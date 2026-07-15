import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { PlayerState, JumpPhase, resolveAssetUrl } from './types';

export const MODEL_SCALE_CONFIG: Record<string, { targetDepth?: number; targetWidth?: number; targetHeight?: number; scaleOverride?: number; yOffset?: number }> = {
  '/assets/character/Xyrtania_Male_NoMorphs.glb': { targetHeight: 2.14, yOffset: 0.0 },
  'base_male_0.fbx': { targetHeight: 2.14 },
  'default': { targetHeight: 2.14 }
};

export class CharacterAnimator {
  public group: THREE.Group;
  public mixer: THREE.AnimationMixer | null = null;
  
  private actions: Record<string, THREE.AnimationAction> = {};
  private activeAction: THREE.AnimationAction | null = null;
  private modelLoaded = false;
  
  private basePrefix = '';
  private currentNametag = '';
  private nametagSprite: THREE.Sprite | null = null;
  private innerMesh: THREE.Object3D | null = null;
  private baseYOffset = 0;
  public targetHeight = 2.2;
  public baseScale = 1.0;
  public currentModelUrl: string = '';
  public currentActionName: string = 'neutral_idle';
  public isRemote: boolean = false;
  private blinkInterval: any = null;
  
  public currentHeadStyle: number = 0;
  public customHeadUrl: string | null = null;
  private customHeadMesh: THREE.Object3D | null = null;
  public originalHeadMesh: THREE.Object3D | null = null;
  public meshBodyHead: THREE.Object3D | null = null;
  public meshBodyTorso: THREE.Object3D | null = null;
  public meshBodyArms: THREE.Object3D | null = null;
  public meshBodyLegs: THREE.Object3D | null = null;
  public meshBodyFeet: THREE.Object3D | null = null;
  public headBone: THREE.Object3D | null = null;
  public leftEyeBone: THREE.Object3D | null = null;
  public rightEyeBone: THREE.Object3D | null = null;
  public beardBone: THREE.Object3D | null = null;
  public leftLegBone: THREE.Object3D | null = null;
  public rightLegBone: THREE.Object3D | null = null;
  public leftArmBone: THREE.Object3D | null = null;
  public rightArmBone: THREE.Object3D | null = null;
  public spineBone: THREE.Object3D | null = null;
  public morphMeshes: THREE.Mesh[] = [];
  public customMorphTargetDictionary: Record<string, number> = {};
  public currentCustomizationState: Record<string, number> = {};
  public lookTarget: THREE.Vector3 | null = null;

  public customColor: string | null = null;
  public customScale: number = 1.0;
  public torsoVisible: boolean = true;
  
  private static modelCache = new Map<string, Promise<THREE.Group>>();
  private static animCache = new Map<string, Promise<THREE.Group>>();
  private static textureCache = new Map<string, Promise<THREE.Texture>>();
  public static onError: ((error: string) => void) | null = null;

  public static clearCaches() {
    this.modelCache.clear();
    this.animCache.clear();
    this.textureCache.clear();
  }

  public static async preloadCharacters(characterUrls: string[]) {
      const animations = [
        '/assets/character/Xyrtania_Male_NoMorphs.glb',
        '/assets/character/animations/walk.fbx',
        '/assets/character/animations/jog.fbx',
        '/assets/character/animations/run.fbx',
        '/assets/character/animations/jump.fbx',
        '/assets/character/animations/pushing.fbx',
        '/assets/character/animations/swim.fbx',
        '/assets/character/animations/tread.fbx',
        '/assets/character/Xyrtania_Male_NoMorphs.glb',
        '/assets/character/animations/crouch_idle.fbx',
        '/assets/character/Xyrtania_Male_NoMorphs.glb',
        '/assets/character/animations/prone_forward.fbx',
        '/assets/character/Xyrtania_Male_NoMorphs.glb',
      ];

      // Preload animations silently in the background
      for (const anim of animations) {
          this.getAnimation(anim).catch(() => {});
          await new Promise(r => setTimeout(r, 50)); // stagger parsing
      }

      // Preload character models
      for (const url of characterUrls) {
          this.getModel(url).catch(() => {});
          
          if (url.includes('humanoid') || url.includes('explorer_clone') || url.includes('base_male_0')) {
              const basePath = url.substring(0, url.lastIndexOf('/'));
              this.getTexture(`${basePath}/Color.png`).catch(() => {});
              this.getTexture(`${basePath}/Normal.png`).catch(() => {});
              this.getTexture(`${basePath}/Metallic.png`).catch(() => {});
              this.getTexture(`${basePath}/Roughness.png`).catch(() => {});
          }
          await new Promise(r => setTimeout(r, 50)); // stagger parsing
      }
  }

  constructor(isRemote: boolean = false) {
    this.isRemote = isRemote;
    this.group = new THREE.Group();
    this.group.name = 'explorer';
  }

  private static getTexture(url: string): Promise<THREE.Texture> {
    if (!this.textureCache.has(url)) {
      const resolvedUrl = resolveAssetUrl(url);
      const isExternal = resolvedUrl.startsWith('http://') || resolvedUrl.startsWith('https://');
      const fetchUrl = isExternal || resolvedUrl.startsWith('blob:') ? resolvedUrl : (resolvedUrl.includes('?') ? resolvedUrl : `${resolvedUrl}`);
      
      const loader = new THREE.TextureLoader();
      
      const promise = loader.loadAsync(fetchUrl).catch((err) => {
        this.textureCache.delete(url);
        throw err;
      });
      this.textureCache.set(url, promise);
    }
    return this.textureCache.get(url)!;
  }

  private static async getModel(url: string): Promise<THREE.Group> {
    if (this.modelCache.has(url)) {
      return await this.modelCache.get(url)!;
    }
    
    if (!this.modelCache.has(url)) {
      const resolvedUrl = resolveAssetUrl(url);
      const isExternal = resolvedUrl.startsWith('http://') || resolvedUrl.startsWith('https://');
      const isGltf = resolvedUrl.toLowerCase().endsWith('.glb') || resolvedUrl.toLowerCase().endsWith('.gltf') || resolvedUrl.includes('.glb') || resolvedUrl.includes('.gltf') || resolvedUrl.startsWith('blob:');
      const fetchUrl = isExternal || resolvedUrl.startsWith('blob:') ? resolvedUrl : (resolvedUrl.includes('?') ? resolvedUrl : `${resolvedUrl}`);
      
      if (isGltf) {
        const promise = (async () => {
          const loader = new GLTFLoader(); loader.setCrossOrigin(""); 
          try {
            const gltf = await loader.loadAsync(fetchUrl);
            return gltf.scene;
          } catch (err: any) {
            const errMsg = err?.message || String(err);
            if (errMsg.toLowerCase().includes('draco') || errMsg.toLowerCase().includes('extension')) {
              console.warn(`GLTF load failed, retrying with DRACOLoader for ${url}`);
              const dracoLoader = new DRACOLoader();
              dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
              loader.setDRACOLoader(dracoLoader);
              const gltf = await loader.loadAsync(fetchUrl);
              return gltf.scene;
            }
            throw err;
          }
        })().catch((err) => {
          this.modelCache.delete(url);
          throw err;
        });
        this.modelCache.set(url, promise as any);
      } else {
        const loader = new FBXLoader();
        const promise = loader.loadAsync(fetchUrl).catch((err) => {
          this.modelCache.delete(url);
          throw err;
        });
        this.modelCache.set(url, promise);
      }
    }
    return this.modelCache.get(url)!;
  }

