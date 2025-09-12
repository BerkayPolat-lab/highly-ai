import React, { useEffect, useState, useRef } from "react"

const HOSTED_AUTH_URL = "http://localhost:3001/auth/google" // URL of the Google Authentication offscreen document.

const TARGET_ORIGIN = new URL(HOSTED_AUTH_URL).origin;

const GoogleAuth: React.FC = () => {
    const iframeRef = useRef<HTMLIFrameElement | null>(null)
    const [ready, setReady] = useState(false)

    useEffect(() => {
        const onMessage = (ev: MessageEvent) => {
            if (ev.origin !== TARGET_ORIGIN) return
            try {
                const data = typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data
                chrome.runtime.sendMessage({target: "sw", type: "firebase-auth/result", payload: data}) // sending the data to the service worker. 
            } catch (err) {
                console.error("error: ", err)
            }
        }

        window.addEventListener("message", onMessage)
        return () => window.removeEventListener("message", onMessage)
    }, [])


    useEffect(() => {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message?.type !== "offscreen") return;

            if (ready === true && message?.type === "firebase-auth/start") { // Perform the conditional only when ready === true, meaning that the iframe is mounted.
                if (!iframeRef.current?.contentWindow) {
                    sendResponse({ok: false, error: "Iframe not ready."})
                    return true;
                }

                iframeRef.current.contentWindow.postMessage("initAuth", TARGET_ORIGIN)
                sendResponse({ok: true})
                return true;
            }

            
        return false;
        })
    }, [])


  return (
    <div style={{ width: 1, height: 1, overflow: "hidden" }}>
      <iframe
        ref={iframeRef}
        src={HOSTED_AUTH_URL}
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