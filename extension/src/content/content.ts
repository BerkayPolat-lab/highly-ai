chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'GET_SELECTION') {
    sendResponse(window.getSelection()?.toString() ?? '');
  }
});