  private static getAnimation(url: string): Promise<THREE.Group> {
    if (!this.animCache.has(url)) {
      const resolvedUrl = resolveAssetUrl(url);
      const isExternal = resolvedUrl.startsWith('http://') || resolvedUrl.startsWith('https://');
      const fetchUrl = isExternal || resolvedUrl.startsWith('blob:') ? resolvedUrl : (resolvedUrl.includes('?') ? resolvedUrl : `${resolvedUrl}`);
      let promise: Promise<any>;
      
      if (resolvedUrl.endsWith('.glb') || resolvedUrl.endsWith('.gltf') || resolvedUrl.includes('.glb') || resolvedUrl.includes('.gltf') || resolvedUrl.startsWith('blob:')) {
        promise = (async () => {
          const loader = new GLTFLoader(); loader.setCrossOrigin(""); 
          try {
            return await loader.loadAsync(fetchUrl);
          } catch (err: any) {
            const errMsg = err?.message || String(err);
            if (errMsg.toLowerCase().includes('draco') || errMsg.toLowerCase().includes('extension')) {
              console.warn(`GLTF animation load failed, retrying with DRACOLoader for ${url}`);
              const dracoLoader = new DRACOLoader();
              dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
              loader.setDRACOLoader(dracoLoader);
              return await loader.loadAsync(fetchUrl);
            }
            throw err;
          }
        })();
      } else {
        const loader = new FBXLoader();
        promise = loader.loadAsync(fetchUrl);
      }

      promise = promise.catch((err) => {
        this.animCache.delete(url);
        throw err;
      });
      this.animCache.set(url, promise);
    }
    return this.animCache.get(url)!;
  }

  public static disposeHierarchy(obj: THREE.Object3D) {
      obj.traverse((child: any) => {
          if ((child as any).isMesh) {
              if (child.geometry) {
                  child.geometry.dispose();
              }
              if (child.material) {
                  if (Array.isArray(child.material)) {
                      child.material.forEach((mat) => mat.dispose());
                  } else {
                      child.material.dispose();
                  }
              }
          }
      });
  }

