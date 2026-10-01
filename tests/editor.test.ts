import { describe, expect, test } from 'vitest';
import '../src/index';
import { applyDiscoverySuggestion } from '../src/editor/discovery-section';
import { setSourceMapping, removeSourceMapping } from '../src/editor/source-mappings-section';
import { addWatchAction, removeWatchAction } from '../src/editor/actions-section';
import { moveRegion, toggleRegion } from '../src/editor/layout-section';
import { updateAppearance } from '../src/editor/appearance-section';

describe('editor', () => {
  test('registers editor', () => expect(customElements.get('mediadeck-editor')).toBeDefined());

  test('discovery acceptance preserves unknown keys', () => {
    const config = {
      type: 'custom:mediadeck-card' as const,
      entity: 'media_player.tv',
      future_key: 42,
    };
    const next = applyDiscoverySuggestion(config, {
      kind: 'remote',
      entity: 'remote.tv',
      confidence: 0.9,
      explanation: 'match',
    });
    expect(next.entities?.remote).toBe('remote.tv');
    expect(next.future_key).toBe(42);
  });

  test('adds and removes explicit source mappings without losing other config', () => {
    const base = {
      type: 'custom:mediadeck-card' as const,
      entity: 'media_player.tv',
      future_key: 'keep-me',
    };
    const mapped = setSourceMapping(base, 'HDMI 1', {
      entity: 'media_player.apple_tv',
      remote: 'remote.apple_tv',
      label: 'Apple TV',
    });
    expect(mapped.source_mappings?.['HDMI 1']).toMatchObject({
      entity: 'media_player.apple_tv',
      remote: 'remote.apple_tv',
      label: 'Apple TV',
    });
    expect(removeSourceMapping(mapped, 'HDMI 1').source_mappings?.['HDMI 1']).toBeUndefined();
    expect(mapped.future_key).toBe('keep-me');
  });

  test('edits watch actions declaratively', () => {
    const base = { type: 'custom:mediadeck-card' as const, entity: 'media_player.tv' };
    const added = addWatchAction(base, {
      name: 'Watch Apple TV',
      action: { action: 'call-service', service: 'script.watch_apple_tv' },
    });
    expect(added.watch_actions).toHaveLength(1);
    expect(added.watch_actions?.[0].action.service).toBe('script.watch_apple_tv');
    expect(removeWatchAction(added, 0).watch_actions).toHaveLength(0);
  });

  test('toggles and reorders sections', () => {
    const base = { type: 'custom:mediadeck-card' as const, entity: 'media_player.tv' };
    const hidden = toggleRegion(base, 'audio', false);
    expect(hidden.regions?.audio).toBe(false);
    const moved = moveRegion(hidden, 'audio', -1);
    expect(moved.section_order?.indexOf('audio')).toBeLessThan(
      moved.section_order?.indexOf('sources') ?? Number.MAX_SAFE_INTEGER,
    );
  });

  test('updates appearance while preserving existing appearance keys', () => {
    const base = {
      type: 'custom:mediadeck-card' as const,
      entity: 'media_player.tv',
      appearance: { artwork_size: 180, accent_color: '#123456' },
    };
    const next = updateAppearance(base, { opacity: 0.75, gap: 20 });
    expect(next.appearance).toMatchObject({
      artwork_size: 180,
      accent_color: '#123456',
      opacity: 0.75,
      gap: 20,
    });
  });
});
