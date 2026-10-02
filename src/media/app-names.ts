const APPS: Record<string, string> = {
  'com.amazon.amazonvideo': 'Prime Video',
  'com.amazon.avod.thirdpartyclient': 'Prime Video',
  'com.disney.disneyplus': 'Disney+',
  'com.netflix.ninja': 'Netflix',
  'com.netflix.mediaclient': 'Netflix',
  'com.google.android.youtube.tv': 'YouTube',
  'com.google.android.youtube': 'YouTube',
  'com.plexapp.android': 'Plex',
  'org.jellyfin.androidtv': 'Jellyfin',
  'org.jellyfin.mobile': 'Jellyfin',
  'com.spotify.tv.android': 'Spotify',
  'com.apple.atve.androidtv.appletv': 'Apple TV',
  'bbc.iplayer.android': 'BBC iPlayer',
  'com.itv.itvplayer': 'ITVX',
  'com.channel4.ondemand': 'Channel 4',
  'com.google.android.tvlauncher': 'Home screen',
  'com.google.android.apps.tv.launcherx': 'Home screen',
};
export function isPackageId(value: string): boolean {
  return /^[a-z][a-z0-9_]*(?:\.[a-z0-9_]+){2,}$/i.test(value);
}
export function appName(value: unknown, overrides: Record<string, string> = {}): string {
  if (typeof value !== 'string') return '';
  return overrides[value] ?? APPS[value.toLowerCase()] ?? value;
}
export function isAppTitle(value: string): boolean {
  return (
    isPackageId(value) ||
    Object.values(APPS).some((name) => name.toLowerCase() === value.toLowerCase())
  );
}
