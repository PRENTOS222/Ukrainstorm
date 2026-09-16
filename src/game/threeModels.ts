import * as THREE from 'three';

/**
 * Procedural 3D Model Factory for Sky Shield Interceptor
 * Generates accurate, visually striking 3D military aircraft, Shahed delta drones,
 * cruise missiles, and weapons using Three.js procedural geometries and materials.
 */

// Shared materials and helpers for optimal performance
const darkMetalMaterial = new THREE.MeshStandardMaterial({
  color: 0x1e293b,
  roughness: 0.4,
  metalness: 0.7,
});

const canopyMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x38bdf8,
  metalness: 0.9,
  roughness: 0.1,
  transparent: true,
  opacity: 0.75,
  reflectivity: 0.9,
});

const nextGenCanopyMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x00f0ff,
  metalness: 0.95,
  roughness: 0.05,
  transparent: true,
  opacity: 0.85,
  emissive: 0x004455,
});

/**
 * Creates Ukrainian Roundel (Blue circle with Gold core)
 */
function createRoundel(): THREE.Group {
  const group = new THREE.Group();
  const blueGeo = new THREE.CircleGeometry(0.35, 16);
  const blueMat = new THREE.MeshBasicMaterial({ color: 0x0057b7, side: THREE.DoubleSide });
  const blueMesh = new THREE.Mesh(blueGeo, blueMat);

  const yellowGeo = new THREE.CircleGeometry(0.18, 16);
  const yellowMat = new THREE.MeshBasicMaterial({ color: 0xffd700, side: THREE.DoubleSide });
  const yellowMesh = new THREE.Mesh(yellowGeo, yellowMat);
  yellowMesh.position.z = 0.01;

  group.add(blueMesh);
  group.add(yellowMesh);
  return group;
}

/**
 * Creates a detailed 3D fighter jet based on aircraft type
 */
export function createAircraftModel(aircraftId: string): THREE.Group {
  const root = new THREE.Group();

  switch (aircraftId) {
    case 'mig29':
      buildMiG29(root);
      break;
    case 'su27':
      buildSu27(root);
      break;
    case 'f16':
      buildF16(root);
      break;
    case 'mirage2000':
      buildMirage2000(root);
      break;
    case 'sokil_x':
      buildSokilXNextGen(root);
      break;
    default:
      buildMiG29(root);
      break;
  }

  // Shadow casting
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  return root;
}

/**
 * MiG-29 "Ghost of Kyiv" (Twin-tail, twin engine, sleek swept wing)
 */
