import { schema, t, type SchemaType } from "@colyseus/schema";

export const Player = schema({
  x: t.number(),
  z: t.number(),
  rotY: t.number(),
  hp: t.number(),
  warmth: t.number(),
  gathering: t.string(),
  sailing: t.boolean(),
  colorIdx: t.uint8(),
  attackSeq: t.uint16(),
  inventory: t.map("number"),
}, "Player");
export type Player = SchemaType<typeof Player>;

export const Resource = schema({
  type: t.string(),
  x: t.number(),
  z: t.number(),
  alive: t.boolean(),
  respawnAt: t.number(),
}, "Resource");
export type Resource = SchemaType<typeof Resource>;

export const Mob = schema({
  type: t.string(),
  x: t.number(),
  z: t.number(),
  rotY: t.number(),
  hp: t.number(),
  state: t.string(), // idle | wander | flee | rest | chase | windup | recover
  alive: t.boolean(),
}, "Mob");
export type Mob = SchemaType<typeof Mob>;

export const Drop = schema({
  itemId: t.string(),
  count: t.uint8(),
  x: t.number(),
  z: t.number(),
}, "Drop");
export type Drop = SchemaType<typeof Drop>;

export const IslandState = schema({
  players: t.map(Player),
  resources: t.map(Resource),
  mobs: t.map(Mob),
  drops: t.map(Drop),
  storage: t.map("number"), // 마을 공용 창고
}, "IslandState");
export type IslandState = SchemaType<typeof IslandState>;
