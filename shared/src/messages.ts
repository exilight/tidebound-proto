// 클라이언트 → 서버
export const MSG = {
  move: "move",       // { dirX, dirZ }
  gather: "gather",   // { resourceId }
  attack: "attack",   // { targetId? }
  board: "board",     // 배 타기
  deposit: "deposit", // 창고에 맡기기
} as const;

// 서버 → 클라이언트
export const EVT = {
  notice: "notice",   // { text }
  hit: "hit",         // { x, z, amount, onPlayer }
  respawn: "respawn", // { reason, lost }
} as const;

export interface MovePayload { dirX: number; dirZ: number }
export interface GatherPayload { resourceId: string }
export interface AttackPayload { targetId?: string }
export interface NoticeEvent { text: string }
export interface HitEvent { x: number; z: number; amount: number; onPlayer: boolean }
export interface RespawnEvent { reason: "hp" | "warmth"; lost: number }