function buildMiG29(root: THREE.Group) {
  const camoMat = new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    roughness: 0.5,
    metalness: 0.5,
  });
  const grayMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.5,
    metalness: 0.6,
  });

  // Main Fuselage
  const fuseGeo = new THREE.ConeGeometry(0.8, 5.2, 16);
  fuseGeo.rotateX(Math.PI / 2);
  fuseGeo.scale(1.1, 0.45, 1.0);
  const fuse = new THREE.Mesh(fuseGeo, camoMat);
  fuse.position.z = -0.5;
  root.add(fuse);

  // Cockpit Canopy
  const canopyGeo = new THREE.SphereGeometry(0.4, 16, 12);
  canopyGeo.scale(0.8, 0.7, 2.2);
  const canopy = new THREE.Mesh(canopyGeo, canopyMaterial);
  canopy.position.set(0, 0.35, -0.6);
  root.add(canopy);

  // Main Swept Wings
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0);
  wingShape.lineTo(4.2, -1.8);
  wingShape.lineTo(4.0, -2.6);
  wingShape.lineTo(0.8, -2.4);
  wingShape.lineTo(0, -2.2);
  wingShape.closePath();

  const wingExtrude = new THREE.ExtrudeGeometry(wingShape, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04 });
  wingExtrude.rotateX(Math.PI / 2);

  const rightWing = new THREE.Mesh(wingExtrude, camoMat);
  rightWing.position.set(0.4, 0, 0.2);
  root.add(rightWing);

  const leftWing = rightWing.clone();
  leftWing.scale.set(-1, 1, 1);
  leftWing.position.set(-0.4, 0, 0.2);
  root.add(leftWing);

  // Twin Vertical Fins
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0);
  finShape.lineTo(0.3, 1.6);
  finShape.lineTo(1.1, 1.5);
  finShape.lineTo(1.3, 0);
  finShape.closePath();

  const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02 });
  finGeo.rotateY(-Math.PI / 2);

  const rightFin = new THREE.Mesh(finGeo, grayMat);
  rightFin.position.set(0.7, 0.1, 1.3);
  rightFin.rotation.z = -0.12; // Outward cant
  root.add(rightFin);

  const leftFin = new THREE.Mesh(finGeo, grayMat);
  leftFin.position.set(-0.7, 0.1, 1.3);
  leftFin.rotation.z = 0.12;
  root.add(leftFin);

  // Twin Engine Nacelles
  const engGeo = new THREE.CylinderGeometry(0.38, 0.42, 3.2, 16);
  engGeo.rotateX(Math.PI / 2);
  const engMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });

  const rightEng = new THREE.Mesh(engGeo, engMat);
  rightEng.position.set(0.65, -0.15, 0.7);
  root.add(rightEng);

  const leftEng = new THREE.Mesh(engGeo, engMat);
  leftEng.position.set(-0.65, -0.15, 0.7);
  root.add(leftEng);

  // Twin Afterburner Glow Rings
  const afterburnerGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.2, 16);
  afterburnerGeo.rotateX(Math.PI / 2);
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });

  const rightFlame = new THREE.Mesh(afterburnerGeo, flameMat);
  rightFlame.position.set(0.65, -0.15, 2.35);
  rightFlame.name = 'afterburner_r';
  root.add(rightFlame);

  const leftFlame = new THREE.Mesh(afterburnerGeo, flameMat);
  leftFlame.position.set(-0.65, -0.15, 2.35);
  leftFlame.name = 'afterburner_l';
  root.add(leftFlame);

  // Ukrainian Roundels on wings
  const r1 = createRoundel();
  r1.rotation.x = -Math.PI / 2;
  r1.position.set(2.2, 0.1, -0.8);
  root.add(r1);

  const r2 = createRoundel();
  r2.rotation.x = -Math.PI / 2;
  r2.position.set(-2.2, 0.1, -0.8);
  root.add(r2);
}

/**
 * Su-27 Flanker (Heavy twin-engine air superiority interceptor)
 */
