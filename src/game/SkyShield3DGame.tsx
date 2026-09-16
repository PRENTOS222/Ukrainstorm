import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import confetti from 'canvas-confetti';
import {
  AircraftConfig,
  PlayerProfile,
  MissionDef,
  CombatHUDState,
  Language,
} from '../types';
import { calculateAircraftStats } from './aircraftData';
import { GUNS_LIST, MISSILES_LIST } from './weaponsData';
import {
  createAircraftModel,
  createShahed136Model,
  createShahed238JetModel,
  createCruiseMissileModel,
  createScoutDroneModel,
  createAirToAirMissileModel,
  createSearchlightBeam,
} from './threeModels';
import { soundManager } from '../audio/soundManager';
import { addPlayerRewards, getRankTitle, RewardsResult } from './storage';
import { 
  Volume2, 
  VolumeX, 
  Target, 
  ShieldAlert, 
  Flame, 
  Crosshair, 
  Award, 
  RotateCcw, 
  ArrowLeft,
  ChevronsUp
} from 'lucide-react';

interface GameProps {
  aircraft: AircraftConfig;
  profile: PlayerProfile;
  mission: MissionDef;
  onExitToLobby: (updatedProfile: PlayerProfile) => void;
  lang: Language;
}

interface EnemyEntity {
  id: string;
  type: 'shahed136' | 'shahed238_jet' | 'cruise_missile' | 'scout_drone';
  mesh: THREE.Group;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  speed: number;
  health: number;
  maxHealth: number;
  points: number;
  xpReward: number;
  radius: number;
}

interface PlayerMissileEntity {
  id: string;
  mesh: THREE.Group;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  targetId: string | null;
  speed: number;
  turnRate: number;
  damage: number;
  blastRadius: number;
  lifetime: number;
  maxLifetime: number;
}

interface BulletEntity {
  mesh: THREE.Mesh;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  damage: number;
  lifetime: number;
  isEnergy?: boolean;
}

interface ExplosionEntity {
  mesh: THREE.Mesh;
  particles: THREE.Points;
  pos: THREE.Vector3;
  radius: number;
  maxRadius: number;
  age: number;
  maxAge: number;
}

interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
  opacity: number;
}

