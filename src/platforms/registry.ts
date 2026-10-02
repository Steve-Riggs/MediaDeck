import type { AdapterContext, PlatformAdapter, PlatformId } from './types';
import { androidTvAdapter } from './android-tv';
import { appleTvAdapter } from './apple-tv';
import { samsungTvAdapter } from './samsung-tv';
import { lgWebosAdapter } from './lg-webos';
import { genericAdapter } from './generic';
export const PLATFORM_ADAPTERS: PlatformAdapter[] = [
  androidTvAdapter,
  appleTvAdapter,
  samsungTvAdapter,
  lgWebosAdapter,
  genericAdapter,
];
export function selectPlatformAdapter(
  context: AdapterContext,
  override?: PlatformId,
): PlatformAdapter {
  if (override) {
    const selected = PLATFORM_ADAPTERS.find((adapter) => adapter.id === override);
    if (selected) return selected;
  }
  return PLATFORM_ADAPTERS.find((adapter) => adapter.matches(context)) ?? genericAdapter;
}