function buildSu27(root: THREE.Group) {
  const suMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.45,
    metalness: 0.55,
  });

  // Elongated Fuselage with LERX
  const fuseGeo = new THREE.ConeGeometry(0.9, 6.4, 16);
  fuseGeo.rotateX(Math.PI / 2);
  fuseGeo.scale(1.15, 0.45, 1.0);
  const fuse = new THREE.Mesh(fuseGeo, suMat);
  fuse.position.z = -0.8;
  root.add(fuse);

  // Tail Stinger between engines
  const stingerGeo = new THREE.ConeGeometry(0.2, 1.6, 12);
  stingerGeo.rotateX(-Math.PI / 2);
  const stinger = new THREE.Mesh(stingerGeo, darkMetalMaterial);
  stinger.position.set(0, -0.05, 2.8);
  root.add(stinger);

  // Large Cockpit
  const canopyGeo = new THREE.SphereGeometry(0.42, 16, 12);
  canopyGeo.scale(0.85, 0.7, 2.5);
  const canopy = new THREE.Mesh(canopyGeo, canopyMaterial);
  canopy.position.set(0, 0.38, -0.9);
  root.add(canopy);

  // Wide Wing Area
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0);
  wingShape.lineTo(4.8, -2.2);
  wingShape.lineTo(4.5, -3.2);
  wingShape.lineTo(0.9, -2.9);
  wingShape.lineTo(0, -2.6);
  wingShape.closePath();

  const wingExtrude = new THREE.ExtrudeGeometry(wingShape, { depth: 0.09, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03 });
  wingExtrude.rotateX(Math.PI / 2);

  const rightWing = new THREE.Mesh(wingExtrude, suMat);
  rightWing.position.set(0.45, 0, 0.1);
  root.add(rightWing);

  const leftWing = rightWing.clone();
  leftWing.scale.set(-1, 1, 1);
  leftWing.position.set(-0.45, 0, 0.1);
  root.add(leftWing);

  // Twin High Tailfins
  const finGeo = new THREE.BoxGeometry(0.08, 1.8, 1.4);
  const rightFin = new THREE.Mesh(finGeo, suMat);
  rightFin.position.set(0.85, 0.9, 1.5);
  rightFin.rotation.x = -0.2;
  root.add(rightFin);

  const leftFin = rightFin.clone();
  leftFin.position.set(-0.85, 0.9, 1.5);
  root.add(leftFin);

  // Twin Engines
  const engGeo = new THREE.CylinderGeometry(0.42, 0.46, 3.8, 16);
  engGeo.rotateX(Math.PI / 2);
  const rightEng = new THREE.Mesh(engGeo, darkMetalMaterial);
  rightEng.position.set(0.75, -0.2, 0.8);
  root.add(rightEng);

  const leftEng = rightEng.clone();
  leftEng.position.set(-0.75, -0.2, 0.8);
  root.add(leftEng);

  // Exhaust glow
  const flameGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.2, 16);
  flameGeo.rotateX(Math.PI / 2);
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xff7700 });
  const rf = new THREE.Mesh(flameGeo, flameMat);
  rf.position.set(0.75, -0.2, 2.75);
  rf.name = 'afterburner_r';
  root.add(rf);
  const lf = rf.clone();
  lf.position.set(-0.75, -0.2, 2.75);
  lf.name = 'afterburner_l';
  root.add(lf);

  // Roundels
  const r1 = createRoundel();
  r1.rotation.x = -Math.PI / 2;
  r1.position.set(2.4, 0.1, -1.0);
  root.add(r1);

  const r2 = createRoundel();
  r2.rotation.x = -Math.PI / 2;
  r2.position.set(-2.4, 0.1, -1.0);
  root.add(r2);
}

/**
 * F-16AM Fighting Falcon (Single engine, ventral intake, cropped delta, wingtip rails)
 */
