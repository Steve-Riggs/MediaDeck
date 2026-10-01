import {
  genericCapabilities,
  remoteSendCommand,
  type NavigationCommand,
  type PlatformAdapter,
} from './types';

const COMMANDS: Record<NavigationCommand, string> = {
  UP: 'KEY_UP',
  DOWN: 'KEY_DOWN',
  LEFT: 'KEY_LEFT',
  RIGHT: 'KEY_RIGHT',
  SELECT: 'KEY_ENTER',
  BACK: 'KEY_RETURN',
  HOME: 'KEY_HOME',
  MENU: 'KEY_MENU',
};

export const samsungTvAdapter: PlatformAdapter = {
  id: 'samsung-tv',
  name: 'Samsung TV',
  matches: ({ entity }) => {
    const text = [
      entity?.entity_id,
      entity?.attributes.integration,
      entity?.attributes.manufacturer,
      entity?.attributes.model,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return /samsung/.test(text);
  },
  capabilities: (context) => ({
    ...genericCapabilities(context),
    remoteNavigation: Boolean(context.remote),
  }),
  remoteAction: (context, command) => remoteSendCommand(context, COMMANDS[command]),
};
