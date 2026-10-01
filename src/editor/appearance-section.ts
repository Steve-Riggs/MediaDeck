import { html, type TemplateResult } from 'lit';
import type { AppearanceConfig, MediaDeckConfig } from '../config/types';

export function updateAppearance(
  config: MediaDeckConfig,
  appearance: Partial<AppearanceConfig>,
): MediaDeckConfig {
  return { ...config, appearance: { ...(config.appearance ?? {}), ...appearance } };
}

export function renderAppearanceSection(
  config: MediaDeckConfig,
  replace: (config: MediaDeckConfig) => void,
): TemplateResult {
  const appearance = config.appearance ?? {};
  const setNumber = (key: keyof AppearanceConfig, value: string) =>
    replace(updateAppearance(config, { [key]: Number(value) }));
  const setText = (key: keyof AppearanceConfig, value: string) =>
    replace(updateAppearance(config, { [key]: value || undefined }));

  return html`<section>
    <h3>Appearance</h3>
    <label
      >Density
      <select
        .value=${appearance.density ?? 'standard'}
        @change=${(event: Event) =>
          replace(
            updateAppearance(config, {
              density: (event.target as HTMLSelectElement).value as AppearanceConfig['density'],
            }),
          )}
      >
        <option value="compact">Compact</option>
        <option value="standard">Standard</option>
        <option value="expanded">Expanded</option>
      </select>
    </label>
    <div class="two-col">
      <label
        >Artwork size<input
          type="number"
          min="60"
          .value=${String(appearance.artwork_size ?? 180)}
          @change=${(e: Event) => setNumber('artwork_size', (e.target as HTMLInputElement).value)}
      /></label>
      <label
        >Corner radius<input
          type="number"
          min="0"
          .value=${String(appearance.border_radius ?? 20)}
          @change=${(e: Event) => setNumber('border_radius', (e.target as HTMLInputElement).value)}
      /></label>
      <label
        >Gap<input
          type="number"
          min="0"
          .value=${String(appearance.gap ?? 14)}
          @change=${(e: Event) => setNumber('gap', (e.target as HTMLInputElement).value)}
      /></label>
      <label
        >Icon size<input
          type="number"
          min="12"
          .value=${String(appearance.icon_size ?? 24)}
          @change=${(e: Event) => setNumber('icon_size', (e.target as HTMLInputElement).value)}
      /></label>
      <label
        >Font scale<input
          type="number"
          min="0.6"
          max="2"
          step="0.05"
          .value=${String(appearance.font_scale ?? 1)}
          @change=${(e: Event) => setNumber('font_scale', (e.target as HTMLInputElement).value)}
      /></label>
      <label
        >Card opacity<input
          type="range"
          min="0.2"
          max="1"
          step="0.05"
          .value=${String(appearance.opacity ?? 1)}
          @change=${(e: Event) => setNumber('opacity', (e.target as HTMLInputElement).value)}
      /></label>
      <label
        >Button opacity<input
          type="range"
          min="0.2"
          max="1"
          step="0.05"
          .value=${String(appearance.button_opacity ?? 0.92)}
          @change=${(e: Event) =>
            setNumber('button_opacity', (e.target as HTMLInputElement).value)}
      /></label>
    </div>
    <label
      >Background<input
        .value=${appearance.background ?? ''}
        placeholder="var(--ha-card-background)"
        @change=${(e: Event) => setText('background', (e.target as HTMLInputElement).value)}
    /></label>
    <label
      >Text colour<input
        .value=${appearance.text_color ?? ''}
        placeholder="var(--primary-text-color)"
        @change=${(e: Event) => setText('text_color', (e.target as HTMLInputElement).value)}
    /></label>
    <label
      >Accent colour<input
        .value=${appearance.accent_color ?? ''}
        placeholder="var(--primary-color)"
        @change=${(e: Event) => setText('accent_color', (e.target as HTMLInputElement).value)}
    /></label>
    <label
      >Button background<input
        .value=${appearance.button_background ?? ''}
        placeholder="var(--secondary-background-color)"
        @change=${(e: Event) => setText('button_background', (e.target as HTMLInputElement).value)}
    /></label>
  </section>`;
}
