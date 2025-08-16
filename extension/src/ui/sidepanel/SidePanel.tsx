import React from 'react';

type Result =
  | { loading: true }
  | { prob_ai: number; ci_low?: number; ci_high?: number; n_tokens?: number; model?: string }
  | { error: string; payload?: any };

export default function SidePanel() {
  const [result, setResult] = React.useState<Result | null>(null);

  React.useEffect(() => {
    chrome.runtime.sendMessage({ type: 'PANEL_READY' });

    const handler = (msg: any) => {
      if (msg?.type === 'SHOW_RESULT') setResult(msg);
    };
    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, []);

  if (!result || (result as any).payload?.loading) return <div style={{ padding: 16 }}>Analyzing…</div>;
  if ((result as any).error === 'TOO_SHORT') {
    const n = (result as any).payload?.nChars ?? 0;
    return <div style={{ padding: 16 }}>Text is too short ({n} chars). Try ≥ 400–800 chars for reliability.</div>;
  }
  if ((result as any).error) return <div style={{ padding: 16 }}>Error: {(result as any).error}</div>;

  const payload = (result as any).payload ?? result;
  const pct = Math.round((payload.prob_ai ?? 0) * 100);

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <h2 style={{ marginTop: 0 }}>AI-likelihood</h2>
      <div style={{ fontSize: 42, fontWeight: 700 }}>{pct}%</div>
      <div style={{ opacity: 0.7, marginTop: 8 }}>
        {payload.ci_low != null && payload.ci_high != null ? (
          <span>± {Math.round((payload.ci_high - payload.ci_low) * 50)}% confidence band</span>
        ) : (
          <span>Uncalibrated estimate</span>
        )}
      </div>
      <div style={{ marginTop: 12, fontSize: 12, opacity: 0.8 }}>
        Model: {payload.model ?? 'unknown'} — Tokens: {payload.n_tokens ?? '—'}
      </div>
      <div style={{ marginTop: 16, fontSize: 12, opacity: 0.7 }}>
        Detection has limitations (short text, paraphrasing, non-native bias). Treat as advisory only.
      </div>
    </div>
  );
}
