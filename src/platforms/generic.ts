import { genericCapabilities,type PlatformAdapter } from './types';
export const genericAdapter:PlatformAdapter={id:'generic',name:'Generic media player',matches:()=>true,capabilities:genericCapabilities};
