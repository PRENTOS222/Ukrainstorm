export type Language = 'uk' | 'ru' | 'en';

export interface GunConfig {
  id: string;
  name: Record<Language, string>;
  type: string;
  caliber: string;
  description: Record<Language, string>;
  unlockLevel: number;
  unlockCost: number;
  damage: number;
  fireRate: number; // rounds/sec
  heatPerShot: number;
  coolRate: number;
  bulletSpeed: number;
  color: string;
  isEnergy?: boolean;
}

export interface MissileConfig {
  id: string;
  name: Record<Language, string>;
  type: string;
  guidance: string;
  description: Record<Language, string>;
  unlockLevel: number;
  unlockCost: number;
  damage: number;
  blastRadius: number;
  maxSpeed: number;
  turnRate: number;
  lockTime: number; // seconds
  lockRange: number; // meters in 3D
  capacityBonus: number;
  color: string;
  isHypersonic?: boolean;
}

export interface AircraftStats {
  speed: number;          // units/sec
  maxHealth: number;      // HP
  armor: number;          // % damage reduction
  agility?: number;        // roll/pitch responsiveness
  afterburnerThrust?: number;
  gunDamage: number;
  gunFireRate: number;
  gunHeatRate: number;
  gunCoolRate: number;
  missileMax: number;
  missileDamage: number;
  missileLockRange: number;
  missileLockTime: number;
  missileReloadTime: number;
  flareCount: number;
  shieldCapacity?: number; // For Next-Gen 6th-gen fighter!
  shieldRegen?: number;   // Shield points/sec
}

export interface AircraftUpgradeLevel {
  guns: number;       // Level 1-5
  missiles: number;   // Level 1-5
  engine: number;     // Level 1-5
  armor: number;      // Level 1-5
  avionics: number;   // Level 1-5
}

export interface AircraftConfig {
  id: string;
  name: string;
  codename: string;
  generation: string;
  role: string;
  description: Record<Language, string>;
  unlockLevel: number;
  unlockCost: number; // Credits
  baseStats: AircraftStats;
  statMultipliers: {
    guns: { damage: number; fireRate: number };
    missiles: { damage: number; capacity: number; lockTime: number };
    engine: { speed: number; afterburner: number };
    armor: { health: number; defense: number };
    avionics: { lockRange: number; leadAssist: number };
  };
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
    glow: string;
    afterburner: string;
  };
  specialAbility?: {
    name: Record<Language, string>;
    desc: Record<Language, string>;
    type: 'plasma_shield' | 'missile_swarm' | 'electronic_jamming' | 'overdrive';
  };
}

export interface PlayerProfile {
  level: number;
  xp: number;
  nextLevelXp: number;
  credits: number; // Points earned by intercepting threats
  selectedAircraftId: string;
  selectedGunId: string;
  selectedMissileId: string;
  unlockedAircraftIds: string[];
  unlockedGunIds: string[];
  unlockedMissileIds: string[];
  upgrades: Record<string, AircraftUpgradeLevel>; // keyed by aircraft ID
  totalKills: number;
  shahedKills: number;
  missileKills: number;
  missionsCompleted: number;
  highScore: number;
  audioEnabled: boolean;
  musicEnabled: boolean;
  language: Language;
}

export type EnemyType = 'shahed136' | 'shahed238_jet' | 'scout_drone' | 'cruise_missile';

export interface Enemy3D {
  id: string;
  type: EnemyType;
  name: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  speed: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  health: number;
  maxHealth: number;
  radius: number;
  targetZ: number; // Towards city defense zone
  points: number;
  xpReward: number;
  passedDefenseLine?: boolean;
}

export interface Bullet3D {
  id: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  damage: number;
  color: string;
  lifetime: number;
  maxLifetime: number;
  isEnergy?: boolean;
}

export interface Missile3D {
  id: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  targetId: string | null;
  speed: number;
  maxSpeed: number;
  turnRate: number;
  damage: number;
  blastRadius: number;
  lifetime: number;
  maxLifetime: number;
  color: string;
  smokeTimer: number;
  isHypersonic?: boolean;
}

export interface Explosion3D {
  x: number;
  y: number;
  z: number;
  radius: number;
  maxRadius: number;
  color: string;
  lifetime: number;
  maxLifetime: number;
  isLarge?: boolean;
}

export interface Particle3D {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  isSmoke?: boolean;
  isSpark?: boolean;
}

export interface MissionDef {
  id: string;
  sectorName: Record<Language, string>;
  subtitle: Record<Language, string>;
  briefing: Record<Language, string>;
  difficulty: 'normal' | 'hard' | 'extreme' | 'endless';
  targetKills: number;
  rewardCredits: number;
  rewardXp: number;
  spawnInterval: number; // ms
  allowedEnemies: EnemyType[];
  cityDefenseHp: number; // Civil infrastructure HP
  backgroundTheme: 'kyiv_night' | 'black_sea_dawn' | 'kharkiv_storm';
}

export interface CombatHUDState {
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  gunHeat: number;
  gunOverheated: boolean;
  missilesCount: number;
  maxMissiles: number;
  missileCooldown: number;
  flaresCount: number;
  cityDefense: number;
  maxCityDefense: number;
  lockedEnemyId: string | null;
  lockingEnemyId: string | null;
  lockProgress: number; // 0 to 1
  score: number;
  kills: number;
  wave: number;
  speedKmh: number;
  altitudeMeters: number;
  throttle: number;
}
