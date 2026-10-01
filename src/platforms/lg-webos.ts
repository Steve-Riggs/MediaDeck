import { genericCapabilities, type NavigationCommand, type PlatformAdapter } from './types';

const COMMANDS: Record<NavigationCommand, string> = {
  UP: 'UP',
  DOWN: 'DOWN',
  LEFT: 'LEFT',
  RIGHT: 'RIGHT',
  SELECT: 'ENTER',
  BACK: 'BACK',
  HOME: 'HOME',
  MENU: 'MENU',
};

export const lgWebosAdapter: PlatformAdapter = {
  id: 'lg-webos',
  name: 'LG webOS',
  matches: ({ entity }) => {
    const text = [
      entity?.entity_id,
      entity?.attributes.integration,
      entity?.attributes.manufacturer,
      entity?.attributes.model,
      entity?.attributes.platform,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return /webos|lg tv|lge/.test(text);
  },
  capabilities: (context) => ({
    ...genericCapabilities(context),
    remoteNavigation: Boolean(context.entity && context.entity.state !== 'unavailable'),
  }),
  remoteAction: (context, command) => {
    if (!context.entity) return undefined;
    return {
      domain: 'webostv',
      service: 'button',
      data: { button: COMMANDS[command] },
      target: { entity_id: context.entity.entity_id },
    };
  },
};
