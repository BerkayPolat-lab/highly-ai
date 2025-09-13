import React from 'react';
import type { PanelInboundMessage, PanelReadyMessage, ShowResultPayload } from '../../shared/types';
import "../../index.css";

export default function SidePanel() {
  const [msg, setMsg] = React.useState<PanelInboundMessage | null>(null);
  const [connected, setConnected] = React.useState(false);

React.useEffect(() => {
  (async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const tabId = tab?.id ?? -1;

    const ok: PanelReadyMessage = await chrome.runtime.sendMessage({ type: 'PANEL_READY', tabId });
    setConnected(Boolean(ok));
  })().catch(() => setConnected(false));

  const handler = (incoming: PanelInboundMessage) => {
    if (incoming?.type === 'SHOW_RESULT_LOADING' ||
        incoming?.type === 'SHOW_RESULT_DATA'    ||
        incoming?.type === 'SHOW_RESULT_ERROR') {
      setMsg(incoming);
    }
  };
  chrome.runtime.onMessage.addListener(handler);
  return () => chrome.runtime.onMessage.removeListener(handler);
}, []);

  if (!connected) return <div style={{ padding: 16 }}>Connecting to extension…</div>;
  if (!msg || msg.type === 'SHOW_RESULT_LOADING') {
    return <div className="h-[300px] overflow-y-auto p-4"  style={{ padding: 16, fontFamily: 'system-ui, sans-serif' }}> Analyzing... </div>;
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
  // const hasBand = typeof p.ci_low === 'number' && typeof p.ci_high === 'number';

  return (
    <div className="h-[300px] overflow-y-auto p-4"  style={{ padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <h2 className="font-bold" style={{ marginTop: 0, marginBottom: 8 }}>AI-likelihood</h2>
      <div className="w-full bg-gray-200 rounded-xl h-6 overflow-hidden relative">
        <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${pct}%` }}/>
        <span className="absolute inset-0 flex items-center justify-center font-bold text-black"> {pct}% </span>
      </div>
      {/* <div style={{ fontSize: 24, fontWeight: 'bold', marginTop: 8 }}>{pct}%</div> */}
      {/* <div style={{ opacity: 0.7, marginTop: 8 }}>
        {hasBand ? (
          <span>± {Math.round((p.ci_high! - p.ci_low!) * 50)}% confidence band</span>
        ) : (
          <span>Uncalibrated estimate</span>
        )}
      </div> */}
      <div style={{ marginTop: 12, fontSize: 12, opacity: 0.8 }}>
        <div> Model: {p.model ?? 'mock-detector'}  </div>
        <div> Tokens: {p.n_tokens ?? '—'} </div>
      </div>
    </div>
  );
}
