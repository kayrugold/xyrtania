import * as THREE from 'three';
import { PlayerState, JumpPhase } from './types';

// Let's hold a flag for the 4-frame impact landing animation tracker
let impactFrameCounter = 0;

export function generateProceduralExplorerMesh(): THREE.Group {
  // Empty parent container with ground pivot lock at local y = 0
  const characterGroup = new THREE.Group();
  characterGroup.name = 'explorer';

  // --- MATERIAL PALETTE (All flatShading: false for smooth organic contours) ---
  const skinMaterial = new THREE.MeshStandardMaterial({ color: 0xffdbac, roughness: 0.5, flatShading: false }); // Peach skin
  const shirtMaterial = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.6, flatShading: false }); // Blue tunic
  const bootMaterial = new THREE.MeshStandardMaterial({ color: 0x4a2a18, roughness: 0.7, flatShading: false }); // Brown leather boots
  const strapMaterial = new THREE.MeshStandardMaterial({ color: 0x5c3317, roughness: 0.7, flatShading: false }); // Dark brown strap
  const bagMaterial = new THREE.MeshStandardMaterial({ color: 0x5a6344, roughness: 0.7, flatShading: false }); // Olive green bag
  const ropeMaterial = new THREE.MeshStandardMaterial({ color: 0xded5be, roughness: 0.8, flatShading: false }); // Beige rope
  const goldMaterial = new THREE.MeshStandardMaterial({ color: 0xfaed26, metalness: 0.8, roughness: 0.2, flatShading: false }); // Gold
  const silverShieldMat = new THREE.MeshStandardMaterial({ color: 0xced4da, metalness: 0.6, roughness: 0.3, flatShading: false }); // Silver
  const hairMaterial = new THREE.MeshStandardMaterial({ color: 0x3d200f, roughness: 0.8, flatShading: false }); // Brown hair
  const hatMaterial = new THREE.MeshStandardMaterial({ color: 0x9c6644, roughness: 0.7, flatShading: false }); // Cowboy hat
  const bandMaterial = new THREE.MeshStandardMaterial({ color: 0xdfd3c3, roughness: 0.7, flatShading: false }); // Hat band
  const mapMaterial = new THREE.MeshStandardMaterial({ color: 0xf3e9dc, roughness: 0.8, flatShading: false }); // Map

  // --- LOWER BODY GROUP (Legs and Boots, Pivot at Y=0) ---
  const lowerBodyGroup = new THREE.Group();
  lowerBodyGroup.name = 'lowerBodyGroup';
  characterGroup.add(lowerBodyGroup);

  // Left Boot (Smooth designer organic boot)
  const leftBootGeometry = new THREE.SphereGeometry(0.24, 16, 16);
  const leftBoot = new THREE.Mesh(leftBootGeometry, bootMaterial);
  leftBoot.scale.set(0.8, 0.75, 1.45); // squashed sphere for a cute, smooth shoe look
  leftBoot.position.set(-0.3, 0.18, 0.08);
  leftBoot.castShadow = true;
  leftBoot.receiveShadow = true;
  lowerBodyGroup.add(leftBoot);

  // Left Leg Cylinder (smooth segment count 16)
  const leftLegGeom = new THREE.CylinderGeometry(0.14, 0.14, 0.6, 16);
  const leftLeg = new THREE.Mesh(leftLegGeom, strapMaterial);
  leftLeg.position.set(-0.3, 0.5, 0);
  leftLeg.castShadow = true;
  leftLeg.receiveShadow = true;
  lowerBodyGroup.add(leftLeg);

  // Right Boot (Smooth designer organic boot)
  const rightBoot = new THREE.Mesh(leftBootGeometry, bootMaterial);
  rightBoot.scale.set(0.8, 0.75, 1.45);
  rightBoot.position.set(0.3, 0.18, 0.08);
  rightBoot.castShadow = true;
  rightBoot.receiveShadow = true;
  lowerBodyGroup.add(rightBoot);

  // Right Leg Cylinder
  const rightLeg = new THREE.Mesh(leftLegGeom, strapMaterial);
  rightLeg.position.set(0.3, 0.5, 0);
  rightLeg.castShadow = true;
  rightLeg.receiveShadow = true;
  lowerBodyGroup.add(rightLeg);


  // --- UPPER BODY GROUP (Torso, Arms, Backpack, Head, Hat) ---
  const upperBodyGroup = new THREE.Group();
  upperBodyGroup.name = 'upperBodyGroup';
  characterGroup.add(upperBodyGroup);

  // Torso capsule (represented organically by a smooth cylinder with high segment count)
  const torsoGeom = new THREE.CylinderGeometry(0.44, 0.44, 1.15, 16);
  const torso = new THREE.Mesh(torsoGeom, shirtMaterial);
  torso.position.set(0, 1.4, 0);
  torso.castShadow = true;
  torso.receiveShadow = true;
  upperBodyGroup.add(torso);

  // Smooth sphere caps for shoulders to make Torso look perfectly organic
  const shoulderGeom = new THREE.SphereGeometry(0.18, 16, 16);
  const shoulderL = new THREE.Mesh(shoulderGeom, shirtMaterial);
  shoulderL.position.set(-0.44, 1.75, 0);
  shoulderL.castShadow = true;
  upperBodyGroup.add(shoulderL);

  const shoulderR = new THREE.Mesh(shoulderGeom, shirtMaterial);
  shoulderR.position.set(0.44, 1.75, 0);
  shoulderR.castShadow = true;
  upperBodyGroup.add(shoulderR);

  // Smooth Chest Badge
  const shieldBase = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.04, 16), silverShieldMat);
  shieldBase.position.set(-0.22, 1.6, 0.42);
  shieldBase.rotation.x = Math.PI / 2;
  shieldBase.castShadow = true;
  const shieldDecor = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), goldMaterial);
  shieldDecor.position.set(-0.22, 1.6, 0.44);
  shieldDecor.castShadow = true;
  upperBodyGroup.add(shieldBase);
  upperBodyGroup.add(shieldDecor);

  // Utility Belt (Smooth Ring-like cylinder)
  const beltGeom = new THREE.CylinderGeometry(0.47, 0.47, 0.16, 16);
  const belt = new THREE.Mesh(beltGeom, strapMaterial);
  belt.position.set(0, 0.9, 0);
  belt.castShadow = true;
  upperBodyGroup.add(belt);

  // Buckle (Smooth sphere-oval)
  const buckleGeom = new THREE.SphereGeometry(0.12, 12, 12);
  const buckle = new THREE.Mesh(buckleGeom, goldMaterial);
  buckle.scale.set(1.4, 1.0, 0.6);
  buckle.position.set(0, 0.9, 0.46);
  buckle.castShadow = true;
  upperBodyGroup.add(buckle);


  // --- ARMS HOLDING THE MAP ---
  // Left Arm (Smooth cylinder)
  const armGeom = new THREE.CylinderGeometry(0.10, 0.09, 0.65, 12);
  const leftArm = new THREE.Group();
  leftArm.name = 'leftArm';
  leftArm.position.set(-0.54, 1.6, 0.15);
  const leftArmMesh = new THREE.Mesh(armGeom, shirtMaterial);
  leftArmMesh.position.set(0, -0.2, 0);
  leftArmMesh.castShadow = true;
  leftArm.add(leftArmMesh);
  
  const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.10, 12, 12), skinMaterial);
  leftHand.position.set(0, -0.55, 0.05);
  leftHand.castShadow = true;
  leftArm.add(leftHand);

  leftArm.rotation.set(-0.4, 0.25, 0.15);
  upperBodyGroup.add(leftArm);

  // Right Arm (Smooth cylinder)
  const rightArm = new THREE.Group();
  rightArm.name = 'rightArm';
  rightArm.position.set(0.54, 1.6, 0.15);
  const rightArmMesh = new THREE.Mesh(armGeom, shirtMaterial);
  rightArmMesh.position.set(0, -0.2, 0);
  rightArmMesh.castShadow = true;
  rightArm.add(rightArmMesh);

  const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.10, 12, 12), skinMaterial);
  rightHand.position.set(0, -0.55, 0.05);
  rightHand.castShadow = true;
  rightArm.add(rightHand);

  rightArm.rotation.set(-0.4, -0.25, -0.15);
  upperBodyGroup.add(rightArm);

  // Handheld Map (Organic smooth edges)
  const mapGeom = new THREE.BoxGeometry(0.75, 0.015, 0.5);
  const mapMesh = new THREE.Mesh(mapGeom, mapMaterial);
  mapMesh.position.set(0, 1.25, 0.45);
  mapMesh.rotation.set(0.25, 0, 0);
  mapMesh.castShadow = true;
  mapMesh.receiveShadow = true;

  const mapDrawing = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.018, 16), strapMaterial);
  mapDrawing.position.set(0.1, 0.01, 0);
  mapMesh.add(mapDrawing);

  upperBodyGroup.add(mapMesh);


  // --- MASSIVE BACKPACK SYSTEM (Organic round pack) ---
  const backpackGeom = new THREE.SphereGeometry(0.38, 16, 16);
  const backpack = new THREE.Mesh(backpackGeom, strapMaterial);
  backpack.scale.set(1.1, 1.3, 0.85); // Organic round egg shapes look super smooth and procedural!
  backpack.position.set(0, 1.45, -0.42);
  backpack.castShadow = true;
  backpack.receiveShadow = true;
  upperBodyGroup.add(backpack);

  // Slung Straps
  const strapLeft = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.9, 0.04), strapMaterial);
  strapLeft.position.set(-0.35, 1.45, 0.38);
  strapLeft.castShadow = true;
  upperBodyGroup.add(strapLeft);

  const strapRight = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.9, 0.04), strapMaterial);
  strapRight.position.set(0.35, 1.45, 0.38);
  strapRight.castShadow = true;
  upperBodyGroup.add(strapRight);

  // Canvas Strap Buckles
  const bL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.08), goldMaterial);
  bL.position.set(-0.35, 1.55, 0.41);
  const bR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.08), goldMaterial);
  bR.position.set(0.35, 1.55, 0.41);
  upperBodyGroup.add(bL, bR);

  // Rolled Sleeping Bag (Organic smooth cylinder)
  const bagGeom = new THREE.CylinderGeometry(0.20, 0.20, 1.05, 16);
  const sleepingBag = new THREE.Group();
  sleepingBag.position.set(0, 2.05, -0.42);
  
  const sleepingBagMesh = new THREE.Mesh(bagGeom, bagMaterial);
  sleepingBagMesh.rotation.z = Math.PI / 2;
  sleepingBagMesh.castShadow = true;
  sleepingBag.add(sleepingBagMesh);

  // Wrap straps
  const bagStrapG = new THREE.CylinderGeometry(0.21, 0.21, 0.08, 16);
  const bagLStrap = new THREE.Mesh(bagStrapG, strapMaterial);
  bagLStrap.position.set(-0.3, 0, 0);
  bagLStrap.rotation.z = Math.PI / 2;
  sleepingBag.add(bagLStrap);

  const bagRStrap = new THREE.Mesh(bagStrapG, strapMaterial);
  bagRStrap.position.set(0.3, 0, 0);
  bagRStrap.rotation.z = Math.PI / 2;
  sleepingBag.add(bagRStrap);

  upperBodyGroup.add(sleepingBag);


  // --- COIL OF ROPE ATTACHED TO COIL BACKPACK ---
  const ropeGeom = new THREE.TorusGeometry(0.28, 0.08, 6, 12);
  const ropeCoil = new THREE.Mesh(ropeGeom, ropeMaterial);
  ropeCoil.position.set(0.55, 1.25, -0.5);
  ropeCoil.rotation.y = Math.PI / 2;
  ropeCoil.castShadow = true;
  upperBodyGroup.add(ropeCoil);


  // --- HEAD & HAIR ---
  // Neck
  const neckGeom = new THREE.CylinderGeometry(0.16, 0.16, 0.25, 16);
  const neck = new THREE.Mesh(neckGeom, skinMaterial);
  neck.position.set(0, 2.15, 0);
  neck.castShadow = true;
  upperBodyGroup.add(neck);

  // Spherical Beautiful Organic Head
  const headGeom = new THREE.SphereGeometry(0.38, 18, 18);
  const head = new THREE.Mesh(headGeom, skinMaterial);
  head.position.set(0, 2.5, 0);
  head.castShadow = true;
  head.receiveShadow = true;
  upperBodyGroup.add(head);

  // Organic custom hair chunks built with layered spheres to resemble smooth clay curls
  const hairGroup = new THREE.Group();
  hairGroup.position.set(0, 2.5, 0);

  const hairPartGeom = new THREE.SphereGeometry(0.25, 12, 12);

  // Back clay curl
  const hC1 = new THREE.Mesh(hairPartGeom, hairMaterial);
  hC1.position.set(0, 0.05, -0.22);
  hC1.scale.set(1.4, 1.2, 0.95);
  hairGroup.add(hC1);

  // Left clay curl
  const hC2 = new THREE.Mesh(hairPartGeom, hairMaterial);
  hC2.position.set(-0.22, 0.0, 0.05);
  hC2.scale.set(0.9, 1.3, 1.1);
  hairGroup.add(hC2);

  // Right clay curl
  const hC3 = new THREE.Mesh(hairPartGeom, hairMaterial);
  hC3.position.set(0.22, 0.0, 0.05);
  hC3.scale.set(0.9, 1.3, 1.1);
  hairGroup.add(hC3);

  // Top cap curl
  const hC4 = new THREE.Mesh(hairPartGeom, hairMaterial);
  hC4.position.set(0, 0.22, -0.05);
  hC4.scale.set(1.2, 0.8, 1.0);
  hairGroup.add(hC4);

  upperBodyGroup.add(hairGroup);

  // Shiny circular organic bead eyes (Pixar-style cute custom expression)
  const eyeGeom = new THREE.SphereGeometry(0.06, 12, 12);
  const leftEye = new THREE.Mesh(eyeGeom, hairMaterial);
  leftEye.position.set(-0.16, 2.5, 0.34);
  const rightEye = new THREE.Mesh(eyeGeom, hairMaterial);
  rightEye.position.set(0.16, 2.5, 0.34);
  upperBodyGroup.add(leftEye, rightEye);

  // Procedural Eyelids (hidden by default)
  const eyelidMat = new THREE.MeshBasicMaterial({ color: 0x221105, side: THREE.DoubleSide });
  const eyelidGeo = new THREE.PlaneGeometry(0.14, 0.05);
  const eyelids = new THREE.Group();
  eyelids.name = 'proceduralEyelids';
  const leftLid = new THREE.Mesh(eyelidGeo, eyelidMat);
  leftLid.position.set(-0.16, 2.49, 0.40);
  const rightLid = new THREE.Mesh(eyelidGeo, eyelidMat);
  rightLid.position.set(0.16, 2.49, 0.40);
  eyelids.add(leftLid, rightLid);
  eyelids.visible = false;
  upperBodyGroup.add(eyelids);


  // --- PATROL HAT ---
  const hatBrimGeom = new THREE.CylinderGeometry(1.25, 1.25, 0.035, 24);
  const hatBrim = new THREE.Mesh(hatBrimGeom, hatMaterial);
  hatBrim.position.set(0, 2.85, 0.04);
  hatBrim.rotation.x = 0.05;
  hatBrim.castShadow = true;
  upperBodyGroup.add(hatBrim);

  const hatCrownGeom = new THREE.CylinderGeometry(0.44, 0.52, 0.5, 24);
  const hatCrown = new THREE.Mesh(hatCrownGeom, hatMaterial);
  hatCrown.position.set(0, 3.06, 0.02);
  hatCrown.rotation.x = 0.05;
  hatCrown.castShadow = true;
  upperBodyGroup.add(hatCrown);

  const hatBandGeom = new THREE.CylinderGeometry(0.53, 0.54, 0.09, 24);
  const hatBand = new THREE.Mesh(hatBandGeom, bandMaterial);
  hatBand.position.set(0, 2.89, 0.03);
  hatBand.rotation.x = 0.05;
  hatBand.castShadow = true;
  upperBodyGroup.add(hatBand);

  const emblemGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.04, 16);
  const emblem = new THREE.Mesh(emblemGeom, goldMaterial);
  emblem.position.set(0.32, 2.95, 0.42);
  emblem.rotation.set(0.4, 0.15, -0.2);
  emblem.castShadow = true;
  upperBodyGroup.add(emblem);

  return characterGroup;
}

