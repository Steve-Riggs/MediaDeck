import { html } from 'lit';
import type { MediaDeckConfig } from '../config/types';
import type { ArtworkSettings } from '../artwork/lookup';
export function renderArtworkSection(
  config: MediaDeckConfig,
  replace: (config: MediaDeckConfig) => void,
) {
  const settings = config.artwork ?? {};
  const provider = settings.provider ?? 'home-assistant';
  const update = (next: Partial<ArtworkSettings>) =>
    replace({ ...config, artwork: { ...settings, ...next } });
  const key = (label: string, field: 'tmdb_api_key' | 'fanart_api_key' | 'fanart_client_key') =>
    html`<label
      >${label}<input
        type="password"
        autocomplete="off"
        .value=${settings[field] ?? ''}
        @change=${(e: Event) =>
          update({ [field]: (e.target as HTMLInputElement).value.trim() || undefined })}
    /></label>`;
  return html`<section>
    <h3>Artwork</h3>
    <label
      >Artwork source<select
        aria-label="Artwork source"
        @change=${(e: Event) =>
          update({
            provider: (e.target as HTMLSelectElement).value as ArtworkSettings['provider'],
          })}
      >
        ${[
          ['home-assistant', 'Home Assistant'],
          ['tmdb', 'TMDB'],
          ['fanart', 'Fanart.tv'],
        ].map(
          ([value, name]) =>
            html`<option value=${value} ?selected=${provider === value}>${name}</option>`,
        )}
      </select></label
    >
    ${provider !== 'home-assistant'
      ? html` <p class="hint">
            Lookups need a film or series title or content ID. App names alone cannot identify what
            is playing.
          </p>
          ${key('TMDB API key (title matching)', 'tmdb_api_key')}
          ${provider === 'fanart'
            ? html`${key('Fanart.tv project API key', 'fanart_api_key')}${key(
                'Fanart.tv personal key (optional)',
                'fanart_client_key',
              )}`
            : ''}
          <label
            >Image style<select
              @change=${(e: Event) =>
                update({
                  image_type: (e.target as HTMLSelectElement)
                    .value as ArtworkSettings['image_type'],
                })}
            >
              ${[
                ['poster', 'Poster'],
                ['backdrop', 'Background / landscape'],
              ].map(
                ([value, name]) =>
                  html`<option
                    value=${value}
                    ?selected=${(settings.image_type ?? 'poster') === value}
                  >
                    ${name}
                  </option>`,
              )}
            </select></label
          >
          <label
            ><input
              type="checkbox"
              .checked=${settings.fallback !== false}
              @change=${(e: Event) => update({ fallback: (e.target as HTMLInputElement).checked })}
            />Fall back to Home Assistant artwork</label
          >
          <p class="hint">
            API keys are stored in dashboard configuration and are visible to users with access to
            it. Selected lookup services receive the title or content ID.
          </p>
          <p class="hint">
            ${provider === 'fanart'
              ? html`Get keys from
                  <a
                    href="https://fanart.tv/get-an-api-key/"
                    target="_blank"
                    rel="noopener noreferrer"
                    >Fanart.tv</a
                  >. `
              : ''}Get
            a title-matching key from
            <a
              href="https://www.themoviedb.org/settings/api"
              target="_blank"
              rel="noopener noreferrer"
              >TMDB</a
            >.
          </p>`
      : ''}
  </section>`;
}
export function renderAppNamesSection(
  config: MediaDeckConfig,
  replace: (config: MediaDeckConfig) => void,
) {
  const names = config.app_names ?? {};
  return html`<section>
    <h3>App names</h3>
    <p class="hint">Common apps have built-in friendly names. Add overrides for other apps.</p>
    ${Object.entries(names).map(
      ([id, name]) =>
        html`<div class="action-row">
          <input
            aria-label="App package ID"
            placeholder="com.example.app"
            .value=${id}
            @change=${(e: Event) => {
              const next = { ...names };
              delete next[id];
              next[(e.target as HTMLInputElement).value.trim()] = name;
              replace({ ...config, app_names: next });
            }}
          /><input
            aria-label="App display name"
            placeholder="App name"
            .value=${name}
            @change=${(e: Event) =>
              replace({
                ...config,
                app_names: { ...names, [id]: (e.target as HTMLInputElement).value },
              })}
          /><button
            @click=${() => {
              const next = { ...names };
              delete next[id];
              replace({ ...config, app_names: next });
            }}
          >
            Remove
          </button>
        </div>`,
    )}
    <button @click=${() => replace({ ...config, app_names: { ...names, '': '' } })}>
      Add app name
    </button>
  </section>`;
}