export const SkyShield3DGame: React.FC<GameProps> = ({
  aircraft,
  profile,
  mission,
  onExitToLobby,
  lang,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Profile and progression state
  const [currentProfile, setCurrentProfile] = useState<PlayerProfile>(profile);
  const [levelUpModal, setLevelUpModal] = useState<RewardsResult | null>(null);

  // HUD and game telemetry state
  const [hud, setHud] = useState<CombatHUDState>({
    health: 100,
    maxHealth: 100,
    shield: 0,
    maxShield: 0,
    gunHeat: 0,
    gunOverheated: false,
    missilesCount: 4,
    maxMissiles: 4,
    missileCooldown: 0,
    flaresCount: 3,
    cityDefense: mission.cityDefenseHp,
    maxCityDefense: mission.cityDefenseHp,
    lockedEnemyId: null,
    lockingEnemyId: null,
    lockProgress: 0,
    score: 0,
    kills: 0,
    wave: 1,
    speedKmh: 650,
    altitudeMeters: 1400,
    throttle: 0.7,
  });

  const [gameOver, setGameOver] = useState<'victory' | 'defeat' | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [cameraMode, setCameraMode] = useState<'chase' | 'cockpit'>('chase');

  // Active weapons configs
  const activeGun = GUNS_LIST.find(g => g.id === currentProfile.selectedGunId) || GUNS_LIST[0];
  const activeMissile = MISSILES_LIST.find(m => m.id === currentProfile.selectedMissileId) || MISSILES_LIST[0];
  const stats = calculateAircraftStats(aircraft, currentProfile.upgrades[aircraft.id] || { guns: 1, missiles: 1, engine: 1, armor: 1, avionics: 1 });

  // Floating text id generator
  const floatIdRef = useRef(0);
  const addFloatingText = (text: string, x: number, y: number, color = '#38bdf8') => {
    const id = ++floatIdRef.current;
    setFloatingTexts(prev => [...prev.slice(-6), { id, text, x, y, color, opacity: 1 }]);
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(t => t.id !== id));
    }, 1400);
  };

  // Keyboard and mouse control states
  const controlsRef = useRef({
    pitchUp: false,
    pitchDown: false,
    rollLeft: false,
    rollRight: false,
    throttleUp: false,
    throttleDown: false,
    afterburner: false,
    fireGun: false,
    fireMissile: false,
    mouseActive: false,
    mouseX: 0,
    mouseY: 0,
  });

  // Main 3D game loop reference
  const gameRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    aircraftMesh: THREE.Group;
    enemies: EnemyEntity[];
    bullets: BulletEntity[];
    missiles: PlayerMissileEntity[];
    explosions: ExplosionEntity[];
    searchlights: THREE.Group[];
    afterburners: THREE.Object3D[];
    shieldMesh?: THREE.Mesh;
    // Runtime values
    aircraftPos: THREE.Vector3;
    aircraftRot: THREE.Euler;
    aircraftVel: THREE.Vector3;
    throttle: number;
    health: number;
    maxHealth: number;
    shield: number;
    maxShield: number;
    gunHeat: number;
    gunOverheated: boolean;
    gunCooldownTimer: number;
    gunLastFired: number;
    missilesCount: number;
    maxMissiles: number;
    missileLastFired: number;
    missileRestockTimer: number;
    cityDefense: number;
    score: number;
    kills: number;
    shahedKills: number;
    missileKills: number;
    wave: number;
    spawnTimer: number;
    lockingTargetId: string | null;
    lockTimeAccum: number;
    lockedTargetId: string | null;
    animationFrameId: number;
    isDestroyed: boolean;
  } | null>(null);

  // Initialize Three.js Game World
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene & Atmosphere
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050c18, 0.0004);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(65, width / height, 0.5, 8000);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0x1e293b, 1.2);
    scene.add(ambientLight);

    const moonLight = new THREE.DirectionalLight(0x93c5fd, 2.0);
    moonLight.position.set(500, 1500, -800);
    scene.add(moonLight);

    // 5. Ground (Ukrainian terrain & glowing cities/infrastructure)
    const groundGeo = new THREE.PlaneGeometry(16000, 16000, 48, 48);
    groundGeo.rotateX(-Math.PI / 2);

    // Procedural terrain grid with city light nodes
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x050a14,
      roughness: 0.9,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = -600;
    scene.add(ground);

    // Glowing city light clusters on the ground
    const cityLightsGeo = new THREE.BufferGeometry();
    const cityLightPos: number[] = [];
    const cityLightColors: number[] = [];
    for (let i = 0; i < 1800; i++) {
      const x = (Math.random() - 0.5) * 12000;
      const z = (Math.random() - 0.5) * 12000;
      cityLightPos.push(x, -590, z);
      const isSodium = Math.random() > 0.4;
      if (isSodium) {
        cityLightColors.push(1.0, 0.7, 0.2); // Warm orange streetlights
      } else {
        cityLightColors.push(0.3, 0.8, 1.0); // Cyan/cool urban LED
      }
    }
    cityLightsGeo.setAttribute('position', new THREE.Float32BufferAttribute(cityLightPos, 3));
    cityLightsGeo.setAttribute('color', new THREE.Float32BufferAttribute(cityLightColors, 3));
    const cityLightsMat = new THREE.PointsMaterial({
      size: 16,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const cityPoints = new THREE.Points(cityLightsGeo, cityLightsMat);
    scene.add(cityPoints);

    // 6. Searchlight Beams from Ukrainian Air Defense on Ground
    const searchlights: THREE.Group[] = [];
    const searchlightCoords = [
      [-1200, 400], [1200, 500], [0, 800], [-800, -600], [900, -500],
      [-2000, 1200], [2200, 1400], [-400, 1600], [500, 1800]
    ];
    searchlightCoords.forEach(([sx, sz]) => {
      const beam = createSearchlightBeam();
      beam.position.set(sx, -590, sz);
      beam.rotation.x = -Math.PI / 3 + (Math.random() - 0.5) * 0.3;
      beam.rotation.y = Math.random() * Math.PI * 2;
      scene.add(beam);
      searchlights.push(beam);
    });

    // 7. Dynamic Starfield / Night Sky Dome
    const starGeo = new THREE.BufferGeometry();
    const starPos: number[] = [];
    for (let i = 0; i < 2200; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 5500;
      starPos.push(
        r * Math.sin(phi) * Math.cos(theta),
        Math.abs(r * Math.cos(phi)) + 100, // Keep in upper hemisphere
        r * Math.sin(phi) * Math.sin(theta)
      );
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 8, transparent: true, opacity: 0.9 });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // 8. Player Aircraft Mesh
    const aircraftMesh = createAircraftModel(aircraft.id);
    scene.add(aircraftMesh);

    // Extract afterburner meshes
    const afterburners: THREE.Object3D[] = [];
    aircraftMesh.traverse((obj) => {
      if (obj.name.startsWith('afterburner')) {
        afterburners.push(obj);
      }
    });

    let shieldMesh: THREE.Mesh | undefined;
    aircraftMesh.traverse((obj) => {
      if (obj.name === 'plasma_shield_mesh' && obj instanceof THREE.Mesh) {
        shieldMesh = obj;
      }
    });

    // Initial Aircraft State
    const maxMissiles = stats.missileMax + activeMissile.capacityBonus;
    const maxShield = stats.shieldCapacity || 0;

    gameRef.current = {
      scene,
      camera,
      renderer,
      aircraftMesh,
      enemies: [],
      bullets: [],
      missiles: [],
      explosions: [],
      searchlights,
      afterburners,
      shieldMesh,
      aircraftPos: new THREE.Vector3(0, 400, 0),
      aircraftRot: new THREE.Euler(0, 0, 0, 'YXZ'),
      aircraftVel: new THREE.Vector3(0, 0, -stats.speed),
      throttle: 0.7,
      health: stats.maxHealth,
      maxHealth: stats.maxHealth,
      shield: maxShield,
      maxShield: maxShield,
      gunHeat: 0,
      gunOverheated: false,
      gunCooldownTimer: 0,
      gunLastFired: 0,
      missilesCount: maxMissiles,
      maxMissiles,
      missileLastFired: 0,
      missileRestockTimer: 0,
      cityDefense: mission.cityDefenseHp,
      score: 0,
      kills: 0,
      shahedKills: 0,
      missileKills: 0,
      wave: 1,
      spawnTimer: 1000,
      lockingTargetId: null,
      lockTimeAccum: 0,
      lockedTargetId: null,
      animationFrameId: 0,
      isDestroyed: false,
    };

    soundManager.startEngine();

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !gameRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      gameRef.current.camera.aspect = w / h;
      gameRef.current.camera.updateProjectionMatrix();
      gameRef.current.renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Start 60fps Game Loop
    let lastTime = performance.now();
    const gameLoop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      if (!isPaused && gameRef.current) {
        updateGameWorld(dt, now);
      }

      if (gameRef.current) {
        gameRef.current.renderer.render(gameRef.current.scene, gameRef.current.camera);
        gameRef.current.animationFrameId = requestAnimationFrame(gameLoop);
      }
    };
    gameRef.current.animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('resize', handleResize);
      soundManager.stopEngine();
      soundManager.stopShahedBuzz();
      soundManager.stopLockTone();
      if (gameRef.current) {
        cancelAnimationFrame(gameRef.current.animationFrameId);
        gameRef.current.renderer.dispose();
      }
    };
  }, [aircraft.id, mission.id]);

  // Main 3D Physics and Combat Update Loop
  const updateGameWorld = (dt: number, now: number) => {
    const game = gameRef.current;
    if (!game || game.isDestroyed) return;

    const ctrl = controlsRef.current;

    // --- 1. Player Flight Controls & Aerodynamics ---
    const pitchRate = 1.4 * dt;
    const rollRate = 2.4 * dt;
    const yawRate = 0.8 * dt;

    // Pitch
    if (ctrl.pitchDown) game.aircraftRot.x += pitchRate;
    if (ctrl.pitchUp) game.aircraftRot.x -= pitchRate;

    // Roll & Bank turn
    if (ctrl.rollLeft) {
      game.aircraftRot.z += rollRate;
      game.aircraftRot.y += yawRate;
    }
    if (ctrl.rollRight) {
      game.aircraftRot.z -= rollRate;
      game.aircraftRot.y -= yawRate;
    }

    // Mouse aiming assist
    if (ctrl.mouseActive) {
      game.aircraftRot.x += ctrl.mouseY * 0.015;
      game.aircraftRot.y -= ctrl.mouseX * 0.02;
      game.aircraftRot.z -= ctrl.mouseX * 0.035;
    }

    // Auto-level roll dampening
    if (!ctrl.rollLeft && !ctrl.rollRight && !ctrl.mouseActive) {
      game.aircraftRot.z *= 0.95;
    }

    // Clamp pitch to avoid extreme gimbal lock
    game.aircraftRot.x = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, game.aircraftRot.x));

    // Throttle & Afterburner
    if (ctrl.throttleUp) game.throttle = Math.min(1.0, game.throttle + 0.5 * dt);
    if (ctrl.throttleDown) game.throttle = Math.max(0.35, game.throttle - 0.5 * dt);

    const isBoosting = ctrl.afterburner;
    const currentSpeed = (stats.speed * (0.6 + game.throttle * 0.6)) * (isBoosting ? 1.55 : 1.0);

    soundManager.updateEnginePitch(game.throttle, isBoosting);

    // Apply rotation and forward movement
    game.aircraftMesh.rotation.copy(game.aircraftRot);

    const forwardDir = new THREE.Vector3(0, 0, -1).applyEuler(game.aircraftRot);
    game.aircraftVel.copy(forwardDir).multiplyScalar(currentSpeed);
    game.aircraftPos.addScaledVector(game.aircraftVel, dt);

    // Prevent flying underground
    if (game.aircraftPos.y < -350) {
      game.aircraftPos.y = -350;
      game.aircraftRot.x = Math.max(0, game.aircraftRot.x);
    }
    // High ceiling limit
    if (game.aircraftPos.y > 3200) {
      game.aircraftPos.y = 3200;
    }

    game.aircraftMesh.position.copy(game.aircraftPos);

    // Afterburner visual animation
    game.afterburners.forEach((ab) => {
      const scale = isBoosting ? 1.8 + Math.random() * 0.4 : 0.8 + game.throttle * 0.5;
      ab.scale.set(scale, scale, scale * (isBoosting ? 2.5 : 1.2));
    });

    // Next-Gen Shield Regeneration & Pulse
    if (game.maxShield > 0) {
      if (game.shield < game.maxShield) {
        game.shield = Math.min(game.maxShield, game.shield + (stats.shieldRegen || 15) * dt);
      }
      if (game.shieldMesh) {
        game.shieldMesh.visible = game.shield > 0;
        const shieldOpacity = 0.08 + (game.shield / game.maxShield) * 0.12;
        (game.shieldMesh.material as THREE.MeshBasicMaterial).opacity = shieldOpacity;
      }
    }

    // --- 2. Camera Positioning ---
    if (cameraMode === 'chase') {
      const camOffset = new THREE.Vector3(0, 3.2, 10.5).applyEuler(game.aircraftRot);
      const targetCamPos = game.aircraftPos.clone().add(camOffset);
      game.camera.position.lerp(targetCamPos, 0.18);
      
      const lookAtPos = game.aircraftPos.clone().add(forwardDir.clone().multiplyScalar(40));
      game.camera.lookAt(lookAtPos);
    } else {
      // Cockpit POV
      const cockpitOffset = new THREE.Vector3(0, 0.45, -0.6).applyEuler(game.aircraftRot);
      game.camera.position.copy(game.aircraftPos.clone().add(cockpitOffset));
      const lookAtPos = game.aircraftPos.clone().add(forwardDir.clone().multiplyScalar(80));
      game.camera.lookAt(lookAtPos);
    }

    // --- 3. Autocannon / Machine Gun Firing ---
    if (game.gunOverheated) {
      game.gunHeat = Math.max(0, game.gunHeat - activeGun.coolRate * dt);
      if (game.gunHeat <= 0.15) {
        game.gunOverheated = false;
      }
    } else {
      game.gunHeat = Math.max(0, game.gunHeat - activeGun.coolRate * dt * 0.6);
    }

    const fireInterval = 1000 / activeGun.fireRate;
    if (ctrl.fireGun && !game.gunOverheated && (now - game.gunLastFired > fireInterval)) {
      game.gunLastFired = now;
      game.gunHeat += activeGun.heatPerShot;
      if (game.gunHeat >= 1.0) {
        game.gunHeat = 1.0;
        game.gunOverheated = true;
        soundManager.playWarningSiren();
      }

      // Spawn Bullet Tracer
      soundManager.playCannonShot(activeGun.isEnergy);

      const bulletGeo = new THREE.CylinderGeometry(0.12, 0.12, 3.5, 6);
      bulletGeo.rotateX(Math.PI / 2);
      const bulletMat = new THREE.MeshBasicMaterial({
        color: activeGun.color,
        blending: THREE.AdditiveBlending,
      });
      const bulletMesh = new THREE.Mesh(bulletGeo, bulletMat);

      // Alternate left/right wing muzzle offset
      const muzzleX = (Math.random() > 0.5 ? 0.8 : -0.8);
      const muzzleOffset = new THREE.Vector3(muzzleX, -0.1, -1.8).applyEuler(game.aircraftRot);
      const bulletPos = game.aircraftPos.clone().add(muzzleOffset);
      bulletMesh.position.copy(bulletPos);
      bulletMesh.rotation.copy(game.aircraftRot);

      // Add high forward velocity
      const bulletVel = forwardDir.clone().multiplyScalar(activeGun.bulletSpeed).add(game.aircraftVel);

      game.scene.add(bulletMesh);
      game.bullets.push({
        mesh: bulletMesh,
        pos: bulletPos,
        vel: bulletVel,
        damage: activeGun.damage,
        lifetime: 0,
        isEnergy: activeGun.isEnergy,
      });
    }

    // Update Bullets
    for (let i = game.bullets.length - 1; i >= 0; i--) {
      const b = game.bullets[i];
      b.lifetime += dt;
      b.pos.addScaledVector(b.vel, dt);
      b.mesh.position.copy(b.pos);

      // Bullet hit detection against enemies
      let hit = false;
      for (const enemy of game.enemies) {
        if (b.pos.distanceTo(enemy.pos) < enemy.radius + 1.2) {
          enemy.health -= b.damage;
          hit = true;
          spawnSparkHit(b.pos, activeGun.color);

          if (enemy.health <= 0) {
            destroyEnemy(enemy, 'bullet');
          }
          break;
        }
      }

      if (hit || b.lifetime > 1.8) {
        game.scene.remove(b.mesh);
        b.mesh.geometry.dispose();
        game.bullets.splice(i, 1);
      }
    }

    // --- 4. Guided Missile Locking & Launching ---
    // Identify targets in front cone
    let candidateEnemy: EnemyEntity | null = null;
    let closestAngle = 0.45; // ~26 degree seeker cone

    for (const enemy of game.enemies) {
      const toEnemy = enemy.pos.clone().sub(game.aircraftPos);
      const dist = toEnemy.length();
      if (dist < activeMissile.lockRange) {
        toEnemy.normalize();
        const dot = forwardDir.dot(toEnemy);
        const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
        if (angle < closestAngle) {
          closestAngle = angle;
          candidateEnemy = enemy;
        }
      }
    }

    if (candidateEnemy) {
      if (game.lockingTargetId !== candidateEnemy.id) {
        game.lockingTargetId = candidateEnemy.id;
        game.lockTimeAccum = 0;
        game.lockedTargetId = null;
      } else {
        game.lockTimeAccum += dt;
        if (game.lockTimeAccum >= activeMissile.lockTime) {
          game.lockedTargetId = candidateEnemy.id;
        }
      }
      soundManager.setLockStatus(game.lockTimeAccum < activeMissile.lockTime, game.lockedTargetId !== null);
    } else {
      game.lockingTargetId = null;
      game.lockedTargetId = null;
      game.lockTimeAccum = 0;
      soundManager.stopLockTone();
    }

    // Restock missile timer
    if (game.missilesCount < game.maxMissiles) {
      game.missileRestockTimer += dt;
      if (game.missileRestockTimer >= stats.missileReloadTime) {
        game.missilesCount++;
        game.missileRestockTimer = 0;
      }
    }

    // Fire Missile
    if (ctrl.fireMissile && game.missilesCount > 0 && (now - game.missileLastFired > 650)) {
      game.missileLastFired = now;
      game.missilesCount--;

      soundManager.playMissileLaunch();

      const mMesh = createAirToAirMissileModel(activeMissile.color, activeMissile.isHypersonic);
      const pWing = (game.missilesCount % 2 === 0 ? 1.8 : -1.8);
      const mOffset = new THREE.Vector3(pWing, -0.3, 0.4).applyEuler(game.aircraftRot);
      const mPos = game.aircraftPos.clone().add(mOffset);
      mMesh.position.copy(mPos);
      mMesh.rotation.copy(game.aircraftRot);

      game.scene.add(mMesh);
      game.missiles.push({
        id: `m_${now}`,
        mesh: mMesh,
        pos: mPos,
        vel: forwardDir.clone().multiplyScalar(currentSpeed + 80),
        targetId: game.lockedTargetId || game.lockingTargetId,
        speed: activeMissile.maxSpeed,
        turnRate: activeMissile.turnRate,
        damage: activeMissile.damage,
        blastRadius: activeMissile.blastRadius,
        lifetime: 0,
        maxLifetime: 6.0,
      });

      ctrl.fireMissile = false; // Single tap launch
    }

    // Update Player Missiles
    for (let i = game.missiles.length - 1; i >= 0; i--) {
      const m = game.missiles[i];
      m.lifetime += dt;

      // Homing guidance algorithm (Proportional Navigation)
      let targetEntity: EnemyEntity | undefined;
      if (m.targetId) {
        targetEntity = game.enemies.find(e => e.id === m.targetId);
      }

      if (targetEntity) {
        const toTarget = targetEntity.pos.clone().sub(m.pos).normalize();
        // Slerp missile velocity towards target
        m.vel.lerp(toTarget.multiplyScalar(m.speed), m.turnRate * dt);
      } else {
        // Accelerate forward
        const forward = m.vel.clone().normalize();
        m.vel.copy(forward.multiplyScalar(m.speed));
      }

      m.pos.addScaledVector(m.vel, dt);
      m.mesh.position.copy(m.pos);
      m.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), m.vel.clone().normalize());

      // Missile proximity detonation
      let detonated = false;
      for (const enemy of game.enemies) {
        if (m.pos.distanceTo(enemy.pos) < m.blastRadius) {
          detonated = true;
          // Apply splash damage
          enemy.health -= m.damage;
          if (enemy.health <= 0) {
            destroyEnemy(enemy, 'missile');
          }
          break;
        }
      }

      if (detonated || m.lifetime >= m.maxLifetime) {
        spawnExplosion(m.pos, m.blastRadius * 0.8, activeMissile.isHypersonic ? '#00f0ff' : '#ff7700', true);
        soundManager.playExplosion(true);
        game.scene.remove(m.mesh);
        game.missiles.splice(i, 1);
      }
    }

    // --- 5. Spawn & Update Enemy Waves (Shahed-136, Shahed-238 Jet, Cruise Missiles) ---
    game.spawnTimer -= dt * 1000;
    if (game.spawnTimer <= 0 && game.kills < mission.targetKills) {
      game.spawnTimer = mission.spawnInterval * (0.8 + Math.random() * 0.4);
      spawnEnemyWave();
    }

    // Update Enemies & Sound Buzzing
    let nearestDistance = 9999;
    for (let i = game.enemies.length - 1; i >= 0; i--) {
      const e = game.enemies[i];
      e.pos.addScaledVector(e.vel, dt);
      e.mesh.position.copy(e.pos);

      // Rotate Shahed pusher propeller
      const prop = e.mesh.getObjectByName('propeller');
      if (prop) {
        prop.rotation.z += 45 * dt;
      }

      const distToPlayer = e.pos.distanceTo(game.aircraftPos);
      if (distToPlayer < nearestDistance) {
        nearestDistance = distToPlayer;
      }

      // Check if Shahed broke through the defense boundary into the city
      if (e.pos.z > 2200) {
        game.cityDefense -= 15;
        soundManager.playExplosion(true);
        soundManager.playWarningSiren();
        addFloatingText(
          lang === 'uk' ? 'ПРОРИВ ШАХЕДА! -15% МІСТО' : lang === 'ru' ? 'ПРОРЫВ ШАХЕДА! -15% ГОРОД' : 'DRONE BREACH! -15% CITY DEFENSE',
          window.innerWidth / 2,
          window.innerHeight / 3,
          '#ef4444'
        );
        spawnExplosion(new THREE.Vector3(e.pos.x, -580, e.pos.z), 40, '#ff3300', true);
        game.scene.remove(e.mesh);
        game.enemies.splice(i, 1);

        if (game.cityDefense <= 0) {
          game.cityDefense = 0;
          triggerDefeat();
        }
        continue;
      }
    }

    soundManager.updateShahedBuzz(nearestDistance);

    // --- 6. Searchlight Beams Animation ---
    game.searchlights.forEach((beam, idx) => {
      const sweep = Math.sin(now * 0.0008 + idx * 1.5) * 0.4;
      beam.rotation.y += 0.15 * dt;
      beam.rotation.z = sweep;
    });

    // --- 7. Update Explosions ---
    for (let i = game.explosions.length - 1; i >= 0; i--) {
      const exp = game.explosions[i];
      exp.age += dt;
      const progress = exp.age / exp.maxAge;

      const scale = exp.radius * (1 + progress * 2.5);
      exp.mesh.scale.set(scale, scale, scale);
      (exp.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - progress);

      if (exp.age >= exp.maxAge) {
        game.scene.remove(exp.mesh);
        game.scene.remove(exp.particles);
        game.explosions.splice(i, 1);
      }
    }

    // Check Victory
    if (mission.difficulty !== 'endless' && game.kills >= mission.targetKills && !gameOver) {
      triggerVictory();
    }

    // --- 8. Sync Telemetry with React HUD ---
    const lockProgress = candidateEnemy ? Math.min(1.0, game.lockTimeAccum / activeMissile.lockTime) : 0;
    setHud({
      health: game.health,
      maxHealth: game.maxHealth,
      shield: Math.round(game.shield),
      maxShield: game.maxShield,
      gunHeat: game.gunHeat,
      gunOverheated: game.gunOverheated,
      missilesCount: game.missilesCount,
      maxMissiles: game.maxMissiles,
      missileCooldown: game.missileRestockTimer,
      flaresCount: stats.flareCount,
      cityDefense: game.cityDefense,
      maxCityDefense: mission.cityDefenseHp,
      lockedEnemyId: game.lockedTargetId,
      lockingEnemyId: candidateEnemy ? candidateEnemy.id : null,
      lockProgress,
      score: game.score,
      kills: game.kills,
      wave: game.wave,
      speedKmh: Math.round(currentSpeed * 2.8),
      altitudeMeters: Math.round(game.aircraftPos.y + 600),
      throttle: game.throttle,
    });
  };

  // Spawn Enemy in airspace
  const spawnEnemyWave = () => {
    const game = gameRef.current;
    if (!game) return;

    // Pick type from allowed in mission
    const types = mission.allowedEnemies;
    const type = types[Math.floor(Math.random() * types.length)];

    let mesh: THREE.Group;
    let speed = 110;
    let hp = 45;
    let points = 250;
    let xpReward = 180;
    let radius = 2.4;

    switch (type) {
      case 'shahed136':
        mesh = createShahed136Model();
        speed = 120 + Math.random() * 20;
        hp = 40;
        points = 300;
        xpReward = 190;
        radius = 2.2;
        break;
      case 'shahed238_jet':
        mesh = createShahed238JetModel();
        speed = 190 + Math.random() * 30;
        hp = 65;
        points = 500;
        xpReward = 320;
        radius = 2.4;
        break;
      case 'cruise_missile':
        mesh = createCruiseMissileModel();
        speed = 240 + Math.random() * 40;
        hp = 85;
        points = 750;
        xpReward = 450;
        radius = 2.0;
        break;
      case 'scout_drone':
        mesh = createScoutDroneModel();
        speed = 90;
        hp = 30;
        points = 200;
        xpReward = 140;
        radius = 1.8;
        break;
      default:
        mesh = createShahed136Model();
        break;
    }

    // Spawn ahead of player along the incoming attack corridor
    const spawnX = (Math.random() - 0.5) * 1600;
    const spawnY = 200 + Math.random() * 600;
    const spawnZ = game.aircraftPos.z - 1800 - Math.random() * 800;

    mesh.position.set(spawnX, spawnY, spawnZ);
    mesh.rotation.y = 0; // Heading south towards Ukraine's interior

    const vel = new THREE.Vector3(
      (Math.random() - 0.5) * 15,
      (Math.random() - 0.5) * 10,
      speed
    );

    game.scene.add(mesh);
    game.enemies.push({
      id: `enemy_${Date.now()}_${Math.random()}`,
      type,
      mesh,
      pos: new THREE.Vector3(spawnX, spawnY, spawnZ),
      vel,
      speed,
      health: hp,
      maxHealth: hp,
      points,
      xpReward,
      radius,
    });
  };

  // Enemy Destroyed handler with XP & Leveling rewards!
  const destroyEnemy = (enemy: EnemyEntity, weaponUsed: 'bullet' | 'missile') => {
    const game = gameRef.current;
    if (!game) return;

    soundManager.playExplosion(enemy.type === 'cruise_missile' || weaponUsed === 'missile');
    spawnExplosion(enemy.pos, enemy.radius * 3.0, '#ff6600', enemy.type === 'cruise_missile');

    game.kills++;
    if (enemy.type === 'shahed136' || enemy.type === 'shahed238_jet') {
      game.shahedKills++;
    } else if (enemy.type === 'cruise_missile') {
      game.missileKills++;
    }

    const bonus = weaponUsed === 'bullet' ? 1.2 : 1.0;
    const earnedXp = Math.round(enemy.xpReward * bonus);
    const earnedCredits = Math.round(enemy.points * 0.7);

    game.score += enemy.points;

    // Floating text above crosshair / screen
    const screenX = window.innerWidth / 2 + (Math.random() - 0.5) * 120;
    const screenY = window.innerHeight / 2 - 80 + (Math.random() - 0.5) * 60;
    addFloatingText(
      `+${earnedXp} XP  +${earnedCredits} ₴`,
      screenX,
      screenY,
      '#facc15'
    );

    // Apply progression & check for LEVEL UP!
    const res = addPlayerRewards(
      currentProfile,
      earnedXp,
      earnedCredits,
      enemy.type === 'shahed136' || enemy.type === 'shahed238_jet' ? 1 : 0,
      enemy.type === 'cruise_missile' ? 1 : 0
    );

    setCurrentProfile(res.updatedProfile);

    if (res.didLevelUp) {
      soundManager.playLevelUp();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
      setLevelUpModal(res);
    }

    // Remove from scene
    game.scene.remove(enemy.mesh);
    const idx = game.enemies.indexOf(enemy);
    if (idx !== -1) {
      game.enemies.splice(idx, 1);
    }
  };

  // Visual Explosion FX in 3D
  const spawnExplosion = (pos: THREE.Vector3, radius: number, color: string, isLarge = false) => {
    const game = gameRef.current;
    if (!game) return;

    // Fireball Sphere
    const sphereGeo = new THREE.SphereGeometry(1.0, 16, 12);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.95,
    });
    const expMesh = new THREE.Mesh(sphereGeo, sphereMat);
    expMesh.position.copy(pos);
    game.scene.add(expMesh);

    // Flying Sparks / Debris Particles
    const count = isLarge ? 48 : 24;
    const partGeo = new THREE.BufferGeometry();
    const partPos: number[] = [];
    for (let i = 0; i < count; i++) {
      partPos.push(
        pos.x + (Math.random() - 0.5) * 6,
        pos.y + (Math.random() - 0.5) * 6,
        pos.z + (Math.random() - 0.5) * 6
      );
    }
    partGeo.setAttribute('position', new THREE.Float32BufferAttribute(partPos, 3));
    const partMat = new THREE.PointsMaterial({
      color: 0xfbbf24,
      size: isLarge ? 8 : 5,
      transparent: true,
      opacity: 0.9,
    });
    const particles = new THREE.Points(partGeo, partMat);
    game.scene.add(particles);

    game.explosions.push({
      mesh: expMesh,
      particles,
      pos: pos.clone(),
      radius,
      maxRadius: radius * 3,
      age: 0,
      maxAge: isLarge ? 0.9 : 0.5,
    });
  };

  const spawnSparkHit = (pos: THREE.Vector3, color: string) => {
    spawnExplosion(pos, 1.2, color, false);
  };

  const triggerVictory = () => {
    setGameOver('victory');
    confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
  };

  const triggerDefeat = () => {
    setGameOver('defeat');
  };

  // Input Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const c = controlsRef.current;
      if (e.code === 'KeyW' || e.code === 'ArrowUp') c.pitchDown = true;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') c.pitchUp = true;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') c.rollLeft = true;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') c.rollRight = true;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') c.afterburner = true;
      if (e.code === 'KeyR') c.throttleUp = true;
      if (e.code === 'KeyF') c.throttleDown = true;
      if (e.code === 'Space') c.fireGun = true;
      if (e.code === 'KeyE' || e.code === 'KeyQ') c.fireMissile = true;

      if (e.code === 'KeyV') {
        setCameraMode(prev => (prev === 'chase' ? 'cockpit' : 'chase'));
      }
      if (e.code === 'Escape') {
        setIsPaused(prev => !prev);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const c = controlsRef.current;
      if (e.code === 'KeyW' || e.code === 'ArrowUp') c.pitchDown = false;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') c.pitchUp = false;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') c.rollLeft = false;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') c.rollRight = false;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') c.afterburner = false;
      if (e.code === 'KeyR') c.throttleUp = false;
      if (e.code === 'KeyF') c.throttleDown = false;
      if (e.code === 'Space') c.fireGun = false;
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) controlsRef.current.fireGun = true;
      if (e.button === 2) {
        e.preventDefault();
        controlsRef.current.fireMissile = true;
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) controlsRef.current.fireGun = false;
      if (e.button === 2) controlsRef.current.fireMissile = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      controlsRef.current.mouseX = (e.clientX - cx) / cx;
      controlsRef.current.mouseY = (e.clientY - cy) / cy;
      controlsRef.current.mouseActive = true;
    };

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-950 select-none">
      {/* 3D WebGL Canvas Viewport */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full cursor-crosshair" />

      {/* Military HUD Scanline & CRT Vignette */}
      <div className="absolute inset-0 tactical-scanlines pointer-events-none" />

      {/* Floating XP & Credits text */}
      {floatingTexts.map(item => (
        <div
          key={item.id}
          className="absolute pointer-events-none font-orbitron font-bold text-lg drop-shadow-[0_0_8px_rgba(0,0,0,0.9)] animate-bounce"
          style={{ left: item.x, top: item.y, color: item.color }}
        >
          {item.text}
        </div>
      ))}

      {/* Cockpit Reticle / Crosshair */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative flex items-center justify-center">
          {/* Outer circle */}
          <div className="w-24 h-24 rounded-full border border-sky-400/40 flex items-center justify-center">
            {/* Center pip */}
            <div className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]" />
          </div>
          {/* Reticle ticks */}
          <div className="absolute w-32 h-0.5 bg-sky-400/30" />
          <div className="absolute h-32 w-0.5 bg-sky-400/30" />

          {/* Missile Seeker / Radar Lock Box */}
          {hud.lockingEnemyId && (
            <div
              className={`absolute w-20 h-20 border-2 transition-all duration-75 flex items-center justify-center ${
                hud.lockedEnemyId
                  ? 'border-red-500 scale-95 shadow-[0_0_15px_#ef4444]'
                  : 'border-yellow-400 scale-110 animate-pulse'
              }`}
            >
              <span className="absolute -top-5 text-[10px] font-orbitron uppercase font-bold tracking-wider px-1 bg-black/70 text-yellow-300">
                {hud.lockedEnemyId ? 'LOCK ACQUIRED' : `SEEKING ${(hud.lockProgress * 100).toFixed(0)}%`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* TOP BAR: Aircraft info, City Defense & Threat level */}
      <div className="absolute top-4 inset-x-6 flex items-center justify-between pointer-events-none">
        {/* Left: Pilot Rank & Level */}
        <div className="flex items-center gap-3 bg-slate-950/80 backdrop-blur-md px-4 py-2 rounded-lg border border-slate-700/80 shadow-lg pointer-events-auto">
          <div className="w-10 h-10 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 font-orbitron font-bold">
            {currentProfile.level}
          </div>
          <div>
            <div className="text-xs text-sky-400 font-chakra font-semibold tracking-wider uppercase">
              {getRankTitle(currentProfile.level, lang)}
            </div>
            <div className="flex items-center gap-2">
              <div className="w-28 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-yellow-400 transition-all duration-300"
                  style={{ width: `${Math.min(100, (currentProfile.xp / currentProfile.nextLevelXp) * 100)}%` }}
                />
              </div>
              <span className="text-[11px] font-chakra text-slate-300">
                {currentProfile.xp}/{currentProfile.nextLevelXp} XP
              </span>
            </div>
          </div>
        </div>

        {/* Center: Mission Target & Sector */}
        <div className="flex flex-col items-center">
          <div className="bg-slate-950/80 backdrop-blur-md px-5 py-1.5 rounded-full border border-sky-500/30 text-sky-300 font-orbitron text-sm tracking-wider uppercase flex items-center gap-3">
            <span>{mission.sectorName[lang]}</span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-yellow-400 font-bold">
              {mission.difficulty === 'endless' ? `${hud.kills} ЗБИТО` : `${hud.kills} / ${mission.targetKills} ЦІЛЕЙ`}
            </span>
          </div>

          {/* City Defense Integrity Bar */}
          <div className="mt-2 flex items-center gap-2 bg-slate-950/70 px-4 py-1 rounded-md border border-red-500/40">
            <ShieldAlert className="w-4 h-4 text-red-400 animate-pulse" />
            <span className="text-xs font-chakra font-bold text-red-300 uppercase tracking-wider">
              {lang === 'uk' ? 'Захист міста:' : lang === 'ru' ? 'Оборона города:' : 'City Defense:'}
            </span>
            <div className="w-36 h-2 bg-slate-800 rounded-full overflow-hidden border border-red-900/60">
              <div
                className={`h-full transition-all duration-300 ${
                  hud.cityDefense < 30 ? 'bg-red-600 animate-pulse' : hud.cityDefense < 60 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${(hud.cityDefense / hud.maxCityDefense) * 100}%` }}
              />
            </div>
            <span className="text-xs font-orbitron font-bold text-slate-200">
              {hud.cityDefense}/{hud.maxCityDefense}
            </span>
          </div>
        </div>

        {/* Right: Score, Credits, Audio & Pause Controls */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-yellow-500/40 text-yellow-400 font-orbitron font-bold text-sm">
            ₴ {currentProfile.credits.toLocaleString()}
          </div>
          <button
            id="toggle-sound-btn"
            onClick={() => soundManager.setMuted(!soundManager.isSoundMuted())}
            className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition"
          >
            {soundManager.isSoundMuted() ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <button
            id="pause-menu-btn"
            onClick={() => setIsPaused(true)}
            className="px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 font-chakra font-bold text-xs uppercase transition"
          >
            ESC • Меню
          </button>
        </div>
      </div>

      {/* BOTTOM LEFT: Aircraft Telemetry (Speed, Altitude, Shield, Health) */}
      <div className="absolute bottom-6 left-6 flex flex-col gap-3 pointer-events-none">
        {/* Speed & Altitude Tapes */}
        <div className="flex items-center gap-4 bg-slate-950/80 backdrop-blur-md px-4 py-2.5 rounded-lg border border-slate-800 text-slate-200 font-orbitron">
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest font-chakra">Швидкість</div>
            <div className="text-lg font-bold text-sky-400">{hud.speedKmh} <span className="text-xs text-slate-400">КМ/ГОД</span></div>
          </div>
          <div className="h-8 w-px bg-slate-700" />
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest font-chakra">Висота</div>
            <div className="text-lg font-bold text-sky-400">{hud.altitudeMeters} <span className="text-xs text-slate-400">М</span></div>
          </div>
          <div className="h-8 w-px bg-slate-700" />
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest font-chakra">Тяга</div>
            <div className="text-lg font-bold text-amber-400">{(hud.throttle * 100).toFixed(0)}%</div>
          </div>
        </div>

        {/* Health and Shield */}
        <div className="bg-slate-950/80 backdrop-blur-md p-3 rounded-lg border border-slate-800 w-64">
          {hud.maxShield > 0 && (
            <div className="mb-2">
              <div className="flex justify-between text-xs font-chakra font-bold text-cyan-400 mb-1">
                <span>ПЛАЗМОВИЙ ЩИТ 6G</span>
                <span>{hud.shield}/{hud.maxShield}</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden border border-cyan-900">
                <div
                  className="h-full bg-cyan-400 shadow-[0_0_8px_#00f0ff] transition-all duration-200"
                  style={{ width: `${(hud.shield / hud.maxShield) * 100}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-between text-xs font-chakra font-bold text-slate-300 mb-1">
            <span>МІЦНІСТЬ КОРПУСУ</span>
            <span>{hud.health}/{hud.maxHealth} HP</span>
          </div>
          <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
            <div
              className="h-full bg-emerald-500 transition-all duration-200"
              style={{ width: `${(hud.health / hud.maxHealth) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* BOTTOM RIGHT: Weapon Armament (Autocannon Heat, Guided Missiles) */}
      <div className="absolute bottom-6 right-6 flex flex-col items-end gap-3 pointer-events-none">
        {/* Active Gun Heat Meter */}
        <div className="bg-slate-950/80 backdrop-blur-md p-3 rounded-lg border border-slate-800 w-64">
          <div className="flex justify-between text-xs font-chakra font-bold mb-1">
            <span className="text-slate-300">{activeGun.name[lang]}</span>
            <span className={hud.gunOverheated ? 'text-red-500 font-bold animate-pulse' : 'text-slate-400'}>
              {hud.gunOverheated ? 'ПЕРЕГРІВ!' : `${Math.round(hud.gunHeat * 100)}%`}
            </span>
          </div>
          <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
            <div
              className={`h-full transition-all duration-100 ${
                hud.gunOverheated
                  ? 'bg-red-500 animate-pulse'
                  : hud.gunHeat > 0.7
                  ? 'bg-amber-500'
                  : 'bg-sky-400'
              }`}
              style={{ width: `${hud.gunHeat * 100}%` }}
            />
          </div>
        </div>

        {/* Guided Missiles Pylons */}
        <div className="bg-slate-950/80 backdrop-blur-md p-3 rounded-lg border border-slate-800 flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs font-chakra font-bold text-sky-400 uppercase">
              {activeMissile.name[lang]}
            </div>
            <div className="text-[11px] text-slate-400">
              {lang === 'uk' ? 'ПКМ / Клавіша Q / E' : lang === 'ru' ? 'ПКМ / Клавиша Q / E' : 'RMB / Key Q / E'}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: hud.maxMissiles }).map((_, i) => (
              <div
                key={i}
                className={`w-3 h-8 rounded-sm border transition-all ${
                  i < hud.missilesCount
                    ? 'bg-red-500 border-red-400 shadow-[0_0_8px_#ef4444]'
                    : 'bg-slate-800/40 border-slate-700 opacity-30'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* CONTROLS REMINDER PILL (Bottom Center) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-950/75 backdrop-blur-md px-4 py-1.5 rounded-full border border-slate-800 text-[11px] font-chakra text-slate-400 pointer-events-none flex items-center gap-3">
        <span><b>W/S/A/D</b> - Крен та Тангаж</span>
        <span>•</span>
        <span><b>SHIFT</b> - Форсаж</span>
        <span>•</span>
        <span><b>ПРОБІЛ</b> - Пулемет</span>
        <span>•</span>
        <span><b>ПКМ / E</b> - Ракета</span>
        <span>•</span>
        <span><b>V</b> - Камера</span>
      </div>

      {/* LEVEL UP MODAL DIALOG */}
      {levelUpModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border-2 border-yellow-500/80 rounded-2xl p-6 max-w-md w-full shadow-[0_0_35px_rgba(234,179,8,0.4)] text-center relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-36 h-36 bg-yellow-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-yellow-500/20 border-2 border-yellow-400 flex items-center justify-center text-yellow-400 shadow-[0_0_15px_#eab308]">
              <ChevronsUp className="w-10 h-10 animate-bounce" />
            </div>

            <h2 className="text-2xl font-orbitron font-black text-yellow-400 tracking-wider uppercase mb-1">
              {lang === 'uk' ? 'НОВИЙ РІВЕНЬ!' : lang === 'ru' ? 'НОВЫЙ УРОВЕНЬ!' : 'LEVEL UP!'}
            </h2>
            <div className="text-base font-chakra font-bold text-white mb-2">
              {getRankTitle(levelUpModal.newLevel, lang)} (Уровень {levelUpModal.newLevel})
            </div>
            <p className="text-xs text-slate-300 mb-4">
              {lang === 'uk'
                ? 'Вітаємо пілота! За знищення шахедів та захист неба вам присвоєно чергове звання та розблоковано нове спорядження:'
                : lang === 'ru'
                ? 'Поздравляем пилота! За уничтожение шахедов вам присвоено очередное звание и разблокировано новое снаряжение:'
                : 'Congratulations pilot! For intercepting Shaheds you earned a promotion and unlocked new equipment:'}
            </p>

            {/* Unlocked Items Grid */}
            <div className="space-y-2 mb-6 text-left">
              {levelUpModal.unlockedItems.aircraft.length > 0 && (
                <div className="bg-sky-500/15 border border-sky-500/40 p-2.5 rounded-lg">
                  <div className="text-[10px] text-sky-400 uppercase font-chakra font-bold">
                    {lang === 'uk' ? 'Новий літак розблоковано:' : 'Новый самолет разблокирован:'}
                  </div>
                  <div className="text-sm font-orbitron font-bold text-white">
                    {levelUpModal.unlockedItems.aircraft.join(', ')}
                  </div>
                </div>
              )}

              {levelUpModal.unlockedItems.guns.length > 0 && (
                <div className="bg-amber-500/15 border border-amber-500/40 p-2.5 rounded-lg">
                  <div className="text-[10px] text-amber-400 uppercase font-chakra font-bold">
                    {lang === 'uk' ? 'Нова авіапушка розблокована:' : 'Новая авиапушка разблокирована:'}
                  </div>
                  <div className="text-sm font-orbitron font-bold text-white">
                    {levelUpModal.unlockedItems.guns.join(', ')}
                  </div>
                </div>
              )}

              {levelUpModal.unlockedItems.missiles.length > 0 && (
                <div className="bg-red-500/15 border border-red-500/40 p-2.5 rounded-lg">
                  <div className="text-[10px] text-red-400 uppercase font-chakra font-bold">
                    {lang === 'uk' ? 'Нові ракети доступні:' : 'Новые ракеты доступны:'}
                  </div>
                  <div className="text-sm font-orbitron font-bold text-white">
                    {levelUpModal.unlockedItems.missiles.join(', ')}
                  </div>
                </div>
              )}
            </div>

            <button
              id="continue-after-levelup-btn"
              onClick={() => setLevelUpModal(null)}
              className="w-full py-2.5 px-4 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-chakra font-bold text-sm uppercase rounded-xl transition shadow-lg shadow-yellow-500/30"
            >
              {lang === 'uk' ? 'Продовжити бій' : lang === 'ru' ? 'Продолжить бой' : 'Continue Battle'}
            </button>
          </div>
        </div>
      )}

      {/* GAME OVER MODAL (Victory or Defeat) */}
      {gameOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-lg p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full text-center shadow-2xl">
            <h2
              className={`text-3xl font-orbitron font-black uppercase mb-2 ${
                gameOver === 'victory' ? 'text-emerald-400' : 'text-red-500'
              }`}
            >
              {gameOver === 'victory'
                ? lang === 'uk' ? 'МІСІЮ ВИКОНАНО!' : lang === 'ru' ? 'МИССИЯ ВЫПОЛНЕНА!' : 'MISSION ACCOMPLISHED!'
                : lang === 'uk' ? 'СЕКТОР ПРОРВАНО' : lang === 'ru' ? 'СЕКТОР ПРОРВАН' : 'DEFENSE BREACHED'}
            </h2>

            <p className="text-sm text-slate-300 font-chakra mb-6">
              {gameOver === 'victory'
                ? lang === 'uk'
                  ? 'Усі шахеди в секторі успішно знищені. Інфраструктура міста у безпеці!'
                  : lang === 'ru'
                  ? 'Все шахэды в секторе успешно перехвачены. Город в безопасности!'
                  : 'All incoming drones destroyed. City infrastructure saved!'
                : lang === 'uk'
                ? 'Критична інфраструктура зазнала ушкоджень. Поверніться до лобі для прокачки літака!'
                : lang === 'ru'
                ? 'Критическая инфраструктура повреждена. Вернитесь в лобби для прокачки самолета!'
                : 'Defense fell. Return to hangar to upgrade weapons and aircraft!'}
            </p>

            <div className="grid grid-cols-2 gap-3 mb-6 font-chakra">
              <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                <div className="text-xs text-slate-400">Збито цілей</div>
                <div className="text-xl font-orbitron font-bold text-sky-400">{hud.kills}</div>
              </div>
              <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                <div className="text-xs text-slate-400">Набрано очок</div>
                <div className="text-xl font-orbitron font-bold text-yellow-400">{hud.score}</div>
              </div>
            </div>

            <button
              id="return-to-lobby-btn"
              onClick={() => onExitToLobby(currentProfile)}
              className="w-full py-3 px-6 bg-sky-500 hover:bg-sky-400 text-slate-950 font-chakra font-bold text-sm uppercase rounded-xl transition shadow-lg shadow-sky-500/30"
            >
              {lang === 'uk' ? 'До ангару / Лобі' : lang === 'ru' ? 'В ангар / Лобби' : 'To Hangar / Lobby'}
            </button>
          </div>
        </div>
      )}

      {/* PAUSE MENU */}
      {isPaused && !gameOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
            <h3 className="text-xl font-orbitron font-bold text-white mb-6 uppercase">
              {lang === 'uk' ? 'ПАУЗА' : lang === 'ru' ? 'ПАУЗА' : 'PAUSED'}
            </h3>

            <div className="space-y-3">
              <button
                id="resume-btn"
                onClick={() => setIsPaused(false)}
                className="w-full py-2.5 px-4 bg-sky-500 hover:bg-sky-400 text-slate-950 font-chakra font-bold text-sm uppercase rounded-xl transition"
              >
                {lang === 'uk' ? 'Продовжити' : lang === 'ru' ? 'Продолжить' : 'Resume'}
              </button>

              <button
                id="restart-mission-btn"
                onClick={() => {
                  setIsPaused(false);
                  if (gameRef.current) {
                    gameRef.current.health = stats.maxHealth;
                    gameRef.current.cityDefense = mission.cityDefenseHp;
                    gameRef.current.kills = 0;
                    gameRef.current.score = 0;
                  }
                }}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-chakra font-bold text-sm uppercase rounded-xl transition border border-slate-700"
              >
                {lang === 'uk' ? 'Почати заново' : lang === 'ru' ? 'Начать заново' : 'Restart'}
              </button>

              <button
                id="exit-to-hangar-btn"
                onClick={() => onExitToLobby(currentProfile)}
                className="w-full py-2.5 px-4 bg-red-500/20 hover:bg-red-500/30 text-red-300 font-chakra font-bold text-sm uppercase rounded-xl transition border border-red-500/40"
              >
                {lang === 'uk' ? 'Вийти в лобі' : lang === 'ru' ? 'Выйти в лобби' : 'Exit to Lobby'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
