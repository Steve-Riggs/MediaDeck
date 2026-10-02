import type { HomeAssistant, HassEntity } from '../types/home-assistant';
import type { NormalizedMediaDeckConfig } from '../config/types';
import { selectPlatformAdapter } from '../platforms/registry';
import { entityPlatform, type EntityRegistryMap } from '../registry/entity-registry';
import type { AdapterContext, MediaCapabilities, PlatformId } from '../platforms/types';
import type { ResolvedMediaSession, MediaDeckSystemState } from './types';

function usable(e?: HassEntity): e is HassEntity {
  return Boolean(e && !['unavailable', 'unknown'].includes(e.state));
}
function mediaState(e?: HassEntity): MediaDeckSystemState {
  if (!e) return 'unavailable';
  if (e.state === 'playing') return 'playing';
  if (e.state === 'paused') return 'paused';
  if (e.state === 'off') return 'off';
  if (e.state === 'unavailable') return 'unavailable';
  if (['idle', 'standby', 'on'].includes(e.state)) return 'idle';
  return 'unknown';
}
const state = (h: HomeAssistant, id?: string) => (id ? h.states[id] : undefined);
function sameDevice(first: HassEntity | undefined, second: HassEntity | undefined, registry: EntityRegistryMap): boolean {
  if (!first || !second) return false;
  const firstDevice = registry[first.entity_id]?.device_id;
  const secondDevice = registry[second.entity_id]?.device_id;
  return Boolean(firstDevice && secondDevice && firstDevice === secondDevice);
}
function sameDeviceOrUnknown(first: HassEntity | undefined, second: HassEntity | undefined, registry: EntityRegistryMap): boolean {
  if (!first || !second) return false;
  const firstDevice = registry[first.entity_id]?.device_id;
  const secondDevice = registry[second.entity_id]?.device_id;
  if (!firstDevice || !secondDevice) return true;
  return firstDevice === secondDevice;
}
function context(entity: HassEntity | undefined, remote: HassEntity | undefined, registry: EntityRegistryMap): AdapterContext {
  return { entity, remote, registryPlatform: entityPlatform(entity, registry), remoteRegistryPlatform: entityPlatform(remote, registry) };
}
function capabilitiesFor(entity: HassEntity | undefined, remote: HassEntity | undefined, registry: EntityRegistryMap, override?: PlatformId): MediaCapabilities {
  const ctx = context(entity, remote, registry);
  return selectPlatformAdapter(ctx, override).capabilities(ctx);
}
function boundCompanion(owner: HassEntity | undefined, preferred: HassEntity | undefined, registry: EntityRegistryMap, requireKnownRelationship: boolean): HassEntity | undefined {
  if (!usable(preferred)) return undefined;
  const related = requireKnownRelationship ? sameDevice(owner, preferred, registry) : sameDeviceOrUnknown(owner, preferred, registry);
  return related ? preferred : undefined;
}

export function resolveMediaSession(hass: HomeAssistant, config: NormalizedMediaDeckConfig, registry: EntityRegistryMap = {}): ResolvedMediaSession {
  const primary = state(hass, config.entity);
  const power = config.entities.power ? state(hass, config.entities.power) : primary;
  const source = primary?.attributes.source as string | undefined;
  const mapping = source ? config.source_mappings[source] : undefined;
  const mapped = state(hass, mapping?.entity);
  const preferredTransport = state(hass, config.entities.transport);
  const preferredMetadata = state(hass, config.entities.metadata);
  const related = (config.entities.related ?? []).map((id) => state(hass, id)).filter((value): value is HassEntity => Boolean(value));
  let active: HassEntity | undefined;
  let reason = 'primary-fallback';
  if (mapping) {
    active = mapped;
    reason = usable(mapped) ? `explicit-source-mapping:${source}` : `explicit-source-mapping-unavailable:${source}`;
  } else if (usable(primary) && ['playing', 'paused'].includes(primary.state)) {
    active = primary;
    reason = 'primary-playback';
  } else {
    const candidates = [preferredTransport, preferredMetadata, ...related].filter((value): value is HassEntity => Boolean(value));
    const playing = candidates.find((candidate) => usable(candidate) && candidate.state === 'playing');
    const paused = candidates.find((candidate) => usable(candidate) && candidate.state === 'paused');
    if (playing ?? paused) {
      active = playing ?? paused;
      reason = 'active-playback';
    } else if (usable(preferredTransport)) {
      active = preferredTransport;
      reason = 'preferred-transport';
    } else active = primary;
  }
  const metadata = boundCompanion(active, preferredMetadata, registry, Boolean(mapping)) ?? active ?? primary;
  const transport = boundCompanion(active, preferredTransport, registry, Boolean(mapping)) ?? active ?? primary;
  const mappedRemote = state(hass, mapping?.remote);
  const configuredRemote = state(hass, config.entities.remote);
  const configuredRemoteAllowed = mapping ? sameDevice(active, configuredRemote, registry) : sameDeviceOrUnknown(active, configuredRemote, registry);
  const remote = usable(mappedRemote) ? mappedRemote : usable(configuredRemote) && configuredRemoteAllowed ? configuredRemote : undefined;
  const mappedAudio = state(hass, mapping?.audio_entity);
  const configuredAudio = state(hass, config.entities.audio);
  const audio = usable(mappedAudio) ? mappedAudio : usable(configuredAudio) ? configuredAudio : usable(active) ? active : undefined;
  const platformOverride = mapping?.platform ?? config.platform;
  const activeContext = context(active, remote, registry);
  const adapter = selectPlatformAdapter(activeContext, platformOverride);
  const transportCapabilities = capabilitiesFor(transport, undefined, registry, platformOverride);
  const audioCapabilities = capabilitiesFor(audio, undefined, registry);
  const remoteCapabilities = adapter.capabilities(activeContext);
  const primaryCapabilities = capabilitiesFor(primary, undefined, registry);
  const capabilities: MediaCapabilities = {
    power: Boolean(power || config.power_actions.on || config.power_actions.off),
    sourceSelect: primaryCapabilities.sourceSelect,
    playPause: transportCapabilities.playPause,
    stop: transportCapabilities.stop,
    next: transportCapabilities.next,
    previous: transportCapabilities.previous,
    seek: transportCapabilities.seek,
    volumeSet: audioCapabilities.volumeSet,
    volumeStep: audioCapabilities.volumeStep,
    mute: audioCapabilities.mute,
    remoteNavigation: remoteCapabilities.remoteNavigation,
    textEntry: remoteCapabilities.textEntry,
  };
  return { primary, power, powerActions: config.power_actions, active, metadata, transport, remote, audio, source, state: mediaState(mapping && !usable(mapped) ? mapped : (active ?? primary)), adapter, adapterContext: activeContext, capabilities, reason, mappedLabel: mapping?.label };
}
