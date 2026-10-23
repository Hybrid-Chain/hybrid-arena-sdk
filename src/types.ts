export type Json = null | boolean | number | string | Json[] | {[key: string]: Json};
export interface GameBinding {
  publisher_id: string; game_id: string; game_version: string;
  ruleset_id: string; ruleset_version: string;
}
export interface GameManifest extends GameBinding {
  schema: 'arena.game.manifest.v1';
  outcomes: {outcome_id: string; label: string}[];
  capabilities: {spectate: boolean; join: boolean; replays: boolean};
  clock: {kind: 'simulation' | 'server'; precision_ms: number; tick_rate_hz?: number};
}
export interface MatchRequest extends GameBinding {
  schema: 'arena.game.match.v1'; request_id: string; match_id: string; epoch: string;
  participants: {actor_id: string; outcome_id: string}[];
}
interface EventBase {
  event_id: string; sequence: number; game_time_ms: number;
  source_tick?: number; occurred_at?: string;
}
export type GameEvent = EventBase & (
  {type: 'match_started'; payload: Record<string, never>} |
  {type: 'score_changed'; payload: {outcome_id: string; score: number}} |
  {type: 'game_event'; payload: {name: string; actor_id?: string; target_actor_id?: string; values: Record<string, number | boolean>}} |
  {type: 'match_completed'; payload: {winner: string | null; scores: {outcome_id: string; score: number}[]}} |
  {type: 'match_canceled'; payload: {reason: 'operator_canceled' | 'source_unavailable' | 'invalid_match'}} |
  {type: 'source_gap'; payload: {reason: 'missing_events' | 'source_restart' | 'integrity_failure'}}
);
export interface EventBatch {
  schema: 'arena.game.events.v1'; publisher_id: string; game_id: string;
  batch_id: string; match_id: string; epoch: string; first_sequence: number;
  previous_batch_sha256: string | null; events: GameEvent[];
}
export interface Receipt {
  schema: 'arena.game.receipt.v1'; request_id: string;
  kind: 'match.created' | 'events.accepted'; publisher_id: string; game_id: string;
  match_id: string; epoch: string; request_sha256: string; manifest_sha256: string;
  first_sequence: number | null; last_sequence: number;
  state: 'created' | 'live' | 'held' | 'completed' | 'canceled'; accepted_at: string;
  assurance: 'local_reference_only'; anchor: null; payout_authorized: false;
}
export interface ClientOptions {
  baseUrl: string; publisherId: string; gameId: string; keyId: string;
  secretHex: string; environment: 'sandbox'; outboxPath: string; timeoutMs?: number;
}
