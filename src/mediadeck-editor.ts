import { LitElement, css, html, type PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import type { HomeAssistant } from './types/home-assistant';
import type { MediaDeckConfig } from './config/types';
import { validateConfig } from './config/validate';
import { isEditorBootstrapConfig } from './config/bootstrap';
import { loadEntityRegistry, type EntityRegistryMap } from './registry/entity-registry';
import { renderEntitySection } from './editor/entity-section';
import { renderSourceMappingsSection } from './editor/source-mappings-section';
import { renderLayoutSection } from './editor/layout-section';
import { renderActionsSection } from './editor/actions-section';
import { renderAppearanceSection } from './editor/appearance-section';
import { renderDiscoverySection } from './editor/discovery-section';
import { renderArtworkSection, renderAppNamesSection } from './editor/artwork-section';

export class MediaDeckEditor extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
    section {
      padding: 14px;
      border: 1px solid var(--divider-color, #ddd);
      border-radius: 14px;
      margin-bottom: 12px;
    }
    h3 {
      margin: 0 0 10px;
    }
    label {
      display: grid;
      gap: 5px;
      margin: 8px 0;
    }
    input,
    select,
    button {
      min-height: 40px;
      border-radius: 10px;
      border: 1px solid var(--divider-color, #ddd);
      background: var(--secondary-background-color, #f4f4f4);
      color: inherit;
      padding: 0 10px;
      box-sizing: border-box;
    }
    select[multiple] {
      min-height: 110px;
      padding: 6px;
    }
    button {
      cursor: pointer;
    }
    .hint {
      opacity: 0.7;
      font-size: 0.82rem;
    }
    .config-error {
      border-color: var(--error-color, #db4437);
    }
    .config-error ul {
      margin-bottom: 0;
    }
    .config-incomplete {
      border-color: var(--warning-color, var(--primary-color));
    }
    .config-incomplete p {
      margin-bottom: 0;
    }
    .suggestion,
    .mapping-row,
    .action-row,
    .layout-row {
      display: grid;
      gap: 8px;
      align-items: center;
      margin: 8px 0;
    }
    .suggestion {
      grid-template-columns: 1fr auto;
    }
    .suggestion small {
      display: block;
      opacity: 0.65;
    }
    .mapping-row {
      grid-template-columns: minmax(90px, 0.5fr) 1.4fr 1.2fr 1fr 1fr auto;
    }
    .action-row {
      grid-template-columns: 1fr 1.4fr auto;
    }
    .layout-row {
      grid-template-columns: 1fr auto auto;
    }
    .layout-row label {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      text-transform: capitalize;
    }
    .two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .colour-row {
      display: grid;
      grid-template-columns: 48px minmax(0, 1fr) auto;
      gap: 8px;
    }
    .colour-row input[type='color'] {
      width: 48px;
      padding: 3px;
    }
    .preset-row {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    input[type='range'] {
      width: 100%;
      padding: 0;
      accent-color: var(--primary-color);
    }
    input[type='checkbox'] {
      min-height: auto;
    }
    summary {
      cursor: pointer;
      margin: 10px 0;
    }
    @media (max-width: 760px) {
      .mapping-row,
      .action-row,
      .two-col {
        grid-template-columns: 1fr;
      }
    }
  `;

  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private config: MediaDeckConfig = { type: 'custom:mediadeck-card', entity: '' };
  @state() private registry: EntityRegistryMap = {};
  private registrySource?: HomeAssistant;
  private editableInvalidConfig = false;

  protected willUpdate(changed: PropertyValues<this>) {
    if (changed.has('hass') && this.hass && this.registrySource !== this.hass) {
      const source = this.hass;
      this.registrySource = source;
      void loadEntityRegistry(source).then((registry) => {
        if (this.registrySource === source) this.registry = registry;
      });
    }
  }

  setConfig(config: MediaDeckConfig) {
    this.config = { ...config };
    this.editableInvalidConfig = false;
  }

  private replace(config: MediaDeckConfig) {
    this.config = config;
    const validation = validateConfig(config);
    this.editableInvalidConfig = !validation.valid && !isEditorBootstrapConfig(config, validation);
    // Keep incomplete form input local so the preview and saved config stay valid.
    if (this.editableInvalidConfig) return;
    this.dispatchEvent(
      new CustomEvent('config-changed', {
        detail: { config },
        bubbles: true,
        composed: true,
      }),
    );
  }

  protected render() {
    if (!this.hass) return html`<p>Loading Home Assistant…</p>`;
    const validation = validateConfig(this.config);
    const bootstrap = isEditorBootstrapConfig(this.config, validation);
    const errors =
      !validation.valid && !bootstrap
        ? html`<section class="config-error" role="alert">
            <h3>MediaDeck configuration error</h3>
            <ul>
              ${validation.errors.map((error) => html`<li>${error}</li>`)}
            </ul>
          </section>`
        : html``;
    if (!validation.valid && !bootstrap && !this.editableInvalidConfig) return errors;

    const replace = (config: MediaDeckConfig) => this.replace(config);
    if (bootstrap) {
      return html`
        <section class="config-incomplete">
          <h3>Choose a primary media entity</h3>
          <p>Select the TV or media player that anchors this MediaDeck setup.</p>
        </section>
        ${renderEntitySection(this.hass, this.config, replace, this.registry)}
      `;
    }

    return html`
      ${errors} ${renderEntitySection(this.hass, this.config, replace, this.registry)}
      ${renderSourceMappingsSection(this.hass, this.config, replace, this.registry)}
      ${renderLayoutSection(this.config, replace)} ${renderActionsSection(this.config, replace)}
      ${renderAppearanceSection(this.config, replace)} ${renderArtworkSection(this.config, replace)}
      ${renderAppNamesSection(this.config, replace)}
      ${renderDiscoverySection(this.hass, this.config, replace, this.registry)}
    `;
  }
}

if (!customElements.get('mediadeck-editor')) {
  customElements.define('mediadeck-editor', MediaDeckEditor);
}
