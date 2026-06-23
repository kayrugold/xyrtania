import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { PlayerState, JumpPhase } from './types';

export class CharacterAnimator {
  public group: THREE.Group;
  public mixer: THREE.AnimationMixer | null = null;
  
  private actions: Record<string, THREE.AnimationAction> = {};
  private activeAction: THREE.AnimationAction | null = null;
  private modelLoaded = false;
  
  private basePrefix = '';
  private currentNametag = '';
  private nametagSprite: THREE.Sprite | null = null;
  
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'explorer';
  }

  public async loadModelAndAnimations() {
    const fbxLoader = new FBXLoader();
    
    return new Promise<void>((resolve, reject) => {
      // First load the base mesh
      fbxLoader.load('/base_male/neutral_idle.fbx', (object) => {
        object.name = 'explorerInner';
        
        // Auto scale to human size (~2 units tall)
        const box = new THREE.Box3().setFromObject(object);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
          const scaleAmount = 2.5 / maxDim;
          object.scale.setScalar(scaleAmount);
        }
        
        // Re-calculate box after scale to adjust pivot to ground at Y=0
        const boxScaled = new THREE.Box3().setFromObject(object);
        object.position.set(0, -boxScaled.min.y, 0);
        
        // Find what the mesh uses for bone prefixes
        let foundBone = false;
        let meshHipsRestingPosition = new THREE.Vector3();
        object.traverse((child: any) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
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
        
        this.group.add(object);
        this.mixer = new THREE.AnimationMixer(object);
        
        const animationsToLoad = [
          { name: 'idle', url: '/base_male/Unarmed Idle 01.fbx' },
          { name: 'walk', url: '/base_male/Walking.fbx' },
          { name: 'jog', url: '/base_male/Jog Forward.fbx' },
          { name: 'run', url: '/base_male/Running.fbx' },
          { name: 'jump', url: '/base_male/Unarmed Jump.fbx' },
          { name: 'pushing', url: '/base_male/Pushing.fbx' },
          { name: 'swim', url: '/base_male/Swimming.fbx' },
          { name: 'tread', url: '/base_male/Treading Water.fbx' },
        ];
        
        let loadedCount = 0;
        animationsToLoad.forEach((anim) => {
          fbxLoader.load(anim.url, (animObject) => {
            if (animObject.animations && animObject.animations.length > 0) {
              const clip = animObject.animations[0];
              clip.name = anim.name;
              
              // Normalize track namespaces to match the base mesh
              clip.tracks.forEach((track) => {
                 // Mixamo structures usually have mixamorig:, mixamorig1:, mixamorig1Hips, etc.
                 track.name = track.name.replace(/^(mixamorig[a-zA-Z0-9_]*:|mixamorig\d*)/, this.basePrefix);
                 
                 // If the base prefix has no namespace but tracks do
                 if (this.basePrefix === '' && track.name.includes(':')) {
                    track.name = track.name.replace(/^.*:/, ''); 
                 }

                 // Align the hip position (root translation matching)
                 if (track.name.includes('Hips.position') && track.values.length >= 3) {
                    const diffX = meshHipsRestingPosition.x - track.values[0];
                    const diffY = meshHipsRestingPosition.y - track.values[1];
                    const diffZ = meshHipsRestingPosition.z - track.values[2];
                    for (let i = 0; i < track.values.length; i += 3) {
                       track.values[i] += diffX;
                       track.values[i+1] += diffY;
                       track.values[i+2] += diffZ;
                    }
                 }
              });
              
              const action = this.mixer!.clipAction(clip);
              if (anim.name === 'jump') {
                action.setLoop(THREE.LoopOnce, 1);
                action.clampWhenFinished = true;
              }
              this.actions[anim.name] = action;
            }
            loadedCount++;
            if (loadedCount === animationsToLoad.length) {
              this.modelLoaded = true;
              this.playAction('idle', 0);
              resolve();
            }
          }, undefined, (e) => {
            console.error('Error loading animation', anim.url, e);
            loadedCount++;
            if (loadedCount === animationsToLoad.length) {
              this.modelLoaded = true;
              this.playAction('idle', 0);
              resolve();
            }
          });
        });

      }, undefined, reject);
    });
  }

  public playAction(name: string, duration: number = 0.2) {
    const nextAction = this.actions[name];
    if (!nextAction || nextAction === this.activeAction) return;

    if (this.activeAction) {
      this.activeAction.fadeOut(duration);
    }

    nextAction.reset();
    nextAction.fadeIn(duration);
    nextAction.play();
    
    this.activeAction = nextAction;
  }

  public updateNametag(name: string) {
    if (!name || name === this.currentNametag) return;
    this.currentNametag = name;

    if (!this.nametagSprite) {
        this.nametagSprite = new THREE.Sprite(new THREE.SpriteMaterial({ depthTest: false }));
        // Put text above head, scale should map to canvas aspect ratio
        this.nametagSprite.position.set(0, 2.6, 0); 
        this.nametagSprite.scale.set(1.5, 0.4, 1);
        this.group.add(this.nametagSprite);
    }

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

  public update(state: PlayerState, dt: number) {
    if (this.mixer) {
      this.mixer.update(dt);
    }
    
    if (!this.modelLoaded) return;
    
    const isSwimming = (state as any).isSwimming || false;

    if (isSwimming) {
      if (state.speed > 0.1) {
        this.playAction('swim');
      } else {
        this.playAction('tread');
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
        this.playAction('idle');
      }
    }
  }
}
