import { Client, type Room } from "@colyseus/sdk";
import { ROOM_NAME, SERVER_PORT } from "@tidebound/shared";

// 서버 스키마를 클라이언트에서 읽을 때 쓰는 모양
export interface MapLike<T> { get(k: string): T | undefined; forEach(cb: (v: T, k: string) => void): void; size: number }
export interface PlayerState {
  x: number; z: number; rotY: number; hp: number; warmth: number; gathering: string;
  sailing: boolean; colorIdx: number; attackSeq: number; inventory: MapLike<number>;
}
export interface ResourceState { type: string; x: number; z: number; alive: boolean }
export interface MobState { type: string; x: number; z: number; rotY: number; hp: number; state: string; alive: boolean }
export interface DropState { itemId: string; count: number; x: number; z: number }
export interface GameState {
  players: MapLike<PlayerState>;
  resources: MapLike<ResourceState>;
  mobs: MapLike<MobState>;
  drops: MapLike<DropState>;
  storage: MapLike<number>;
}

export async function connect(): Promise<Room<any, GameState>> {
  // 같은 와이파이의 폰에서 접속해도 되도록 접속한 주소를 그대로 쓴다
  const client = new Client(`${location.protocol}//${location.hostname}:${SERVER_PORT}`);
  return client.joinOrCreate<GameState>(ROOM_NAME);
}
