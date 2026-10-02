import { html, type TemplateResult } from 'lit';
import type { MediaDeckConfig } from '../config/types';
import type { PlatformId } from '../platforms/types';
import type { HomeAssistant, HassEntity } from '../types/home-assistant';
import {
  entityOptionLabel,
  uniqueEntities,
  type EntityRegistryMap,
} from '../registry/entity-registry';

const PLATFORM_OPTIONS: Array<[PlatformId | '', string]> = [
  ['', 'Automatic'],
  ['generic', 'Generic media player'],
  ['android-tv', 'Android / Google TV'],
  ['apple-tv', 'Apple TV'],
  ['samsung-tv', 'Samsung TV'],
  ['lg-webos', 'LG webOS'],
];

export function renderEntitySection(
  hass: HomeAssistant,
  config: MediaDeckConfig,
  replace: (config: MediaDeckConfig) => void,
  registry: EntityRegistryMap = {},
): TemplateResult {
  const media = uniqueEntities(
    Object.values(hass.states).filter((entity) => entity.entity_id.startsWith('media_player.')),
  );
  const remotes = uniqueEntities(
    Object.values(hass.states).filter((entity) => entity.entity_id.startsWith('remote.')),
  );
  const powerEntities = uniqueEntities([...media, ...remotes]);
  const roles = config.entities ?? {};
  const select = (
    label: string,
    value: string | undefined,
    entities: HassEntity[],
    onChange: (value: string) => void,
  ) =>
    html`<label
      >${label}<select
        @change=${(event: Event) => onChange((event.target as HTMLSelectElement).value)}
      >
        <option value="" ?selected=${!value}>None</option>
        ${entities.map(
          (entity) =>
            html`<option value=${entity.entity_id} ?selected=${value === entity.entity_id}>
              ${entityOptionLabel(hass, entity, registry)}
            </option>`,
        )}
      </select></label
    >`;

  return html`<section>
    <h3>Devices</h3>
    ${select('Primary media entity', config.entity, media, (entity) =>
      replace({ ...config, entity }),
    )}
    <label
      >Platform
      <select
        @change=${(event: Event) => {
          const platform = (event.target as HTMLSelectElement).value as PlatformId | '';
          replace({ ...config, platform: platform || undefined });
        }}
      >
        ${PLATFORM_OPTIONS.map(
          ([value, label]) =>
            html`<option value=${value} ?selected=${(config.platform ?? '') === value}>
              ${label}
            </option>`,
        )}
      </select>
    </label>
    ${select('Power entity', roles.power, powerEntities, (power) =>
      replace({ ...config, entities: { ...roles, power: power || undefined } }),
    )}
    <p class="hint">
      Optional. Choose the media player or remote that can reliably turn the system on and off.
    </p>
    ${select('Metadata entity', roles.metadata, media, (metadata) =>
      replace({ ...config, entities: { ...roles, metadata: metadata || undefined } }),
    )}
    ${select('Transport entity', roles.transport, media, (transport) =>
      replace({ ...config, entities: { ...roles, transport: transport || undefined } }),
    )}
    ${select('Remote entity', roles.remote, remotes, (remote) =>
      replace({ ...config, entities: { ...roles, remote: remote || undefined } }),
    )}
    ${select('Audio / AVR entity', roles.audio, media, (audio) =>
      replace({ ...config, entities: { ...roles, audio: audio || undefined } }),
    )}
    <label
      >Related media players
      <select
        multiple
        @change=${(event: Event) => {
          const related = Array.from((event.target as HTMLSelectElement).selectedOptions).map(
            (option) => option.value,
          );
          replace({ ...config, entities: { ...roles, related } });
        }}
      >
        ${media
          .filter((entity) => entity.entity_id !== config.entity)
          .map(
            (entity) =>
              html`<option
                value=${entity.entity_id}
                ?selected=${roles.related?.includes(entity.entity_id) ?? false}
              >
                ${entityOptionLabel(hass, entity, registry)}
              </option>`,
          )}
      </select>
    </label>
  </section>`;
}