function buildF16(root: THREE.Group) {
  const natoMat = new THREE.MeshStandardMaterial({
    color: 0x64748b, // NATO Ghost Gray
    roughness: 0.4,
    metalness: 0.6,
  });

  // Streamlined fuselage
  const fuseGeo = new THREE.ConeGeometry(0.75, 5.0, 16);
  fuseGeo.rotateX(Math.PI / 2);
  fuseGeo.scale(0.9, 0.5, 1.0);
  const fuse = new THREE.Mesh(fuseGeo, natoMat);
  fuse.position.z = -0.5;
  root.add(fuse);

  // Ventral Oval Jet Intake Scoop under fuselage
  const intakeGeo = new THREE.BoxGeometry(0.6, 0.35, 1.4);
  const intake = new THREE.Mesh(intakeGeo, darkMetalMaterial);
  intake.position.set(0, -0.38, -0.4);
  root.add(intake);

  // Large Single Bubble Canopy
  const canopyGeo = new THREE.SphereGeometry(0.38, 16, 12);
  canopyGeo.scale(0.85, 0.85, 2.1);
  const canopy = new THREE.Mesh(canopyGeo, canopyMaterial);
  canopy.position.set(0, 0.38, -0.7);
  root.add(canopy);

  // Cropped Delta Wings
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0);
  wingShape.lineTo(3.4, -1.2);
  wingShape.lineTo(3.4, -2.1);
  wingShape.lineTo(0.5, -2.3);
  wingShape.closePath();

  const wingExtrude = new THREE.ExtrudeGeometry(wingShape, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03 });
  wingExtrude.rotateX(Math.PI / 2);

  const rightWing = new THREE.Mesh(wingExtrude, natoMat);
  rightWing.position.set(0.35, 0, 0.1);
  root.add(rightWing);

  const leftWing = rightWing.clone();
  leftWing.scale.set(-1, 1, 1);
  leftWing.position.set(-0.35, 0, 0.1);
  root.add(leftWing);

  // Wingtip Missile Launch Rails
  const railGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.4, 8);
  railGeo.rotateX(Math.PI / 2);
  const railR = new THREE.Mesh(railGeo, darkMetalMaterial);
  railR.position.set(3.75, 0, -0.9);
  root.add(railR);
  const railL = railR.clone();
  railL.position.set(-3.75, 0, -0.9);
  root.add(railL);

  // Single Tall Vertical Stabilizer (Fin)
  const finGeo = new THREE.BoxGeometry(0.08, 1.8, 1.5);
  const fin = new THREE.Mesh(finGeo, natoMat);
  fin.position.set(0, 0.95, 1.1);
  fin.rotation.x = -0.3;
  root.add(fin);

  // Single Big Engine Exhaust
  const engGeo = new THREE.CylinderGeometry(0.48, 0.52, 2.4, 16);
  engGeo.rotateX(Math.PI / 2);
  const eng = new THREE.Mesh(engGeo, darkMetalMaterial);
  eng.position.set(0, -0.05, 1.2);
  root.add(eng);

  // Afterburner ring
  const flameGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.25, 16);
  flameGeo.rotateX(Math.PI / 2);
  const flameMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const flame = new THREE.Mesh(flameGeo, flameMat);
  flame.position.set(0, -0.05, 2.45);
  flame.name = 'afterburner_center';
  root.add(flame);

  // Ukrainian Roundels
  const r1 = createRoundel();
  r1.rotation.x = -Math.PI / 2;
  r1.position.set(1.9, 0.1, -0.6);
  root.add(r1);

  const r2 = createRoundel();
  r2.rotation.x = -Math.PI / 2;
  r2.position.set(-1.9, 0.1, -0.6);
  root.add(r2);
}

/**
 * Mirage 2000-5 (Delta Wing Interceptor)
 */
function buildMirage2000(root: THREE.Group) {
  const mirageMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.4,
    metalness: 0.6,
  });

  // Sharp Delta Fuselage
  const fuseGeo = new THREE.ConeGeometry(0.7, 5.4, 16);
  fuseGeo.rotateX(Math.PI / 2);
  fuseGeo.scale(0.9, 0.5, 1.0);
  const fuse = new THREE.Mesh(fuseGeo, mirageMat);
  fuse.position.z = -0.7;
  root.add(fuse);

  // Large Characteristic Delta Wings
  const deltaShape = new THREE.Shape();
  deltaShape.moveTo(0, 0);
  deltaShape.lineTo(3.8, -2.8);
  deltaShape.lineTo(0.5, -2.8);
  deltaShape.closePath();

  const deltaExtrude = new THREE.ExtrudeGeometry(deltaShape, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03 });
  deltaExtrude.rotateX(Math.PI / 2);

  const rWing = new THREE.Mesh(deltaExtrude, mirageMat);
  rWing.position.set(0.35, 0, -0.2);
  root.add(rWing);

  const lWing = rWing.clone();
  lWing.scale.set(-1, 1, 1);
  lWing.position.set(-0.35, 0, -0.2);
  root.add(lWing);

  // Cockpit
  const canopyGeo = new THREE.SphereGeometry(0.36, 16, 12);
  canopyGeo.scale(0.85, 0.8, 2.2);
  const canopy = new THREE.Mesh(canopyGeo, canopyMaterial);
  canopy.position.set(0, 0.35, -0.9);
  root.add(canopy);

  // Single large swept tailfin
  const finGeo = new THREE.BoxGeometry(0.08, 1.9, 1.8);
  const fin = new THREE.Mesh(finGeo, mirageMat);
  fin.position.set(0, 0.95, 1.0);
  fin.rotation.x = -0.35;
  root.add(fin);

  // SNECMA M53 Single Engine
  const engGeo = new THREE.CylinderGeometry(0.46, 0.5, 2.2, 16);
  engGeo.rotateX(Math.PI / 2);
  const eng = new THREE.Mesh(engGeo, darkMetalMaterial);
  eng.position.set(0, -0.05, 1.2);
  root.add(eng);

  // Afterburner ring
  const flameGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 16);
  flameGeo.rotateX(Math.PI / 2);
  const flameMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
  const flame = new THREE.Mesh(flameGeo, flameMat);
  flame.position.set(0, -0.05, 2.35);
  flame.name = 'afterburner_center';
  root.add(flame);

  // Roundels
  const r1 = createRoundel();
  r1.rotation.x = -Math.PI / 2;
  r1.position.set(1.8, 0.1, -1.0);
  root.add(r1);

  const r2 = createRoundel();
  r2.rotation.x = -Math.PI / 2;
  r2.position.set(-1.8, 0.1, -1.0);
  root.add(r2);
}

