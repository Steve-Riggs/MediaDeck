import { afterEach, describe, expect, test } from 'vitest';
import '../src/index';
import { MediaDeckCard } from '../src/mediadeck-card';
import { entity, hass } from './helpers';

afterEach(() => {
  document.body.innerHTML = '';
});

function selectForLabel(root: ShadowRoot, text: string): HTMLSelectElement | undefined {
  const label = [...root.querySelectorAll('label')].find((candidate) =>
    candidate.textContent?.includes(text),
  );
  return label?.querySelector('select') ?? undefined;
}

describe('v0.1.2 editor bootstrap regression', () => {
  test('brand-new stub still renders the primary entity selector', async () => {
    const editor = document.createElement('mediadeck-editor') as any;
    editor.setConfig(MediaDeckCard.getStubConfig());
    editor.hass = hass([
      entity('media_player.sitting_room_tv', 'off', { friendly_name: 'Sitting Room TV' }),
    ]);
    document.body.append(editor);
    await editor.updateComplete;

    const primary = selectForLabel(editor.shadowRoot, 'Primary media entity');
    expect(primary).toBeDefined();
    expect(primary?.value).toBe('');
    expect(
      [...primary!.options].some((option) => option.value === 'media_player.sitting_room_tv'),
    ).toBe(true);
  });

  test('brand-new stub preview is editable instead of throwing a configuration error', async () => {
    const card = document.createElement('mediadeck-card') as any;
    expect(() => card.setConfig(MediaDeckCard.getStubConfig())).not.toThrow();
    card.hass = hass([
      entity('media_player.sitting_room_tv', 'off', { friendly_name: 'Sitting Room TV' }),
    ]);
    document.body.append(card);
    await card.updateComplete;

    expect(card.shadowRoot.textContent).toContain('Select a primary media entity');
  });

  test('genuinely malformed configuration still blocks the editor', async () => {
    const editor = document.createElement('mediadeck-editor') as any;
    editor.setConfig({
      type: 'custom:mediadeck-card',
      entity: '',
      entities: { related: 'media_player.invalid' },
    });
    editor.hass = hass([entity('media_player.sitting_room_tv', 'off')]);
    document.body.append(editor);
    await editor.updateComplete;

    expect(editor.shadowRoot.querySelector('.config-error')).not.toBeNull();
    expect(selectForLabel(editor.shadowRoot, 'Primary media entity')).toBeUndefined();
  });
});
