import React from 'react';
import type { PanelInboundMessage, PanelReadyMessage, ShowResultPayload } from '../../shared/types';

export default function SidePanel() {
  const [msg, setMsg] = React.useState<PanelInboundMessage | null>(null);
  const [connected, setConnected] = React.useState(false);

  React.useEffect(() => {
    // Tell SW we mounted; this helps avoid “Receiving end does not exist”
    const ready: PanelReadyMessage = { type: 'PANEL_READY' };
    chrome.runtime.sendMessage(ready).then(
      () => setConnected(true),
      () => setConnected(false),
    );

    const handler = (incoming: PanelInboundMessage) => {
      if (
        incoming?.type === 'SHOW_RESULT_LOADING' ||
        incoming?.type === 'SHOW_RESULT_DATA' ||
        incoming?.type === 'SHOW_RESULT_ERROR'
      ) {
        setMsg(incoming);
      }
    };

    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, []);

  if (!connected) return <div style={{ padding: 16 }}>Connecting to extension…</div>;
  if (!msg || msg.type === 'SHOW_RESULT_LOADING') {
    return <div style={{ padding: 16 }}>Analyzing…</div>;
  }

  if (msg.type === 'SHOW_RESULT_ERROR') {
    if (msg.error === 'TOO_SHORT') {
      const n = msg.payload?.nChars ?? 0;
      return <div style={{ padding: 16 }}>Text is too short ({n} chars). Try ≥ 400–800 chars.</div>;
    }
    const explain = msg.payload?.message || msg.error;
    return <div style={{ padding: 16 }}>Error: {explain}</div>;
  }

  const p: ShowResultPayload = msg.payload ?? {};
  const pct = Math.round((p.prob_ai ?? 0) * 100);
  const hasBand = typeof p.ci_low === 'number' && typeof p.ci_high === 'number';

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <h2 style={{ marginTop: 0 }}>AI-likelihood</h2>
      <div style={{ fontSize: 42, fontWeight: 700 }}>{pct}%</div>
      <div style={{ opacity: 0.7, marginTop: 8 }}>
        {hasBand ? (
          <span>± {Math.round((p.ci_high! - p.ci_low!) * 50)}% confidence band</span>
        ) : (
          <span>Uncalibrated estimate</span>
        )}
      </div>
      <div style={{ marginTop: 12, fontSize: 12, opacity: 0.8 }}>
        Model: {p.model ?? 'mock-detector'} — Tokens: {p.n_tokens ?? '—'}
      </div>
    </div>
  );
}
