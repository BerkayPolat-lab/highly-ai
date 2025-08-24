import type { PanelInboundMessage, PanelReadyMessage } from '../shared/types';

const panelReady = new Map<number, boolean>();
const API_BASE = 'http://127.0.0.1:8080'
const API_TIMEOUT_MS = 8000;

chrome.runtime.onMessage.addListener((msg: PanelReadyMessage, sender) => {
  if (msg?.type === 'PANEL_READY' && sender?.tab?.id != null) {
    panelReady.set(sender.tab.id, true);
  }
  // Return false so we don't keep the message channel open
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