/**
 * 6TH-GEN HYPERSONIC STEALTH FIGHTER: "СОКІЛ-X" (SOKIL-X)
 * Lambda-wing, faceted stealth carbon skin, dual plasma vector thrusters,
 * glowing cyan energy conduits, plasma shield bubble, hypersonic lines!
 */
function buildSokilXNextGen(root: THREE.Group) {
  const stealthCarbonMat = new THREE.MeshStandardMaterial({
    color: 0x0b1320,
    roughness: 0.25,
    metalness: 0.85,
  });

  const cyanConduitMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
  });

  // Lambda Stealth Diamond Fuselage
  const fuseGeo = new THREE.ConeGeometry(0.9, 6.2, 6); // Faceted stealth angles
  fuseGeo.rotateX(Math.PI / 2);
  fuseGeo.scale(1.2, 0.35, 1.0);
  const fuse = new THREE.Mesh(fuseGeo, stealthCarbonMat);
  fuse.position.z = -0.6;
  root.add(fuse);

  // Next-Gen Iridescent Cyan Cockpit
  const canopyGeo = new THREE.SphereGeometry(0.4, 16, 12);
  canopyGeo.scale(0.85, 0.65, 2.4);
  const canopy = new THREE.Mesh(canopyGeo, nextGenCanopyMaterial);
  canopy.position.set(0, 0.3, -0.8);
  root.add(canopy);

  // Lambda / Cranked Arrow Stealth Wings with Canted Winglets
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0);
  wingShape.lineTo(4.6, -1.8);
  wingShape.lineTo(4.4, -2.6);
  wingShape.lineTo(1.8, -3.2);
  wingShape.lineTo(0.5, -3.0);
  wingShape.closePath();

  const wingExtrude = new THREE.ExtrudeGeometry(wingShape, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03 });
  wingExtrude.rotateX(Math.PI / 2);

  const rWing = new THREE.Mesh(wingExtrude, stealthCarbonMat);
  rWing.position.set(0.4, 0, -0.1);
  root.add(rWing);

  const lWing = rWing.clone();
  lWing.scale.set(-1, 1, 1);
  lWing.position.set(-0.4, 0, -0.1);
  root.add(lWing);

  // Glowing Plasma Light Conduits on Leading Wing Edges
  const conduitGeo = new THREE.CylinderGeometry(0.04, 0.04, 4.8, 8);
  conduitGeo.rotateZ(Math.PI / 3.4);
  const rConduit = new THREE.Mesh(conduitGeo, cyanConduitMat);
  rConduit.position.set(2.4, 0.06, -0.9);
  root.add(rConduit);

  const lConduit = rConduit.clone();
  lConduit.rotation.z = -Math.PI / 3.4;
  lConduit.position.set(-2.4, 0.06, -0.9);
  root.add(lConduit);

  // Canted V-Tail Ruddervators (Stealth Radar Deflecting)
  const vTailGeo = new THREE.BoxGeometry(0.06, 1.3, 1.4);
  const rVTail = new THREE.Mesh(vTailGeo, stealthCarbonMat);
  rVTail.position.set(0.9, 0.5, 1.7);
  rVTail.rotation.z = -0.55; // 40 degree outward cant
  rVTail.rotation.x = -0.25;
  root.add(rVTail);

  const lVTail = new THREE.Mesh(vTailGeo, stealthCarbonMat);
  lVTail.position.set(-0.9, 0.5, 1.7);
  lVTail.rotation.z = 0.55;
  lVTail.rotation.x = -0.25;
  root.add(lVTail);

  // Dual Rectangular 2D Vectoring Plasma Thrusters
  const nozzGeo = new THREE.BoxGeometry(0.6, 0.28, 1.8);
  const rNozz = new THREE.Mesh(nozzGeo, darkMetalMaterial);
  rNozz.position.set(0.65, -0.05, 1.5);
  root.add(rNozz);

  const lNozz = rNozz.clone();
  lNozz.position.set(-0.65, -0.05, 1.5);
  root.add(lNozz);

  // Glowing Cyan Plasma Flame Exhausts
  const plasmaFlameGeo = new THREE.BoxGeometry(0.52, 0.2, 0.35);
  const plasmaFlameMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
  const rFlame = new THREE.Mesh(plasmaFlameGeo, plasmaFlameMat);
  rFlame.position.set(0.65, -0.05, 2.45);
  rFlame.name = 'afterburner_r';
  root.add(rFlame);

  const lFlame = rFlame.clone();
  lFlame.position.set(-0.65, -0.05, 2.45);
  lFlame.name = 'afterburner_l';
  root.add(lFlame);

  // Semi-transparent Plasma Shield Bubble (can be toggled in game)
  const shieldGeo = new THREE.SphereGeometry(3.6, 24, 16);
  const shieldMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    transparent: true,
    opacity: 0.12,
    wireframe: true,
  });
  const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
  shieldMesh.name = 'plasma_shield_mesh';
  root.add(shieldMesh);

  // Trident Insignia in Golden-Cyan
  const tridentGeo = new THREE.RingGeometry(0.2, 0.45, 16);
  const tridentMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide });
  const tMesh = new THREE.Mesh(tridentGeo, tridentMat);
  tMesh.rotation.x = -Math.PI / 2;
  tMesh.position.set(0, 0.12, -1.8);
  root.add(tMesh);
}

