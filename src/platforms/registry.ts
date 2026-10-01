import type { AdapterContext,PlatformAdapter } from './types';
import { androidTvAdapter } from './android-tv';import { appleTvAdapter } from './apple-tv';import { samsungTvAdapter } from './samsung-tv';import { lgWebosAdapter } from './lg-webos';import { genericAdapter } from './generic';
export const PLATFORM_ADAPTERS:PlatformAdapter[]=[androidTvAdapter,appleTvAdapter,samsungTvAdapter,lgWebosAdapter,genericAdapter];
export function selectPlatformAdapter(context:AdapterContext):PlatformAdapter{return PLATFORM_ADAPTERS.find(a=>a.matches(context))??genericAdapter;}
