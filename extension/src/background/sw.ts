import type { PanelInboundMessage, PanelReadyMessage } from '../shared/types';
import { GoogleAuthProvider, onAuthStateChanged, signOut, signInWithCredential } from 'firebase/auth/web-extension';
import {getAuth, signOut as fbSignOut} from "firebase/auth";
import {auth} from "../shared/firebase"

const panelReady = new Map<number, boolean>();
const API_BASE = 'http://127.0.0.1:8080'
const API_TIMEOUT_MS = 8000;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL; // AUTH endpoint.
const OFFSCREEN_PATH = "offscreen/index.html" // change the path, if an error occurs.
let creatingOffscreen: Promise<void> | undefined;

//
// Google Auth - Offscreen Document 
//

async function offscreenExists(): Promise<boolean> {
  return await chrome.offscreen.hasDocument();
}

async function ensureOffscreen() {
  if (await offscreenExists()) return;
  if (creatingOffscreen) {
    await creatingOffscreen;
    return;
  }

  creatingOffscreen = chrome.offscreen.createDocument({
    url: OFFSCREEN_PATH,
    reasons: [chrome.offscreen.Reason.DOM_SCRAPING],
    justification: "Run Firebase signInWithPopup via hosted page inside iframe",
  }) as unknown as Promise<void>;
  try {
    await creatingOffscreen;
  } finally {
    creatingOffscreen = undefined;
  }
}

async function closeOffscreen() {
  if (await offscreenExists()) {
    await chrome.offscreen.closeDocument();
  }
}

async function signInWithGoogleFlow() {
  await ensureOffscreen();

  let started = await chrome.runtime.sendMessage({target: "offscreen", type: "firebase-auth/start"});

  if (!started.ok) {
    await new Promise(res => setTimeout(res, 500));
    started = await chrome.runtime.sendMessage({target: "offscreen", type: "firebase-auth/start"}); 
  }

  if (!started?.ok) throw new Error(started?.error ?? "Failed to start offscreen auth"); // An Error occurs when the Google Authentication button is pressed.

  const result = await new Promise<{ ok: boolean; idToken?: string; profile?: any; error?: any }>(
    (resolve) => {
      const listener = (msg: any, _sender: chrome.runtime.MessageSender) => {
        if (msg?.target === "sw" && msg?.type === "firebase-auth/result") {
          chrome.runtime.onMessage.removeListener(listener);
          resolve(msg.payload);
        }
      };
      chrome.runtime.onMessage.addListener(listener);
    }
  );

  await closeOffscreen();

  if (!result.ok || !result.idToken) {
    throw new Error(result?.error?.message || "Google sign-in failed");
  }

  // Firebase session established.
  const cred = GoogleAuthProvider.credential(result.idToken);
  const userCred = await signInWithCredential(auth, cred);

  await chrome.storage.local.set({
    uid: userCred.user.uid,
    userProfile: result.profile || {
      email: userCred.user.email,
      displayName: userCred.user.displayName,
      photoURL: userCred.user.photoURL,
    },
  });

  return userCred.user;
}

// Public message API for popup/content scripts
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    if (msg?.type === "auth/signInWithGoogle") {
      try {
        const user = await signInWithGoogleFlow();
        sendResponse({ ok: true, uid: user.uid });
      } catch (e: any) {
        sendResponse({ ok: false, error: e.message ?? String(e) });
      }
      return;
    }

    if (msg?.type === "auth/signOut") {
      await signOut(auth);
      await chrome.storage.local.remove(["uid", "userProfile"]);
      sendResponse({ ok: true });
      return;
    }

    if (msg?.type === "auth/getIdToken") {
      const token = auth.currentUser ? await auth.currentUser.getIdToken(false) : null;
      sendResponse({ ok: true, idToken: token });
      return;
    }
  })();

  return true; // keep the message channel open for async sendResponse
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    await chrome.storage.local.remove(["uid", "userProfile"]);
  }
});