/**
 * Creates 3D Shahed-136 Kamikaze Drone
 * Characteristic delta wing flying body, pusher propeller, rear fins, dull military paint
 */
export function createShahed136Model(): THREE.Group {
  const root = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x333b45, // Gray/charcoal drone color
    roughness: 0.7,
    metalness: 0.2,
  });

  // Delta Flying Wing Body
  const deltaShape = new THREE.Shape();
  deltaShape.moveTo(0, -1.6); // Nose
  deltaShape.lineTo(2.0, 1.4);  // Right wingtip
  deltaShape.lineTo(1.8, 1.6);  // Right rear
  deltaShape.lineTo(-1.8, 1.6); // Left rear
  deltaShape.lineTo(-2.0, 1.4); // Left wingtip
  deltaShape.closePath();

  const deltaExtrude = new THREE.ExtrudeGeometry(deltaShape, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05 });
  deltaExtrude.rotateX(Math.PI / 2);
  const deltaMesh = new THREE.Mesh(deltaExtrude, bodyMat);
  root.add(deltaMesh);

  // Wingtip Stabilizer Vertical Fins
  const finGeo = new THREE.BoxGeometry(0.06, 0.6, 0.7);
  const rFin = new THREE.Mesh(finGeo, bodyMat);
  rFin.position.set(1.95, 0.2, 1.3);
  root.add(rFin);

  const lFin = rFin.clone();
  lFin.position.set(-1.95, 0.2, 1.3);
  root.add(lFin);

  // Optical / guidance lens in nose (blunt nose sensor)
  const lensGeo = new THREE.SphereGeometry(0.12, 12, 8);
  const lensMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  const lens = new THREE.Mesh(lensGeo, lensMat);
  lens.position.set(0, 0, -1.65);
  root.add(lens);

  // Rear 2-blade Propeller (animated spinning)
  const propGroup = new THREE.Group();
  const propBladeGeo = new THREE.BoxGeometry(0.85, 0.06, 0.02);
  const propMat = new THREE.MeshBasicMaterial({ color: 0x111827 });
  const propBlade = new THREE.Mesh(propBladeGeo, propMat);
  propGroup.add(propBlade);

  const propHubGeo = new THREE.ConeGeometry(0.09, 0.18, 8);
  propHubGeo.rotateX(Math.PI / 2);
  const propHub = new THREE.Mesh(propHubGeo, propMat);
  propGroup.add(propHub);

  propGroup.position.set(0, 0, 1.7);
  propGroup.name = 'propeller';
  root.add(propGroup);

  return root;
}