// 4-Phase Athletic Jump State machine driven by delta time and frame-sensitive ticks
export function updateMascotAnimation(
  character: THREE.Group,
  state: PlayerState,
  dt: number,
  globalTime: number
): void {
  // --- UNIVERSAL EYE BLINK LOGIC ---
  if (state.blinkTimer === undefined) state.blinkTimer = 0;
  state.blinkTimer += dt;
  
  // Blink every 3.5 seconds, lasts for 0.15s
  const isBlinking = (state.blinkTimer % 3.5) < 0.15;
  
  let animatedMorphs = false;
  character.traverse((c: any) => {
     if (c.morphTargetDictionary && c.morphTargetInfluences) {
         for (const key in c.morphTargetDictionary) {
             const lowerKey = key.toLowerCase();
             if (lowerKey.includes('blink') || lowerKey.includes('eye')) {
                 const idx = c.morphTargetDictionary[key];
                 c.morphTargetInfluences[idx] = isBlinking ? 1.0 : 0.0;
                 animatedMorphs = true;
             }
         }
     }
  });
  
  if (!animatedMorphs) {
      // Fallback procedural eyelids (created in loader or procedural generator)
      const eyelids = character.getObjectByName('proceduralEyelids');
      if (eyelids) {
          eyelids.visible = isBlinking;
      }
  }

  const upperBody = character.getObjectByName('upperBodyGroup') as THREE.Group;
  const lowerBody = character.getObjectByName('lowerBodyGroup') as THREE.Group;
  if (!upperBody || !lowerBody) return;

  const leftArm = character.getObjectByName('leftArm') as THREE.Group;
  const rightArm = character.getObjectByName('rightArm') as THREE.Group;

  // Track legs to animate running bobs
  const children = lowerBody.children;
  // Let's identify the legs/boots objects dynamically
  const leftLegObj = children[1]; // cylinder left leg
  const leftBootObj = children[0]; // box left boot
  const rightLegObj = children[3]; // cylinder right leg
  const rightBootObj = children[2]; // box right boot

  switch (state.jumpPhase) {
    case JumpPhase.IDLE: {
      impactFrameCounter = 0;
      // Reset overall scales
      character.scale.lerp(new THREE.Vector3(1, 1, 1), dt * 10);
      upperBody.position.set(0, 0, 0);
      lowerBody.position.set(0, 0, 0);
      upperBody.rotation.set(0, 0, 0);
      lowerBody.scale.set(1, 1, 1);

      // Cute slow breathing idle bob
      const breathing = Math.sin(globalTime * 3) * 0.035;
      upperBody.position.y = breathing;

      if (leftLegObj && rightLegObj) {
        leftLegObj.rotation.x = 0;
        rightLegObj.rotation.x = 0;
        leftBootObj.position.y = 0.18;
        rightBootObj.position.y = 0.18;
      }
      if (leftArm && rightArm) {
        leftArm.rotation.set(-0.4, 0.25, 0.15 + Math.sin(globalTime * 3) * 0.04);
        rightArm.rotation.set(-0.4, -0.25, -0.15 - Math.sin(globalTime * 3) * 0.04);
      }
      break;
    }

    case JumpPhase.RUNNING: {
      impactFrameCounter = 0;
      // Ensure scales are default
      character.scale.lerp(new THREE.Vector3(1, 1, 1), dt * 10);
      upperBody.position.set(0, 0, 0);
      lowerBody.position.set(0, 0, 0);
      upperBody.rotation.set(0, 0, 0);
      lowerBody.scale.set(1, 1, 1);

      // Alternate legging run cycle
      // If horse riding is active, run legs bob differently (equestrian posture!)
      const animSpeed = state.isRidingHorse ? 16 : 12;
      const angleSweep = state.isRidingHorse ? 0.35 : 0.65;
      
      const bounce = Math.abs(Math.sin(globalTime * animSpeed)) * 0.09;
      upperBody.position.y = bounce;

      if (leftLegObj && rightLegObj && leftBootObj && rightBootObj) {
        const cycle = Math.sin(globalTime * animSpeed);
        leftLegObj.rotation.x = cycle * angleSweep;
        rightLegObj.rotation.x = -cycle * angleSweep;

        // Make boots move visual height representation
        leftBootObj.position.y = 0.18 + Math.max(0, cycle) * 0.18;
        rightBootObj.position.y = 0.18 + Math.max(0, -cycle) * 0.18;
      }

      if (leftArm && rightArm) {
        // Arm bob swing swinging map
        const armCycle = Math.sin(globalTime * animSpeed);
        leftArm.rotation.x = -0.4 + armCycle * 0.15;
        rightArm.rotation.x = -0.4 - armCycle * 0.15;
      }
      break;
    }

    case JumpPhase.PREP: {
      // PREP: Crunch upperBody group down and expand lower legs/shoes horizontally (knee bend)
      impactFrameCounter = 0;
      upperBody.position.y = THREE.MathUtils.lerp(upperBody.position.y, -0.28, dt * 20);

      // Widens legs scale horizontally
      lowerBody.scale.set(1.3, 0.72, 1.3);
      character.scale.set(1.0, 0.82, 1.0);

      // Flatten leg angles
      if (leftLegObj && rightLegObj) {
        leftLegObj.rotation.x = 0;
        rightLegObj.rotation.x = 0;
      }
      break;
    }

    case JumpPhase.LAUNCH: {
      impactFrameCounter = 0;
      // LAUNCH/ASCENT: Stretch character mesh vertically and lean the whole character forward
      // Pitch forward lean in the upperBody relative to direction of travel!
      const travelSpeedPercent = Math.min(1.0, state.speed / 15);
      const targetForwardLean = 0.32 * (travelSpeedPercent + 0.3); // Explicit forward lean (do not lean backward)
      
      upperBody.rotation.x = THREE.MathUtils.lerp(upperBody.rotation.x, targetForwardLean, dt * 12);
      
      // Vertical stretch of overall dimensions
      character.scale.lerp(new THREE.Vector3(0.82, 1.32, 0.82), dt * 15);
      lowerBody.scale.lerp(new THREE.Vector3(1, 1, 1), dt * 15);

      // Animate arms high wide for in-flight flair
      if (leftArm && rightArm) {
        leftArm.rotation.set(-0.8, 0.1, 0.4);
        rightArm.rotation.set(-0.8, -0.1, -0.4);
      }
      break;
    }

    case JumpPhase.APEX: {
      impactFrameCounter = 0;
      // APEX: Interpolate smoothly back to default (1,1,1) bounds
      character.scale.lerp(new THREE.Vector3(1.0, 1.0, 1.0), dt * 8);
      upperBody.rotation.x = THREE.MathUtils.lerp(upperBody.rotation.x, 0.05, dt * 8);

      if (leftArm && rightArm) {
        leftArm.rotation.set(-0.5, 0.2, 0.2);
        rightArm.rotation.set(-0.5, -0.2, -0.2);
      }
      break;
    }

    case JumpPhase.IMPACT: {
      // IMPACT LANDING: Trigger brief horizontal squash upon touching the ground over EXACTLY 4 frames
      impactFrameCounter++;

      if (impactFrameCounter <= 4) {
        // Dramatic squash
        character.scale.set(1.38, 0.68, 1.38);
        upperBody.position.y = -0.32;
        if (leftArm && rightArm) {
          leftArm.rotation.set(-0.2, 0.4, 0.3);
          rightArm.rotation.set(-0.2, -0.4, -0.3);
        }
      } else {
        // Snapshot snapback & clear transition
        character.scale.set(1.0, 1.0, 1.0);
        upperBody.position.y = 0;
        state.jumpPhase = state.speed > 0.1 ? JumpPhase.RUNNING : JumpPhase.IDLE;
        impactFrameCounter = 0;
      }
      break;
    }
  }
}