//
// AUTH & USAGE LOGGING
//

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse): boolean | void => {
  // Debug the conditional statement.
  if (msg?.type === "GET_AUTH") {
    chrome.storage.local.get("auth").then(({ auth }) => sendResponse(auth))
    return true;
  }

  if (msg?.type === "SIGNED_OUT") {
    (async () => {
      try { 
      await fbSignOut(getAuth())
    } catch (err) {
      console.error(err);
      console.error("Sign out failed.", err)
      throw new Error("Sign out failed.");
    }
    await chrome.storage.local.set({auth: {signedIn: false}})
    chrome.runtime.sendMessage({type: "AUTH_UPDATED", payload: {signedIn: false}})
    sendResponse({ok: true});
    })();
    return true;
  }

  if (msg?.type === "AUTH_UPDATED") {
    chrome.storage.local.set({auth: msg.payload}).then(() => sendResponse({ok: true}))
  }


  if (msg?.type === "LOG_EVENT") {
    if (!auth.currentUser) {
      sendResponse({ ok: false, error: "not_signed_in" });
      return;
    }
    auth.currentUser.getIdToken().then((token: string) => {
      fetch(`${API_BASE_URL}/api/events/usage`, {method: "POST", 
        headers: {"Content-Type": "application/json", Authorization: `Bearer ${token}`}, // Includes payload auth token
        body: JSON.stringify(msg.payload || {})
      })
        .then((r) => r.json())
        .then((data) => sendResponse(data))
        .catch((e) => sendResponse({ ok: false, error: String(e) }));
    });
    return true; 
  }
});




// SIDE PANEL COMMUNICATION & COMMANDS

chrome.runtime.onMessage.addListener((msg: PanelReadyMessage, sender) => {
  if (msg?.type === 'PANEL_READY' && sender?.tab?.id != null) {
    panelReady.set(sender.tab.id, true);
  }
  return false;
});

async function waitForPanelReady(tabId: number, timeoutMs = 1500): Promise<void> {
  if (panelReady.get(tabId)) return;
  const start = Date.now();
  await new Promise<void>((resolve) => {
    const iv = setInterval(() => {
      if (panelReady.get(tabId) || Date.now() - start > timeoutMs) {
        clearInterval(iv);
        resolve();
      }
    }, 50);
  });
}

async function sendToPanel(tabId: number, m: PanelInboundMessage): Promise<void> {
  await waitForPanelReady(tabId);

  try {
    await chrome.runtime.sendMessage(m);
  } catch (e) {
    console.debug('sendToPanel failed:', (e as Error).message || e);
  }
}

function isSupportedHttpUrl(url?: string | null): boolean {
  if (!url) return false;
  return /^https?:/i.test(url);
}

chrome.commands.onCommand.addListener((command) => {
  if (command !== "toggle-ai-likelihood-panel") return;
  console.log('onCommand fired:', command, "sidePanel?", !!chrome.sidePanel);


  chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
    if (!tab?.id) return;
    const tabId = tab.id;

    panelReady.delete(tabId);
    await chrome.sidePanel.open({ tabId });
    await sendToPanel(tabId, { type: "SHOW_RESULT_LOADING" });

    if (!isSupportedHttpUrl(tab.url)) {
      await sendToPanel(tabId, {
        type: "SHOW_RESULT_ERROR",
        error: "UNSUPPORTED_PAGE",
        payload: { url: tab.url || "(unknown)" },
      });
      return;
    }

    let selected = "";
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId, allFrames: true },
        func: () => window.getSelection()?.toString() ?? "",
      });

      selected = results.map((r) => (typeof r.result === "string" ? r.result : "")).find((s) => s && s.trim().length > 0) || "";
    } catch (err) {
      await sendToPanel(tabId, {
        type: "SHOW_RESULT_ERROR",
        error: "SELECTION_FAILED",
        payload: { message: (err as Error)?.message ?? "Could not read selection" },
      });
      return;
    }

    if (selected.trim().length < 300) {
      await sendToPanel(tabId, {
        type: "SHOW_RESULT_ERROR",
        error: "TOO_SHORT",
        payload: { nChars: selected.trim().length },
      });
      return;
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

      const resp = await fetch(`${API_BASE}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: selected }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!resp.ok) {
        let detail = `HTTP_${resp.status}`;
        try {
          const body = await resp.json();
          detail = body?.detail || detail;
        } catch (error) {
          console.warn("Failed to parse error response from API", error);
          console.log(`API error: ${detail}`);
        }
        await sendToPanel(tabId, {
          type: "SHOW_RESULT_ERROR",
          error: "API_ERROR",
          payload: { message: detail },
        });
        return;
      }

      const data = await resp.json(); 
      await sendToPanel(tabId, {
        type: "SHOW_RESULT_DATA",
        payload: {
          prob_ai: data.prob_ai,
          n_tokens: data.n_tokens,
          model: data.model,
        },
      });
    } catch (err) {
      await sendToPanel(tabId, {
        type: "SHOW_RESULT_ERROR",
        error: "NETWORK_OR_TIMEOUT",
        payload: { message: (err as Error)?.message ?? "Request failed" },
      });
    }
  });
});
