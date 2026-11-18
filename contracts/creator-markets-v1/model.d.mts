import type{CreatorMarketState,CreatorMarketManifest}from'./state.mjs';
export declare const CREATOR_MODEL_VERSION:string;
export declare const CREATOR_MODEL_HASH:string;
export declare const CREATOR_MODEL_POLICY:Readonly<Record<string,string|number>>;
export declare function estimateCreatorScoreWin(input:CreatorMarketState,manifest:CreatorMarketManifest,options?:{now?:number;allowHistorical?:boolean}):{schema:'arena.creator-win-estimate.v1';model_version:string;model_hash:string;feature_hash:string;manifest_sha256:string;package_sha256:string;source_epoch:string;source_sequence:number;source_tick:number;observed_at:number;probability_scale:number;calibration:'experimental_not_calibrated';executable_quote:false;state:CreatorMarketState['status'];probabilities_ppm:number[]|null;winner:string|null};
