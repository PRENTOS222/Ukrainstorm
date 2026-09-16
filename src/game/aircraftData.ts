import { AircraftConfig, AircraftUpgradeLevel, AircraftStats } from '../types';

export const AIRCRAFT_LIST: AircraftConfig[] = [
  {
    id: 'mig29',
    name: 'МіГ-29',
    codename: 'Привид (Ghost)',
    generation: 'Gen 4 Interceptor',
    role: 'Фронтовий перехоплювач',
    description: {
      uk: 'Легендарний легкий винищувач-перехоплювач. Відмінна маневреність на віражах та перевірена часом 30-мм автоматична гармата.',
      ru: 'Легендарный легкий истребитель-перехватчик. Отличная маневренность и проверенная временем 30-мм автопушка.',
      en: 'Legendary lightweight interceptor. Superb dogfight agility and battle-tested 30mm autocannon.',
    },
    unlockLevel: 1,
    unlockCost: 0,
    baseStats: {
      speed: 380,
      maxHealth: 100,
      armor: 0.1,
      gunDamage: 22,
      gunFireRate: 11, // rounds/sec
      gunHeatRate: 0.08,
      gunCoolRate: 0.35,
      missileMax: 4,
      missileDamage: 120,
      missileReloadTime: 6.5,
      missileLockRange: 420,
      missileLockTime: 1.2,
      flareCount: 3,
    },
    statMultipliers: {
      guns: { damage: 1.15, fireRate: 1.1 },
      missiles: { damage: 1.18, capacity: 1, lockTime: 0.88 },
      engine: { speed: 1.08, afterburner: 1.12 },
      armor: { health: 1.15, defense: 1.05 },
      avionics: { lockRange: 1.12, leadAssist: 1.1 },
    },
    colorScheme: {
      primary: '#3b82f6', // Ukrainian digital blue
      secondary: '#1e293b',
      accent: '#facc15', // Yellow accents
      glow: 'rgba(59, 130, 246, 0.4)',
      afterburner: '#f97316',
    },
  },
  {
    id: 'su27',
    name: 'Су-27',
    codename: 'Фланкер (Flanker)',
    generation: 'Gen 4 Heavy Interceptor',
    role: 'Важкий винищувач завоювання переваги',
    description: {
      uk: 'Важкий двомоторний перехоплювач із розширеним ракетним арсеналом, підвищеною міцністю корпусу та потужним радаром.',
      ru: 'Тяжелый двухдвигательный перехватчик с увеличенным ракетным арсеналом, повышенной прочностью и мощным радаром.',
      en: 'Heavy twin-engine air superiority fighter with increased missile loadout and heavy reinforced airframe.',
    },
    unlockLevel: 3,
    unlockCost: 1500,
    baseStats: {
      speed: 400,
      maxHealth: 140,
      armor: 0.18,
      gunDamage: 26,
      gunFireRate: 10,
      gunHeatRate: 0.07,
      gunCoolRate: 0.4,
      missileMax: 6,
      missileDamage: 140,
      missileReloadTime: 6.0,
      missileLockRange: 460,
      missileLockTime: 1.1,
      flareCount: 4,
    },
    statMultipliers: {
      guns: { damage: 1.18, fireRate: 1.08 },
      missiles: { damage: 1.2, capacity: 1, lockTime: 0.85 },
      engine: { speed: 1.09, afterburner: 1.14 },
      armor: { health: 1.2, defense: 1.08 },
      avionics: { lockRange: 1.15, leadAssist: 1.12 },
    },
    colorScheme: {
      primary: '#0284c7',
      secondary: '#0f172a',
      accent: '#38bdf8',
      glow: 'rgba(2, 132, 199, 0.4)',
      afterburner: '#ea580c',
    },
  },
  {
    id: 'f16',
    name: 'F-16AM',
    codename: 'Бойовий Сокіл (Fighting Falcon)',
    generation: 'Gen 4.5 Multirole',
    role: 'Багатоцільовий високоефективний винищувач',
    description: {
      uk: 'Швидкісна 20-мм шестиствольна гармата M61A1 Vulcan та надсучасний радар APG-68 для миттєвого захоплення швидкісних цілей.',
      ru: 'Скорострельная 20-мм шестиствольная пушка M61A1 Vulcan и радар APG-68 для мгновенного захвата скоростных целей.',
      en: 'Equipped with M61A1 Vulcan 6-barrel rotary cannon and APG-68 radar for split-second multi-target lock-on.',
    },
    unlockLevel: 6,
    unlockCost: 3500,
    baseStats: {
      speed: 430,
      maxHealth: 120,
      armor: 0.14,
      gunDamage: 18,
      gunFireRate: 18, // High-rate rotary cannon
      gunHeatRate: 0.05,
      gunCoolRate: 0.45,
      missileMax: 6,
      missileDamage: 150,
      missileReloadTime: 5.0,
      missileLockRange: 500,
      missileLockTime: 0.85,
      flareCount: 5,
    },
    statMultipliers: {
      guns: { damage: 1.14, fireRate: 1.15 },
      missiles: { damage: 1.22, capacity: 1, lockTime: 0.82 },
      engine: { speed: 1.1, afterburner: 1.15 },
      armor: { health: 1.16, defense: 1.06 },
      avionics: { lockRange: 1.18, leadAssist: 1.15 },
    },
    colorScheme: {
      primary: '#475569', // NATO Ghost Gray
      secondary: '#1e293b',
      accent: '#38bdf8',
      glow: 'rgba(56, 189, 248, 0.45)',
      afterburner: '#fb923c',
    },
  },
  {
    id: 'mirage2000',
    name: 'Mirage 2000-5',
    codename: 'Міраж (Mirage)',
    generation: 'Gen 4.5 Delta-Wing',
    role: 'Висотно-швидкісний перехоплювач',
    description: {
      uk: 'Безхвоста трикутна аеродинамічна схема «дельта». Блискавичний розгін, спарені 30-мм гармати DEFA та ракети MICA.',
      ru: 'Бесхвостая треугольная дельта-схема. Молниеносный разгон, спаренные 30-мм пушки DEFA и ракеты MICA.',
      en: 'Delta-wing aerodynamics. Blistering acceleration, dual DEFA 30mm cannons, and precision MICA air-to-air missiles.',
    },
    unlockLevel: 9,
    unlockCost: 6500,
    baseStats: {
      speed: 450,
      maxHealth: 130,
      armor: 0.15,
      gunDamage: 32, // Twin cannons
      gunFireRate: 13,
      gunHeatRate: 0.065,
      gunCoolRate: 0.48,
      missileMax: 6,
      missileDamage: 175,
      missileReloadTime: 4.8,
      missileLockRange: 530,
      missileLockTime: 0.75,
      flareCount: 5,
    },
    statMultipliers: {
      guns: { damage: 1.16, fireRate: 1.12 },
      missiles: { damage: 1.22, capacity: 1, lockTime: 0.8 },
      engine: { speed: 1.12, afterburner: 1.16 },
      armor: { health: 1.18, defense: 1.08 },
      avionics: { lockRange: 1.2, leadAssist: 1.18 },
    },
    colorScheme: {
      primary: '#334155',
      secondary: '#0f172a',
      accent: '#06b6d4',
      glow: 'rgba(6, 182, 212, 0.5)',
      afterburner: '#38bdf8',
    },
  },
  {
    id: 'sokil_x',
    name: 'Сокіл-X (Sokil-X)',
    codename: 'Тризуб-6G (Trident 6G)',
    generation: 'Gen 6 Next-Gen Stealth Interceptor',
    role: 'Гіперзвуковий винищувач нового покоління',
    description: {
      uk: 'ПЕРЕДОВИЙ ЛІТАК НОВОГО ПОКОЛІННЯ! Оснащений енергетичним щитом, імпульсним рейкотроном, квантовим радаром та роєм гіперзвукових ракет.',
      ru: 'ПЕРЕДОВОЙ САМОЛЕТ НОВОГО ПОКОЛЕНИЯ! Оснащен энергощитом, импульсным рельсотроном, квантовым радаром и роем гиперзвуковых ракет.',
      en: 'NEXT-GENERATION 6TH GEN INTERCEPTOR! Equipped with plasma deflector shields, hyper-velocity railgun, and hypersonic swarm seeker missiles.',
    },
    unlockLevel: 12,
    unlockCost: 12000,
    baseStats: {
      speed: 520,
      maxHealth: 180,
      armor: 0.28,
      gunDamage: 45, // Kinetic Railgun
      gunFireRate: 16,
      gunHeatRate: 0.04,
      gunCoolRate: 0.65,
      missileMax: 8,
      missileDamage: 240,
      missileReloadTime: 3.8,
      missileLockRange: 650,
      missileLockTime: 0.5,
      flareCount: 8,
      shieldCapacity: 100, // Regenerating Energy Shield!
      shieldRegen: 15,
    },
    statMultipliers: {
      guns: { damage: 1.25, fireRate: 1.15 },
      missiles: { damage: 1.25, capacity: 1, lockTime: 0.75 },
      engine: { speed: 1.14, afterburner: 1.2 },
      armor: { health: 1.22, defense: 1.1 },
      avionics: { lockRange: 1.22, leadAssist: 1.22 },
    },
    colorScheme: {
      primary: '#0f172a', // Matte Stealth Carbon
      secondary: '#020617',
      accent: '#00f0ff', // Cybernetic Plasma Cyan
      glow: 'rgba(0, 240, 255, 0.7)',
      afterburner: '#00f0ff', // Blue-cyan plasma exhaust!
    },
    specialAbility: {
      name: {
        uk: 'Плазмовий Щит & Гіперзвуковий Рой',
        ru: 'Плазменный Щит & Гиперзвуковой Рой',
        en: 'Plasma Shield & Hypersonic Swarm',
      },
      desc: {
        uk: 'Автоматичне відновлення щита та миттєве захоплення до 3 цілей одночасно.',
        ru: 'Автоматическое восстановление щита и мгновенный захват до 3 целей одновременно.',
        en: 'Auto-regenerating deflector shield and instant multi-drone targeting lock.',
      },
      type: 'plasma_shield',
    },
  },
];

