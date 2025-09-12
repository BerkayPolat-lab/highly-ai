import React, { useState } from "react";

type Props = { onSuccess?: (uid: string) => void };

const GoogleButton: React.FC<Props> = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setErr(null);
    const res = await chrome.runtime.sendMessage({ type: "auth/signInWithGoogle" });
    setLoading(false);

    if (res?.ok) {
      onSuccess?.(res.uid);
    } else {
      setErr(res?.error || "Sign-in failed.");
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 14px",
          borderRadius: 9999,
          border: "1px solid #dadce0",
          background: "#fff",
          cursor: "pointer",
          width: "100%",
          justifyContent: "center",
        }}
        aria-label="Sign in with Google"
      >
        {/* simple G logo glyph */}
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 3l5.7-5.7C33.6 6.1 29 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c10 0 19-7.3 19-20 0-1.3-.1-2.7-.4-3.5z"/>
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16.2 18.9 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C33.6 6.1 29 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/>
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.7 13.6-4.7l-6.3-5.2C29.3 36 26.8 37 24 37c-5.2 0-9.6-3.4-11.2-8.1l-6.6 5.1C9.5 39.7 16.2 44 24 44z"/>
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.6 5.8-6.7 7.2l6.3 5.2c3.6-3.3 5.7-8.2 5.7-14.4 0-1.3-.1-2.7-.4-3.5z"/>
        </svg>
        <span style={{ fontWeight: 500 }}>
          {loading ? "Signing in..." : "Sign in with Google"}
        </span>
      </button>
      {err && <div style={{ color: "#d93025", fontSize: 12, marginTop: 6 }}>{err}</div>}
    </div>
  );
};

export default GoogleButton;
