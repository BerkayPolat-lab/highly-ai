import type { PanelInboundMessage, PanelReadyMessage, ShowResultPayload } from '../shared/types';

const panelReady = new Map<number, boolean>();

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

// Small helper to send messages defensively
async function sendToPanel(tabId: number, m: PanelInboundMessage): Promise<void> {
  // Ensure the panel is mounted (best-effort)
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

// Keyboard shortcut handler (user gesture)
chrome.commands.onCommand.addListener((command) => {
  if (command !== 'toggle-ai-likelihood-panel') return;

  chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
    if (!tab?.id) return;
    const tabId = tab.id;

    panelReady.delete(tabId);

    await chrome.sidePanel.open({ tabId });

    await sendToPanel(tabId, { type: 'SHOW_RESULT_LOADING' });

    if (!isSupportedHttpUrl(tab.url)) {
      await sendToPanel(tabId, {
        type: 'SHOW_RESULT_ERROR',
        error: 'UNSUPPORTED_PAGE',
        payload: { url: tab.url || '(unknown)' }
      });
      return;
    }

    setTimeout(async () => {
      const fake: ShowResultPayload = {
        prob_ai: 0.63,
        ci_low: 0.55,
        ci_high: 0.70,
        n_tokens: 512,
        model: 'mock-detector'
      };
      await sendToPanel(tabId, { type: 'SHOW_RESULT_DATA', payload: fake });
    }, 500);
  });
});
