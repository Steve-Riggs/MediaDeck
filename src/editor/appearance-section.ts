import { html, type TemplateResult } from 'lit';
import type { AppearanceConfig, MediaDeckConfig } from '../config/types';
import { DEFAULT_APPEARANCE } from '../config/defaults';
export function updateAppearance(
  config: MediaDeckConfig,
  appearance: Partial<AppearanceConfig>,
): MediaDeckConfig {
  const next = { ...(config.appearance ?? {}) };
  for (const [key, value] of Object.entries(appearance)) {
    if (value === undefined) delete (next as Record<string, unknown>)[key];
    else (next as Record<string, unknown>)[key] = value;
  }
  return { ...config, appearance: next };
}
export function renderAppearanceSection(
  config: MediaDeckConfig,
  replace: (config: MediaDeckConfig) => void,
): TemplateResult {
  const a = {
    ...DEFAULT_APPEARANCE,
    ...Object.fromEntries(
      Object.entries(config.appearance ?? {}).filter(([, v]) => v !== undefined),
    ),
  };
  const set = (next: Partial<AppearanceConfig>) => replace(updateAppearance(config, next));
  const slider = (
    label: string,
    key:
      | 'artwork_size'
      | 'border_radius'
      | 'gap'
      | 'icon_size'
      | 'font_scale'
      | 'opacity'
      | 'button_opacity'
      | 'min_height',
    min: number,
    max: number,
    step: number,
    unit: string,
  ) =>
    html`<label
      >${label} <output>${a[key]}${unit}</output
      ><input
        aria-label=${label}
        type="range"
        min=${min}
        max=${max}
        step=${step}
        .value=${String(a[key])}
        @change=${(e: Event) => set({ [key]: Number((e.target as HTMLInputElement).value) })}
    /></label>`;
  const colour = (
    label: string,
    key: 'background' | 'text_color' | 'accent_color' | 'button_background',
    fallback: string,
  ) =>
    html`<label
      >${label}
      <div class="colour-row">
        <input
          type="color"
          aria-label=${`${label} picker`}
          .value=${/^#[0-9a-f]{6}$/i.test(a[key]) ? a[key] : fallback}
          @input=${(e: Event) => set({ [key]: (e.target as HTMLInputElement).value })}
        /><input
          aria-label=${`${label} CSS value`}
          .value=${config.appearance?.[key] ?? ''}
          placeholder="Use theme colour"
          @change=${(e: Event) =>
            set({ [key]: (e.target as HTMLInputElement).value.trim() || undefined })}
        /><button @click=${() => set({ [key]: undefined })}>Theme</button>
      </div></label
    >`;
  return html`<section>
    <h3>Appearance</h3>
    <p class="hint">
      Start with a size preset, then adjust the controls. Theme buttons restore your Home Assistant
      colours.
    </p>
    <div class="preset-row">
      ${(['compact', 'standard', 'expanded'] as const).map(
        (density) =>
          html`<button
            @click=${() =>
              set({
                density,
                artwork_size: density === 'compact' ? 105 : density === 'expanded' ? 220 : 180,
                gap: density === 'compact' ? 9 : 14,
                min_height: 0,
              })}
          >
            ${density === 'compact' ? 'Compact' : density === 'standard' ? 'Standard' : 'Expanded'}
          </button>`,
      )}<button @click=${() => replace({ ...config, appearance: {} })}>Reset appearance</button>
    </div>
    <label
      >Density<select
        aria-label="Density"
        @change=${(e: Event) =>
          set({ density: (e.target as HTMLSelectElement).value as AppearanceConfig['density'] })}
      >
        ${['compact', 'standard', 'expanded'].map(
          (value) =>
            html`<option value=${value} ?selected=${a.density === value}>${value}</option>`,
        )}
      </select></label
    >
    <div class="two-col">
      ${slider('Artwork size', 'artwork_size', 60, 320, 5, 'px')}${slider(
        'Corner radius',
        'border_radius',
        0,
        40,
        1,
        'px',
      )}${slider('Spacing', 'gap', 0, 30, 1, 'px')}${slider(
        'Whole card opacity',
        'opacity',
        0.2,
        1,
        0.05,
        '',
      )}${slider('Button opacity', 'button_opacity', 0.2, 1, 0.05, '')}${slider(
        'Text size',
        'font_scale',
        0.6,
        2,
        0.05,
        '×',
      )}
    </div>
    <label
      >Artwork fit<select
        @change=${(e: Event) =>
          set({
            artwork_fit: (e.target as HTMLSelectElement).value as AppearanceConfig['artwork_fit'],
          })}
      >
        <option value="cover" ?selected=${a.artwork_fit === 'cover'}>Fill / crop</option>
        <option value="contain" ?selected=${a.artwork_fit === 'contain'}>Show whole image</option>
      </select></label
    >
    ${colour('Background', 'background', '#ffffff')}${colour(
      'Text colour',
      'text_color',
      '#111111',
    )}${colour('Accent colour', 'accent_color', '#03a9f4')}${colour(
      'Button background',
      'button_background',
      '#eeeeee',
    )}
    <details>
      <summary>Advanced sizing</summary>
      <div class="two-col">
        ${slider('Minimum height (0 = automatic)', 'min_height', 0, 800, 10, 'px')}${slider(
          'Control icon size',
          'icon_size',
          12,
          48,
          1,
          'px',
        )}
      </div>
    </details>
  </section>`;
}
