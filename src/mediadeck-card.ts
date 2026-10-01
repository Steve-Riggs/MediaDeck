import { LitElement, html, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
import type { HomeAssistant } from './types/home-assistant';
import type { MediaDeckConfig, NormalizedMediaDeckConfig, RegionName } from './config/types';
import { normalizeConfig } from './config/defaults';
import { validateConfig } from './config/validate';
import { resolveMediaSession } from './session/resolve-session';
import { executeIntent } from './actions/router';
import type { MediaIntent } from './actions/types';
import { renderNowPlaying } from './ui/now-playing';
import { renderTransportControls } from './ui/transport-controls';
import { renderRemoteControls } from './ui/remote-controls';
import { renderSourceSelector } from './ui/source-selector';
import { renderAudioControls } from './ui/audio-controls';
import { renderWatchActions } from './ui/watch-actions';
import { renderDeviceInspector } from './ui/device-inspector';
import { cardStyles } from './styles/card-styles';

export class MediaDeckCard extends LitElement {
  static styles = cardStyles;

  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private config?: NormalizedMediaDeckConfig;
  @state() private actionError?: string;

  setConfig(config: MediaDeckConfig) {
    const validation = validateConfig(config);
    if (!validation.valid) throw new Error(validation.errors.join(' '));
    this.config = normalizeConfig(config);
  }

  getCardSize() {
    return this.config?.appearance.density === 'compact' ? 5 : 7;
  }

  getGridOptions() {
    return {
      columns: 12,
      rows: this.config?.appearance.density === 'compact' ? 5 : 7,
      min_columns: 4,
      min_rows: 3,
    };
  }

  static async getConfigElement() {
    await import('./mediadeck-editor');
    return document.createElement('mediadeck-editor');
  }

  static getStubConfig(): MediaDeckConfig {
    return { type: 'custom:mediadeck-card', entity: '' };
  }

  static async getEntitySuggestion(hass: HomeAssistant, entityId: string) {
    if (!entityId.startsWith('media_player.') || !hass.states[entityId]) return undefined;
    return { type: 'custom:mediadeck-card' as const, entity: entityId };
  }

  private async run(intent: MediaIntent) {
    if (!this.hass || !this.config) return;
    const result = await executeIntent(
      this.hass,
      resolveMediaSession(this.hass, this.config),
      intent,
    );
    this.actionError = result.ok ? undefined : (result.message ?? 'Media action failed.');
  }

  private section(region: RegionName, session: ReturnType<typeof resolveMediaSession>) {
    if (!this.config?.regions[region]) return nothing;
    switch (region) {
      case 'now_playing':
        return renderNowPlaying(session, this.config);
      case 'transport':
        return renderTransportControls(session, (intent) => void this.run(intent));
      case 'remote':
        return renderRemoteControls(session, (intent) => void this.run(intent));
      case 'sources':
        return renderSourceSelector(session, (intent) => void this.run(intent));
      case 'audio':
        return renderAudioControls(session, (intent) => void this.run(intent));
      case 'watch_actions':
        return renderWatchActions(this.config, (intent) => void this.run(intent));
      case 'inspector':
        return renderDeviceInspector(session);
    }
  }

  protected render() {
    if (!this.config) return html`<div class="card notice">Configure MediaDeck to begin.</div>`;
    if (!this.hass) return html`<div class="card notice">Loading Home Assistant…</div>`;

    const primary = this.hass.states[this.config.entity];
    if (!primary) {
      return html`<div class="card notice">
        Media entity ${this.config.entity || '(not selected)'} was not found.
      </div>`;
    }

    const session = resolveMediaSession(this.hass, this.config);
    const appearance = this.config.appearance;
    const style = [
      `--mediadeck-min-height:${appearance.min_height}px`,
      `--mediadeck-radius:${appearance.border_radius}px`,
      `--mediadeck-artwork:${appearance.artwork_size}px`,
      `--mediadeck-art-fit:${appearance.artwork_fit}`,
      `--mediadeck-background:${appearance.background}`,
      `--mediadeck-text:${appearance.text_color}`,
      `--mediadeck-accent:${appearance.accent_color}`,
      `--mediadeck-button:${appearance.button_background}`,
      `--mediadeck-button-opacity:${appearance.button_opacity}`,
      `--mediadeck-icon-size:${appearance.icon_size}px`,
      `--mediadeck-font-scale:${appearance.font_scale}`,
      `--mediadeck-gap:${appearance.gap}px`,
      `opacity:${appearance.opacity}`,
    ].join(';');
    const primaryRegions: RegionName[] = ['now_playing', 'transport'];

    return html`<article class="card" style=${style}>
      <header class="header">
        <h1>${this.config.title ?? primary.attributes.friendly_name ?? 'MediaDeck'}</h1>
        <div>
          <span class="status">${session.adapter.name}</span>
          <button @click=${() => void this.run({ kind: 'power', on: primary.state === 'off' })}>
            ⏻
          </button>
        </div>
      </header>
      <div class="card-body">
        <div>
          ${this.config.section_order
            .filter((region) => primaryRegions.includes(region))
            .map((region) => this.section(region, session))}
        </div>
        <div>
          ${this.config.section_order
            .filter((region) => !primaryRegions.includes(region))
            .map((region) => this.section(region, session))}
        </div>
      </div>
      ${this.actionError
        ? html`<div class="error" role="status">${this.actionError}</div>`
        : nothing}
    </article>`;
  }
}