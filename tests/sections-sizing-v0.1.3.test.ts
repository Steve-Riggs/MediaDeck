import { describe, expect, test } from 'vitest';
import { MediaDeckCard } from '../src/index';

describe('v0.1.3 sections sizing regression', () => {
  test('uses natural height in Home Assistant sections view', () => {
    const options = MediaDeckCard.prototype.getGridOptions.call({
      config: undefined,
    }) as Record<string, unknown>;

    expect(options.columns).toBe(12);
    expect(options.min_columns).toBe(4);
    expect(options).not.toHaveProperty('rows');
    expect(options).not.toHaveProperty('min_rows');
    expect(options).not.toHaveProperty('max_rows');
  });
});
