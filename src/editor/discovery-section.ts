import { html, type TemplateResult } from 'lit';
import type { HomeAssistant } from '../types/home-assistant';
import type { MediaDeckConfig } from '../config/types';
import { normalizeConfig } from '../config/defaults';
import { discoverMediaRelationships, type DiscoverySuggestion } from '../discovery/discover';
export function applyDiscoverySuggestion(
  c: MediaDeckConfig,
  s: DiscoverySuggestion,
): MediaDeckConfig {
  if (s.kind === 'remote') return { ...c, entities: { ...(c.entities ?? {}), remote: s.entity } };
  if (s.kind === 'audio') return { ...c, entities: { ...(c.entities ?? {}), audio: s.entity } };
  if (s.kind === 'media-player')
    return {
      ...c,
      entities: {
        ...(c.entities ?? {}),
        related: [...new Set([...(c.entities?.related ?? []), s.entity])],
      },
    };
  if (s.kind === 'source-mapping' && s.source)
    return {
      ...c,
      source_mappings: { ...(c.source_mappings ?? {}), [s.source]: { entity: s.entity } },
    };
  return c;
}
export function renderDiscoverySection(
  h: HomeAssistant,
  c: MediaDeckConfig,
  replace: (c: MediaDeckConfig) => void,
): TemplateResult {
  if (!c.entity || !h.states[c.entity])
    return html`<section>
      <h3>Discovery</h3>
      <p>Select a primary media player first.</p>
    </section>`;
  const s = discoverMediaRelationships(h, normalizeConfig(c));
  return html`<section>
    <h3>Discovery</h3>
    <p>Suggestions only apply after you accept them.</p>
    ${s.map(
      (i) =>
        html`<div class="suggestion">
          <div>
            <strong>${i.entity}</strong
            ><small>${Math.round(i.confidence * 100)}% · ${i.explanation}</small>
          </div>
          <button @click=${() => replace(applyDiscoverySuggestion(c, i))}>Accept</button>
        </div>`,
    )}
  </section>`;
}
