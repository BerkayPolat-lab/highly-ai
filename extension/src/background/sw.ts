const panelReady = new Map<number, boolean>();

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.type === 'PANEL_READY') {
    if (sender?.tab?.id != null) {
      panelReady.set(sender.tab.id, true);
    } else {
      // Fallback: mark all as ready (rare)
      // panelReady.clear(); // optional
    }
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command !== 'toggle-ai-likelihood-panel') return;

  chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
    if (!tab?.id) return;

    await chrome.sidePanel.open({ tabId: tab.id });

    // 2) Tell UI we're working
    chrome.runtime.sendMessage({ type: 'SHOW_RESULT', payload: { loading: true } });

    // 3) Bail out on unsupported URLs (chrome://, chromewebstore://, pdf viewer, etc.)
    if (!tab.url || !/^https?:/.test(tab.url)) {
      chrome.runtime.sendMessage({
        type: 'SHOW_RESULT',
        error: 'UNSUPPORTED_PAGE',
        payload: { url: tab.url || '(unknown)' }
      });
      return;
    }

    // 4) Execute in-page function to get the current selection text
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id!, allFrames: true }, 
        func: () => (window.getSelection()?.toString() ?? '')
      });

      // Pick the first non-empty result from any frame
      const selected = results
        .map(r => (typeof r.result === 'string' ? r.result : ''))
        .find(s => s && s.trim().length > 0) || '';

      if (selected.length < 400) {
        chrome.runtime.sendMessage({
          type: 'SHOW_RESULT',
          error: 'TOO_SHORT',
          payload: { nChars: selected.length }
        });
        return;
      }

      // 5) MOCK until backend is ready (or call your API here)
      const fake = {
        prob_ai: 0.63,
        ci_low: 0.55,
        ci_high: 0.70,
        n_tokens: Math.min(2048, Math.ceil(selected.length / 4)),
        model: 'mock-detector'
      };
      chrome.runtime.sendMessage({ type: 'SHOW_RESULT', payload: fake });

      // --- When backend is ready, replace with:
      // const resp = await fetch('https://your-api.example.com/score', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json', 'X-Api-Key': 'REDACTED' },
      //   body: JSON.stringify({ text: selected })
      // });
      // const data = await resp.json();
      // chrome.runtime.sendMessage({ type: 'SHOW_RESULT', payload: data });

    } catch (err) {
      chrome.runtime.sendMessage({
        type: 'SHOW_RESULT',
        error: 'PAGE_CHANGED',
        payload: { message: (err as Error).message || String(err) }
      });
    }
  });
});
