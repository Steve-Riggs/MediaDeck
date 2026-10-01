import { genericCapabilities, remoteSendCommand, type PlatformAdapter } from './types';

export const genericAdapter: PlatformAdapter = {
  id: 'generic',
  name: 'Generic media player',
  matches: () => true,
  capabilities: genericCapabilities,
  remoteAction: (context, command) => remoteSendCommand(context, command),
};
