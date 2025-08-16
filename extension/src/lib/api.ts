export type ScoreResponse = {
  prob_ai: number; ci_low?: number; ci_high?: number; n_tokens?: number; model?: string;
};