import type { PlatformId } from '../platforms/types';

export const MEDIADECK_SCHEMA_VERSION = 1;
export type Density = 'compact' | 'standard' | 'expanded';
export type RegionName =
  | 'now_playing'
  | 'transport'
  | 'remote'
  | 'sources'
  | 'audio'
  | 'watch_actions'
  | 'inspector';
export interface MediaDeckAction {
  action: 'call-service';
  service: string;
  target?: Record<string, unknown>;
  data?: Record<string, unknown>;
  confirmation?: string;
}
export interface PowerActions {
  on?: MediaDeckAction;
  off?: MediaDeckAction;
}
export interface SourceMapping {
  entity: string;
  remote?: string;
  audio_entity?: string;
  label?: string;
  icon?: string;
  platform?: PlatformId;
}
export interface EntityRoles {
  power?: string;
  metadata?: string;
  transport?: string;
  remote?: string;
  audio?: string;
  related?: string[];
}
export interface WatchAction {
  name: string;
  icon?: string;
  action: MediaDeckAction;
}
export interface AppearanceConfig {
  density?: Density;
  min_height?: number;
  artwork_size?: number;
  artwork_fit?: 'cover' | 'contain';
  border_radius?: number;
  opacity?: number;
  background?: string;
  text_color?: string;
  accent_color?: string;
  button_background?: string;
  button_opacity?: number;
  icon_size?: number;
  font_scale?: number;
  gap?: number;
}
export interface DiscoveryConfig {
  enabled?: boolean;
  minimum_confidence?: number;
}
export interface MediaDeckConfig {
  type: 'custom:mediadeck-card';
  entity: string;
  schema_version?: number;
  platform?: PlatformId;
  entities?: EntityRoles;
  source_mappings?: Record<string, SourceMapping>;
  watch_actions?: WatchAction[];
  custom_actions?: Record<string, MediaDeckAction>;
  power_actions?: PowerActions;
  regions?: Partial<Record<RegionName, boolean>>;
  section_order?: RegionName[];
  appearance?: AppearanceConfig;
  discovery?: DiscoveryConfig;
  title?: string;
  [key: string]: unknown;
}
export interface NormalizedMediaDeckConfig extends MediaDeckConfig {
  schema_version: number;
  entities: EntityRoles;
  source_mappings: Record<string, SourceMapping>;
  watch_actions: WatchAction[];
  custom_actions: Record<string, MediaDeckAction>;
  power_actions: PowerActions;
  regions: Record<RegionName, boolean>;
  section_order: RegionName[];
  appearance: Required<AppearanceConfig>;
  discovery: Required<DiscoveryConfig>;
}
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
