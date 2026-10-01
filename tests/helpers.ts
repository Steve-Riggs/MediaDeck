import type { HassEntity,HomeAssistant } from '../src/types/home-assistant';
export function entity(entity_id:string,state='idle',attributes:Record<string,any>={}):HassEntity{return{entity_id,state,attributes};}
export function hass(states:HassEntity[]):HomeAssistant&{calls:any[]}{const calls:any[]=[];return{states:Object.fromEntries(states.map(i=>[i.entity_id,i])),calls,async callService(domain,service,data,target){calls.push({domain,service,data,target});}};}
