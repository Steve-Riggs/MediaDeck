import {
  genericCapabilities,
  remoteSendCommand,
  type NavigationCommand,
  type PlatformAdapter,
} from './types';

const COMMANDS: Record<NavigationCommand, string> = {
  UP: 'up',
  DOWN: 'down',
  LEFT: 'left',
  RIGHT: 'right',
  SELECT: 'select',
  BACK: 'menu',
  HOME: 'home',
  MENU: 'top_menu',
};

export const appleTvAdapter: PlatformAdapter = {
  id: 'apple-tv',
  name: 'Apple TV',
  matches: ({ entity }) => {
    const text = [
      entity?.entity_id,
      entity?.attributes.integration,
      entity?.attributes.platform,
      entity?.attributes.model,
      entity?.attributes.friendly_name,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return /apple.?tv|pyatv/.test(text);
  },
  capabilities: (context) => ({
    ...genericCapabilities(context),
    remoteNavigation: Boolean(context.remote),
  }),
  remoteAction: (context, command) => remoteSendCommand(context, COMMANDS[command]),
};
