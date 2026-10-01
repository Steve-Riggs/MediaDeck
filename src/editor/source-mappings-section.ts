import { html, type TemplateResult } from 'lit';
import type { MediaDeckConfig, SourceMapping } from '../config/types';
import type { HomeAssistant } from '../types/home-assistant';

export function setSourceMapping(
  config: MediaDeckConfig,
  source: string,
  mapping: SourceMapping,
): MediaDeckConfig {
  return {
    ...config,
    source_mappings: { ...(config.source_mappings ?? {}), [source]: { ...mapping } },
  };
}

export function removeSourceMapping(config: MediaDeckConfig, source: string): MediaDeckConfig {
  const mappings = { ...(config.source_mappings ?? {}) };
  delete mappings[source];
  return { ...config, source_mappings: mappings };
}

export function renderSourceMappingsSection(
  hass: HomeAssistant,
  config: MediaDeckConfig,
  replace: (config: MediaDeckConfig) => void,
): TemplateResult {
  const primary = hass.states[config.entity];
  const sources = Array.isArray(primary?.attributes.source_list)
    ? (primary.attributes.source_list as string[])
    : [];
  const media = Object.values(hass.states).filter((entity) =>
    entity.entity_id.startsWith('media_player.'),
  );
  const remotes = Object.values(hass.states).filter((entity) =>
    entity.entity_id.startsWith('remote.'),
  );

  return html`<section>
    <h3>Source mappings</h3>
    <p class="hint">Explicit mappings always take priority over activity detection.</p>
    ${sources.length
      ? sources.map((source) => {
          const mapping = config.source_mappings?.[source];
          return html`<div class="mapping-row">
            <strong>${source}</strong>
            <select
              aria-label=${`${source} playback entity`}
              .value=${mapping?.entity ?? ''}
              @change=${(event: Event) => {
                const entity = (event.target as HTMLSelectElement).value;
                if (!entity) replace(removeSourceMapping(config, source));
                else replace(setSourceMapping(config, source, { ...(mapping ?? {}), entity }));
              }}
            >
              <option value="">Automatic</option>
              ${media.map(
                (entity) => html`<option value=${entity.entity_id}>
                  ${entity.attributes.friendly_name ?? entity.entity_id}
                </option>`,
              )}
            </select>
            <select
              aria-label=${`${source} remote entity`}
              .value=${mapping?.remote ?? ''}
              @change=${(event: Event) => {
                if (!mapping?.entity) return;
                const remote = (event.target as HTMLSelectElement).value || undefined;
                replace(setSourceMapping(config, source, { ...mapping, remote }));
              }}
            >
              <option value="">Default remote</option>
              ${remotes.map(
                (entity) => html`<option value=${entity.entity_id}>
                  ${entity.attributes.friendly_name ?? entity.entity_id}
                </option>`,
              )}
            </select>
            ${mapping
              ? html`<input
                    aria-label=${`${source} friendly label`}
                    placeholder="Friendly label"
                    .value=${mapping.label ?? ''}
                    @change=${(event: Event) =>
                      replace(
                        setSourceMapping(config, source, {
                          ...mapping,
                          label: (event.target as HTMLInputElement).value || undefined,
                        }),
                      )}
                  />
                  <button @click=${() => replace(removeSourceMapping(config, source))}>Clear</button>`
              : ''}
          </div>`;
        })
      : html`<p class="hint">No source list is currently exposed by the primary entity.</p>`}
  </section>`;
}