export const UPGRADE_CONFIG = {
  maxLevel: 5,
  costFormula: (baseCost: number, level: number) => Math.round(baseCost * Math.pow(1.65, level - 1)),
  baseCosts: {
    guns: 350,
    missiles: 450,
    engine: 300,
    armor: 400,
    avionics: 380,
  },
  titles: {
    guns: {
      uk: 'Авіаційна гармата',
      ru: 'Авиационная пушка',
      en: 'Autocannon',
    },
    missiles: {
      uk: 'Керовані ракети',
      ru: 'Управляемые ракеты',
      en: 'Guided Missiles',
    },
    engine: {
      uk: 'Двигун та форсаж',
      ru: 'Двигатель и форсаж',
      en: 'Engine & Afterburner',
    },
    armor: {
      uk: 'Броня та живучість',
      ru: 'Броня и живучесть',
      en: 'Armor & Durability',
    },
    avionics: {
      uk: 'Авіоніка та РЛС',
      ru: 'Авионика и РЛС',
      en: 'Avionics & Radar',
    },
  },
  descriptions: {
    guns: {
      uk: 'Збільшує темп стрільби, шкоду та швидкість охолодження ствола.',
      ru: 'Увеличивает скорострельность, урон и скорость охлаждения орудия.',
      en: 'Increases fire rate, caliber damage, and heat dissipation.',
    },
    missiles: {
      uk: 'Збільшує боєзапас, швидкість захоплення цілі та радіус ураження.',
      ru: 'Увеличивает боезапас, скорость захвата цели и радиус взрыва.',
      en: 'Boosts missile capacity, acquisition speed, and explosive radius.',
    },
    engine: {
      uk: 'Підвищує максимальну швидкість польоту, тягу форсажу та прискорення.',
      ru: 'Повышает максимальную скорость, тягу форсажа и ускорение.',
      en: 'Increases top speed, afterburner thrust, and maneuvering acceleration.',
    },
    armor: {
      uk: 'Підвищує запас міцності літака та зменшує отримані ушкодження.',
      ru: 'Повышает запас прочности самолета и снижает получаемый урон.',
      en: 'Reinforces fuselage structural integrity and mitigates damage.',
    },
    avionics: {
      uk: 'Збільшує радіус виявлення шахедів на радарі та оптичний автоприціл.',
      ru: 'Увеличивает радиус обнаружения шахедов на радаре и автоприцел.',
      en: 'Expands radar detection range and optical lead computing accuracy.',
    },
  },
};