  private createProceduralTeacherHead(): THREE.Group {
    const headGroup = new THREE.Group();
    headGroup.name = 'ProceduralTeacherHead';

    // Skin Color: Use custom color if present, or fallback peach/beige
    const skinColor = this.customColor || '#ffcca3';
    const headMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(skinColor),
        roughness: 0.6,
        metalness: 0.1
    });

    // 1. Head Sphere (Centered around origin, slightly offset up from neck pivot)
    const headGeo = new THREE.SphereGeometry(0.24, 32, 32);
    headGeo.scale(1, 1.15, 1);
    const headMesh = new THREE.Mesh(headGeo, headMat);
    headMesh.name = 'ProceduralTeacherHead_Base';
    headMesh.position.set(0, 0.22, 0);
    headMesh.castShadow = true;
    headMesh.receiveShadow = true;
    headGroup.add(headMesh);

    // 2. Teacher Hair (A stylish bun & side hair)
    const hairColor = '#5c4033'; // Dark Brown
    const hairMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(hairColor),
        roughness: 0.8,
        metalness: 0.1
    });

    // Top hair bun
    const bunGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const bunMesh = new THREE.Mesh(bunGeo, hairMat);
    bunMesh.position.set(0, 0.48, -0.05);
    bunMesh.castShadow = true;
    headGroup.add(bunMesh);

    // Hair cap / back hair
    const hairCapGeo = new THREE.SphereGeometry(0.25, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const hairCapMesh = new THREE.Mesh(hairCapGeo, hairMat);
    hairCapMesh.rotation.x = -Math.PI / 6;
    hairCapMesh.position.set(0, 0.23, -0.03);
    headGroup.add(hairCapMesh);

    // 3. Cute Eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const eyeGeo = new THREE.SphereGeometry(0.024, 8, 8);
    
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.08, 0.23, 0.20);
    headGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.08, 0.23, 0.20);
    headGroup.add(rightEye);

    // 4. Stylish Teacher Glasses (Vibrant magenta frames with transparent lenses)
    const frameColor = '#ff007f';
    const frameMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(frameColor),
        roughness: 0.3,
        metalness: 0.8
    });

    const lensMat = new THREE.MeshPhysicalMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.4,
        roughness: 0.1,
        transmission: 0.9,
        thickness: 0.05
    });

    // Left Glass
    const glassFrameGeo = new THREE.BoxGeometry(0.1, 0.08, 0.02);
    const leftFrame = new THREE.Mesh(glassFrameGeo, frameMat);
    leftFrame.position.set(-0.08, 0.23, 0.22);
    headGroup.add(leftFrame);

    const leftLensGeo = new THREE.BoxGeometry(0.08, 0.06, 0.01);
    const leftLens = new THREE.Mesh(leftLensGeo, lensMat);
    leftLens.position.set(-0.08, 0.23, 0.225);
    headGroup.add(leftLens);

    // Right Glass
    const rightFrame = new THREE.Mesh(glassFrameGeo, frameMat);
    rightFrame.position.set(0.08, 0.23, 0.22);
    headGroup.add(rightFrame);

    const rightLens = new THREE.Mesh(leftLensGeo, lensMat);
    rightLens.position.set(0.08, 0.23, 0.225);
    headGroup.add(rightLens);

    // Glasses Bridge
    const bridgeGeo = new THREE.BoxGeometry(0.06, 0.015, 0.015);
    const bridge = new THREE.Mesh(bridgeGeo, frameMat);
    bridge.position.set(0, 0.23, 0.22);
    headGroup.add(bridge);

    // Glasses Temples
    const sideTempleGeo = new THREE.BoxGeometry(0.015, 0.015, 0.22);
    
    const leftTemple = new THREE.Mesh(sideTempleGeo, frameMat);
    leftTemple.position.set(-0.13, 0.23, 0.11);
    leftTemple.rotation.y = 0.05;
    headGroup.add(leftTemple);

    const rightTemple = new THREE.Mesh(sideTempleGeo, frameMat);
    rightTemple.position.set(0.13, 0.23, 0.11);
    rightTemple.rotation.y = -0.05;
    headGroup.add(rightTemple);

    // 5. Friendly Smile
    const mouthMat = new THREE.MeshBasicMaterial({ color: 0x992222 });
    const mouthGeo = new THREE.BoxGeometry(0.06, 0.012, 0.01);
    const mouthMesh = new THREE.Mesh(mouthGeo, mouthMat);
    mouthMesh.position.set(0, 0.11, 0.21);
    headGroup.add(mouthMesh);

    // 6. Cute Pink Blush
    const blushMat = new THREE.MeshBasicMaterial({ color: 0xffaaaa, transparent: true, opacity: 0.6 });
    const blushGeo = new THREE.SphereGeometry(0.03, 8, 8);
    blushGeo.scale(1, 0.5, 1);
    
    const leftBlush = new THREE.Mesh(blushGeo, blushMat);
    leftBlush.position.set(-0.11, 0.17, 0.201);
    headGroup.add(leftBlush);

    const rightBlush = new THREE.Mesh(blushGeo, blushMat);
    rightBlush.position.set(0.11, 0.17, 0.201);
    headGroup.add(rightBlush);

    // Scale down to perfectly match head joint dimensions
    headGroup.scale.set(0.72, 0.72, 0.72);

    return headGroup;
  }

  private createProceduralCyberHelmetHead(): THREE.Group {
    const headGroup = new THREE.Group();
    headGroup.name = 'ProceduralCyberHelmetHead';

    // Futuristic Sleek Metallic Helmet
    const helmetColor = '#1a1a24'; // Sleek dark metal
    const helmetMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(helmetColor),
        roughness: 0.15,
        metalness: 0.95
    });

    // 1. Helmet Base Dome
    const baseGeo = new THREE.SphereGeometry(0.24, 32, 32);
    baseGeo.scale(1.05, 1.1, 1.05);
    const baseMesh = new THREE.Mesh(baseGeo, helmetMat);
    baseMesh.position.set(0, 0.22, 0);
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    headGroup.add(baseMesh);

    // 2. Glowing Visor (Bright neon cyan/blue)
    const visorMat = new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        emissive: 0x00ffff,
        emissiveIntensity: 1.8,
        roughness: 0.05,
        metalness: 0.5
    });
    const visorGeo = new THREE.SphereGeometry(0.242, 16, 16, 0, Math.PI * 2, Math.PI / 4, Math.PI / 2);
    visorGeo.scale(0.85, 0.4, 0.85); // Flattened visor shape
    const visorMesh = new THREE.Mesh(visorGeo, visorMat);
    visorMesh.position.set(0, 0.23, 0.05);
    visorMesh.rotation.x = Math.PI / 12; // tilt visor slightly forward
    headGroup.add(visorMesh);

    // 3. Cybernetic Ears / Side Plates (Glowing cyan rings)
    const sideMat = new THREE.MeshStandardMaterial({
        color: 0x2d2d3a,
        roughness: 0.2,
        metalness: 0.9
    });
    const sideGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.04, 16);
    sideGeo.rotateZ(Math.PI / 2);
    
    const leftEar = new THREE.Mesh(sideGeo, sideMat);
    leftEar.position.set(-0.25, 0.22, 0);
    headGroup.add(leftEar);

    const rightEar = new THREE.Mesh(sideGeo, sideMat);
    rightEar.position.set(0.25, 0.22, 0);
    headGroup.add(rightEar);

    // Ear glow lights
    const earLightGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.045, 16);
    earLightGeo.rotateZ(Math.PI / 2);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    
    const leftGlow = new THREE.Mesh(earLightGeo, glowMat);
    leftGlow.position.set(-0.255, 0.22, 0);
    headGroup.add(leftGlow);

    const rightGlow = new THREE.Mesh(earLightGeo, glowMat);
    rightGlow.position.set(0.255, 0.22, 0);
    headGroup.add(rightGlow);

    // 4. Sleek Top Fin (Aero cyber antenna)
    const finMat = new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        roughness: 0.2,
        metalness: 0.8
    });
    const finGeo = new THREE.BoxGeometry(0.02, 0.08, 0.16);
    const finMesh = new THREE.Mesh(finGeo, finMat);
    finMesh.position.set(0, 0.45, -0.05);
    headGroup.add(finMesh);

    // Scale to match body head joint
    headGroup.scale.set(0.72, 0.72, 0.72);

    return headGroup;
  }

  public async setHeadStyle(style: number, headUrl: string | null = null) {
      this.currentHeadStyle = style;
      if (headUrl !== null) {
          this.customHeadUrl = headUrl;
      }
      
      if (this.customHeadMesh) {
          if (this.customHeadMesh.parent) {
              this.customHeadMesh.parent.remove(this.customHeadMesh);
          }
          CharacterAnimator.disposeHierarchy(this.customHeadMesh);
          this.customHeadMesh = null;
      }
      
      if (style === 0) {
          if (this.originalHeadMesh) {
              this.originalHeadMesh.visible = true;
          } else if (this.headBone) {
              this.headBone.scale.set(1, 1, 1);
          }
      } else if (style === 1) {
          if (this.originalHeadMesh) {
              this.originalHeadMesh.visible = false;
          } else if (this.headBone) {
              this.headBone.scale.set(0.001, 0.001, 0.001);
          }
          
          let loaded = false;
          const urlToLoad = this.customHeadUrl || '/assets/character/customization/teacher_head_style_1.glb';
          
          try {
              const customHeadScene = await CharacterAnimator.getModel(urlToLoad);
              this.customHeadMesh = SkeletonUtils.clone(customHeadScene) as THREE.Group;
              loaded = true;
          } catch (e) {
              console.warn("Failed to load custom GLB head, falling back to high-fidelity procedural cyber helmet:", e);
              this.customHeadMesh = this.createProceduralCyberHelmetHead();
              loaded = true;
              
              if (!this.customHeadUrl && CharacterAnimator.onError) {
                  CharacterAnimator.onError("Custom GLB head file is corrupted. Displaying sleek Cyber Helmet fallback! Feel free to upload your own .glb.");
              }
          }
          
          if (loaded && this.customHeadMesh && this.headBone) {
              this.group.add(this.customHeadMesh);
              const offsetWrapper = new THREE.Group();
              
              if (this.originalHeadMesh && (this.originalHeadMesh as THREE.Mesh).geometry) {
                  const origGeom = (this.originalHeadMesh as THREE.Mesh).geometry;
                  if (!origGeom.boundingBox) origGeom.computeBoundingBox();
                  const origBox = origGeom.boundingBox!;
                  const origCenter = new THREE.Vector3();
                  origBox.getCenter(origCenter);
                  const origSize = new THREE.Vector3();
                  origBox.getSize(origSize);
                  
                  if (this.customHeadMesh.name !== 'ProceduralCyberHelmetHead') {
                      const customBox = new THREE.Box3().setFromObject(this.customHeadMesh);
                      const customSize = new THREE.Vector3();
                      customBox.getSize(customSize);
                      
                      if (customSize.y > 0.001) {
                          const scaleFactor = origSize.y / customSize.y;
                          this.customHeadMesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
                      }
                  }
                  
                  const customBoxScaled = new THREE.Box3().setFromObject(this.customHeadMesh);
                  const customCenterScaled = new THREE.Vector3();
                  customBoxScaled.getCenter(customCenterScaled);
                  
                  const boneRestPos = new THREE.Vector3();
                  this.headBone.getWorldPosition(boneRestPos);
                  this.group.worldToLocal(boneRestPos);
                  
                  if (this.customHeadMesh.name === 'ProceduralCyberHelmetHead') {
                      this.customHeadMesh.position.set(0, 0, 0);
                  } else {
                      this.customHeadMesh.position.set(
                          origCenter.x - customCenterScaled.x,
                          origCenter.y - customCenterScaled.y - boneRestPos.y,
                          origCenter.z - customCenterScaled.z - boneRestPos.z
                      );
                  }
              } else {
                  const box = new THREE.Box3().setFromObject(this.customHeadMesh);
                  const center = new THREE.Vector3();
                  box.getCenter(center);
                  const size = box.getSize(new THREE.Vector3());
                  const verticalOffset = -box.min.y - (size.y * 0.35);
                  
                  if (this.customHeadMesh.name === 'ProceduralCyberHelmetHead') {
                      this.customHeadMesh.position.set(0, 0, 0);
                  } else {
                      this.customHeadMesh.position.set(-center.x, verticalOffset, -center.z);
                  }
              }
              
              offsetWrapper.add(this.customHeadMesh);
              this.customHeadMesh = offsetWrapper;
              this.group.add(this.customHeadMesh);
              this.customHeadMesh.scale.set(1, 1, 1);
          }
      } else if (style === 2) {
          if (this.originalHeadMesh) {
              this.originalHeadMesh.visible = false;
          } else if (this.headBone) {
              this.headBone.scale.set(0.001, 0.001, 0.001);
          }
          
          this.customHeadMesh = this.createProceduralCyberHelmetHead();
          
          if (this.customHeadMesh && this.headBone) {
              this.group.add(this.customHeadMesh);
              const offsetWrapper = new THREE.Group();
              
              if (this.originalHeadMesh && (this.originalHeadMesh as THREE.Mesh).geometry) {
                  const origGeom = (this.originalHeadMesh as THREE.Mesh).geometry;
                  if (!origGeom.boundingBox) origGeom.computeBoundingBox();
                  const origBox = origGeom.boundingBox!;
                  const origCenter = new THREE.Vector3();
                  origBox.getCenter(origCenter);
                  
                  const customBox = new THREE.Box3().setFromObject(this.customHeadMesh);
                  const customCenter = new THREE.Vector3();
                  customBox.getCenter(customCenter);
                  
                  const boneRestPos = new THREE.Vector3();
                  this.headBone.getWorldPosition(boneRestPos);
                  this.group.worldToLocal(boneRestPos);
                  
                  this.customHeadMesh.position.set(0, 0, 0);
              } else {
                  this.customHeadMesh.position.set(0, 0, 0);
              }
              
              offsetWrapper.add(this.customHeadMesh);
              this.customHeadMesh = offsetWrapper;
              this.group.add(this.customHeadMesh);
              this.customHeadMesh.scale.set(1, 1, 1);
          }
      } else if (style === 3) {
          if (this.originalHeadMesh) {
              this.originalHeadMesh.visible = false;
          } else if (this.headBone) {
              this.headBone.scale.set(0.001, 0.001, 0.001);
          }
          
          this.customHeadMesh = this.createProceduralTeacherHead();
          
          if (this.customHeadMesh && this.headBone) {
              this.group.add(this.customHeadMesh);
              const offsetWrapper = new THREE.Group();
              
              if (this.originalHeadMesh && (this.originalHeadMesh as THREE.Mesh).geometry) {
                  const origGeom = (this.originalHeadMesh as THREE.Mesh).geometry;
                  if (!origGeom.boundingBox) origGeom.computeBoundingBox();
                  const origBox = origGeom.boundingBox!;
                  const origCenter = new THREE.Vector3();
                  origBox.getCenter(origCenter);
                  
                  const customBox = new THREE.Box3().setFromObject(this.customHeadMesh);
                  const customCenter = new THREE.Vector3();
                  customBox.getCenter(customCenter);
                  
                  const boneRestPos = new THREE.Vector3();
                  this.headBone.getWorldPosition(boneRestPos);
                  this.group.worldToLocal(boneRestPos);
                  
                  this.customHeadMesh.position.set(0, 0, 0);
              } else {
                  this.customHeadMesh.position.set(0, 0, 0);
              }
              
              offsetWrapper.add(this.customHeadMesh);
              this.customHeadMesh = offsetWrapper;
              this.group.add(this.customHeadMesh);
              this.customHeadMesh.scale.set(1, 1, 1);
          }
      }
  }

  public async loadModelAndAnimations(modelUrl: string = '/assets/character/Xyrtania_Male_NoMorphs.glb') {
    const requestedUrl = modelUrl;
    this.currentModelUrl = modelUrl;
    // Clear old group children except nametag
    const toRemove: THREE.Object3D[] = [];
    this.group.children.forEach(c => {
        if (c !== this.nametagSprite) {
            toRemove.push(c);
        }
    });
    toRemove.forEach(c => {
        this.group.remove(c);
        c.traverse((child: any) => {
            if (child.name === 'proceduralFace') {
                CharacterAnimator.disposeHierarchy(child);
            }
        });
    });
    
    if (this.mixer) {
        this.mixer.stopAllAction();
        this.mixer = null;
    }
    this.actions = {};
    this.activeAction = null;
    this.modelLoaded = false;
    this.basePrefix = '';
    this.baseScale = 1.0;
    this.headBone = null;
    this.leftEyeBone = null;
    this.rightEyeBone = null;
    this.beardBone = null;
    this.leftLegBone = null;
    this.rightLegBone = null;
    this.leftArmBone = null;
    this.rightArmBone = null;
    this.spineBone = null;

    try {
      // First load the base mesh using cache, with a robust fallback to base_male_0.fbx
      let modelToLoad = modelUrl;

      let cachedObject: THREE.Group;
      try {
        cachedObject = await CharacterAnimator.getModel(modelUrl);
      } catch (loadErr) {
        console.warn(`Failed to load requested model ${modelToLoad}, falling back to Xyrtania_Male_NoMorphs.glb`);
        modelToLoad = '/assets/character/Xyrtania_Male_NoMorphs.glb';
        cachedObject = await CharacterAnimator.getModel(modelToLoad);
      }

      const config = MODEL_SCALE_CONFIG[modelToLoad] || MODEL_SCALE_CONFIG['default'];

      const object = SkeletonUtils.clone(cachedObject) as THREE.Group;
      object.name = 'explorerInner';
      
      // Removed automatic asset scaling for the clean modular system.
      // We assume the GLB export is correctly scaled.
      object.scale.set(1, 1, 1);
      object.updateMatrixWorld(true);
      
      const boxScaled = new THREE.Box3().setFromObject(object);
      const sizeScaled = boxScaled.getSize(new THREE.Vector3());
      
      this.targetHeight = sizeScaled.y;
      
      if (config && config.scaleOverride) {
          this.baseScale = config.scaleOverride;
          this.targetHeight = sizeScaled.y * this.baseScale;
      }
      this.group.scale.setScalar(this.baseScale);
      
      if (this.nametagSprite) {
        this.nametagSprite.position.set(0, this.targetHeight + 0.4, 0);
      }

      this.baseYOffset = -boxScaled.min.y;
      if (config && config.yOffset) {
          this.baseYOffset += config.yOffset;
      }
      
      const innerWrapper = new THREE.Group();
      innerWrapper.name = 'explorerInnerWrapper';
      innerWrapper.add(object);
      innerWrapper.position.set(0, this.baseYOffset, 0);
      this.innerMesh = innerWrapper;

      const isGltf = requestedUrl.toLowerCase().endsWith('.glb') || requestedUrl.toLowerCase().endsWith('.gltf') || requestedUrl.includes('.glb') || requestedUrl.includes('.gltf') || requestedUrl.startsWith('blob:');
      const isCustomTripoModel = !isGltf && (requestedUrl.includes('base_male_0') || requestedUrl.includes('peter'));
      let colorMap: THREE.Texture | null = null;
      let normalMap: THREE.Texture | null = null;
      let metallicMap: THREE.Texture | null = null;
      let roughnessMap: THREE.Texture | null = null;
      
      if (isCustomTripoModel) {
          let basePath = requestedUrl.substring(0, requestedUrl.lastIndexOf('/'));
          if (requestedUrl.includes('base_male_0.fbx') && !requestedUrl.includes('base_male_0/')) {
              basePath = '/assets/character/base_male_0';
          } else if (requestedUrl.includes('peteridle.fbx')) {
              basePath = '/assets/character/peter';
          }
          try {
              colorMap = await CharacterAnimator.getTexture(`${basePath}/Color.png`);
              colorMap.colorSpace = THREE.SRGBColorSpace;
          } catch (e) {
              console.warn(`Could not load color map for ${requestedUrl}:`, e);
          }
          try {
              normalMap = await CharacterAnimator.getTexture(`${basePath}/Normal.png`);
          } catch (e) {
              console.warn(`Could not load normal map for ${requestedUrl}:`, e);
          }
          try {
              metallicMap = await CharacterAnimator.getTexture(`${basePath}/Metallic.png`);
          } catch (e) {
              console.warn(`Could not load metallic map for ${requestedUrl}:`, e);
          }
          try {
              roughnessMap = await CharacterAnimator.getTexture(`${basePath}/Roughness.png`);
          } catch (e) {
              console.warn(`Could not load roughness map for ${requestedUrl}:`, e);
          }
      }
      
      let foundBone = false;
      let rootMeshName = '';
      let meshHipsRestingPosition = new THREE.Vector3();
      object.traverse((child: any) => {
        if ((child as any).isMesh) {
          if (!rootMeshName) rootMeshName = child.name;
          child.castShadow = false;
          child.receiveShadow = false;
          child.frustumCulled = false; // Prevent culling when animated/scaled
          
          if (isCustomTripoModel && child.material) {
              const applyMaps = (origMat: any) => {
                  let mat: any;
                  if (origMat.isMeshStandardMaterial || origMat.isMeshPhysicalMaterial) {
                      mat = origMat.clone();
                  } else {
                      // Convert Phong/Basic material to Standard material to support PBR textures
                      mat = new THREE.MeshStandardMaterial();
                      // Copy basic properties from the original material
                      if (origMat.color) mat.color.copy(origMat.color);
                      if (origMat.map) mat.map = origMat.map;
                      if (origMat.opacity !== undefined) mat.opacity = origMat.opacity;
                      if (origMat.transparent !== undefined) mat.transparent = origMat.transparent;
                      if (origMat.side !== undefined) mat.side = origMat.side;
                  }
                  
                  if (colorMap) {
                      mat.map = colorMap;
                      mat.color.setRGB(1, 1, 1);
                  }
                  if (normalMap) mat.normalMap = normalMap;
                  if (metallicMap) mat.metalnessMap = metallicMap;
                  if (roughnessMap) mat.roughnessMap = roughnessMap;
                  
                  mat.needsUpdate = true;
                  return mat;
              };
              if (Array.isArray(child.material)) {
                  child.material = child.material.map(applyMaps);
              } else {
                  child.material = applyMaps(child.material);
              }
          } else if (child.material) {
              // Polish non-custom standard FBX models while properly keeping original embedded textures
              const polishStandardMat = (origMat: any) => {
                  if (origMat.isMeshStandardMaterial || origMat.isMeshPhysicalMaterial) {
                      return origMat;
                  }
                  if (origMat.map) {
                      const newMat = new THREE.MeshStandardMaterial();
                      newMat.map = origMat.map;
                      if (origMat.normalMap) newMat.normalMap = origMat.normalMap;
                      newMat.roughness = 0.6;
                      newMat.metalness = 0.1;
                      if (origMat.color) newMat.color.copy(origMat.color);
                      newMat.needsUpdate = true;
                      return newMat;
                  }
                  const newMat = new THREE.MeshStandardMaterial({
                      roughness: 0.6,
                      metalness: 0.1,
                  });
                  if (origMat.color) {
                      newMat.color.copy(origMat.color);
                  } else {
                      newMat.color.setHex(requestedUrl.includes('female') ? 0xfecdd3 : 0xbae6fd); // Soft pink for female, soft blue for male
                  }
                  newMat.needsUpdate = true;
                  return newMat;
              };
              if (Array.isArray(child.material)) {
                  child.material = child.material.map(polishStandardMat);
              } else {
                  child.material = polishStandardMat(child.material);
              }
          }
        }
         if (!this.headBone && child.isBone && child.name.toLowerCase().includes('head') && !child.name.toLowerCase().includes('top')) {
             this.headBone = child;
         }
         if (child.isBone) {
             const lowerName = child.name.toLowerCase().replace(/[:_-]/g, '');
             if (lowerName === 'eyel') this.leftEyeBone = child;
             if (lowerName === 'eyer') this.rightEyeBone = child;
             if (lowerName.includes('beard')) this.beardBone = child;
             
             if (lowerName.includes('upleg') || lowerName.includes('upperleg')) {
                 if (lowerName.includes('left') || lowerName.endsWith('l')) this.leftLegBone = child;
                 if (lowerName.includes('right') || lowerName.endsWith('r')) this.rightLegBone = child;
             }
             if (lowerName.includes('arm') && !lowerName.includes('fore') && !lowerName.includes('shoulder')) {
                 if (lowerName.includes('left') || lowerName.endsWith('l')) this.leftArmBone = child;
                 if (lowerName.includes('right') || lowerName.endsWith('r')) this.rightArmBone = child;
             }
             if (lowerName.includes('spine') && !lowerName.includes('spine1') && !lowerName.includes('spine2')) {
                 this.spineBone = child;
             }
         }
         if (child.isMesh && child.morphTargetDictionary) {
             this.morphMeshes.push(child);
             // Merge dictionaries
             for (const [key, idx] of Object.entries(child.morphTargetDictionary)) {
                 this.customMorphTargetDictionary[key] = idx as number;
             }
         }
         if ((child as any).isMesh) {
             const name = child.name;
             if (name === 'Body_Head') this.meshBodyHead = child;
             if (name === 'Body_Torso') this.meshBodyTorso = child;
             if (name === 'Body_Arms') this.meshBodyArms = child;
             if (name === 'Body_Legs' || name === 'Bpdu_Legs') this.meshBodyLegs = child;
             if (name === 'Body_Feet') this.meshBodyFeet = child;
         }
         
         if (!this.originalHeadMesh && child.isMesh && child.name === 'Body_Head') {
             this.originalHeadMesh = child;
         }
         if (!foundBone && child.isBone) {
            const name = child.name;
            if (name.includes('Hips')) {
              this.basePrefix = name.replace('Hips', '');
              meshHipsRestingPosition.copy(child.position);
              foundBone = true;
            }
         }
      });
      
      this.setHeadStyle(this.currentHeadStyle);
      
      if (foundBone) {
          this.baseYOffset = 0;
          if (config && config.yOffset) {
              this.baseYOffset += config.yOffset;
          }
          innerWrapper.position.set(0, this.baseYOffset, 0);
      }
      
      if (!foundBone) {
          console.warn("Model has no bones. Rotating to stand up.");
          object.rotation.set(0, 0, 0); 
      }

      // Safeguard against concurrent loads: clear any children that might have loaded in parallel
      const concurrentToRemove: THREE.Object3D[] = [];
      this.group.children.forEach(c => {
          if (c !== this.nametagSprite) {
              concurrentToRemove.push(c);
          }
      });
      concurrentToRemove.forEach(c => {
          this.group.remove(c);
          c.traverse((child: any) => {
              if (child.name === 'proceduralFace') {
                  CharacterAnimator.disposeHierarchy(child);
              }
          });
      });

      this.group.add(this.innerMesh);
      this.mixer = new THREE.AnimationMixer(object);
      
      let animationsToLoad = [
        { name: 'idle', url: '/assets/character/Xyrtania_Male_NoMorphs.glb' },
        { name: 'walk', url: '/assets/character/animations/walk.fbx' },
        { name: 'jog', url: '/assets/character/animations/jog.fbx' },
        { name: 'run', url: '/assets/character/animations/run.fbx' },
        { name: 'jump', url: '/assets/character/animations/jump.fbx' },
        { name: 'pushing', url: '/assets/character/animations/pushing.fbx' },
        { name: 'swim', url: '/assets/character/animations/swim.fbx' },
        { name: 'tread', url: '/assets/character/animations/tread.fbx' },
        { name: 'neutral_idle', url: '/assets/character/Xyrtania_Male_NoMorphs.glb' },
        { name: 'crouch_idle', url: '/assets/character/animations/crouch_idle.fbx' },
        { name: 'crouched_walking', url: '/assets/character/Xyrtania_Male_NoMorphs.glb' },
        { name: 'prone_forward', url: '/assets/character/animations/prone_forward.fbx' },
        { name: 'breathing_idle', url: '/assets/character/Xyrtania_Male_NoMorphs.glb' },
      ];
      
      await Promise.all(animationsToLoad.map(async (anim) => {
        try {
          const animObject = await CharacterAnimator.getAnimation(anim.url);
          if (animObject.animations && animObject.animations.length > 0) {
            // Deep clone tracks to isolate track mutations entirely from shared cache
            const tracks = animObject.animations[0].tracks.map(t => t.clone());
            let clip = new THREE.AnimationClip(anim.name, animObject.animations[0].duration, tracks);
            
            const isTargetGLB = this.currentModelUrl.endsWith('.glb') || this.currentModelUrl.endsWith('.gltf') || this.currentModelUrl.includes('.glb') || this.currentModelUrl.includes('.gltf') || this.currentModelUrl.startsWith('blob:');
            const isSourceFBX = anim.url.endsWith('.fbx');

            let sourceGroup: THREE.Object3D = animObject;
            if (isSourceFBX) {
                sourceGroup = SkeletonUtils.clone(animObject);
            }

            if (isTargetGLB && isSourceFBX && this.innerMesh) {
                let targetSkinnedMesh: THREE.SkinnedMesh | null = null;
                this.innerMesh.traverse(c => { if ((c as any).isSkinnedMesh && !targetSkinnedMesh) targetSkinnedMesh = c as THREE.SkinnedMesh; });
                
                let sourceSkinnedMesh: THREE.SkinnedMesh | null = null;
                sourceGroup.traverse(c => {
                    if (c.name.startsWith('mixamorig1')) c.name = c.name.replace('mixamorig1', 'mixamorig');
                    if ((c as any).isSkinnedMesh && !sourceSkinnedMesh) sourceSkinnedMesh = c as THREE.SkinnedMesh;
                });
                
                if (!sourceSkinnedMesh) {
                    let rootBone: THREE.Bone | null = null;
                    sourceGroup.traverse(c => { if ((c as any).isBone && !rootBone) rootBone = c as THREE.Bone; });
                    if (rootBone) {
                        const bones: THREE.Bone[] = [];
                        rootBone.traverse(b => { if ((b as any).isBone) bones.push(b as THREE.Bone); });
                        const skeleton = new THREE.Skeleton(bones);
                        sourceSkinnedMesh = new THREE.SkinnedMesh(new THREE.BufferGeometry(), new THREE.Material());
                        sourceSkinnedMesh.add(rootBone);
                        sourceSkinnedMesh.bind(skeleton);
                    }
                }

                if (targetSkinnedMesh && sourceSkinnedMesh) {
                    clip.tracks.forEach(t => t.name = t.name.replace('mixamorig1', 'mixamorig'));

                    // Save original bone transforms because retargetClip mutates them!
                    const originalTransforms = new Map<THREE.Bone, { pos: THREE.Vector3, quat: THREE.Quaternion, scale: THREE.Vector3 }>();
                    targetSkinnedMesh.skeleton.bones.forEach(b => {
                        originalTransforms.set(b, {
                            pos: b.position.clone(),
                            quat: b.quaternion.clone(),
                            scale: b.scale.clone()
                        });
                    });

                    const retargetedClip = SkeletonUtils.retargetClip(targetSkinnedMesh, sourceSkinnedMesh, clip, {
                        preserveMatrix: false,
                        preservePosition: false,
                        preserveHipPosition: false,
                        useFirstFramePosition: false,
                        hip: this.basePrefix + 'Hips',
                        scale: 0.01,
                        getBoneName: (b: THREE.Bone) => b.name
                    } as any);
                    
                    // Restore original bone transforms so the character doesn't become a giant
                    targetSkinnedMesh.skeleton.bones.forEach(b => {
                        const t = originalTransforms.get(b);
                        if (t) {
                            b.position.copy(t.pos);
                            b.quaternion.copy(t.quat);
                            b.scale.copy(t.scale);
                        }
                    });

                    retargetedClip.tracks.forEach(track => {
                        const match = track.name.match(/\.bones\[([^\]]+)\]\.(.+)/);
                        if (match) track.name = `${match[1]}.${match[2]}`;
                    });
                    
                    retargetedClip.name = clip.name;
                    clip = retargetedClip;
                }
            }

            const isCustomAnim = false;
            clip.tracks.forEach((track) => {
               if (!isCustomAnim) {
                  if (foundBone) {
                      track.name = track.name.replace(/^(mixamorig[a-zA-Z0-9_]*:|mixamorig\d*)/, this.basePrefix);
                      if (this.basePrefix === '' && track.name.includes(':')) {
                         track.name = track.name.replace(/^.*:/, ''); 
                      }
                  } else {
                      // Fallback for static models like bob.fbx that have no bones:
                      // apply Hips translation/rotation directly to the root mesh!
                      if (track.name.includes('Hips')) {
                          track.name = rootMeshName + '.' + track.name.split('.')[1];
                      } else {
                          track.name = 'ignored.' + track.name.split('.')[1];
                      }
                  }
               }
            
            });
            
            // Remove ignored tracks to prevent console warnings
            clip.tracks = clip.tracks.filter(t => !t.name.startsWith('ignored.'));
            
             const action = this.mixer!.clipAction(clip);
            if (anim.name === 'jump') {
              action.setLoop(THREE.LoopOnce, 1);
              action.clampWhenFinished = true;
            }
            this.actions[anim.name] = action;
          }
        } catch (e) {
          console.warn(`Failed to load or retarget animation ${anim.name} from ${anim.url}:`, e);
        }
      }));

      this.modelLoaded = true;
      if (CharacterAnimator.onError) {
        CharacterAnimator.onError('');
      }
      // Triggers stored animation state, defaulting to 'neutral_idle' or 'idle'
      this.playAction(this.currentActionName || 'idle', 0);
      
      this.setCustomization(this.customColor, this.customScale, this.torsoVisible);
      // Force apply morph targets since the mesh is now available
      const savedState = { ...this.currentCustomizationState };
      this.currentCustomizationState = {}; // reset to force apply
      this.applyCustomization(savedState);
      
    } catch (err: any) {
      console.error(`Error in loadModelAndAnimations for ${modelUrl}:`, err);

      if (CharacterAnimator.onError) {
        CharacterAnimator.onError(`Failed to load character: ${err?.message || String(err)}`);
      }

      // Fallback placeholder mesh
      const geo = new THREE.CapsuleGeometry(0.5, 1, 4, 16);
      const mat = new THREE.MeshStandardMaterial({ color: 0xff4444 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = 1;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);
      this.modelLoaded = true;
    }
  }

  public playAction(name: string, duration: number = 0.2) {
    this.currentActionName = name;
    if (!this.modelLoaded) return;

    // Map animation names dynamically if not found in Mixer actions
    let mappedName = name;
    if (!this.actions[mappedName]) {
       if (name === 'idle') {
          if (this.actions['neutral_idle']) mappedName = 'neutral_idle';
          else if (this.actions['breathing_idle']) mappedName = 'breathing_idle';
       } else if (name === 'neutral_idle') {
          if (this.actions['breathing_idle']) mappedName = 'breathing_idle';
          else if (this.actions['idle']) mappedName = 'idle';
       } else if (name === 'crouch') {
          mappedName = 'crouch_idle';
       } else if (name === 'prone') {
          mappedName = 'prone_forward';
       } else if (name === 'walk') {
          mappedName = 'walk';
       } else if (name === 'jog') {
          mappedName = 'jog';
       } else if (name === 'run') {
          mappedName = 'run';
       } else if (name === 'jump') {
          mappedName = 'jump';
       } else if (name === 'pushing') {
          mappedName = 'pushing';
       } else if (name === 'swim') {
          mappedName = 'swim';
       } else if (name === 'tread') {
          mappedName = 'tread';
       }
    }

    let nextAction = this.actions[mappedName];
    if (!nextAction) {
       if (mappedName === 'neutral_idle' || mappedName === 'breathing_idle' || mappedName === 'idle') {
          nextAction = this.actions['neutral_idle'] || this.actions['breathing_idle'] || this.actions['idle'];
       }
    }
    if (!nextAction) return;
    if (nextAction === this.activeAction) return;

    if (this.activeAction) {
      this.activeAction.fadeOut(duration);
    }

    nextAction.reset();
    
    // Mixamo standard jump animations have a long crouch build-up.
    // Our game jump is snappy (0.05s delay), so we skip the crouch buildup (about 0.4s)
    // and speed up the mid-air portion so it looks like a responsive leap.
    if (mappedName === 'jump') {
        nextAction.time = 0.4;
        nextAction.setEffectiveTimeScale(1.5);
        nextAction.timeScale = 1.0;
    } else {
        nextAction.setEffectiveTimeScale(1.0);
        nextAction.timeScale = 1.0;
    }
    
    nextAction.fadeIn(duration);
    nextAction.play();
    
    this.activeAction = nextAction;
  }

  private lastAppliedColor: string | null = null;
  private lastAppliedScale: number | null = null;
  private lastAppliedTorsoVisible: boolean | null = null;

  public setCustomization(color: string | null, scale: number, torsoVisible: boolean = true) {
    if (this.lastAppliedColor === color && this.lastAppliedScale === scale && this.lastAppliedTorsoVisible === torsoVisible) return;

    this.customColor = color;
    this.customScale = scale;
    this.torsoVisible = torsoVisible;
    this.lastAppliedColor = color;
    this.lastAppliedScale = scale;
    this.lastAppliedTorsoVisible = torsoVisible;

    // Apply scale directly to the main group
    
    
    if (this.innerMesh) {
      this.group.scale.setScalar(scale);
    }

    // Toggle Torso Mesh Visibility
    if (this.meshBodyTorso) {
      this.meshBodyTorso.visible = torsoVisible;
    }

    // Apply color to materials
    if (this.innerMesh && color) {
      const c = new THREE.Color(color);
      this.innerMesh.traverse((child: any) => {
        if (child.isMesh && child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((mat: any) => {
            if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial || mat.isMeshPhongMaterial) {
              mat.color.copy(c);
              mat.needsUpdate = true;
            }
          });
        }
      });
    } else if (this.innerMesh && !color) {
        // Reset color if removed (optional improvement)
        this.innerMesh.traverse((child: any) => {
            if (child.isMesh && child.material) {
              const mats = Array.isArray(child.material) ? child.material : [child.material];
              mats.forEach((mat: any) => {
                if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial || mat.isMeshPhongMaterial) {
                  mat.color.setHex(0xffffff);
                  mat.needsUpdate = true;
                }
              });
            }
          });
    }

    // Apply color to procedural head base if active
    if (this.customHeadMesh && color) {
      const c = new THREE.Color(color);
      this.customHeadMesh.traverse((child: any) => {
        if (child.isMesh && child.name === 'ProceduralTeacherHead_Base' && child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((mat: any) => {
            if (mat.color) {
              mat.color.copy(c);
              mat.needsUpdate = true;
            }
          });
        }
      });
    }
  }

  public updateNametag(name: string) {
    if (!name || name === this.currentNametag) return;
    this.currentNametag = name;

    if (!this.nametagSprite) {
        this.nametagSprite = new THREE.Sprite(new THREE.SpriteMaterial({ depthTest: false }));
        this.group.add(this.nametagSprite);
    }
    // Put text above head, scale should map to canvas aspect ratio
    this.nametagSprite.position.set(0, this.targetHeight + 0.4, 0); 
    this.nametagSprite.scale.set(1.5, 0.4, 1);

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background pill shape
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.roundRect(0, 0, 512, 128, 64);
    ctx.fill();

    // Text Name
    ctx.font = 'bold 54px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#10b981'; // Emerald standard PWA theme
    ctx.fillText(name, 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    // Needs minFilter linear to prevent mipmap glitches for UI text
    texture.minFilter = THREE.LinearFilter;
    
    // Cleanup old texture to prevent memory leak
    if (this.nametagSprite.material.map) {
      this.nametagSprite.material.map.dispose();
    }
    
    this.nametagSprite.material.map = texture;
    this.nametagSprite.material.needsUpdate = true;
  }

  public applyCustomization(state: Record<string, any>) {
    this.currentCustomizationState = { ...state };
    
    // Apply structural transforms based on standard keys
    if (state.width !== undefined || state.height !== undefined || state.depth !== undefined) {
      const w = state.width ?? 1.0;
      const h = state.height ?? 1.0;
      const d = state.depth ?? 1.0;
      this.group.scale.set(this.customScale * w, this.customScale * h, this.customScale * d);
    }
    
    // Apply bone modifications for rigged models
    if (this.headBone) {
      const hs = state.headScale ?? 1.0;
      this.headBone.scale.set(hs, hs, hs);
    }
    if (this.leftLegBone && this.rightLegBone) {
      const ll = state.legLength ?? 1.0;
      this.leftLegBone.scale.set(1.0, ll, 1.0);
      this.rightLegBone.scale.set(1.0, ll, 1.0);
    }
    if (this.leftArmBone && this.rightArmBone) {
      const al = state.armLength ?? 1.0;
      this.leftArmBone.scale.set(al, 1.0, 1.0);
      this.rightArmBone.scale.set(al, 1.0, 1.0);
    }
    if (this.spineBone) {
      const tt = state.torsoThickness ?? 1.0;
      this.spineBone.scale.set(tt, 1.0, tt);
    }
    
    // Apply material properties to all meshes
    this.group.traverse((child) => {
      if ((child as any).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
           const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
           mats.forEach((mat: any) => {
             if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial) {
                if (state.metalness !== undefined) mat.metalness = state.metalness;
                if (state.roughness !== undefined) mat.roughness = state.roughness;
                
                // Emissive Glow
                if (state.glowIntensity !== undefined && state.glowIntensity > 0) {
                   const glowColVal = state.glowColor !== undefined ? state.glowColor : '#00ffff';
                   mat.emissive.set(glowColVal);
                   mat.emissiveIntensity = state.glowIntensity;
                } else {
                   mat.emissive.setHex(0x000000);
                   mat.emissiveIntensity = 0.0;
                }
                
                // Wireframe Mode
                if (state.wireframe !== undefined) {
                   mat.wireframe = state.wireframe > 0.5;
                }
                
                // Hologram Mode (Glassy translucent)
                if (state.hologram !== undefined) {
                   const isHolo = state.hologram > 0.5;
                   mat.transparent = isHolo;
                   mat.opacity = isHolo ? 0.35 : (this.torsoVisible ? 1.0 : 0.0);
                   mat.roughness = isHolo ? 0.05 : (state.roughness ?? 0.6);
                   mat.metalness = isHolo ? 0.95 : (state.metalness ?? 0.1);
                }
                
                mat.needsUpdate = true;
             }
           });
        }
      }
    });

    for (const [key, value] of Object.entries(state)) {
      if (typeof value === 'number') {
        const lowerKey = key.toLowerCase().replace(/_/g, '').replace(/\s+/g, '');
        for (const mesh of this.morphMeshes) {
          if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
            const matchedRealKey = Object.keys(mesh.morphTargetDictionary).find(k => {
              const lk = k.toLowerCase().replace(/_/g, '').replace(/\s+/g, '');
              return lk === lowerKey;
            });
            if (matchedRealKey !== undefined) {
              const idx = mesh.morphTargetDictionary[matchedRealKey];
              mesh.morphTargetInfluences[idx] = value;
            }
          }
        }
      }
    }
  }

  public update(state: PlayerState, dt: number) {
    if (this.mixer) {
      this.mixer.update(dt);
      
      // Apply head tracking AFTER animation
      if (this.lookTarget && this.headBone) {
        // Simple head tracking
        const targetWorld = this.lookTarget.clone();
        const currentRot = this.headBone.rotation.clone();
        
        // Let the bone look at the target
        // We use a dummy object to calculate the target rotation to avoid twisting
        this.headBone.lookAt(targetWorld);
        
        // Blend towards target rotation
        const targetQuat = this.headBone.quaternion.clone();
        this.headBone.rotation.copy(currentRot); // restore
        
        this.headBone.quaternion.slerp(targetQuat, 0.05); // Smooth tracking
      }
    }
    
    if (this.customHeadMesh && this.headBone) {
        const worldPos = new THREE.Vector3();
        const worldQuat = new THREE.Quaternion();
        this.headBone.getWorldPosition(worldPos);
        this.headBone.getWorldQuaternion(worldQuat);
        
        this.customHeadMesh.position.copy(worldPos);
        this.group.worldToLocal(this.customHeadMesh.position);
        
        const groupWorldQuat = new THREE.Quaternion();
        this.group.getWorldQuaternion(groupWorldQuat);
        this.customHeadMesh.quaternion.copy(worldQuat).premultiply(groupWorldQuat.invert());
    }
    
    if (this.innerMesh) {
       // Fix sideways swimming animation
       // const isSwimAnim = this.activeAction?.getClip().name === 'swim' || this.activeAction?.getClip().name === 'tread';
       // const targetRotY = isSwimAnim ? -Math.PI / 2 : 0;
       // this.innerMesh.rotation.y = THREE.MathUtils.lerp(this.innerMesh.rotation.y, targetRotY, dt * 10);
       this.innerMesh.rotation.y = 0;
       
       const isProne = (state as any).isProne || false;
       const isCrouching = (state as any).isCrouching || false;
       
       let targetY = this.baseYOffset;
       let targetRotX = 0;
       if (isProne) {
           // Scale prone offset proportionally to unscaled model hip height
           const unscaledHeight = this.targetHeight / this.baseScale;
           const referenceHipHeight = unscaledHeight * 0.48;
           targetY = this.baseYOffset;
       } else if (isCrouching) {
           targetY = this.baseYOffset;
           targetRotX = 0;
       }
       
       this.innerMesh.position.y = THREE.MathUtils.lerp(this.innerMesh.position.y, targetY, dt * 10);
       this.innerMesh.rotation.x = THREE.MathUtils.lerp(this.innerMesh.rotation.x, targetRotX, dt * 10);
    }

    if (!this.modelLoaded) return;
    
    if (this.isRemote && (state.animationState || state.currentAnimation)) {
      this.playAction(state.animationState || state.currentAnimation || 'neutral_idle');
      return;
    }

    const isSwimming = (state as any).isSwimming || false;
    const isCrouching = (state as any).isCrouching || false;
    const isProne = (state as any).isProne || false;

    if (isSwimming) {
      if (state.speed > 0.1) {
        this.playAction('swim');
      } else {
        this.playAction('tread');
      }
      return;
    }

    if (isProne) {
      this.playAction('prone_forward');
      if (this.activeAction) {
         // Pause animation if not moving
         if (state.speed > 0.1) {
            this.activeAction.timeScale = 1.0;
         } else {
            this.activeAction.timeScale = 0.0;
         }
      }
      return;
    }

    if (isCrouching) {
      if (state.speed > 0.1) {
        this.playAction('crouched_walking');
      } else {
        this.playAction('crouch_idle');
      }
      return;
    }

    if (state.jumpPhase === JumpPhase.PUSHING) {
      this.playAction('pushing');
    } else if (state.jumpPhase !== JumpPhase.IDLE && state.jumpPhase !== JumpPhase.RUNNING) {
      this.playAction('jump');
    } else {
      if (state.speed > 9.5) { // Run speed (user wanted walk -> jog -> run)
        this.playAction('run');
      } else if (state.speed > 5) {
        this.playAction('jog');
      } else if (state.speed > 0.1) {
        this.playAction('walk');
      } else {
        this.playAction('neutral_idle');
      }
    }
  }
}
