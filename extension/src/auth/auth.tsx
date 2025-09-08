import React, { useMemo, useState } from "react";
import {createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile} from "firebase/auth";
import "../index.css"
import {auth} from "../shared/firebase"
// import { email } from "zod";

async function afterAuthSucces() {
  const u = auth.currentUser!;
  const token = await u.getIdToken();

  const authState = {
  signedIn: true,
  uid: u.uid,
  displayName: u.displayName, // Make the name, email and password fields a requirement for the user. 
  email: u.email,
  token,
  ts: Date.now(),
  }

  await chrome.storage.local.set({ auth: authState }).then(() => {console.log("Auth state set.")})
  chrome.runtime.sendMessage({ type: "AUTH_UPDATED", payload: authState })
}

function useMode(): "signin" | "signup" {
  return useMemo(() => (location.hash.toLowerCase().includes("signup") ? "signup" : "signin"), []);
}

export default function AuthForm() {
  const mode = useMode();
  const [email, setEmail] = useState("");
  const [name, setName] = useState(""); 
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); 
    setError(null);
    try {
      if (mode === "signup") {
        if (!name.trim()) throw new Error("Name is required."); // Name field is required.
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (name.trim()) await updateProfile(cred.user, { displayName: name.trim() });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }

      await afterAuthSucces(); // Sign in/up Successful. Send the user information to the pop-up window for display.

      const token = await auth.currentUser?.getIdToken();
      if (token) {
        await fetch(`${import.meta.env.VITE_API_BASE}/api/users/init`, { // Change the endpoint, if necessary.
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ displayName: name || null }),
        });
      }
      setDone(true);
    } catch (err) {
      setError(String(err));
    } finally { setBusy(false); }
  };

  if (done) {
    return (
      <div className="max-w-md mx-auto mt-10 font-sans px-4">
        <h2 className="text-xl font-semibold mb-2">Success 🎉</h2>
        <p className="text-gray-600 mb-4">
          You’re signed {mode === "signup" ? "up" : "in"}. Open the extension popup again.
        </p>
        <button className="w-full rounded-xl border px-3 py-2" onClick={() => window.close()}>
          Close tab
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="max-w-md mx-auto mt-10 font-sans px-4">
      <h2 className="text-xl font-semibold mb-2">
        {mode === "signup" ? "Create your account" : "Welcome back"}
      </h2>
      <p className="text-gray-600 mb-4">
        {mode === "signup" ? "Use email and a password to sign up." : "Sign in with your email and password."}
      </p>

      {mode === "signup" && (
        <div className="mb-3">
          <label className="block text-sm mb-1">Name</label>
          <input
            required
            placeholder="Ada Lovelace"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none"
          />
        </div>
      )}

      <div className="mb-3">
        <label className="block text-sm mb-1">Email</label>
        <input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm mb-1">Password</label>
        <input
          type="password"
          required
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none"
        />
      </div>
      {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
      <button type="submit" disabled={busy} className="w-full rounded-xl border border-black bg-black text-black px-3 py-2 disabled:opacity-70">
        {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
      </button>

     { /* Work on the redirecting page. */ }
      {/* <div className="w-full mt-3 text-sm">
        {mode === "signup" ? (<a href="#mode=signin" className="underline">Already have an account? Sign in</a>
        ) : (<a href="#mode=signup" className="underline">New here? Create an account</a> // Work on the redirecting later.
        )}
      </div> */}
    </form>
  );
}
