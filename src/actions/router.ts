import type { HomeAssistant } from '../types/home-assistant';
import type { ResolvedMediaSession } from '../session/types';
import type { MediaDeckAction } from '../config/types';
import type { AdapterServiceCall } from '../platforms/types';
import type { ActionResult, MediaIntent } from './types';

function parts(service: string): [string, string] | undefined {
  const value = service.split('.');
  return value.length === 2 && value.every(Boolean) ? [value[0], value[1]] : undefined;
}

function adapterContext(session: ResolvedMediaSession) {
  return { entity: session.active ?? session.primary, remote: session.remote };
}

function remoteCall(
  session: ResolvedMediaSession,
  intent: Extract<MediaIntent, { kind: 'remote' }>,
) {
  return session.adapter.remoteAction(adapterContext(session), intent.command);
}

function textCall(session: ResolvedMediaSession, intent: Extract<MediaIntent, { kind: 'text' }>) {
  return session.adapter.textAction?.(adapterContext(session), intent.text);
}

export function canExecuteIntent(session: ResolvedMediaSession, intent: MediaIntent): boolean {
  switch (intent.kind) {
    case 'power':
      return Boolean(session.primary);
    case 'play-pause':
      return session.capabilities.playPause && Boolean(session.transport);
    case 'stop':
      return session.capabilities.stop && Boolean(session.transport);
    case 'next':
      return session.capabilities.next && Boolean(session.transport);
    case 'previous':
      return session.capabilities.previous && Boolean(session.transport);
    case 'seek':
      return session.capabilities.seek && Boolean(session.transport);
    case 'volume-set':
      return session.capabilities.volumeSet && Boolean(session.audio);
    case 'volume-up':
    case 'volume-down':
      return session.capabilities.volumeStep && Boolean(session.audio);
    case 'mute':
      return session.capabilities.mute && Boolean(session.audio);
    case 'source-select':
      return session.capabilities.sourceSelect && Boolean(session.primary);
    case 'remote':
      return session.capabilities.remoteNavigation && Boolean(remoteCall(session, intent));
    case 'text':
      return (
        session.capabilities.textEntry &&
        intent.text.length > 0 &&
        Boolean(textCall(session, intent))
      );
    case 'custom':
      return Boolean(parts(intent.action.service));
  }
}

async function call(hass: HomeAssistant, serviceCall: AdapterServiceCall) {
  await hass.callService(
    serviceCall.domain,
    serviceCall.service,
    serviceCall.data as Record<string, any>,
    serviceCall.target as Record<string, any>,
  );
}

async function configured(hass: HomeAssistant, action: MediaDeckAction) {
  const service = parts(action.service);
  if (!service) throw new Error(`Invalid Home Assistant service: ${action.service}`);
  await hass.callService(
    service[0],
    service[1],
    action.data as Record<string, any> | undefined,
    action.target as Record<string, any> | undefined,
  );
}

export async function executeIntent(
  hass: HomeAssistant,
  session: ResolvedMediaSession,
  intent: MediaIntent,
): Promise<ActionResult> {
  if (!canExecuteIntent(session, intent)) {
    return { ok: false, message: 'Action is not supported by the active media session.' };
  }

  try {
    switch (intent.kind) {
      case 'power':
        await hass.callService(
          'media_player',
          intent.on ? 'turn_on' : 'turn_off',
          {},
          {
            entity_id: session.primary!.entity_id,
          },
        );
        break;
      case 'play-pause':
        await hass.callService(
          'media_player',
          'media_play_pause',
          {},
          {
            entity_id: session.transport!.entity_id,
          },
        );
        break;
      case 'stop':
        await hass.callService(
          'media_player',
          'media_stop',
          {},
          {
            entity_id: session.transport!.entity_id,
          },
        );
        break;
      case 'next':
        await hass.callService(
          'media_player',
          'media_next_track',
          {},
          {
            entity_id: session.transport!.entity_id,
          },
        );
        break;
      case 'previous':
        await hass.callService(
          'media_player',
          'media_previous_track',
          {},
          {
            entity_id: session.transport!.entity_id,
          },
        );
        break;
      case 'seek':
        await hass.callService(
          'media_player',
          'media_seek',
          { seek_position: intent.position },
          {
            entity_id: session.transport!.entity_id,
          },
        );
        break;
      case 'volume-set':
        await hass.callService(
          'media_player',
          'volume_set',
          { volume_level: intent.volume },
          {
            entity_id: session.audio!.entity_id,
          },
        );
        break;
      case 'volume-up':
      case 'volume-down':
        await hass.callService(
          'media_player',
          intent.kind === 'volume-up' ? 'volume_up' : 'volume_down',
          {},
          { entity_id: session.audio!.entity_id },
        );
        break;
      case 'mute':
        await hass.callService(
          'media_player',
          'volume_mute',
          { is_volume_muted: intent.muted },
          {
            entity_id: session.audio!.entity_id,
          },
        );
        break;
      case 'source-select':
        await hass.callService(
          'media_player',
          'select_source',
          { source: intent.source },
          {
            entity_id: session.primary!.entity_id,
          },
        );
        break;
      case 'remote':
        await call(hass, remoteCall(session, intent)!);
        break;
      case 'text':
        await call(hass, textCall(session, intent)!);
        break;
      case 'custom':
        await configured(hass, intent.action);
        break;
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Home Assistant service call failed.',
      error,
    };
  }
}
