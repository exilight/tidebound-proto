// 밸런스 수치는 전부 여기서 조정한다.
export const ROOM_NAME = "island";
export const MAX_CLIENTS = 2;
export const SERVER_PORT = 2567;
export const TICK_MS = 50;

// 플레이어
export const PLAYER_SPEED = 5.5;
export const PLAYER_RADIUS = 0.4;
export const MAX_HP = 100;
export const MAX_WARMTH = 100;
export const RESPAWN_WARMTH = 50;
export const BAG_CAPACITY = 30;
export const BAG_LOSS_RATIO = 0.3; // 쓰러지면 잃는 가방 비율 (기획서: 가방 일부만 손실)

// 전투
export const ATTACK_RANGE = 2.6;
export const ATTACK_DAMAGE = 15;
export const ATTACK_COOLDOWN = 0.5;

// 채집
export const GATHER_RANGE = 2;
export const GATHER_TIME = 2;
export const RESOURCE_RESPAWN = 30;
export const PICKUP_RADIUS = 1.6;
export const DROP_LIFETIME = 90;

// 빛과 온기
export const PLAYER_LIGHT_RADIUS = 8;   // 시야용 등불 반경
export const LANTERN_POST_RADIUS = 6;   // 고정 호박등 안전지대
export const VILLAGE_LIGHT_RADIUS = 30;
export const WARMTH_DRAIN = 0.5;        // 초당, 안개 속 (고정 불빛 밖)
export const WARMTH_REGEN = 10;         // 초당, 고정 불빛 안
export const ALLY_WARMTH_RADIUS = 6;    // 동료와 가까우면 빛을 합쳐 감소량 절반
export const ALLY_WARMTH_FACTOR = 0.5;
export const HP_REGEN_IN_LIGHT = 5;     // 초당

// 이동 수단
export const DOCK_RANGE = 3.5;
export const STORAGE_RANGE = 3.5;
export const SAIL_TIME = 4;

// 아이템
export const ITEM_IDS = ["wood", "stone", "fiber", "meat", "hide", "tusk"] as const;
export type ItemId = (typeof ITEM_IDS)[number];
export const ITEM_INFO: Record<ItemId, { name: string; icon: string }> = {
  wood: { name: "나무", icon: "🪵" },
  stone: { name: "돌", icon: "🪨" },
  fiber: { name: "섬유", icon: "🌿" },
  meat: { name: "고기", icon: "🍖" },
  hide: { name: "가죽", icon: "🟫" },
  tusk: { name: "엄니", icon: "🦷" },
};

// 자원
export type ResourceType = "tree" | "rock" | "grass";
export const RESOURCE_INFO: Record<ResourceType, { item: ItemId; verb: string }> = {
  tree: { item: "wood", verb: "나무 베기" },
  rock: { item: "stone", verb: "돌 캐기" },
  grass: { item: "fiber", verb: "풀 베기" },
};
export const RESOURCE_COUNT: Record<ResourceType, number> = { tree: 38, rock: 16, grass: 28 };

// 몬스터
export type MobType = "rabbit" | "deer" | "boar";
export interface MobStats {
  name: string;
  hp: number;
  radius: number;
  walkSpeed: number;
  runSpeed: number;
  count: number;
  respawn: number;
  drops: Partial<Record<ItemId, number>>;
  // 도망형
  alertRadius?: number;
  fleeTime?: number;
  restTime?: number;
  // 선공형
  aggroRadius?: number;
  leashRadius?: number;
  attackRange?: number;
  hitRange?: number;
  damage?: number;
  windup?: number;
  recover?: number;
}
export const MOB_STATS: Record<MobType, MobStats> = {
  rabbit: {
    name: "토끼", hp: 25, radius: 0.3, walkSpeed: 1.2, runSpeed: 5, count: 9, respawn: 30,
    drops: { meat: 1, hide: 1 },
    alertRadius: 6, fleeTime: 2, restTime: 1.6,
  },
  deer: {
    name: "사슴", hp: 45, radius: 0.55, walkSpeed: 1.6, runSpeed: 6.5, count: 6, respawn: 45,
    drops: { meat: 2, hide: 2 },
    alertRadius: 9, fleeTime: 2.2, restTime: 2,
  },
  boar: {
    name: "멧돼지", hp: 75, radius: 0.65, walkSpeed: 1.4, runSpeed: 4.8, count: 6, respawn: 60,
    drops: { meat: 2, hide: 1, tusk: 1 },
    aggroRadius: 7, leashRadius: 18, attackRange: 1.7, hitRange: 2.3, damage: 12, windup: 0.45, recover: 0.8,
  },
};
export const BOAR_MIN_DOCK_DIST = 20; // 부두 근처에는 멧돼지를 두지 않는다
