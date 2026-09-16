import { PlayerProfile, Language } from '../types';
import { AIRCRAFT_LIST } from './aircraftData';
import { GUNS_LIST, MISSILES_LIST } from './weaponsData';

const STORAGE_KEY = 'skyshield_pilot_profile_v2';

export function calculateXpForLevel(level: number): number {
  return Math.round(450 * Math.pow(level, 1.35));
}

export function getRankTitle(level: number, lang: Language): string {
  const ranks: { minLvl: number; title: Record<Language, string> }[] = [
    { minLvl: 1, title: { uk: 'Лейтенант ПС ЗСУ', ru: 'Лейтенант ВС ВСУ', en: 'Lieutenant' } },
    { minLvl: 3, title: { uk: 'Старший Лейтенант', ru: 'Старший Лейтенант', en: 'Senior Lieutenant' } },
    { minLvl: 6, title: { uk: 'Капітан (Ас перехоплення)', ru: 'Капитан (Ас перехвата)', en: 'Captain (Interceptor Ace)' } },
    { minLvl: 9, title: { uk: 'Майор тактичної авіації', ru: 'Майор тактической авиации', en: 'Major' } },
    { minLvl: 12, title: { uk: 'Підполковник (Командир ескадрильї)', ru: 'Подполковник (Комэск)', en: 'Lt. Colonel' } },
    { minLvl: 15, title: { uk: 'Полковник (Герой Неба)', ru: 'Полковник (Герой Неба)', en: 'Colonel' } },
    { minLvl: 20, title: { uk: 'Генерал авіації (Легенда ППО)', ru: 'Генерал авиации (Легенда ПВО)', en: 'Air General (Ghost Legend)' } },
  ];

  let current = ranks[0].title;
  for (const r of ranks) {
    if (level >= r.minLvl) {
      current = r.title;
    }
  }
  return current[lang];
}

export interface LevelUnlocks {
  newAircraft: string[];
  newGuns: string[];
  newMissiles: string[];
}

export function checkUnlocksForLevel(level: number): LevelUnlocks {
  const newAircraft = AIRCRAFT_LIST.filter(a => a.unlockLevel === level).map(a => a.id);
  const newGuns = GUNS_LIST.filter(g => g.unlockLevel === level).map(g => g.id);
  const newMissiles = MISSILES_LIST.filter(m => m.unlockLevel === level).map(m => m.id);

  return { newAircraft, newGuns, newMissiles };
}

const DEFAULT_PROFILE: PlayerProfile = {
  level: 1,
  xp: 0,
  nextLevelXp: calculateXpForLevel(1),
  credits: 1200, // Starting credits bonus
  selectedAircraftId: 'mig29',
  selectedGunId: 'gsh301',
  selectedMissileId: 'r73',
  unlockedAircraftIds: ['mig29'],
  unlockedGunIds: ['gsh301'],
  unlockedMissileIds: ['r73'],
  upgrades: {
    mig29: { guns: 1, missiles: 1, engine: 1, armor: 1, avionics: 1 },
    su27: { guns: 1, missiles: 1, engine: 1, armor: 1, avionics: 1 },
    f16: { guns: 1, missiles: 1, engine: 1, armor: 1, avionics: 1 },
    mirage2000: { guns: 1, missiles: 1, engine: 1, armor: 1, avionics: 1 },
    sokil_x: { guns: 1, missiles: 1, engine: 1, armor: 1, avionics: 1 },
  },
  totalKills: 0,
  shahedKills: 0,
  missileKills: 0,
  missionsCompleted: 0,
  highScore: 0,
  audioEnabled: true,
  musicEnabled: true,
  language: 'ru',
};

export function loadPlayerProfile(): PlayerProfile {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return DEFAULT_PROFILE;
    const parsed = JSON.parse(data);
    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      unlockedAircraftIds: parsed.unlockedAircraftIds || DEFAULT_PROFILE.unlockedAircraftIds,
      unlockedGunIds: parsed.unlockedGunIds || DEFAULT_PROFILE.unlockedGunIds,
      unlockedMissileIds: parsed.unlockedMissileIds || DEFAULT_PROFILE.unlockedMissileIds,
      upgrades: {
        ...DEFAULT_PROFILE.upgrades,
        ...(parsed.upgrades || {}),
      },
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function savePlayerProfile(profile: PlayerProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (err) {
    console.error('Failed to save profile:', err);
  }
}

export interface RewardsResult {
  updatedProfile: PlayerProfile;
  didLevelUp: boolean;
  oldLevel: number;
  newLevel: number;
  unlockedItems: {
    aircraft: string[];
    guns: string[];
    missiles: string[];
  };
}

export function addPlayerRewards(
  profile: PlayerProfile,
  gainedXp: number,
  gainedCredits: number,
  shahedCount: number,
  missileCount: number
): RewardsResult {
  let xp = profile.xp + gainedXp;
  let level = profile.level;
  const oldLevel = level;
  let nextXp = calculateXpForLevel(level);
  let didLevelUp = false;

  const unlockedAircraft: string[] = [];
  const unlockedGuns: string[] = [];
  const unlockedMissiles: string[] = [];

  const currentUnlockedPlanes = new Set(profile.unlockedAircraftIds);
  const currentUnlockedGuns = new Set(profile.unlockedGunIds);
  const currentUnlockedMissiles = new Set(profile.unlockedMissileIds);

  while (xp >= nextXp) {
    xp -= nextXp;
    level += 1;
    nextXp = calculateXpForLevel(level);
    didLevelUp = true;

    // Check unlocks for each reached level
    const unlocks = checkUnlocksForLevel(level);
    unlocks.newAircraft.forEach(id => {
      if (!currentUnlockedPlanes.has(id)) {
        currentUnlockedPlanes.add(id);
        unlockedAircraft.push(id);
      }
    });
    unlocks.newGuns.forEach(id => {
      if (!currentUnlockedGuns.has(id)) {
        currentUnlockedGuns.add(id);
        unlockedGuns.push(id);
      }
    });
    unlocks.newMissiles.forEach(id => {
      if (!currentUnlockedMissiles.has(id)) {
        currentUnlockedMissiles.add(id);
        unlockedMissiles.push(id);
      }
    });
  }

  const updatedProfile: PlayerProfile = {
    ...profile,
    level,
    xp,
    nextLevelXp: nextXp,
    credits: profile.credits + gainedCredits,
    unlockedAircraftIds: Array.from(currentUnlockedPlanes),
    unlockedGunIds: Array.from(currentUnlockedGuns),
    unlockedMissileIds: Array.from(currentUnlockedMissiles),
    totalKills: profile.totalKills + shahedCount + missileCount,
    shahedKills: profile.shahedKills + shahedCount,
    missileKills: profile.missileKills + missileCount,
    missionsCompleted: profile.missionsCompleted + 1,
  };

  savePlayerProfile(updatedProfile);

  return {
    updatedProfile,
    didLevelUp,
    oldLevel,
    newLevel: level,
    unlockedItems: {
      aircraft: unlockedAircraft,
      guns: unlockedGuns,
      missiles: unlockedMissiles,
    },
  };
}