export function calculateAircraftStats(config: AircraftConfig, upgrades: AircraftUpgradeLevel): AircraftStats {
  const base = config.baseStats;
  const mult = config.statMultipliers;

  const gunLvl = upgrades.guns - 1;
  const misLvl = upgrades.missiles - 1;
  const engLvl = upgrades.engine - 1;
  const armLvl = upgrades.armor - 1;
  const aviLvl = upgrades.avionics - 1;

  const speed = base.speed * Math.pow(mult.engine.speed, engLvl);
  const maxHealth = Math.round(base.maxHealth * Math.pow(mult.armor.health, armLvl));
  const armor = Math.min(0.65, base.armor * Math.pow(mult.armor.defense, armLvl));

  const gunDamage = Math.round(base.gunDamage * Math.pow(mult.guns.damage, gunLvl));
  const gunFireRate = Number((base.gunFireRate * Math.pow(mult.guns.fireRate, gunLvl)).toFixed(1));
  const gunHeatRate = Math.max(0.02, base.gunHeatRate * (1 - gunLvl * 0.08));
  const gunCoolRate = Number((base.gunCoolRate * (1 + gunLvl * 0.15)).toFixed(2));

  const missileMax = base.missileMax + misLvl * mult.missiles.capacity;
  const missileDamage = Math.round(base.missileDamage * Math.pow(mult.missiles.damage, misLvl));
  const missileLockRange = Math.round(base.missileLockRange * Math.pow(mult.avionics.lockRange, aviLvl));
  const missileLockTime = Math.max(0.25, Number((base.missileLockTime * Math.pow(mult.missiles.lockTime, misLvl)).toFixed(2)));

  const flareCount = base.flareCount + Math.floor(armLvl / 2);
  const shieldCapacity = base.shieldCapacity ? Math.round(base.shieldCapacity * (1 + armLvl * 0.2)) : undefined;
  const shieldRegen = base.shieldRegen ? Math.round(base.shieldRegen * (1 + aviLvl * 0.15)) : undefined;

  return {
    speed,
    maxHealth,
    armor,
    gunDamage,
    gunFireRate,
    gunHeatRate,
    gunCoolRate,
    missileMax,
    missileDamage,
    missileReloadTime: Math.max(2.5, base.missileReloadTime - misLvl * 0.5),
    missileLockRange,
    missileLockTime,
    flareCount,
    shieldCapacity,
    shieldRegen,
  };
}
