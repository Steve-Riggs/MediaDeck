import { html, type TemplateResult } from 'lit';
import type { MediaDeckConfig } from '../config/types';
import type { HomeAssistant, HassEntity } from '../types/home-assistant';

export function renderEntitySection(
  hass: HomeAssistant,
  config: MediaDeckConfig,
  replace: (config: MediaDeckConfig) => void,
): TemplateResult {
  const media = Object.values(hass.states).filter((entity) =>
    entity.entity_id.startsWith('media_player.'),
  );
  const remotes = Object.values(hass.states).filter((entity) =>
    entity.entity_id.startsWith('remote.'),
  );
  const roles = config.entities ?? {};
  const select = (
    label: string,
    value: string | undefined,
    entities: HassEntity[],
    onChange: (value: string) => void,
  ) =>
    html`<label
      >${label}<select
        .value=${value ?? ''}
        @change=${(event: Event) => onChange((event.target as HTMLSelectElement).value)}
      >
        <option value="">None</option>
        ${entities.map(
          (entity) =>
            html`<option value=${entity.entity_id}>
              ${entity.attributes.friendly_name ?? entity.entity_id}
            </option>`,
        )}
      </select></label
    >`;

  return html`<section>
    <h3>Devices</h3>
    ${select('Primary media entity', config.entity, media, (entity) =>
      replace({ ...config, entity }),
    )}
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
                .selected=${roles.related?.includes(entity.entity_id) ?? false}
              >
                ${entity.attributes.friendly_name ?? entity.entity_id}
              </option>`,
          )}
      </select>
    </label>
  </section>`;
}
