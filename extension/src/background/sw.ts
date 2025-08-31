import type { PanelInboundMessage, PanelReadyMessage } from '../shared/types';
import { initializeApp, type FirebaseOptions } from "firebase/app";
import {getAuth, onAuthStateChanged, signOut, type User} from "firebase/auth";

const panelReady = new Map<number, boolean>();
const API_BASE = 'http://127.0.0.1:8080'
const API_TIMEOUT_MS = 8000;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL; // AUTH endpoint.

const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

let cachedUser: User | null = null;
onAuthStateChanged(auth, (u) => {
  cachedUser = u || null;
});


// AUTH & USAGE LOGGING

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse): boolean | void => {
  if (msg?.type === "GET_AUTH_STATE") {
    const state = cachedUser
      ? {
          signedIn: true,
          uid: cachedUser.uid,
          email: cachedUser.email,
          displayName: cachedUser.displayName
        }
      : { signedIn: false };
    sendResponse(state);
    return; 
  }

  if (msg?.type === "SIGN_OUT") {
    signOut(auth)
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true; 
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
  console.log('onCommand fired:', command);

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
