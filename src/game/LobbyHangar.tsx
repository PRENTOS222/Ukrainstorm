import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  AircraftConfig,
  PlayerProfile,
  MissionDef,
  Language,
  GunConfig,
  MissileConfig,
} from '../types';
import { AIRCRAFT_LIST, UPGRADE_CONFIG, calculateAircraftStats } from './aircraftData';
import { GUNS_LIST, MISSILES_LIST } from './weaponsData';
import { MISSIONS } from './missionsData';
import { createAircraftModel } from './threeModels';
import { getRankTitle, savePlayerProfile } from './storage';
import { soundManager } from '../audio/soundManager';
import {
  Shield,
  Zap,
  Crosshair,
  Volume2,
  VolumeX,
  Plane,
  Flame,
  Award,
  Lock,
  Check,
  ChevronRight,
  Sparkles,
  Gauge,
  Radio,
} from 'lucide-react';

interface LobbyHangarProps {
  profile: PlayerProfile;
  onStartMission: (aircraft: AircraftConfig, mission: MissionDef, updatedProfile: PlayerProfile) => void;
  onUpdateProfile: (updatedProfile: PlayerProfile) => void;
}

export const LobbyHangar: React.FC<LobbyHangarProps> = ({
  profile,
  onStartMission,
  onUpdateProfile,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<'hangar' | 'weapons' | 'upgrades' | 'missions'>('hangar');
  const [selectedAircraftId, setSelectedAircraftId] = useState<string>(profile.selectedAircraftId);
  const [selectedMissionId, setSelectedMissionId] = useState<string>('kyiv_night');
  const [currentProfile, setCurrentProfile] = useState<PlayerProfile>(profile);
  const [isAudioMuted, setIsAudioMuted] = useState(soundManager.isSoundMuted());

  const lang = currentProfile.language;

  const currentAircraft = AIRCRAFT_LIST.find(a => a.id === selectedAircraftId) || AIRCRAFT_LIST[0];
  const currentMission = MISSIONS.find(m => m.id === selectedMissionId) || MISSIONS[0];
  const aircraftUpgrades = currentProfile.upgrades[currentAircraft.id] || { guns: 1, missiles: 1, engine: 1, armor: 1, avionics: 1 };
  const currentStats = calculateAircraftStats(currentAircraft, aircraftUpgrades);

  // 3D Hangar Turntable Ref
  const hangarRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    aircraftGroup: THREE.Group;
    currentMesh: THREE.Group | null;
    isDragging: boolean;
    prevMouseX: number;
    rotationY: number;
    animId: number;
  } | null>(null);

  // Initialize 3D Hangar Turntable
  useEffect(() => {
    if (!canvasRef.current) return;
    const container = canvasRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050c18);
    scene.fog = new THREE.Fog(0x050c18, 12, 35);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 2.5, 7.8);
    camera.lookAt(0, 0.2, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Hangar Floor with circular glowing pad
    const padGeo = new THREE.CylinderGeometry(4.5, 4.5, 0.2, 32);
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.3,
      metalness: 0.8,
    });
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.y = -1.2;
    scene.add(pad);

    const ringGeo = new THREE.RingGeometry(3.8, 4.1, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = -1.08;
    scene.add(ring);

    // Atmospheric Hangar Spotlights
    const spot1 = new THREE.SpotLight(0x38bdf8, 8, 25, Math.PI / 4, 0.5);
    spot1.position.set(-4, 6, 4);
    spot1.target = pad;
    scene.add(spot1);

    const spot2 = new THREE.SpotLight(0xffd700, 6, 25, Math.PI / 4, 0.5);
    spot2.position.set(4, 6, -3);
    spot2.target = pad;
    scene.add(spot2);

    const amb = new THREE.AmbientLight(0x1e293b, 1.5);
    scene.add(amb);

    const aircraftGroup = new THREE.Group();
    scene.add(aircraftGroup);

    hangarRef.current = {
      scene,
      camera,
      renderer,
      aircraftGroup,
      currentMesh: null,
      isDragging: false,
      prevMouseX: 0,
      rotationY: -0.4,
      animId: 0,
    };

    // Render loop
    const animate = () => {
      if (hangarRef.current) {
        if (!hangarRef.current.isDragging) {
          hangarRef.current.rotationY += 0.004; // Smooth idle turntable rotation
        }
        hangarRef.current.aircraftGroup.rotation.y = hangarRef.current.rotationY;
        hangarRef.current.renderer.render(hangarRef.current.scene, hangarRef.current.camera);
        hangarRef.current.animId = requestAnimationFrame(animate);
      }
    };
    animate();

    const handleResize = () => {
      if (!canvasRef.current || !hangarRef.current) return;
      const w = canvasRef.current.clientWidth;
      const h = canvasRef.current.clientHeight;
      hangarRef.current.camera.aspect = w / h;
      hangarRef.current.camera.updateProjectionMatrix();
      hangarRef.current.renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (hangarRef.current) {
        cancelAnimationFrame(hangarRef.current.animId);
        hangarRef.current.renderer.dispose();
      }
    };
  }, []);

  // Update Aircraft Model in 3D Hangar whenever selection changes
  useEffect(() => {
    if (!hangarRef.current) return;
    const { aircraftGroup, scene } = hangarRef.current;

    // Clear old mesh
    while (aircraftGroup.children.length > 0) {
      const obj = aircraftGroup.children[0];
      aircraftGroup.remove(obj);
    }

    const newMesh = createAircraftModel(selectedAircraftId);
    newMesh.position.y = 0;
    aircraftGroup.add(newMesh);
    hangarRef.current.currentMesh = newMesh;
  }, [selectedAircraftId]);

  // Mouse drag to orbit in 3D Hangar
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!hangarRef.current) return;
    hangarRef.current.isDragging = true;
    hangarRef.current.prevMouseX = e.clientX;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!hangarRef.current || !hangarRef.current.isDragging) return;
    const deltaX = e.clientX - hangarRef.current.prevMouseX;
    hangarRef.current.prevMouseX = e.clientX;
    hangarRef.current.rotationY += deltaX * 0.01;
  };

  const handleMouseUp = () => {
    if (hangarRef.current) hangarRef.current.isDragging = false;
  };

  // Upgrade Purchase Handler
  const handleUpgrade = (type: 'guns' | 'missiles' | 'engine' | 'armor' | 'avionics') => {
    const currentLvl = aircraftUpgrades[type];
    if (currentLvl >= UPGRADE_CONFIG.maxLevel) return;

    const baseCost = UPGRADE_CONFIG.baseCosts[type];
    const cost = UPGRADE_CONFIG.costFormula(baseCost, currentLvl);

    if (currentProfile.credits < cost) return;

    soundManager.playUpgradeBought();

    const updatedProfile: PlayerProfile = {
      ...currentProfile,
      credits: currentProfile.credits - cost,
      upgrades: {
        ...currentProfile.upgrades,
        [currentAircraft.id]: {
          ...aircraftUpgrades,
          [type]: currentLvl + 1,
        },
      },
    };

    setCurrentProfile(updatedProfile);
    savePlayerProfile(updatedProfile);
    onUpdateProfile(updatedProfile);
  };

  // Select / Equip Aircraft
  const handleEquipAircraft = (plane: AircraftConfig) => {
    if (currentProfile.level < plane.unlockLevel) return;

    const updated: PlayerProfile = {
      ...currentProfile,
      selectedAircraftId: plane.id,
    };
    setSelectedAircraftId(plane.id);
    setCurrentProfile(updated);
    savePlayerProfile(updated);
    onUpdateProfile(updated);
    soundManager.playUpgradeBought();
  };

  // Equip Weapon
  const handleEquipGun = (gun: GunConfig) => {
    if (currentProfile.level < gun.unlockLevel) return;
    const updated: PlayerProfile = {
      ...currentProfile,
      selectedGunId: gun.id,
    };
    setCurrentProfile(updated);
    savePlayerProfile(updated);
    onUpdateProfile(updated);
    soundManager.playUpgradeBought();
  };

  const handleEquipMissile = (missile: MissileConfig) => {
    if (currentProfile.level < missile.unlockLevel) return;
    const updated: PlayerProfile = {
      ...currentProfile,
      selectedMissileId: missile.id,
    };
    setCurrentProfile(updated);
    savePlayerProfile(updated);
    onUpdateProfile(updated);
    soundManager.playUpgradeBought();
  };

  // Language Change
  const setLang = (l: Language) => {
    const updated = { ...currentProfile, language: l };
    setCurrentProfile(updated);
    savePlayerProfile(updated);
    onUpdateProfile(updated);
  };

  const toggleSound = () => {
    const next = !soundManager.isSoundMuted();
    soundManager.setMuted(next);
    setIsAudioMuted(next);
  };

  return (
    <div className="relative w-full h-screen bg-[#050c18] text-slate-100 flex flex-col select-none overflow-hidden font-rajdhani">
      {/* 3D Hangar Background Viewport */}
      <div
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Military Grid Overlay */}
      <div className="absolute inset-0 radar-grid opacity-30 pointer-events-none" />

      {/* HEADER: Pilot Rank, Level Progress, Credits, and Settings */}
      <header className="relative z-10 p-4 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md flex items-center justify-between">
        {/* Left: Pilot Rank and Level XP Bar */}
        <div className="flex items-center gap-4">
          <div className="relative flex items-center justify-center">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-sky-600 to-blue-900 border-2 border-sky-400/80 flex flex-col items-center justify-center shadow-[0_0_15px_rgba(56,189,248,0.4)]">
              <span className="text-[10px] uppercase font-chakra font-bold text-sky-200">LVL</span>
              <span className="text-2xl font-orbitron font-black text-white leading-none">{currentProfile.level}</span>
            </div>
            {currentProfile.level >= 12 && (
              <div className="absolute -bottom-1 -right-1 bg-cyan-400 text-slate-950 p-1 rounded-full shadow-[0_0_8px_#00f0ff]">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-orbitron font-bold text-white tracking-wider">
                {getRankTitle(currentProfile.level, lang)}
              </h1>
              <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 text-xs font-chakra font-bold border border-sky-500/30">
                ПС ЗСУ
              </span>
            </div>

            {/* XP Bar */}
            <div className="flex items-center gap-3 mt-1">
              <div className="w-48 h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/80">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 via-blue-400 to-yellow-400 transition-all duration-300"
                  style={{ width: `${Math.min(100, (currentProfile.xp / currentProfile.nextLevelXp) * 100)}%` }}
                />
              </div>
              <span className="text-xs font-chakra font-semibold text-slate-300">
                {currentProfile.xp} / {currentProfile.nextLevelXp} XP
              </span>
            </div>
          </div>
        </div>

        {/* Center: Mission Interception Record Badges */}
        <div className="hidden md:flex items-center gap-6 text-center font-chakra">
          <div>
            <div className="text-[11px] text-slate-400 uppercase tracking-wider">
              {lang === 'uk' ? 'Збито Шахедів' : lang === 'ru' ? 'Сбито Шахедов' : 'Shaheds Downed'}
            </div>
            <div className="text-xl font-orbitron font-bold text-sky-400">{currentProfile.shahedKills}</div>
          </div>
          <div className="h-8 w-px bg-slate-800" />
          <div>
            <div className="text-[11px] text-slate-400 uppercase tracking-wider">
              {lang === 'uk' ? 'Збито Ракет' : lang === 'ru' ? 'Сбито Ракет' : 'Missiles Downed'}
            </div>
            <div className="text-xl font-orbitron font-bold text-red-400">{currentProfile.missileKills}</div>
          </div>
          <div className="h-8 w-px bg-slate-800" />
          <div>
            <div className="text-[11px] text-slate-400 uppercase tracking-wider">
              {lang === 'uk' ? 'Бойові Вильоти' : lang === 'ru' ? 'Боевые Вылеты' : 'Missions Flown'}
            </div>
            <div className="text-xl font-orbitron font-bold text-emerald-400">{currentProfile.missionsCompleted}</div>
          </div>
        </div>

        {/* Right: Credits, Language & Audio */}
        <div className="flex items-center gap-3">
          {/* Credits Balance */}
          <div className="bg-slate-900/90 border border-yellow-500/40 px-3.5 py-1.5 rounded-lg flex items-center gap-2">
            <span className="text-yellow-400 font-bold text-sm">₴</span>
            <span className="text-base font-orbitron font-bold text-yellow-400">
              {currentProfile.credits.toLocaleString()}
            </span>
          </div>

          {/* Audio Toggle */}
          <button
            id="lobby-audio-toggle"
            onClick={toggleSound}
            className="p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition"
            title="Toggle Sound"
          >
            {isAudioMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-sky-400" />}
          </button>

          {/* Language Selector */}
          <div className="flex bg-slate-900 border border-slate-700 rounded-lg p-0.5 text-xs font-chakra font-bold">
            {(['uk', 'ru', 'en'] as Language[]).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-2 py-1 rounded transition uppercase ${
                  lang === l ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* NAVIGATION TABS */}
      <div className="relative z-10 px-6 pt-3 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2 bg-slate-950/80 backdrop-blur-md p-1 rounded-xl border border-slate-800">
          <button
            id="tab-hangar"
            onClick={() => setActiveTab('hangar')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-chakra font-bold text-sm tracking-wider uppercase transition ${
              activeTab === 'hangar'
                ? 'bg-sky-500 text-slate-950 shadow-[0_0_12px_rgba(56,189,248,0.5)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Plane className="w-4 h-4" />
            <span>{lang === 'uk' ? 'Ангар Літаків' : lang === 'ru' ? 'Ангар Самолетов' : 'Aircraft Hangar'}</span>
          </button>

          <button
            id="tab-weapons"
            onClick={() => setActiveTab('weapons')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-chakra font-bold text-sm tracking-wider uppercase transition ${
              activeTab === 'weapons'
                ? 'bg-sky-500 text-slate-950 shadow-[0_0_12px_rgba(56,189,248,0.5)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Crosshair className="w-4 h-4" />
            <span>{lang === 'uk' ? 'Озброєння' : lang === 'ru' ? 'Оружейная' : 'Armory'}</span>
          </button>

          <button
            id="tab-upgrades"
            onClick={() => setActiveTab('upgrades')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-chakra font-bold text-sm tracking-wider uppercase transition ${
              activeTab === 'upgrades'
                ? 'bg-sky-500 text-slate-950 shadow-[0_0_12px_rgba(56,189,248,0.5)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>{lang === 'uk' ? 'Прокачка ТТХ' : lang === 'ru' ? 'Прокачка ТТХ' : 'Tech Upgrades'}</span>
          </button>

          <button
            id="tab-missions"
            onClick={() => setActiveTab('missions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-chakra font-bold text-sm tracking-wider uppercase transition ${
              activeTab === 'missions'
                ? 'bg-sky-500 text-slate-950 shadow-[0_0_12px_rgba(56,189,248,0.5)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>{lang === 'uk' ? 'Сектори ППО' : lang === 'ru' ? 'Секторы ПВО' : 'Combat Sectors'}</span>
          </button>
        </div>

        {/* Launch Mission Action Button */}
        <button
          id="launch-mission-btn"
          onClick={() => onStartMission(currentAircraft, currentMission, currentProfile)}
          className="flex items-center gap-3 px-6 py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-950 font-orbitron font-black text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(234,179,8,0.4)] transition transform hover:scale-105"
        >
          <Flame className="w-5 h-5 text-slate-950" />
          <span>{lang === 'uk' ? 'В БІЙ: НА ПЕРЕХОПЛЕННЯ' : lang === 'ru' ? 'В БОЙ: НА ПЕРЕХВАТ' : 'SCRAMBLE INTERCEPT'}</span>
          <ChevronRight className="w-5 h-5 text-slate-950" />
        </button>
      </div>

      {/* MAIN CONTENT DRAWER / PANELS */}
      <div className="relative z-10 flex-1 p-6 flex flex-col justify-end pointer-events-none">
        {/* TAB 1: AIRCRAFT HANGAR */}
        {activeTab === 'hangar' && (
          <div className="w-full max-w-6xl mx-auto bg-slate-950/85 backdrop-blur-md rounded-2xl border border-slate-800 p-5 pointer-events-auto shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-orbitron font-bold text-white tracking-wider flex items-center gap-2">
                  <span>{currentAircraft.name}</span>
                  <span className="text-sky-400 text-sm font-chakra font-bold">«{currentAircraft.codename}»</span>
                  <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-300 font-chakra border border-slate-700">
                    {currentAircraft.generation}
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5 max-w-2xl font-chakra">
                  {currentAircraft.description[lang]}
                </p>
              </div>

              {/* Special Next-Gen Ability */}
              {currentAircraft.specialAbility && (
                <div className="bg-cyan-500/10 border border-cyan-400/40 px-3 py-1.5 rounded-xl text-right">
                  <div className="text-[10px] text-cyan-400 font-chakra uppercase font-bold flex items-center justify-end gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{currentAircraft.specialAbility.name[lang]}</span>
                  </div>
                  <div className="text-xs text-slate-300 font-chakra">
                    {currentAircraft.specialAbility.desc[lang]}
                  </div>
                </div>
              )}
            </div>

            {/* Aircraft Selection Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {AIRCRAFT_LIST.map(plane => {
                const isUnlocked = currentProfile.level >= plane.unlockLevel;
                const isSelected = selectedAircraftId === plane.id;
                const isNextGen = plane.id === 'sokil_x';

                return (
                  <div
                    key={plane.id}
                    onClick={() => {
                      setSelectedAircraftId(plane.id);
                      if (isUnlocked) handleEquipAircraft(plane);
                    }}
                    className={`relative p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? isNextGen
                          ? 'bg-slate-900 border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.4)]'
                          : 'bg-slate-900 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.3)]'
                        : isUnlocked
                        ? 'bg-slate-900/60 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
                        : 'bg-slate-950/80 border-slate-800/60 opacity-60'
                    }`}
                  >
                    {/* Badge for Next-Gen 6G */}
                    {isNextGen && (
                      <span className="absolute -top-2.5 right-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-orbitron font-bold text-[9px] shadow-[0_0_10px_#00f0ff]">
                        6G NEXT-GEN
                      </span>
                    )}

                    <div className="text-sm font-orbitron font-bold text-white mb-0.5">
                      {plane.name}
                    </div>
                    <div className="text-[11px] font-chakra text-slate-400 mb-2 truncate">
                      {plane.codename}
                    </div>

                    {/* Stats miniature bars */}
                    <div className="space-y-1 text-[10px] font-chakra text-slate-400">
                      <div className="flex justify-between">
                        <span>Швидкість</span>
                        <span className="text-sky-300 font-bold">{plane.baseStats.speed}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Міцність</span>
                        <span className="text-emerald-400 font-bold">{plane.baseStats.maxHealth} HP</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Ракети</span>
                        <span className="text-red-400 font-bold">x{plane.baseStats.missileMax}</span>
                      </div>
                    </div>

                    {/* Lock / Equip Status */}
                    <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-chakra font-bold">
                      {isUnlocked ? (
                        isSelected ? (
                          <span className="text-sky-400 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> {lang === 'uk' ? 'Обрано' : lang === 'ru' ? 'Выбран' : 'Equipped'}
                          </span>
                        ) : (
                          <span className="text-slate-400 hover:text-white">
                            {lang === 'uk' ? 'Вибрати' : lang === 'ru' ? 'Выбрать' : 'Select'}
                          </span>
                        )
                      ) : (
                        <span className="text-yellow-500/90 flex items-center gap-1 text-[11px]">
                          <Lock className="w-3 h-3" /> Рівень {plane.unlockLevel}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: WEAPONS & ARMORY */}
        {activeTab === 'weapons' && (
          <div className="w-full max-w-6xl mx-auto bg-slate-950/85 backdrop-blur-md rounded-2xl border border-slate-800 p-5 pointer-events-auto shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Guns & Autocannons Column */}
              <div>
                <h3 className="text-sm font-orbitron font-bold text-sky-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Crosshair className="w-4 h-4" />
                  <span>{lang === 'uk' ? 'Авіаційні Гармати та Кулемети' : lang === 'ru' ? 'Авиапушки и Пулеметы' : 'Autocannons & Guns'}</span>
                </h3>
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {GUNS_LIST.map(gun => {
                    const isUnlocked = currentProfile.level >= gun.unlockLevel;
                    const isEquipped = currentProfile.selectedGunId === gun.id;

                    return (
                      <div
                        key={gun.id}
                        onClick={() => isUnlocked && handleEquipGun(gun)}
                        className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                          isEquipped
                            ? gun.isEnergy
                              ? 'bg-slate-900 border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                              : 'bg-slate-900 border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.3)]'
                            : isUnlocked
                            ? 'bg-slate-900/60 hover:bg-slate-900 border-slate-800'
                            : 'bg-slate-950/80 border-slate-800/60 opacity-60'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-orbitron font-bold text-white text-sm">{gun.name[lang]}</span>
                            <span className="text-[10px] font-chakra px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                              {gun.caliber}
                            </span>
                            {gun.isEnergy && (
                              <span className="text-[9px] font-orbitron px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                                6G PLASMA
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-chakra text-slate-400 mt-1 flex items-center gap-3">
                            <span>Урон: <b className="text-white">{gun.damage}</b></span>
                            <span>Темп: <b className="text-white">{gun.fireRate} в/с</b></span>
                            <span>Швидкість кулі: <b className="text-white">{gun.bulletSpeed} м/с</b></span>
                          </div>
                        </div>

                        <div>
                          {isUnlocked ? (
                            isEquipped ? (
                              <span className="px-3 py-1 rounded bg-sky-500 text-slate-950 font-chakra font-bold text-xs flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> {lang === 'uk' ? 'Встановлено' : 'Установлено'}
                              </span>
                            ) : (
                              <button className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-chakra font-bold text-xs">
                                {lang === 'uk' ? 'Обрати' : 'Выбрать'}
                              </button>
                            )
                          ) : (
                            <span className="text-yellow-500 font-chakra font-bold text-xs flex items-center gap-1">
                              <Lock className="w-3 h-3" /> Ур. {gun.unlockLevel}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Guided Air-to-Air Missiles Column */}
              <div>
                <h3 className="text-sm font-orbitron font-bold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Flame className="w-4 h-4" />
                  <span>{lang === 'uk' ? 'Керовані Ракети «Повітря-Повітря»' : lang === 'ru' ? 'Управляемые Ракеты «Воздух-Воздух»' : 'Guided Missiles'}</span>
                </h3>
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {MISSILES_LIST.map(mis => {
                    const isUnlocked = currentProfile.level >= mis.unlockLevel;
                    const isEquipped = currentProfile.selectedMissileId === mis.id;

                    return (
                      <div
                        key={mis.id}
                        onClick={() => isUnlocked && handleEquipMissile(mis)}
                        className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                          isEquipped
                            ? mis.isHypersonic
                              ? 'bg-slate-900 border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                              : 'bg-slate-900 border-red-400 shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                            : isUnlocked
                            ? 'bg-slate-900/60 hover:bg-slate-900 border-slate-800'
                            : 'bg-slate-950/80 border-slate-800/60 opacity-60'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-orbitron font-bold text-white text-sm">{mis.name[lang]}</span>
                            <span className="text-[10px] font-chakra px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                              {mis.guidance}
                            </span>
                            {mis.isHypersonic && (
                              <span className="text-[9px] font-orbitron px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                                6G HYPERSONIC
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-chakra text-slate-400 mt-1 flex items-center gap-3">
                            <span>Урон: <b className="text-white">{mis.damage}</b></span>
                            <span>Захоплення: <b className="text-white">{mis.lockTime} сек</b></span>
                            <span>Дальність: <b className="text-white">{mis.lockRange} м</b></span>
                          </div>
                        </div>

                        <div>
                          {isUnlocked ? (
                            isEquipped ? (
                              <span className="px-3 py-1 rounded bg-red-500 text-white font-chakra font-bold text-xs flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> {lang === 'uk' ? 'Встановлено' : 'Установлено'}
                              </span>
                            ) : (
                              <button className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-chakra font-bold text-xs">
                                {lang === 'uk' ? 'Обрати' : 'Выбрать'}
                              </button>
                            )
                          ) : (
                            <span className="text-yellow-500 font-chakra font-bold text-xs flex items-center gap-1">
                              <Lock className="w-3 h-3" /> Ур. {mis.unlockLevel}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: UPGRADES / TECH TREE */}
        {activeTab === 'upgrades' && (
          <div className="w-full max-w-5xl mx-auto bg-slate-950/85 backdrop-blur-md rounded-2xl border border-slate-800 p-5 pointer-events-auto shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-orbitron font-bold text-white tracking-wider">
                  {lang === 'uk' ? `Модернізація: ${currentAircraft.name}` : `Модернизация: ${currentAircraft.name}`}
                </h3>
                <p className="text-xs font-chakra text-slate-400">
                  {lang === 'uk'
                    ? 'Покращуйте тактико-технічні характеристики поточного винищувача за зароблені кредити ₴.'
                    : 'Улучшайте тактико-технические характеристики текущего истребителя за заработанные кредиты ₴.'}
                </p>
              </div>

              <div className="text-right font-chakra">
                <span className="text-xs text-slate-400">Баланс: </span>
                <span className="text-lg font-orbitron font-bold text-yellow-400">
                  ₴ {currentProfile.credits.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(['guns', 'missiles', 'engine', 'armor', 'avionics'] as const).map(type => {
                const currentLvl = aircraftUpgrades[type];
                const isMax = currentLvl >= UPGRADE_CONFIG.maxLevel;
                const cost = isMax ? 0 : UPGRADE_CONFIG.costFormula(UPGRADE_CONFIG.baseCosts[type], currentLvl);
                const canAfford = currentProfile.credits >= cost;

                return (
                  <div key={type} className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-orbitron font-bold text-sm text-sky-300">
                          {UPGRADE_CONFIG.titles[type][lang]}
                        </span>
                        {/* Stars */}
                        <div className="flex gap-1 text-yellow-400 text-xs">
                          {Array.from({ length: UPGRADE_CONFIG.maxLevel }).map((_, idx) => (
                            <span key={idx}>{idx < currentLvl ? '★' : '☆'}</span>
                          ))}
                        </div>
                      </div>
                      <p className="text-[11px] font-chakra text-slate-400 mb-3">
                        {UPGRADE_CONFIG.descriptions[type][lang]}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-xs font-chakra text-slate-300">
                        {isMax ? (
                          <span className="text-emerald-400 font-bold">MAX РІВЕНЬ</span>
                        ) : (
                          <span>Ціна: <b className="text-yellow-400">₴ {cost.toLocaleString()}</b></span>
                        )}
                      </span>

                      {!isMax && (
                        <button
                          onClick={() => handleUpgrade(type)}
                          disabled={!canAfford}
                          className={`px-3 py-1 rounded-lg text-xs font-chakra font-bold uppercase transition ${
                            canAfford
                              ? 'bg-yellow-500 hover:bg-yellow-400 text-slate-950 shadow-md'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          {lang === 'uk' ? 'Покращити' : 'Прокачать'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: COMBAT SECTORS / MISSIONS */}
        {activeTab === 'missions' && (
          <div className="w-full max-w-5xl mx-auto bg-slate-950/85 backdrop-blur-md rounded-2xl border border-slate-800 p-5 pointer-events-auto shadow-2xl">
            <h3 className="text-lg font-orbitron font-bold text-white tracking-wider mb-3">
              {lang === 'uk' ? 'Вибір Сектора Повітряної Оборони' : 'Выбор Сектора Воздушной Обороны'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {MISSIONS.map(m => {
                const isSelected = selectedMissionId === m.id;

                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMissionId(m.id)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-slate-900 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.3)]'
                        : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-orbitron font-bold text-sm text-white">{m.sectorName[lang]}</span>
                        <span
                          className={`text-[10px] font-chakra font-bold px-1.5 py-0.5 rounded uppercase ${
                            m.difficulty === 'normal'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : m.difficulty === 'hard'
                              ? 'bg-amber-500/20 text-amber-300'
                              : m.difficulty === 'extreme'
                              ? 'bg-red-500/20 text-red-300'
                              : 'bg-purple-500/20 text-purple-300'
                          }`}
                        >
                          {m.difficulty}
                        </span>
                      </div>
                      <p className="text-xs font-chakra text-sky-400/90 mb-2">
                        {m.subtitle[lang]}
                      </p>
                      <p className="text-[11px] font-chakra text-slate-400 line-clamp-3 mb-3">
                        {m.briefing[lang]}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-chakra">
                      <span className="text-yellow-400 font-bold">+ {m.rewardCredits} ₴</span>
                      <span className="text-sky-300 font-semibold">+ {m.rewardXp} XP</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