/**
 * Creates 3D Shahed-238 Jet-Powered Drone (Black radar-absorbent body, dorsal jet intake)
 */
export function createShahed238JetModel(): THREE.Group {
  const root = new THREE.Group();

  const blackMat = new THREE.MeshStandardMaterial({
    color: 0x111827, // Dark black carbon finish
    roughness: 0.5,
    metalness: 0.4,
  });

  // Delta Wing Body
  const deltaShape = new THREE.Shape();
  deltaShape.moveTo(0, -1.8);
  deltaShape.lineTo(2.2, 1.3);
  deltaShape.lineTo(2.0, 1.6);
  deltaShape.lineTo(-2.0, 1.6);
  deltaShape.lineTo(-2.2, 1.3);
  deltaShape.closePath();

  const deltaExtrude = new THREE.ExtrudeGeometry(deltaShape, { depth: 0.24, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05 });
  deltaExtrude.rotateX(Math.PI / 2);
  const deltaMesh = new THREE.Mesh(deltaExtrude, blackMat);
  root.add(deltaMesh);

  // Dorsal Micro-Turbojet Intake
  const intakeGeo = new THREE.BoxGeometry(0.45, 0.25, 0.9);
  const intake = new THREE.Mesh(intakeGeo, darkMetalMaterial);
  intake.position.set(0, 0.22, 0.4);
  root.add(intake);

  // Jet Exhaust Flame
  const jetExhaustGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.2, 12);
  jetExhaustGeo.rotateX(Math.PI / 2);
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
  const flame = new THREE.Mesh(jetExhaustGeo, flameMat);
  flame.position.set(0, 0, 1.7);
  flame.name = 'jet_flame';
  root.add(flame);

  // Wingtip Fins
  const finGeo = new THREE.BoxGeometry(0.06, 0.65, 0.7);
  const rFin = new THREE.Mesh(finGeo, blackMat);
  rFin.position.set(2.1, 0.22, 1.3);
  root.add(rFin);

  const lFin = rFin.clone();
  lFin.position.set(-2.1, 0.22, 1.3);
  root.add(lFin);

  return root;
}

/**
 * Creates 3D Cruise Missile (Kh-101 / Kalibr style)
 * Sleek fuselage, pop-out wings, cruciform control fins, bright rocket booster glow
 */
export function createCruiseMissileModel(): THREE.Group {
  const root = new THREE.Group();

  const missileMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8, // Light gray stealth body
    roughness: 0.35,
    metalness: 0.6,
  });

  // Long Cylindrical Fuselage with Ogive Nose Cone
  const bodyGeo = new THREE.CylinderGeometry(0.24, 0.24, 3.4, 16);
  bodyGeo.rotateX(Math.PI / 2);
  const body = new THREE.Mesh(bodyGeo, missileMat);
  root.add(body);

  const noseGeo = new THREE.ConeGeometry(0.24, 0.8, 16);
  noseGeo.rotateX(-Math.PI / 2);
  const nose = new THREE.Mesh(noseGeo, darkMetalMaterial);
  nose.position.z = -2.1;
  root.add(nose);

  // Pop-Out Straight Wings
  const wingGeo = new THREE.BoxGeometry(2.4, 0.04, 0.4);
  const wing = new THREE.Mesh(wingGeo, darkMetalMaterial);
  wing.position.set(0, 0, -0.2);
  root.add(wing);

  // 4 Cruciform Tailfins
  const tailGeo1 = new THREE.BoxGeometry(1.0, 0.04, 0.5);
  const tail1 = new THREE.Mesh(tailGeo1, darkMetalMaterial);
  tail1.position.set(0, 0, 1.5);
  root.add(tail1);

  const tailGeo2 = new THREE.BoxGeometry(0.04, 1.0, 0.5);
  const tail2 = new THREE.Mesh(tailGeo2, darkMetalMaterial);
  tail2.position.set(0, 0, 1.5);
  root.add(tail2);

  // Blazing Jet Engine Glow
  const glowGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.25, 12);
  glowGeo.rotateX(Math.PI / 2);
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xff4400 });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.position.set(0, 0, 1.8);
  glow.name = 'missile_glow';
  root.add(glow);

  return root;
}

