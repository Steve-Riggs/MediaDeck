import { genericCapabilities,type PlatformAdapter } from './types';
export const samsungTvAdapter:PlatformAdapter={id:'samsung-tv',name:'Samsung TV',matches:({entity})=>{const text=[entity?.entity_id,entity?.attributes.integration,entity?.attributes.manufacturer,entity?.attributes.model].filter(Boolean).join(' ').toLowerCase();return /samsung/.test(text);},capabilities:genericCapabilities};
