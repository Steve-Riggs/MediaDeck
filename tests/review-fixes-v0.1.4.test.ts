import { afterEach, expect, test, vi } from 'vitest';
import '../src/index';
import { MediaDeckCard } from '../src/mediadeck-card';
import { MediaDeckEditor } from '../src/mediadeck-editor';
import type { MediaDeckConfig } from '../src/config/types';
import { entity, hass } from './helpers';

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

test('invalid power service stays editable and only emits configuration after correction', async () => {
  const editor = document.createElement('mediadeck-editor') as MediaDeckEditor;
  editor.setConfig({ type: 'custom:mediadeck-card', entity: 'media_player.tv' });
  editor.hass = hass([entity('media_player.tv', 'off')]);
  const emitted: MediaDeckConfig[] = [];
  editor.addEventListener('config-changed', (event) => {
    emitted.push((event as CustomEvent).detail.config);
  });
  document.body.append(editor);
  await editor.updateComplete;
  const powerInput = () => {
    const label = [...editor.shadowRoot!.querySelectorAll('label')].find((item) =>
      item.textContent?.includes('Power on service'),
    );
    return label?.querySelector('input');
  };
  powerInput()!.value = 'script.';
  powerInput()!.dispatchEvent(new Event('change'));
  await editor.updateComplete;
  expect(editor.shadowRoot!.querySelector('.config-error')).not.toBeNull();
  expect(powerInput()?.value).toBe('script.');
  expect(emitted).toHaveLength(0);

  powerInput()!.value = 'script.wake_tv';
  powerInput()!.dispatchEvent(new Event('change'));
  await editor.updateComplete;
  expect(editor.shadowRoot!.querySelector('.config-error')).toBeNull();
  expect(emitted).toHaveLength(1);
  expect(emitted[0].power_actions?.on?.service).toBe('script.wake_tv');
});

async function mountCard(config: MediaDeckConfig, powerState?: string) {
  const card = document.createElement('mediadeck-card') as MediaDeckCard;
  card.setConfig(config);
  const home = hass([
    entity('media_player.tv', 'playing'),
    ...(powerState === undefined ? [] : [entity('remote.tv', powerState)]),
  ]);
  card.hass = home;
  document.body.append(card);
  await card.updateComplete;
  return { card, home };
}

test.each(['off', 'unknown', 'unavailable'])(
  'power state %s invokes the configured wake action',
  async (powerState) => {
    const { card, home } = await mountCard(
      {
        type: 'custom:mediadeck-card',
        entity: 'media_player.tv',
        entities: { power: 'remote.tv' },
        power_actions: { on: { action: 'call-service', service: 'script.wake_tv' } },
      },
      powerState,
    );
    (card.shadowRoot!.querySelector('header button') as HTMLButtonElement).click();
    await card.updateComplete;
    expect(home.calls).toEqual([
      { domain: 'script', service: 'wake_tv', data: undefined, target: undefined },
    ]);
  },
);

test('missing explicit power controller invokes wake instead of following the playing primary', async () => {
  const { card, home } = await mountCard({
    type: 'custom:mediadeck-card',
    entity: 'media_player.tv',
    entities: { power: 'remote.tv' },
    power_actions: { on: { action: 'call-service', service: 'script.wake_tv' } },
  });
  (card.shadowRoot!.querySelector('header button') as HTMLButtonElement).click();
  await card.updateComplete;
  expect(home.calls[0]).toMatchObject({ domain: 'script', service: 'wake_tv' });
});

test('unknown power state without override attempts turn_on on the configured controller', async () => {
  const { card, home } = await mountCard(
    {
      type: 'custom:mediadeck-card',
      entity: 'media_player.tv',
      entities: { power: 'remote.tv' },
    },
    'unknown',
  );
  (card.shadowRoot!.querySelector('header button') as HTMLButtonElement).click();
  await card.updateComplete;
  expect(home.calls[0]).toMatchObject({
    domain: 'remote',
    service: 'turn_on',
    target: { entity_id: 'remote.tv' },
  });
});

test.each(['on', 'off'])(
  'cancelling confirmation prevents the power %s override',
  async (direction) => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { card, home } = await mountCard(
      {
        type: 'custom:mediadeck-card',
        entity: 'media_player.tv',
        entities: { power: 'remote.tv' },
        power_actions: {
          [direction]: {
            action: 'call-service',
            service: 'script.change_power',
            confirmation: 'Change power?',
          },
        },
      },
      direction === 'on' ? 'off' : 'on',
    );
    (card.shadowRoot!.querySelector('header button') as HTMLButtonElement).click();
    await card.updateComplete;
    expect(home.calls).toHaveLength(0);
  },
);

test.each(['on', 'off'])(
  'accepting confirmation executes the power %s override with its data and target',
  async (direction) => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { card, home } = await mountCard(
      {
        type: 'custom:mediadeck-card',
        entity: 'media_player.tv',
        entities: { power: 'remote.tv' },
        power_actions: {
          [direction]: {
            action: 'call-service',
            service: 'script.turn_on',
            confirmation: 'Change power?',
            target: { entity_id: 'script.change_power' },
            data: { variables: { mode: direction } },
          },
        },
      },
      direction === 'on' ? 'off' : 'on',
    );
    (card.shadowRoot!.querySelector('header button') as HTMLButtonElement).click();
    await card.updateComplete;
    expect(home.calls).toEqual([
      {
        domain: 'script',
        service: 'turn_on',
        target: { entity_id: 'script.change_power' },
        data: { variables: { mode: direction } },
      },
    ]);
  },
);
