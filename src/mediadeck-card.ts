import { LitElement, html, nothing, type PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import type { HomeAssistant } from './types/home-assistant';
import type { MediaDeckConfig, NormalizedMediaDeckConfig, RegionName } from './config/types';
import { normalizeConfig } from './config/defaults';
import { validateConfig } from './config/validate';
import { isEditorBootstrapConfig } from './config/bootstrap';
import { resolveMediaSession } from './session/resolve-session';
import { executeIntent } from './actions/router';
import type { MediaIntent } from './actions/types';
import { loadEntityRegistry, type EntityRegistryMap } from './registry/entity-registry';
import { renderNowPlaying } from './ui/now-playing';
import { renderTransportControls } from './ui/transport-controls';
import { renderRemoteControls } from './ui/remote-controls';
import { renderSourceSelector } from './ui/source-selector';
import { renderAudioControls } from './ui/audio-controls';
import { renderWatchActions } from './ui/watch-actions';
import { renderDeviceInspector } from './ui/device-inspector';
import { cardStyles } from './styles/card-styles';
import { ArtworkLookup, type ArtworkResult } from './artwork/lookup';
import { getArtworkMedia } from './artwork/media';

export class MediaDeckCard extends LitElement {
  static styles = cardStyles;

  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private config?: NormalizedMediaDeckConfig;
  @state() private actionError?: string;
  @state() private registry: EntityRegistryMap = {};
  @state() private volumeDraft?: number;
  private registrySource?: HomeAssistant;
  private progressTimer?: number;
  private artworkLookup = new ArtworkLookup();
  private artworkSignature = '';
  @state() private artworkResult?: ArtworkResult;
  @state() private failedArtwork = new Set<string>();

  connectedCallback() {
    super.connectedCallback();
    this.progressTimer = window.setInterval(() => this.requestUpdate(), 1000);
  }

  disconnectedCallback() {
    if (this.progressTimer !== undefined) window.clearInterval(this.progressTimer);
    this.progressTimer = undefined;
    this.artworkSignature = '';
    super.disconnectedCallback();
  }

  private updateArtwork() {
    if (!this.hass || !this.config || !this.isConnected) return;
    const session = resolveMediaSession(this.hass, this.config, this.registry);
    const media = getArtworkMedia(session.metadata ?? session.active ?? session.primary);
    const settings = this.config.artwork ?? {};
    const enabled =
      this.config.regions.now_playing &&
      settings.provider &&
      settings.provider !== 'home-assistant';
    const signature = JSON.stringify([enabled, media, settings, Math.floor(Date.now() / 300000)]);
    if (signature === this.artworkSignature) return;
    this.artworkSignature = signature;
    this.failedArtwork = new Set();
    this.artworkResult = enabled
      ? {
          message: media
            ? 'Looking up artwork…'
            : 'No film or series title is available for artwork lookup.',
        }
      : undefined;
    if (enabled && media)
      void this.artworkLookup.lookup(media, settings).then((result) => {
        if (this.isConnected && this.artworkSignature === signature) this.artworkResult = result;
      });
  }

  protected willUpdate(changed: PropertyValues<this>) {
    if (changed.has('hass') && this.hass && this.registrySource !== this.hass) {
      const source = this.hass;
      this.registrySource = source;
      void loadEntityRegistry(source).then((registry) => {
        if (this.registrySource === source) this.registry = registry;
      });
    }
    this.updateArtwork();
  }

  setConfig(config: MediaDeckConfig) {
    const validation = validateConfig(config);
    if (!validation.valid && !isEditorBootstrapConfig(config, validation)) {
      throw new Error(validation.errors.join(' '));
    }
    this.config = normalizeConfig(config);
  }

  getCardSize() {
    return this.config?.appearance.density === 'compact'
      ? 5
      : this.config?.appearance.density === 'expanded'
        ? 9
        : 7;
  }

  getGridOptions() {
    return {
      columns: 12,
      min_columns: 4,
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
    const configuredAction =
      intent.kind === 'custom'
        ? intent.action
        : intent.kind === 'power'
          ? this.config.power_actions[intent.on ? 'on' : 'off']
          : undefined;
    if (configuredAction?.confirmation && !window.confirm(configuredAction.confirmation)) return;

    const result = await executeIntent(
      this.hass,
      resolveMediaSession(this.hass, this.config, this.registry),
      intent,
    );
    this.actionError = result.ok ? undefined : (result.message ?? 'Media action failed.');
  }

  private section(region: RegionName, session: ReturnType<typeof resolveMediaSession>) {
    if (!this.config?.regions[region]) return nothing;
    switch (region) {
      case 'now_playing':
        return renderNowPlaying(
          session,
          this.config,
          (intent) => void this.run(intent),
          this.artworkResult,
          this.failedArtwork,
          (url) => {
            this.failedArtwork = new Set([...this.failedArtwork, url]);
          },
        );
      case 'transport':
        return renderTransportControls(session, (intent) => void this.run(intent));
      case 'remote':
        return renderRemoteControls(session, (intent) => void this.run(intent));
      case 'sources':
        return renderSourceSelector(
          session,
          (intent) => void this.run(intent),
          this.config.app_names,
        );
      case 'audio':
        return renderAudioControls(
          session,
          (intent) => void this.run(intent),
          this.volumeDraft,
          (value) => {
            this.volumeDraft = value;
          },
        );
      case 'watch_actions':
        return renderWatchActions(this.config, (intent) => void this.run(intent));
      case 'inspector':
        return renderDeviceInspector(session);
    }
  }

  protected render() {
    if (!this.config) return html`<div class="card notice">Configure MediaDeck to begin.</div>`;
    if (!this.hass) return html`<div class="card notice">Loading Home Assistant…</div>`;
    if (!this.config.entity) {
      return html`<div class="card notice">
        Select a primary media entity to configure MediaDeck.
      </div>`;
    }

    const primary = this.hass.states[this.config.entity];
    if (!primary) {
      return html`<div class="card notice">Media entity ${this.config.entity} was not found.</div>`;
    }

    const session = resolveMediaSession(this.hass, this.config, this.registry);
    const appearance = this.config.appearance;
    const powerState = session.power?.state;
    const turnPowerOn = !powerState || ['off', 'unknown', 'unavailable'].includes(powerState);
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

    return html`<article class=${`card density-${appearance.density}`} style=${style}>
      <header class="header">
        <h1>${this.config.title ?? primary.attributes.friendly_name ?? 'MediaDeck'}</h1>
        <div>
          <span class="status">${session.adapter.name}</span>
          <button
            aria-label=${turnPowerOn ? 'Turn on' : 'Turn off'}
            @click=${() => void this.run({ kind: 'power', on: turnPowerOn })}
          >
            ⏻
          </button>
        </div>
      </header>
      <div class="card-body">
        ${this.config.section_order.map((region) => {
          const content = this.section(region, session);
          return content === nothing
            ? nothing
            : html`<div class=${`region region-${region}`}>${content}</div>`;
        })}
      </div>
      ${this.actionError
        ? html`<div class="error" role="status">${this.actionError}</div>`
        : nothing}
    </article>`;
  }
}
