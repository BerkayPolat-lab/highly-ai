export interface ShowResultPayload {
  loading?: boolean;
  prob_ai?: number;
  ci_low?: number;
  ci_high?: number;
  n_tokens?: number;
  model?: string;
  nChars?: number;
  url?: string;
  message?: string;
}

export type PanelInboundMessage = { type: 'SHOW_RESULT_LOADING' } | { type: 'SHOW_RESULT_DATA'; payload: ShowResultPayload } | {
      type: 'SHOW_RESULT_ERROR';
      error:
        | 'UNSUPPORTED_PAGE'
        | 'TOO_SHORT'
        | 'PAGE_CHANGED'
        | 'NETWORK_ERROR'
        | 'NO_CONTENT_ACCESS';
      payload?: ShowResultPayload;
    };                                  

export interface PanelReadyMessage {
  type: 'PANEL_READY';
}

export function isPanelInboundMessage(m: unknown): m is PanelInboundMessage {
  return (typeof m === 'object' && m !== null && ['SHOW_RESULT_LOADING', 'SHOW_RESULT_DATA', 'SHOW_RESULT_ERROR'].includes((m as any).type));
}

