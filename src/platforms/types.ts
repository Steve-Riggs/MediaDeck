import type { HassEntity } from '../types/home-assistant';

export type NavigationCommand =
  | 'UP'
  | 'DOWN'
  | 'LEFT'
  | 'RIGHT'
  | 'SELECT'
  | 'BACK'
  | 'HOME'
  | 'MENU';

export interface MediaCapabilities {
  power: boolean;
  playPause: boolean;
  stop: boolean;
  next: boolean;
  previous: boolean;
  seek: boolean;
  volumeSet: boolean;
  volumeStep: boolean;
  mute: boolean;
  sourceSelect: boolean;
  remoteNavigation: boolean;
  textEntry: boolean;
}

export interface AdapterContext {
  entity?: HassEntity;
  remote?: HassEntity;
}

export interface AdapterServiceCall {
  domain: string;
  service: string;
  data: Record<string, unknown>;
  target: Record<string, unknown>;
}

export interface PlatformAdapter {
  id: 'generic' | 'android-tv' | 'apple-tv' | 'samsung-tv' | 'lg-webos';
  name: string;
  matches(context: AdapterContext): boolean;
  capabilities(context: AdapterContext): MediaCapabilities;
  remoteAction(context: AdapterContext, command: NavigationCommand): AdapterServiceCall | undefined;
  textAction?(context: AdapterContext, text: string): AdapterServiceCall | undefined;
}

export const MEDIA_FEATURE = {
  PAUSE: 1,
  SEEK: 2,
  VOLUME_SET: 4,
  VOLUME_MUTE: 8,
  PREVIOUS_TRACK: 16,
  NEXT_TRACK: 32,
  TURN_ON: 128,
  TURN_OFF: 256,
  VOLUME_STEP: 1024,
  SELECT_SOURCE: 2048,
  STOP: 4096,
  PLAY: 16384,
} as const;

export function genericCapabilities(context: AdapterContext): MediaCapabilities {
  const features = Number(context.entity?.attributes.supported_features ?? 0);
  const remote = Boolean(context.remote && context.remote.state !== 'unavailable');
  return {
    power: Boolean(features & (MEDIA_FEATURE.TURN_ON | MEDIA_FEATURE.TURN_OFF)),
    playPause: Boolean(features & (MEDIA_FEATURE.PLAY | MEDIA_FEATURE.PAUSE)),
    stop: Boolean(features & MEDIA_FEATURE.STOP),
    next: Boolean(features & MEDIA_FEATURE.NEXT_TRACK),
    previous: Boolean(features & MEDIA_FEATURE.PREVIOUS_TRACK),
    seek: Boolean(features & MEDIA_FEATURE.SEEK),
    volumeSet: Boolean(features & MEDIA_FEATURE.VOLUME_SET),
    volumeStep: Boolean(features & MEDIA_FEATURE.VOLUME_STEP),
    mute: Boolean(features & MEDIA_FEATURE.VOLUME_MUTE),
    sourceSelect: Boolean(features & MEDIA_FEATURE.SELECT_SOURCE),
    remoteNavigation: remote,
    textEntry: false,
  };
}

export function remoteSendCommand(
  context: AdapterContext,
  command: string,
): AdapterServiceCall | undefined {
  if (!context.remote) return undefined;
  return {
    domain: 'remote',
    service: 'send_command',
    data: { command },
    target: { entity_id: context.remote.entity_id },
  };
}
