import type { HassEntity } from '../types/home-assistant';
import type { PowerActions } from '../config/types';
import type { AdapterContext, MediaCapabilities, PlatformAdapter } from '../platforms/types';
export type MediaDeckSystemState =
  | 'off'
  | 'idle'
  | 'playing'
  | 'paused'
  | 'unavailable'
  | 'unknown';
export interface ResolvedMediaSession {
  primary?: HassEntity;
  power?: HassEntity;
  powerActions: PowerActions;
  active?: HassEntity;
  metadata?: HassEntity;
  transport?: HassEntity;
  remote?: HassEntity;
  audio?: HassEntity;
  source?: string;
  state: MediaDeckSystemState;
  adapter: PlatformAdapter;
  adapterContext: AdapterContext;
  capabilities: MediaCapabilities;
  reason: string;
  mappedLabel?: string;
}
