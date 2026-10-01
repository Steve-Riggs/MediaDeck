import { LitElement, css, html } from 'lit';
import { property, state } from 'lit/decorators.js';
import type { HomeAssistant } from './types/home-assistant';
import type { MediaDeckConfig } from './config/types';
import { renderEntitySection } from './editor/entity-section';
import { renderSourceMappingsSection } from './editor/source-mappings-section';
import { renderLayoutSection } from './editor/layout-section';
import { renderActionsSection } from './editor/actions-section';
import { renderAppearanceSection } from './editor/appearance-section';
import { renderDiscoverySection } from './editor/discovery-section';

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
      grid-template-columns: minmax(90px, 0.6fr) 1fr 1fr 1fr auto;
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
    @media (max-width: 620px) {
      .mapping-row,
      .action-row,
      .two-col {
        grid-template-columns: 1fr;
      }
    }
  `;

  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private config: MediaDeckConfig = { type: 'custom:mediadeck-card', entity: '' };

  setConfig(config: MediaDeckConfig) {
    this.config = { ...config };
  }

  private replace(config: MediaDeckConfig) {
    this.config = config;
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
    const replace = (config: MediaDeckConfig) => this.replace(config);
    return html`
      ${renderEntitySection(this.hass, this.config, replace)}
      ${renderSourceMappingsSection(this.hass, this.config, replace)}
      ${renderLayoutSection(this.config, replace)} ${renderActionsSection(this.config, replace)}
      ${renderAppearanceSection(this.config, replace)}
      ${renderDiscoverySection(this.hass, this.config, replace)}
    `;
  }
}

if (!customElements.get('mediadeck-editor')) {
  customElements.define('mediadeck-editor', MediaDeckEditor);
}
