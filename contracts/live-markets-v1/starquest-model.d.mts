export interface StarQuestOutcomeFeatures {
 outcome:number;score:number;station_hull_milli:number;station_max_hull_milli:number;station_destroyed:boolean;
 modules_alive:number;modules_total:number;fleet_alive:number;fleet_total:number;fleet_hull_milli:number;fleet_shield_milli:number;
 fleet_max_hull_milli:number;fleet_max_shield_milli:number;captures:number;transport_deliveries:number;
 transport_cargo_milli:number|null;transport_hull_milli:number|null;gameplay_active:boolean;terminal_winner:boolean|null;
}
export interface StarQuestPricingFeatures {
 schema:'starquest.pricing-features.v1';game:'starquest';source_epoch:string;match_id:string;
 mode:'battlefield'|'bombing'|'capture'|'transport';ruleset:string;source_tick:number;observed_at:number;elapsed_ms:number;
 status:'live'|'completed';winner:number|null;completion_reason:'time_limit'|null;time_limit_ms:number|null;
 idle_time_limit_ms:number|null;idle_time_limit_active:boolean;safe_radius_milli:number;capture_carrier_team:number|null;
 bomb_carrier_team:number|null;bomb_fuse_remaining_ms:number|null;outcomes:StarQuestOutcomeFeatures[];observation_hash:string;
}
export interface WinEstimate {
 schema:'arena.win-estimate.v1';model_version:string;model_hash:string;feature_hash:string;source_epoch:string;source_tick:number;
 observed_at:number;probability_scale:1000000;calibration:'experimental_not_calibrated';executable_quote:false;
 state:'live'|'awaiting_result'|'completed';probabilities_ppm:number[]|null;winner:number|null;
}
export declare const MODEL_VERSION:string;
export declare const MODEL_HASH:string;
export declare const MODEL_POLICY:Readonly<{schema:string;version:string;probability_scale:number;probability_floor:number;utility_base:number;power:number;score_prior:number;objective_prior_milli:number;max_source_age_ms:number;max_future_skew_ms:number;weights:Readonly<Record<string,readonly number[]>>}>;
export declare function pricingHash(value:unknown):string;
export declare function validateStarQuestFeatures(value:unknown):StarQuestPricingFeatures;
export declare function estimateStarQuestWin(value:unknown,options?:{now?:number;allowHistorical?:boolean}):WinEstimate;
