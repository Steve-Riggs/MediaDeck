import type { MediaDeckAction } from '../config/types';
export type MediaIntent={kind:'power';on:boolean}|{kind:'play-pause'}|{kind:'stop'}|{kind:'next'}|{kind:'previous'}|{kind:'seek';position:number}|{kind:'volume-set';volume:number}|{kind:'volume-up'}|{kind:'volume-down'}|{kind:'mute';muted:boolean}|{kind:'source-select';source:string}|{kind:'remote';command:'UP'|'DOWN'|'LEFT'|'RIGHT'|'SELECT'|'BACK'|'HOME'|'MENU'}|{kind:'text';text:string}|{kind:'custom';action:MediaDeckAction};
export interface ActionResult{ok:boolean;message?:string;error?:unknown;}
