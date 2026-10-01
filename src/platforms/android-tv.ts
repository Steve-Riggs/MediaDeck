import {
  genericCapabilities,
  remoteSendCommand,
  type AdapterContext,
  type NavigationCommand,
  type PlatformAdapter,
} from './types';

function platformText(context: AdapterContext): string {
  return [
    context.entity?.entity_id,
    context.entity?.attributes.integration,
    context.entity?.attributes.platform,
    context.entity?.attributes.model,
    context.remote?.entity_id,
    context.remote?.attributes.integration,
    context.remote?.attributes.platform,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function isModernRemote(context: AdapterContext): boolean {
  return /androidtv_remote|android tv remote|google tv/.test(platformText(context));
}

const MODERN_COMMANDS: Record<NavigationCommand, string> = {
  UP: 'DPAD_UP',
  DOWN: 'DPAD_DOWN',
  LEFT: 'DPAD_LEFT',
  RIGHT: 'DPAD_RIGHT',
  SELECT: 'DPAD_CENTER',
  BACK: 'BACK',
  HOME: 'HOME',
  MENU: 'MENU',
};

const ADB_COMMANDS: Record<NavigationCommand, string> = {
  UP: 'UP',
  DOWN: 'DOWN',
  LEFT: 'LEFT',
  RIGHT: 'RIGHT',
  SELECT: 'CENTER',
  BACK: 'BACK',
  HOME: 'HOME',
  MENU: 'MENU',
};

export const androidTvAdapter: PlatformAdapter = {
  id: 'android-tv',
  name: 'Android / Google TV',
  matches: (context) => /android|google tv|adb/.test(platformText(context)),
  capabilities: (context) => ({
    ...genericCapabilities(context),
    remoteNavigation: Boolean(context.remote),
    textEntry: Boolean(context.remote),
  }),
  remoteAction: (context, command) =>
    remoteSendCommand(context, (isModernRemote(context) ? MODERN_COMMANDS : ADB_COMMANDS)[command]),
  textAction: (context, text) => {
    if (!context.remote) return undefined;
    if (isModernRemote(context)) return remoteSendCommand(context, `text:${text}`);
    const escaped = text.replaceAll(' ', '%s').replace(/[;&|`$]/g, '');
    return remoteSendCommand(context, `input text ${escaped}`);
  },
};
