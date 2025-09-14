import React, { useEffect, useState, useRef } from "react"

const HOSTED_AUTH_URL = "http://localhost:3001/auth/google" // URL of the Google Authentication offscreen document.
const EXT_ORIGIN = chrome.runtime.getURL('/').replace(/\/$/, ''); // "chrome-extension://<id>"
const TARGET_ORIGIN = new URL(HOSTED_AUTH_URL).origin;

const IFRAME_URL  = `http://localhost:3001/auth/google?ext=${encodeURIComponent(EXT_ORIGIN)}`;

const GoogleAuth: React.FC = () => {
    const iframeRef = useRef<HTMLIFrameElement | null>(null)
    const [ready, setReady] = useState(false)

    useEffect(() => {
        const onMessage = (ev: MessageEvent) => {
        if (ev.origin !== TARGET_ORIGIN) return;
            try {
                const data = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data;
                chrome.runtime.sendMessage({
                    target: 'sw',
                    type: 'firebase-auth/result',
                    payload: data,
                });
            } catch (err) {
            console.error('error: ', err);
            chrome.runtime.sendMessage({
                target: 'sw',
                type: 'firebase-auth/result',
                payload: { ok: false, error: { message: String(err) } },
            });
        }};
        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
  }, []);

    useEffect(() => {
      const messageHandler = (message: any, _sender: any, sendResponse: any) => {
        if (message?.target !== 'offscreen') return false;     // correct gate

        if (message?.type === 'firebase-auth/start') {
          if (!ready || !iframeRef.current?.contentWindow) {
            sendResponse({ ok: false, error: 'Iframe not ready.' });
            return true; // synchronous response is fine; true is harmless
          }
          iframeRef.current!.contentWindow!.postMessage('initAuth', TARGET_ORIGIN);
          sendResponse({ ok: true });
          return true;
        }

        return false;
      };

      chrome.runtime.onMessage.addListener(messageHandler);
      return () => chrome.runtime.onMessage.removeListener(messageHandler);
    }, [ready]);

  return (
    <div style={{ width: 1, height: 1, overflow: "hidden" }}>
      <iframe
        ref={iframeRef}
        src={IFRAME_URL}
        onLoad={() => setReady(true)}
        style={{ width: 1, height: 1, border: "0" }}
        title="firebase-auth"
      />
      {/* Optional tiny status for debugging via chrome://inspect/#extensions */}
      <div style={{ fontSize: 10, color: "#888" }}>{ready ? "auth iframe ready" : "loading..."}</div>
    </div>
  );
}

export default GoogleAuth;