/**
 * Creates 3D Scout Drone (Orlan-10 / Zala style)
 */
export function createScoutDroneModel(): THREE.Group {
  const root = new THREE.Group();
  const droneMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5 });

  const fuseGeo = new THREE.CylinderGeometry(0.16, 0.16, 1.6, 12);
  fuseGeo.rotateX(Math.PI / 2);
  root.add(new THREE.Mesh(fuseGeo, droneMat));

  const wingGeo = new THREE.BoxGeometry(3.2, 0.04, 0.35);
  const wing = new THREE.Mesh(wingGeo, droneMat);
  wing.position.set(0, 0.1, -0.1);
  root.add(wing);

  const tailGeo = new THREE.BoxGeometry(0.8, 0.04, 0.25);
  const tail = new THREE.Mesh(tailGeo, droneMat);
  tail.position.set(0, 0.1, 0.85);
  root.add(tail);

  const vTailGeo = new THREE.BoxGeometry(0.04, 0.45, 0.25);
  const vTail = new THREE.Mesh(vTailGeo, droneMat);
  vTail.position.set(0, 0.25, 0.85);
  root.add(vTail);

  return root;
}

/**
 * Creates 3D Air-to-Air Missile
 */
export function createAirToAirMissileModel(color: string, isHypersonic = false): THREE.Group {
  const root = new THREE.Group();

  const bodyGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.8, 12);
  bodyGeo.rotateX(Math.PI / 2);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: isHypersonic ? 0x0f172a : 0xe2e8f0,
    metalness: isHypersonic ? 0.9 : 0.4,
    roughness: 0.3,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  root.add(body);

  const noseGeo = new THREE.ConeGeometry(0.1, 0.4, 12);
  noseGeo.rotateX(-Math.PI / 2);
  const noseMat = new THREE.MeshBasicMaterial({ color: color });
  const nose = new THREE.Mesh(noseGeo, noseMat);
  nose.position.z = -1.1;
  root.add(nose);

  const finGeo = new THREE.BoxGeometry(0.45, 0.45, 0.02);
  const finMat = new THREE.MeshStandardMaterial({ color: 0x334155 });
  const fin1 = new THREE.Mesh(finGeo, finMat);
  fin1.position.z = 0.7;
  root.add(fin1);

  const flameGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.15, 8);
  flameGeo.rotateX(Math.PI / 2);
  const flame = new THREE.Mesh(flameGeo, new THREE.MeshBasicMaterial({ color: isHypersonic ? 0x00f0ff : 0xffaa00 }));
  flame.position.z = 0.95;
  root.add(flame);

  return root;
}

/**
 * Creates Searchlight Beam projecting from ground to night sky
 */
export function createSearchlightBeam(): THREE.Group {
  const group = new THREE.Group();

  // Flak / Searchlight spot
  const coneGeo = new THREE.ConeGeometry(40, 600, 16, 1, true);
  coneGeo.rotateX(Math.PI / 2);
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0x93c5fd,
    transparent: true,
    opacity: 0.08,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const beam = new THREE.Mesh(coneGeo, coneMat);
  beam.position.z = -300;
  group.add(beam);

  return group;
}
