import { html, type TemplateResult } from 'lit';
import type { HomeAssistant } from '../types/home-assistant';
import type { MediaDeckConfig } from '../config/types';
import type { EntityRegistryMap } from '../registry/entity-registry';
import { normalizeConfig } from '../config/defaults';
import { discoverMediaRelationships, type DiscoverySuggestion } from '../discovery/discover';

export function applyDiscoverySuggestion(
  config: MediaDeckConfig,
  suggestion: DiscoverySuggestion,
): MediaDeckConfig {
  if (suggestion.kind === 'remote')
    return { ...config, entities: { ...(config.entities ?? {}), remote: suggestion.entity } };
  if (suggestion.kind === 'audio')
    return { ...config, entities: { ...(config.entities ?? {}), audio: suggestion.entity } };
  if (suggestion.kind === 'media-player')
    return {
      ...config,
      entities: {
        ...(config.entities ?? {}),
        related: [...new Set([...(config.entities?.related ?? []), suggestion.entity])],
      },
    };
  if (suggestion.kind === 'source-mapping' && suggestion.source)
    return {
      ...config,
      source_mappings: {
        ...(config.source_mappings ?? {}),
        [suggestion.source]: { entity: suggestion.entity },
      },
    };
  return config;
}

export function renderDiscoverySection(
  hass: HomeAssistant,
  config: MediaDeckConfig,
  replace: (config: MediaDeckConfig) => void,
  registry: EntityRegistryMap = {},
): TemplateResult {
  if (!config.entity || !hass.states[config.entity])
    return html`<section>
      <h3>Discovery</h3>
      <p>Select a primary media player first.</p>
    </section>`;
  const suggestions = discoverMediaRelationships(hass, normalizeConfig(config), registry);
  return html`<section>
    <h3>Discovery</h3>
    <p>Suggestions only apply after you accept them.</p>
    ${suggestions.map(
      (suggestion) =>
        html`<div class="suggestion">
          <div>
            <strong>${suggestion.entity}</strong
            ><small>${Math.round(suggestion.confidence * 100)}% · ${suggestion.explanation}</small>
          </div>
          <button @click=${() => replace(applyDiscoverySuggestion(config, suggestion))}>
            Accept
          </button>
        </div>`,
    )}
  </section>`;
}
