import type { HassEntity } from '../types/home-assistant';import type { MediaCapabilities,PlatformAdapter } from '../platforms/types';
export type MediaDeckSystemState='off'|'idle'|'playing'|'paused'|'unavailable'|'unknown';
export interface ResolvedMediaSession{primary?:HassEntity;active?:HassEntity;metadata?:HassEntity;transport?:HassEntity;remote?:HassEntity;audio?:HassEntity;source?:string;state:MediaDeckSystemState;adapter:PlatformAdapter;capabilities:MediaCapabilities;reason:string;mappedLabel?:string;}
