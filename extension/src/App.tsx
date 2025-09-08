import { useState, useEffect } from 'react'
import './App.css'
// import {signOut as fbSignOut, getAuth} from "firebase/auth"

type AuthState = {
  signedIn: boolean;
  uid?: string;
  email?: string;
  displayName?: string;
  token?: string;
  ts?: number;
}

function App() {
  const [auth, setAuth] = useState<AuthState>({ signedIn: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_AUTH' }).then((response: AuthState) => {
      setAuth(response ?? { signedIn: false });
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    const handler = (msg: any) => {
      if (msg?.type === "AUTH_UPDATED") {
        setAuth(msg.payload);
      }
    }
    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, [])


  const openAuthTab = (mode: "signin" | "signup") => {
    const url = chrome.runtime.getURL(`auth.html#mode=${mode}`);
    chrome.tabs.create({ url });
  }

  const signOut = () => {
    // tell background to clear storage (and your auth tab can also do Firebase signOut)
    chrome.runtime.sendMessage({ type: "SIGNED_OUT" }, () => setAuth({ signedIn: false }));
  };

  if (loading) return <div className="p-3 text-sm">Loading…</div>;

  if (!auth.signedIn) {
    return (
      <div className="p-4 w-72">
        <h3 className="text-base font-semibold mb-3">highlyAI</h3>
        <p className="text-xs text-gray-600 mb-3">
          Sign in to sync your usage and manage account settings.
        </p>
        <div className="grid gap-2">
          <button
            onClick={() => openAuthTab("signin")}
            className="rounded-xl px-3 py-2 border text-sm hover:bg-gray-50">
            Sign in
          </button>
          <button
            onClick={() => openAuthTab("signup")}
            className="rounded-xl px-3 py-2 border text-sm hover:bg-gray-50">
            Create account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 w-72">
      <h3 className="text-base font-semibold mb-2">Account</h3>
      <div className="text-sm">
        <div className="font-medium">{auth.displayName || "(no name set)"}</div>
        <div className="text-gray-600">{auth.email}</div>
      </div>
      <button
        onClick={signOut} // Calling the signOut function when the sign-out button is pressed. 
        // Come back if an error occurs. Signing 
        className="mt-3 rounded-xl px-3 py-2 border text-sm hover:bg-gray-50 w-full"
      >
        Sign out
      </button>
    </div>
  );
}

export default App
