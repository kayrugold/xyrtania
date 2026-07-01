import React, { useEffect, useRef, useState } from 'react'; // Trigger file watcher
import * as THREE from 'three';
import { Maximize, Palette } from 'lucide-react';
import { WorldGrid } from './WorldGrid';
import { PlayerState, JumpPhase } from './types';
import { CharacterAnimator } from './CharacterAnimator';
import { NetworkManager } from './NetworkManager';
import { AccountUI } from './components/AccountUI';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const joystickRef = useRef<HTMLDivElement | null>(null);
  const joystickKnobRef = useRef<HTMLDivElement | null>(null);
  const lookRef = useRef<HTMLDivElement | null>(null);
  const lookKnobRef = useRef<HTMLDivElement | null>(null);

  // High-fidelity active React HUD states synced with the WebGL gameplay loop
  const [health, setHealth] = useState(100);
  const [stamina, setStamina] = useState(100);
  const [px, setPx] = useState(0);
  const [pz, setPz] = useState(0);
  const [heading, setHeading] = useState('N');
  const [headingDegrees, setHeadingDegrees] = useState(0);
  const [fps, setFps] = useState(60);
  const [jumpPhase, setJumpPhase] = useState<JumpPhase>(JumpPhase.IDLE);
  const [chunkCx, setChunkCx] = useState(0);
  const [chunkCz, setChunkCz] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHud, setShowHud] = useState(true);
  const [isFakeFullscreen, setIsFakeFullscreen] = useState(false);
  const [lastLoadError, setLastLoadError] = useState<string | null>(null);
  const [gamepadName, setGamepadName] = useState<string | null>(null);
  
  // Real-time network states synced with Colyseus loop
  const [netStatus, setNetStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected');
  const [netRoomId, setNetRoomId] = useState<string | null>(null);
  const [netEndpoint, setNetEndpoint] = useState<string>('');
  const [netPeersCount, setNetPeersCount] = useState<number>(0);
  const [peerNames, setPeerNames] = useState<string[]>([]);
  
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [customColor, setCustomColor] = useState<string>('#ffffff');
  const [customScale, setCustomScale] = useState<number>(1.0);
  const [graphicsQuality, setGraphicsQuality] = useState<'high' | 'medium' | 'low'>('high');

  const graphicsQualityRef = useRef(graphicsQuality);
  useEffect(() => {
    graphicsQualityRef.current = graphicsQuality;
    window.dispatchEvent(new Event('resize'));
  }, [graphicsQuality]);

  const localAnimatorRef = useRef<CharacterAnimator | null>(null);
  const networkManagerRef = useRef<NetworkManager | null>(null);

  const [connectionMode, setConnectionMode] = useState<'colyseus_render' | 'colyseus_local' | 'p2p'>(() => {
    let saved = localStorage.getItem('xyrtania_connection_mode') as 'colyseus_render' | 'colyseus_local' | 'p2p' | 'colyseus';
    if (saved === 'colyseus' || saved === 'colyseus_render' || saved === 'p2p') {
      saved = 'colyseus_local';
      localStorage.setItem('xyrtania_connection_mode', 'colyseus_local');
    }
    return saved || 'colyseus_local';
  });

  const handleConnectionModeChange = (mode: 'colyseus_render' | 'colyseus_local' | 'p2p') => {
    setConnectionMode(mode);
    if (networkManagerRef.current) {
      networkManagerRef.current.setConnectionMode(mode);
    }
  };

  // References to invoke in-game actions from absolute HTML DOM target elements
  const triggerJumpRef = useRef<() => void>(() => {});
  const switchCharacterRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (localAnimatorRef.current) {
      localAnimatorRef.current.setCustomization(customColor, customScale);
    }
  }, [customColor, customScale]);

  // Fullscreen support state detection
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    const handleGamepadConnected = (e: GamepadEvent) => {
      setGamepadName(e.gamepad.id);
    };
    
    const handleGamepadDisconnected = (e: GamepadEvent) => {
      setGamepadName(null);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    window.addEventListener('gamepadconnected', handleGamepadConnected);
    window.addEventListener('gamepaddisconnected', handleGamepadDisconnected);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      window.removeEventListener('gamepadconnected', handleGamepadConnected);
      window.removeEventListener('gamepaddisconnected', handleGamepadDisconnected);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else if ((document.documentElement as any).webkitRequestFullscreen) {
          await (document.documentElement as any).webkitRequestFullscreen();
        } else if ((document.documentElement as any).msRequestFullscreen) {
          await (document.documentElement as any).msRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
      }
    } catch (err) {
      console.warn("Native fullscreen blocked. Using fixed page overlay instead.", err);
      // Fallback to fake fullscreen (CSS fixed overlay)
      setIsFakeFullscreen((prev) => !prev);
    }
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // --- 1. RENDERER INITIALIZATION ---
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true, // Transparent WebGL background reveals the beautiful radial galaxy grid underneath!
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // CRITICAL: Prevent auto-clearing to enable dual-scene overlay pipeline
    renderer.autoClear = false;

    // --- 2. MULTI-SCENE DIRECTORY SETUP ---
    // Scene A: Main 3D Perspective World
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050508);
    scene.fog = new THREE.FogExp2(0x050508, 0.015); // Deep slate fog gradients fade to black void in distance

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.2, 500);
    // Camera starts behind the player character in a beautiful third-person orbital angle
    camera.position.set(0, 10, 14);

    // Scene B: Orthographic HUD Scene
    const hudScene = new THREE.Scene();
    const hudCamera = new THREE.OrthographicCamera(
      -width / 2,
      width / 2,
      height / 2,
      -height / 2,
      1,
      100
    );
    hudCamera.position.z = 15;

    // --- 3. LIGHTING PIPELINE ---
    const ambientLight = new THREE.AmbientLight(0x0f172a, 0.85); // Slate blue ambient fill
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0x22d3ee, 1.4); // Cool cyan futuristic moonlight spotlight beams!
    sunLight.position.set(35, 60, 25);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 150;
    const sCamDist = 60;
    sunLight.shadow.camera.left = -sCamDist;
    sunLight.shadow.camera.right = sCamDist;
    sunLight.shadow.camera.top = sCamDist;
    sunLight.shadow.camera.bottom = -sCamDist;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    const hemisphereLight = new THREE.HemisphereLight(0x0e172c, 0x050508, 0.45);
    scene.add(hemisphereLight);

    // Dynamic point light following the player for a warm golden safety aura
    const lanternLight = new THREE.PointLight(0xf59e0b, 2.5, 14);
    lanternLight.position.set(0, 2.5, 0);
    scene.add(lanternLight);

    // Warm high-intensity camera headlight to make the player pop and look perfectly illuminated
    const headLight = new THREE.PointLight(0xfff7e6, 3.2, 30, 0.45);
    scene.add(headLight);

    // Water Ripple Pool for Treading Water
    const maxRipples = 6;
    const rippleGeo = new THREE.RingGeometry(0.5, 0.65, 16);
    const rippleMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
    const ripples: THREE.Mesh[] = [];
    for (let i = 0; i < maxRipples; i++) {
        const r = new THREE.Mesh(rippleGeo, rippleMat.clone());
        r.rotation.x = -Math.PI / 2;
        r.visible = false;
        r.userData = { age: 999 };
        scene.add(r);
        ripples.push(r);
    }

    // --- 4. ENGINE INITIALIZATION ---
    const worldGrid = new WorldGrid(scene);

    // Player State Tracker
    const state: PlayerState = {
      position: new THREE.Vector3(0, 0, 0),
      velocity: new THREE.Vector3(0, 0, 0),
      direction: 0,
      speed: 0,
      health: 100,
      jumpPhase: JumpPhase.IDLE,
      jumpProgress: 0,
      isGrounded: true,
      verticalVelocity: 0,
    };

    // Shared Group containing both the Explorer character and the custom loaded mounts
    const playerRootGroup = new THREE.Group();
    playerRootGroup.position.set(0, 0, 0);
    scene.add(playerRootGroup);

    // Explorer Character Mesh (FBX + Animations)
    const animator = new CharacterAnimator();
    CharacterAnimator.onError = (err) => {
      setLastLoadError(err || null);
    };
    localAnimatorRef.current = animator;
    playerRootGroup.add(animator.group);
    animator.loadModelAndAnimations('/assets/character/peter/peteridle.fbx').catch((err) => console.error(err));

    // --- 5. NETWORK MANAGER INITIALIZATION ---
    const networkManager = new NetworkManager('xyrtania-world-1', 'main-room');
    networkManagerRef.current = networkManager;
    const remoteAnimators = new Map<string, CharacterAnimator>();

    // Initial state bindings
    setNetEndpoint(networkManager.serverEndpoint);
    setNetStatus(networkManager.status);
    setNetRoomId(networkManager.roomId || null);

    networkManager.onStatusChange = (status, roomId) => {
      setNetStatus(status);
      setNetRoomId(roomId || null);
      setNetEndpoint(networkManager.serverEndpoint);
    };

    networkManager.onPeersChange = (count) => {
      setNetPeersCount(count);
      const names: string[] = [];
      for (const peer of networkManager.peers.values()) {
        names.push(peer.state.displayName || 'Anonymous');
      }
      setPeerNames(names);
    };

    networkManager.onPeerJoin = (id) => {
      const names: string[] = [];
      for (const peer of networkManager.peers.values()) {
        names.push(peer.state.displayName || 'Anonymous');
      }
      setPeerNames(names);
    };

    networkManager.onPeerLeave = (id) => {
      const remAnim = remoteAnimators.get(id);
      if (remAnim) {
        scene.remove(remAnim.group);
        remoteAnimators.delete(id);
      }
      const names: string[] = [];
      for (const peer of networkManager.peers.values()) {
        names.push(peer.state.displayName || 'Anonymous');
      }
      setPeerNames(names);
    };

    networkManager.onPeerAnimationStateChange = (peerId, animationState) => {
        const remAnim = remoteAnimators.get(peerId);
        if (remAnim) {
            remAnim.playAction(animationState, 0.25);
        }
    };

    networkManager.onPeerDisplayNameChange = (peerId, displayName) => {
        const remAnim = remoteAnimators.get(peerId);
        if (remAnim && displayName) {
            remAnim.updateNametag(displayName);
        }
        const names: string[] = [];
        for (const peer of networkManager.peers.values()) {
          names.push(peer.state.displayName || 'Anonymous');
        }
        setPeerNames(names);
    };

    // --- 6. NATIVE 3D HUD COMPONENT GENERATION (HUD Scene) ---
    const hudElementsGroup = new THREE.Group();
    hudScene.add(hudElementsGroup);

    const hudMaterials = {
      darkGrey: new THREE.MeshBasicMaterial({ color: 0x1f2937, depthTest: false, transparent: true, opacity: 0.85 }),
      solidGreen: new THREE.MeshBasicMaterial({ color: 0x10b981, depthTest: false }),
      dangerRed: new THREE.MeshBasicMaterial({ color: 0xef4444, depthTest: false }),
      white: new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false }),
      gold: new THREE.MeshBasicMaterial({ color: 0xf59e0b, depthTest: false }),
      goldPressed: new THREE.MeshBasicMaterial({ color: 0xd97706, depthTest: false }),
      copper: new THREE.MeshBasicMaterial({ color: 0x92400e, depthTest: false }),
      compassBase: new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.6 }),
      compassN: new THREE.MeshStandardMaterial({ color: 0xd9383a, roughness: 0.4 }),
      compassS: new THREE.MeshStandardMaterial({ color: 0xf3f4f6, roughness: 0.4 }),
      compassEW: new THREE.MeshStandardMaterial({ color: 0xfab226, roughness: 0.4 }),
    };

    // (A) HEALTH BAR OVERLAY SYSTEM
    const healthContainer = new THREE.Group();
    healthContainer.name = 'healthContainer';

    // Red Cross medical shield emblem
    const emblemBg = new THREE.Mesh(new THREE.CircleGeometry(16, 24), hudMaterials.dangerRed);
    emblemBg.position.set(-110, 0, 1);
    healthContainer.add(emblemBg);

    const plusVert = new THREE.Mesh(new THREE.PlaneGeometry(6, 20), hudMaterials.white);
    plusVert.position.set(-110, 0, 2);
    const plusHoriz = new THREE.Mesh(new THREE.PlaneGeometry(20, 6), hudMaterials.white);
    plusHoriz.position.set(-110, 0, 2);
    healthContainer.add(plusVert);
    healthContainer.add(plusHoriz);

    // Frame backplate
    const healthBack = new THREE.Mesh(new THREE.PlaneGeometry(168, 24), hudMaterials.darkGrey);
    healthBack.position.set(-10, 0, 0);
    healthContainer.add(healthBack);

    // Inner green scale-aligned health fill. Align geometry to left edge to make scale operation direct.
    const healthFillGeom = new THREE.PlaneGeometry(160, 16);
    healthFillGeom.translate(80, 0, 0); // Translate half width to make pivot left-aligned
    const healthFill = new THREE.Mesh(healthFillGeom, hudMaterials.solidGreen);
    healthFill.position.set(-90, 0, 2);
    healthContainer.add(healthFill);

    hudElementsGroup.add(healthContainer);

    // (B) 3D ROTATING COMPASS DIAL
    // This is a gorgeous 3D disk placed at top center, lit in the orthographic HUD overlay
    const compassSystem = new THREE.Group();
    compassSystem.name = 'compassSystem';

    // Compass dial frame
    const dialCylinder = new THREE.Mesh(new THREE.CylinderGeometry(44, 45, 12, 16), hudMaterials.compassBase);
    dialCylinder.rotation.x = 0.3; // Tilt forward so player sees detail
    compassSystem.add(dialCylinder);

    // static indicator arrow floating in front of dial
    const staticArrowGeom = new THREE.ConeGeometry(5, 12, 4);
    const staticArrow = new THREE.Mesh(staticArrowGeom, hudMaterials.dangerRed);
    staticArrow.position.set(0, 52, 6);
    staticArrow.rotation.z = Math.PI; // point down towards the dial
    compassSystem.add(staticArrow);

    // Add cardinal markers directly as structural parts of the rotating dial
    // North Pointer: Red cone
    const pN = new THREE.Mesh(new THREE.ConeGeometry(4, 16, 4), hudMaterials.compassN);
    pN.position.set(0, 0, -32);
    pN.rotation.x = -Math.PI / 2;
    dialCylinder.add(pN);

    // South Pointer: White cone
    const pS = new THREE.Mesh(new THREE.ConeGeometry(4, 16, 4), hudMaterials.compassS);
    pS.position.set(0, 0, 32);
    pS.rotation.x = Math.PI / 2;
    dialCylinder.add(pS);

    // East Pointer: Golden cone
    const pE = new THREE.Mesh(new THREE.ConeGeometry(4, 16, 4), hudMaterials.compassEW);
    pE.position.set(32, 0, 0);
    pE.rotation.z = -Math.PI / 2;
    dialCylinder.add(pE);

    // West Pointer: Golden cone
    const pW = new THREE.Mesh(new THREE.ConeGeometry(4, 16, 4), hudMaterials.compassEW);
    pW.position.set(-32, 0, 0);
    pW.rotation.z = Math.PI / 2;
    dialCylinder.add(pW);

    // Add lighting to the HUD scene because the compass dial is a Standard material
    const hudDirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    hudDirLight.position.set(10, 30, 20);
    hudScene.add(hudDirLight);
    const hudAmbLight = new THREE.AmbientLight(0xffffff, 0.45);
    hudScene.add(hudAmbLight);

    hudElementsGroup.add(compassSystem);


    // (C) GOLDEN JUMP TRIGGER CIRCLE BUTTON
    const jumpButton = new THREE.Group();
    jumpButton.name = 'btn_jump';

    // Outer backing golden ring
    const btnOuter = new THREE.Mesh(new THREE.RingGeometry(32, 38, 32), hudMaterials.gold);
    btnOuter.position.z = 1;
    jumpButton.add(btnOuter);

    // Touch circular interaction zone plane
    const btnInner = new THREE.Mesh(new THREE.CircleGeometry(30, 32), hudMaterials.darkGrey);
    btnInner.position.z = 0;
    jumpButton.add(btnInner);

    // Generous transparent touch hit target (Industry standard)
    const btnHitArea = new THREE.Mesh(
      new THREE.CircleGeometry(60, 16),
      new THREE.MeshBasicMaterial({ depthTest: false, transparent: true, opacity: 0 })
    );
    btnHitArea.position.z = -1;
    jumpButton.add(btnHitArea);

    // Stylized Up Arrow indicators inside button
    const arrowStem = new THREE.Mesh(new THREE.PlaneGeometry(6, 16), hudMaterials.gold);
    arrowStem.position.set(0, -3, 2);
    jumpButton.add(arrowStem);

    const arrowTip = new THREE.Mesh(new THREE.ConeGeometry(10, 12, 3), hudMaterials.gold);
    arrowTip.position.set(0, 8, 2);
    arrowTip.rotation.z = Math.PI / 2; // point up relative to cone coordinates
    jumpButton.add(arrowTip);

    hudElementsGroup.add(jumpButton);

    // (C-2) CROUCH BUTTON
    const crouchButton = new THREE.Group();
    crouchButton.name = 'btn_crouch';

    const cbOuter = new THREE.Mesh(new THREE.RingGeometry(18, 22, 32), hudMaterials.gold);
    cbOuter.position.z = 1;
    crouchButton.add(cbOuter);

    const cbInner = new THREE.Mesh(new THREE.CircleGeometry(16, 32), hudMaterials.darkGrey);
    cbInner.position.z = 0;
    crouchButton.add(cbInner);

    const cbHitArea = new THREE.Mesh(
      new THREE.CircleGeometry(40, 16),
      new THREE.MeshBasicMaterial({ depthTest: false, transparent: true, opacity: 0 })
    );
    cbHitArea.position.z = -1;
    crouchButton.add(cbHitArea);

    const crouchStem = new THREE.Mesh(new THREE.PlaneGeometry(5, 12), hudMaterials.gold);
    crouchStem.position.set(0, 3, 2);
    crouchButton.add(crouchStem);

    const crouchTip = new THREE.Mesh(new THREE.ConeGeometry(8, 8, 3), hudMaterials.gold);
    crouchTip.position.set(0, -5, 2);
    crouchTip.rotation.z = -Math.PI / 2; // point down
    crouchButton.add(crouchTip);

    hudElementsGroup.add(crouchButton);

    // (C-3) PRONE BUTTON
    const proneButton = new THREE.Group();
    proneButton.name = 'btn_prone';

    const pbOuter = new THREE.Mesh(new THREE.RingGeometry(18, 22, 32), hudMaterials.gold);
    pbOuter.position.z = 1;
    proneButton.add(pbOuter);

    const pbInner = new THREE.Mesh(new THREE.CircleGeometry(16, 32), hudMaterials.darkGrey);
    pbInner.position.z = 0;
    proneButton.add(pbInner);

    const pbHitArea = new THREE.Mesh(
      new THREE.CircleGeometry(40, 16),
      new THREE.MeshBasicMaterial({ depthTest: false, transparent: true, opacity: 0 })
    );
    pbHitArea.position.z = -1;
    proneButton.add(pbHitArea);

    const proneLine = new THREE.Mesh(new THREE.PlaneGeometry(12, 3), hudMaterials.gold);
    proneLine.position.set(0, -6, 2);
    proneButton.add(proneLine);

    const proneStem = new THREE.Mesh(new THREE.PlaneGeometry(5, 8), hudMaterials.gold);
    proneStem.position.set(0, 2, 2);
    proneButton.add(proneStem);

    const proneTip = new THREE.Mesh(new THREE.ConeGeometry(8, 8, 3), hudMaterials.gold);
    proneTip.position.set(0, -3, 2);
    proneTip.rotation.z = -Math.PI / 2; // point down
    proneButton.add(proneTip);

    hudElementsGroup.add(proneButton);

    // (E) TEXT GRAPHIC NOTICES IN WEBGL (Simple UI guide plates constructed out of meshes)
    const noticePlate = new THREE.Group();
    noticePlate.name = 'noticePlate';
    
    // Background bar
    const npBg = new THREE.Mesh(new THREE.PlaneGeometry(280, 22), hudMaterials.darkGrey);
    noticePlate.add(npBg);

    // Decorative pixels spelling keys: "WASD" keys to Move
    const keySymbolGroup = new THREE.Group();
    keySymbolGroup.position.set(0, 0, 1);
    noticePlate.add(keySymbolGroup);

    // Create a horizontal white pixel indicator representing control bindings
    const controlGuideLine = new THREE.Mesh(new THREE.PlaneGeometry(240, 2), hudMaterials.gold);
    controlGuideLine.position.y = -8;
    noticePlate.add(controlGuideLine);

    // hudElementsGroup.add(noticePlate); // REMOVED BY USER REQUEST



    // (F) WEBGL FULLSCREEN BUTTON drawn directly to the canvas using primitives
    const fullscreenButton = new THREE.Group();
    fullscreenButton.name = 'btn_fullscreen';

    // Outer backing golden ring
    const fsOuter = new THREE.Mesh(new THREE.RingGeometry(42, 48, 32), hudMaterials.gold);
    fsOuter.position.z = 1;
    fullscreenButton.add(fsOuter);

    // Inner backplate (dark grey)
    const fsInner = new THREE.Mesh(new THREE.CircleGeometry(44, 32), hudMaterials.darkGrey);
    fsInner.position.z = 0;
    fullscreenButton.add(fsInner);

    // Generous transparent touch hit target (Industry standard)
    const fsHitArea = new THREE.Mesh(
      new THREE.CircleGeometry(75, 16),
      new THREE.MeshBasicMaterial({ depthTest: false, transparent: true, opacity: 0 })
    );
    fsHitArea.position.z = -1;
    fullscreenButton.add(fsHitArea);

    // Draw clean fullscreen brackets on the canvas with Plane geometries:
    const bracketGroup = new THREE.Group();
    bracketGroup.position.z = 2;

    const bSize = 10;
    const bThick = 2.5;
    const bOff = 12;

    // Top-left
    const tlH = new THREE.Mesh(new THREE.PlaneGeometry(bSize, bThick), hudMaterials.gold);
    tlH.position.set(-bOff + bSize / 2, bOff - bThick / 2, 0);
    const tlV = new THREE.Mesh(new THREE.PlaneGeometry(bThick, bSize), hudMaterials.gold);
    tlV.position.set(-bOff + bThick / 2, bOff - bSize / 2, 0);
    bracketGroup.add(tlH, tlV);

    // Top-right
    const trH = new THREE.Mesh(new THREE.PlaneGeometry(bSize, bThick), hudMaterials.gold);
    trH.position.set(bOff - bSize / 2, bOff - bThick / 2, 0);
    const trV = new THREE.Mesh(new THREE.PlaneGeometry(bThick, bSize), hudMaterials.gold);
    trV.position.set(bOff - bThick / 2, bOff - bSize / 2, 0);
    bracketGroup.add(trH, trV);

    // Bottom-left
    const blH = new THREE.Mesh(new THREE.PlaneGeometry(bSize, bThick), hudMaterials.gold);
    blH.position.set(-bOff + bSize / 2, -bOff + bThick / 2, 0);
    const blV = new THREE.Mesh(new THREE.PlaneGeometry(bThick, bSize), hudMaterials.gold);
    blV.position.set(-bOff + bThick / 2, -bOff + bSize / 2, 0);
    bracketGroup.add(blH, blV);

    // Bottom-right
    const brH = new THREE.Mesh(new THREE.PlaneGeometry(bSize, bThick), hudMaterials.gold);
    brH.position.set(bOff - bSize / 2, -bOff + bThick / 2, 0);
    const brV = new THREE.Mesh(new THREE.PlaneGeometry(bThick, bSize), hudMaterials.gold);
    brV.position.set(bOff - bThick / 2, -bOff + bSize / 2, 0);
    bracketGroup.add(brH, brV);

    fullscreenButton.add(bracketGroup);
    hudElementsGroup.add(fullscreenButton);


    // --- RE-ENABLE FULL RICH HUD PARTS FOR INTUITIVE USER CONTROLS ---
    healthContainer.visible = true;
    compassSystem.visible = false;
    noticePlate.visible = true;


    // --- 6. WINDOW RESIZING ENGINE ---
    const layoutUI = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      // Update basic viewport systems
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();

      // Optimize pixelRatio dynamically to prevent frame drops in fullscreen / high resolution
      const quality = graphicsQualityRef.current;
      let maxPixelRatio = 1.5;
      
      if (quality === 'high') {
        // High quality: 1.5 max pixel ratio under normal, 1.25 in fullscreen to optimize fill rate
        maxPixelRatio = document.fullscreenElement ? 1.25 : 1.5;
        sunLight.castShadow = true;
        renderer.shadowMap.enabled = true;
      } else if (quality === 'medium') {
        // Medium quality: 1.0 max pixel ratio (sharp, but much fewer pixels than 1.5/2.0), shadows enabled
        maxPixelRatio = 1.0;
        sunLight.castShadow = true;
        renderer.shadowMap.enabled = true;
      } else { // 'low'
        // Low quality: 0.85 max pixel ratio (sub-sampled), shadows disabled completely for peak performance
        maxPixelRatio = 0.85;
        sunLight.castShadow = false;
        renderer.shadowMap.enabled = false;
      }
      
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));

      // Update HUD Camera projection mapping
      hudCamera.left = -w / 2;
      hudCamera.right = w / 2;
      hudCamera.top = h / 2;
      hudCamera.bottom = -h / 2;
      hudCamera.updateProjectionMatrix();

      // Reposition all HUD group elements elegantly relative to anchors
      healthContainer.position.set(-w / 2 + 130, h / 2 - 45, 0);
      compassSystem.position.set(0, h / 2 - 55, 0);
      jumpButton.position.set(w / 2 - 45, -h / 2 + 45, 0);
      crouchButton.position.set(w / 2 - 100, -h / 2 + 30, 0);
      proneButton.position.set(w / 2 - 70, -h / 2 + 90, 0);
      
      // Make fullscreen a tiny button at the top right
      fullscreenButton.position.set(w / 2 - 35, h / 2 - 35, 0);
      fullscreenButton.scale.set(0.42, 0.42, 0.42);
      
      noticePlate.visible = false;
    };
    window.addEventListener('resize', layoutUI);
    // Initial dynamic layout binding
    layoutUI();


    // --- 7. INPUT & STEERING INTERACTORS ---
    let currentStamina = 100;
    
    let isTouchMode = false;

    const keys: { [key: string]: boolean } = {};
    const keyPressHandler = (e: KeyboardEvent) => {
      isTouchMode = false; // keyboard input means we probably aren't relying purely on touch HUD
      
      // Prevent scrolling when pressing Spacebar
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
      }
      if (e.code === 'Numpad6' || e.key === 'Fullscreen') {
        const docEl = document.documentElement;
        if (!document.fullscreenElement) {
          docEl.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      }

      const k = e.key.toLowerCase();
      if (keys[k]) return; // Stop repeating keydown auto-repeat
      keys[k] = true;

      // Character Switch
      if (k === 'c') {
        switchCharacter();
      }

      // Crouch
      if (k === 'control') {
        state.isCrouching = !state.isCrouching;
        if (state.isCrouching) state.isProne = false;
      }

      // Prone (Z key)
      if (k === 'z') {
        state.isProne = !state.isProne;
        if (state.isProne) state.isCrouching = false;
      }

      // Space Trigger JUMP
      if (e.key === ' ' || e.code === 'Space') {
        initiateJump();
      }
    };
    const keyReleaseHandler = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', keyPressHandler);
    window.addEventListener('keyup', keyReleaseHandler);

    const characters = [
      '/assets/character/peter/peteridle.fbx'
    ];
    
    // Kickoff background async preloading of all models to avoid lag spikes
    CharacterAnimator.preloadCharacters(characters);
    
    let currentCharacterIndex = 0;
    let lastSwitchTime = 0;

    function switchCharacter() {
        const now = performance.now();
        if (now - lastSwitchTime < 1500) return;
        lastSwitchTime = now;
        
        currentCharacterIndex = (currentCharacterIndex + 1) % characters.length;
        animator.loadModelAndAnimations(characters[currentCharacterIndex]).catch(e => console.error('Error switching character:', e));
    }

    function initiateJump() {
      // Allow jump if player is on the ground
      if (state.isGrounded && state.jumpPhase !== JumpPhase.PREP) {
        state.isCrouching = false;
        state.isProne = false;
        state.jumpPhase = JumpPhase.PREP;
        state.jumpProgress = 0;

        // Pulse the gold jump button on screen
        jumpButton.scale.set(0.75, 0.75, 0.75);
      }
    }

    // Connect refs to make these actions callable from the outer React DOM HUD
    triggerJumpRef.current = initiateJump;
    switchCharacterRef.current = switchCharacter;

    // Split-screen touch/mouse active tracking states
    let moveActive = false;
    let moveTouchId: number | null = null;
    let jumpActive = false;
    let jumpTouchId: number | null = null;
    let moveStartX = 0;
    let moveStartY = 0;
    let moveCurrentX = 0;
    let moveCurrentY = 0;

    let camActive = false;
    let camTouchId: number | null = null;
    let camStartX = 0;
    let camStartY = 0;
    let camCurrentX = 0;
    let camCurrentY = 0;

    // Camera orbit parameters (starts behind player looking forward)
    let cameraYaw = 0;
    let cameraPitch = 0.55;
    const baseCameraDistance = 5.5;

    const handlePointerDown = (clientX: number, clientY: number, touchId: number | null) => {
      // 1. Raycast into flat Hud Scene to verify circular buttons hits
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();
      mouse.x = (clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, hudCamera);
      const intersects = raycaster.intersectObjects(hudElementsGroup.children, true);

      let buttonHit = false;
      for (const hit of intersects) {
        let parent: THREE.Object3D | null = hit.object;
        while (parent && parent !== hudScene) {
          if (parent.name === 'btn_jump') {
            initiateJump();
            jumpActive = true;
            jumpTouchId = touchId;
            buttonHit = true;
            break;
          }
          if (parent.name === 'btn_crouch') {
            state.isCrouching = !state.isCrouching;
            if (state.isCrouching) state.isProne = false;
            buttonHit = true;
            break;
          }
          if (parent.name === 'btn_prone') {
            state.isProne = !state.isProne;
            if (state.isProne) state.isCrouching = false;
            buttonHit = true;
            break;
          }
          if (parent.name === 'btn_fullscreen') {
            toggleFullscreen();
            buttonHit = true;
            break;
          }
          parent = parent.parent;
        }
        if (buttonHit) break;
      }

      // 2. If no button is hit, use split-screen inputs (left side for steer, right side for camera orbit look)
      if (!buttonHit) {
        const isLeftHalf = clientX < window.innerWidth / 2;
        if (isLeftHalf) {
          moveActive = true;
          moveTouchId = touchId;
          moveStartX = clientX;
          moveStartY = clientY;
          moveCurrentX = clientX;
          moveCurrentY = clientY;
          
          // Display and position virtual joystick DOM container
          if (joystickRef.current) {
            joystickRef.current.style.display = 'block';
            joystickRef.current.style.left = `${clientX}px`;
            joystickRef.current.style.top = `${clientY}px`;
          }
          if (joystickKnobRef.current) {
            joystickKnobRef.current.style.transform = `translate(0px, 0px)`;
          }
        } else {
          camActive = true;
          camTouchId = touchId;
          camStartX = clientX;
          camStartY = clientY;
          camCurrentX = clientX;
          camCurrentY = clientY;

          // Position look pointer ring visual
          if (lookRef.current) {
            lookRef.current.style.display = 'block';
            lookRef.current.style.left = `${clientX}px`;
            lookRef.current.style.top = `${clientY}px`;
          }
          if (lookKnobRef.current) {
            lookKnobRef.current.style.transform = `translate(0px, 0px)`;
          }
        }
      }
    };

    const handlePointerMove = (clientX: number, clientY: number, touchId: number | null) => {
      if (moveActive && moveTouchId === touchId) {
        moveCurrentX = clientX;
        moveCurrentY = clientY;
        const dx = clientX - moveStartX;
        const dy = clientY - moveStartY;
        // Clamp virtual knob graphics within 45px radius boundary
        const angle = Math.atan2(dy, dx);
        const dist = Math.min(45, Math.sqrt(dx*dx + dy*dy));
        const knobX = dist * Math.cos(angle);
        const knobY = dist * Math.sin(angle);
        if (joystickKnobRef.current) {
          joystickKnobRef.current.style.transform = `translate(${knobX}px, ${knobY}px)`;
        }
      }
      if (camActive && camTouchId === touchId) {
        camCurrentX = clientX;
        camCurrentY = clientY;
        const dx = clientX - camStartX;
        const dy = clientY - camStartY;
        // Clamp camera knob graphics within 45px radius boundary
        const angle = Math.atan2(dy, dx);
        const dist = Math.min(45, Math.sqrt(dx*dx + dy*dy));
        const knobX = dist * Math.cos(angle);
        const knobY = dist * Math.sin(angle);
        if (lookKnobRef.current) {
          lookKnobRef.current.style.transform = `translate(${knobX}px, ${knobY}px)`;
        }
      }
    };

    const handlePointerUp = (touchId: number | null) => {
      if (touchId === null) {
        moveActive = false;
        moveTouchId = null;
        camActive = false;
        camTouchId = null;
        jumpActive = false;
        jumpTouchId = null;
        if (joystickRef.current) {
          joystickRef.current.style.display = 'none';
        }
        if (lookRef.current) {
          lookRef.current.style.display = 'none';
        }
      } else {
        if (moveActive && moveTouchId === touchId) {
          moveActive = false;
          moveTouchId = null;
          if (joystickRef.current) {
            joystickRef.current.style.display = 'none';
          }
        }
        if (camActive && camTouchId === touchId) {
          camActive = false;
          camTouchId = null;
          if (lookRef.current) {
            lookRef.current.style.display = 'none';
          }
        }
        if (jumpActive && jumpTouchId === touchId) {
          jumpActive = false;
          jumpTouchId = null;
        }
      }
    };

    // Canvas listeners
    const el = canvasRef.current;
    
    const onMouseDown = (e: MouseEvent) => {
      isTouchMode = false;
      if (document.pointerLockElement !== el) {
        el.requestPointerLock().catch(() => {});
      }
    };
    const onMouseMove = (e: MouseEvent) => {
      isTouchMode = false;
      if (document.pointerLockElement === el) {
        cameraYaw -= e.movementX * 0.012;
        cameraPitch = Math.max(-1.4, Math.min(1.4, cameraPitch + e.movementY * 0.005));
      } else if (e.buttons > 0) {
        // Fallback for iframe where pointer lock might be blocked
        cameraYaw -= e.movementX * 0.012;
        cameraPitch = Math.max(-1.4, Math.min(1.4, cameraPitch + e.movementY * 0.005));
      }
    };
    const onWindowMouseUp = () => {
      isTouchMode = false;
      handlePointerUp(null);
    };

    const onTouchStart = (e: TouchEvent) => {
      isTouchMode = true;
      e.preventDefault(); // Stop mobile scrolling/pinch effects on WebGL frame canvas
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        handlePointerDown(t.clientX, t.clientY, t.identifier);
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        handlePointerMove(t.clientX, t.clientY, t.identifier);
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        handlePointerUp(t.identifier);
      }
    };

    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onWindowMouseUp);

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: false });
    el.addEventListener('touchcancel', onTouchEnd, { passive: false });

    // --- 8. THE MAIN GAMEPLAY SIMULATION LOOP ---
    const clock = new THREE.Clock();
    let playerDirectionAngle = 0;
    let cameraShake = 0;

    // Telemetry and high-performance State tracking clocks
    let lastTime = performance.now();
    let lastRenderTime = performance.now();
    let frames = 0;
    let lastFpsUpdate = 0;
    let lastStateUpdate = 0;

    let frameId: number = 0;

    let targetKeyboardX = 0;
    let targetKeyboardZ = 0;
    let smoothedKeyboardX = 0;
    let smoothedKeyboardZ = 0;
    let prevGamepadJump = false;
    let prevGamepadCrouch = false;
    let gamepadCrouchPressTime = 0;
    let gamepadCrouchHoldTriggered = false;

    const gameLoop = () => {
      frameId = requestAnimationFrame(gameLoop);

      const currentTime = performance.now();
      
      const dt = Math.min(clock.getDelta(), 0.05); // Clamp dt to prevent massive jumps on page switch, max 50ms (20fps)
      const globalTime = clock.getElapsedTime();
      
      // Update HUD visibility based on current input mode
      jumpButton.visible = isTouchMode;
      crouchButton.visible = isTouchMode;
      proneButton.visible = isTouchMode;
      fullscreenButton.visible = isTouchMode;

      // Keyboard camera turning
      if (keys['q']) cameraYaw += 3.5 * dt;
      if (keys['e']) cameraYaw -= 3.5 * dt;

      // Gradual decay of HUD click scale pulses
      jumpButton.scale.lerp(new THREE.Vector3(1, 1, 1), dt * 10);

      // --- MOVEMENT STEERING DECODER ---
      const moveVec = new THREE.Vector3(0, 0, 0);

      targetKeyboardX = 0;
      targetKeyboardZ = 0;
      if (keys['w'] || keys['arrowup']) targetKeyboardZ -= 1;
      if (keys['s'] || keys['arrowdown']) targetKeyboardZ += 1;
      if (keys['a'] || keys['arrowleft']) targetKeyboardX -= 1;
      if (keys['d'] || keys['arrowright']) targetKeyboardX += 1;

      let gamepadJump = false;
      let gamepadCrouch = false;

      // --- GAMEPAD SUPPORT ---
      const gamepads = navigator.getGamepads ? Array.from(navigator.getGamepads()) : [];
      let gamepadActive = false;
      for (const gp of gamepads) {
        if (!gp) continue;
        
        // D-Pad (usually buttons 12-15)
        const dpadUp = gp.buttons[12]?.pressed;
        const dpadDown = gp.buttons[13]?.pressed;
        const dpadLeft = gp.buttons[14]?.pressed;
        const dpadRight = gp.buttons[15]?.pressed;

        let gpDx = 0;
        let gpDz = 0;

        if (dpadUp) gpDz -= 1;
        if (dpadDown) gpDz += 1;
        if (dpadLeft) gpDx -= 1;
        if (dpadRight) gpDx += 1;

        // Left stick for movement (axes 0 and 1) - overrides D-Pad if used
        if (gp.axes.length >= 2) {
            const stickX = Math.abs(gp.axes[0]) > 0.15 ? gp.axes[0] : 0;
            const stickY = Math.abs(gp.axes[1]) > 0.15 ? gp.axes[1] : 0;
            if (stickX !== 0 || stickY !== 0) {
                gpDx = stickX;
                gpDz = stickY;
            }
        }
        
        if (gpDx !== 0 || gpDz !== 0) {
            targetKeyboardX = gpDx;
            targetKeyboardZ = gpDz;
            gamepadActive = true;
        }
        
        // Right stick for camera look (axes 2 and 3)
        if (gp.axes.length >= 4) {
            const gpCx = Math.abs(gp.axes[2]) > 0.15 ? gp.axes[2] : 0;
            const gpCy = Math.abs(gp.axes[3]) > 0.15 ? gp.axes[3] : 0;
            
            if (gpCx !== 0) cameraYaw -= gpCx * 3.0 * dt;
            if (gpCy !== 0) cameraPitch = Math.max(-1.4, Math.min(1.4, cameraPitch + gpCy * 2.0 * dt));
        }

        // Button 1 (index 1) for jump
        if (gp.buttons[1] && gp.buttons[1].pressed) {
            gamepadJump = true;
        }

        // Button 11 (index 11) for crouch/prone
        if (gp.buttons[11] && gp.buttons[11].pressed) {
            gamepadCrouch = true;
        }

        const debugEl = document.getElementById('gamepad-debug');
        if (debugEl && (gpDx !== 0 || gpDz !== 0 || gp.axes[2] !== 0 || gp.axes[3] !== 0 || gamepadJump || gamepadCrouch)) {
            debugEl.innerText = `${gp.id.substring(0, 15)}...\nL(${gp.axes[0]?.toFixed(2)}, ${gp.axes[1]?.toFixed(2)}) R(${gp.axes[2]?.toFixed(2)}, ${gp.axes[3]?.toFixed(2)})\nBtns: ${gp.buttons.map((b, i) => b.pressed ? i : -1).filter(i => i >= 0).join(',')}`;
        }
      }

      if (gamepadJump && !prevGamepadJump) {
          initiateJump();
      }
      prevGamepadJump = gamepadJump;

      if (gamepadCrouch && !prevGamepadCrouch) {
          gamepadCrouchPressTime = currentTime;
          gamepadCrouchHoldTriggered = false;
      }
      
      if (gamepadCrouch && prevGamepadCrouch) {
          const holdDuration = currentTime - gamepadCrouchPressTime;
          if (holdDuration > 400 && !gamepadCrouchHoldTriggered) {
              gamepadCrouchHoldTriggered = true;
              if (state.isProne) {
                  state.isProne = false;
                  state.isCrouching = false;
              } else {
                  state.isProne = true;
                  state.isCrouching = false;
              }
          }
      }
      
      if (!gamepadCrouch && prevGamepadCrouch) {
          if (!gamepadCrouchHoldTriggered) {
              if (state.isProne) {
                  state.isProne = false;
                  state.isCrouching = true;
              } else {
                  state.isCrouching = !state.isCrouching;
                  if (state.isCrouching) state.isProne = false;
              }
          }
      }
      prevGamepadCrouch = gamepadCrouch;

      // Normalize target keyboard vectors to prevent diagonal speed boost
      // Only normalize if it's from keyboard (not analog gamepad which shouldn't be forced to 1.0 length unless > 1)
      if (!gamepadActive && targetKeyboardX !== 0 && targetKeyboardZ !== 0) {
        const len = Math.sqrt(targetKeyboardX * targetKeyboardX + targetKeyboardZ * targetKeyboardZ);
        targetKeyboardX /= len;
        targetKeyboardZ /= len;
      } else if (gamepadActive) {
          // Clamp magnitude to 1 for analog sticks so they don't exceed max speed
          const len = Math.sqrt(targetKeyboardX * targetKeyboardX + targetKeyboardZ * targetKeyboardZ);
          if (len > 1.0) {
              targetKeyboardX /= len;
              targetKeyboardZ /= len;
          }
      }

      // Smooth keyboard movement to create analog joystick feel
      const kAccel = dt * 10.0;
      smoothedKeyboardX += (targetKeyboardX - smoothedKeyboardX) * Math.min(1.0, kAccel);
      smoothedKeyboardZ += (targetKeyboardZ - smoothedKeyboardZ) * Math.min(1.0, kAccel);

      if (Math.abs(smoothedKeyboardX) > 0.01) moveVec.x = smoothedKeyboardX;
      if (Math.abs(smoothedKeyboardZ) > 0.01) moveVec.z = smoothedKeyboardZ;

      // Steer via touch movement vector (Split Screen Joystick style)
      if (moveActive) {
        const screenDx = moveCurrentX - moveStartX;
        const screenDz = moveCurrentY - moveStartY;

        // Apply a small deadzone to prevent jittery inputs
        if (Math.abs(screenDx) > 4 || Math.abs(screenDz) > 4) {
          // Angle on screen relative to starting touch position
          const screenAngle = Math.atan2(screenDx, screenDz);
          
          // Project relative to camera forward vector
          const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
          if (!(state as any).isSwimming) camForward.y = 0;
          camForward.normalize();

          const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
          if (!(state as any).isSwimming) camRight.y = 0;
          camRight.normalize();

          // Mix vectors scaled by cam orientation
          const touchDir = camForward.multiplyScalar(-Math.cos(screenAngle)).add(camRight.multiplyScalar(Math.sin(screenAngle)));
          touchDir.normalize();

          moveVec.copy(touchDir);
        }
      }

      // Convert local keyboard inputs into world spaces aligned relative to camera facing heading
      if (moveVec.lengthSq() > 0.01 && !moveActive) {
        const keyboardMag = moveVec.length();
        moveVec.normalize();
        
        const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        if (!(state as any).isSwimming) camForward.y = 0;
        camForward.normalize();

        const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        if (!(state as any).isSwimming) camRight.y = 0;
        camRight.normalize();

        // moveVec.z is -1 for forward, moveVec.x is -1 for left
        const alignedMoveVec = camForward.multiplyScalar(-moveVec.z).add(camRight.multiplyScalar(moveVec.x));
        moveVec.copy(alignedMoveVec).normalize().multiplyScalar(keyboardMag);
      }

      // Decides movement speed scale depending on analog touch joystick drag pull
      let speedScale = 1.0;
      if (moveActive) {
        const screenDx = moveCurrentX - moveStartX;
        const screenDz = moveCurrentY - moveStartY;
        const dragDist = Math.sqrt(screenDx * screenDx + screenDz * screenDz);
        speedScale = Math.min(1.0, dragDist / 45);
      }

      // We want walk -> jog -> run, so we use a low acceleration factor when running
      // so the player naturally transitions through the animation thresholds.
      const isSwimmingNow = (state as any).isSwimming || false;
      const isCrouchingNow = state.isCrouching || false;
      const isProneNow = state.isProne || false;
      
      let baseSpeed = 18;
      if (isSwimmingNow) baseSpeed = 8;
      else if (isProneNow) baseSpeed = 2;
      else if (isCrouchingNow) baseSpeed = 4.5;
      
      const targetSpeed = baseSpeed * speedScale;
      // Start out slower, accelerate slowly
      let accelFactor = isSwimmingNow ? 3 : 6.0; 
      // Deceleration is faster
      let decelFactor = isSwimmingNow ? 6.0 : 12.0;

      if (!state.isGrounded && !isSwimmingNow) {
         accelFactor = 1.0; // Less horizontal push correction in air
         decelFactor = 0.1; // Very little air drag so they retain jump momentum
      }

      if (moveVec.lengthSq() > 0.01) {
        // Lock player head orientation yaw
        playerDirectionAngle = Math.atan2(moveVec.x, moveVec.z);
        // Interpolate velocity
        state.velocity.lerp(moveVec.multiplyScalar(targetSpeed), dt * accelFactor);
        state.speed = state.velocity.length();

        // Animate legs run cycle
        if (state.jumpPhase === JumpPhase.IDLE || state.jumpPhase === JumpPhase.PUSHING) {
          state.jumpPhase = JumpPhase.RUNNING;
        }
      } else {
        // Slow down to a stop
        state.velocity.lerp(new THREE.Vector3(0, 0, 0), dt * decelFactor);
        state.speed = state.velocity.length();
        if (state.speed < 0.1) {
          state.speed = 0;
          if (state.jumpPhase === JumpPhase.RUNNING || state.jumpPhase === JumpPhase.PUSHING) {
            state.jumpPhase = JumpPhase.IDLE;
          }
        }
      }


      // Align model rotation smoothly to the movement velocity axis
      if (state.speed > 0.1) {
        // Handle wrapping angles cleanly with lerp
        let diff = playerDirectionAngle - playerRootGroup.rotation.y;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        playerRootGroup.rotation.y += diff * dt * 25;
      }

      const waterLevel = -0.5;
      const waterSurfaceY = -2.0;

      // 1. Calculate next horizontal and vertical
      let nextY = state.position.y;
      
      if (isSwimmingNow) {
        // Update player pitch to match velocity
        const totalSpeed = state.velocity.length() || 0.1;
        // Only pitch if we're actively moving, otherwise stay horizontally stable for tread animation
        const pitchTarget = state.speed > 0.2 ? Math.asin(Math.max(-1, Math.min(1, -state.velocity.y / totalSpeed))) : 0;
        playerRootGroup.rotation.x = THREE.MathUtils.lerp(playerRootGroup.rotation.x, pitchTarget, dt * 5);

        // Spacebar or jump button to ascend to surface
        if (keys[' '] || jumpActive || gamepadJump) {
            // Smoothly lift the player up when holding space
            state.velocity.y = THREE.MathUtils.lerp(state.velocity.y, 5.0, dt * 2);
            state.velocity.x *= Math.pow(0.8, dt);
            state.velocity.z *= Math.pow(0.8, dt);
        } else if (state.speed < 0.2) {
            // Gentle buoyancy floating up when not moving
            state.velocity.y = THREE.MathUtils.lerp(state.velocity.y, 1.0, dt * 0.5);
        }

        // Sync vertical velocity for position update
        state.verticalVelocity = state.velocity.y;
        
        nextY += state.verticalVelocity * dt;
        
        // Surface swimming barrier clamp
        if (nextY > waterSurfaceY) {
            nextY = waterSurfaceY;
            if (state.verticalVelocity > 0) {
                state.verticalVelocity = 0;
                state.velocity.y = 0;
            }
        }

        // To jump out of water, wait until at surface and press space to breach
        if (nextY >= waterSurfaceY - 0.1 && (keys[' '] || jumpActive || gamepadJump) && state.jumpPhase === JumpPhase.IDLE) {
            state.jumpPhase = JumpPhase.PREP;
            state.jumpProgress = 0;
        }
        
        if (state.jumpPhase === JumpPhase.PREP) {
          state.jumpProgress += dt;
          if (state.jumpProgress >= 0.05) {
            state.jumpPhase = JumpPhase.LAUNCH;
            state.verticalVelocity = 10.0; // Lower realistic breach jump, not the massive 15.5 land jump
            state.velocity.y = state.verticalVelocity;
            state.isGrounded = false;
            (state as any).isSwimming = false;
          }
        }
      } else {
        // Reset player pitch
        playerRootGroup.rotation.x = THREE.MathUtils.lerp(playerRootGroup.rotation.x, 0, dt * 10);
        
        if (state.jumpPhase === JumpPhase.PREP) {
          state.jumpProgress += dt;
          if (state.jumpProgress >= 0.05) {
            state.jumpPhase = JumpPhase.LAUNCH;
            state.verticalVelocity = 15.5; // snappier, bolder jump
            state.isGrounded = false;
          }
        } else if (!state.isGrounded) {
          state.verticalVelocity -= 45 * dt; // slightly stronger gravity
        } else {
          state.verticalVelocity = 0;
        }
      }
      
      if (!isSwimmingNow || state.jumpPhase === JumpPhase.LAUNCH) {
         nextY += state.verticalVelocity * dt;
      }

      // Apply horizontal displacements
      state.position.addScaledVector(state.velocity, dt);

      // --- MAP BOUNDS CLAMPING (84,000 bounds) ---
      worldGrid.clampPositionToBounds(state.position);

      // --- CHUNK INITIALIZATION & GC PASS ---
      // Make sure active chunks are up to date with new position
      worldGrid.update(state.position);
      const activeChunks = worldGrid.getActiveChunks();

      // --- HORIZONTAL COLLISION DETECTION ---
      for (const chunk of activeChunks.values()) {
        for (const object of chunk.clutterMeshes) {
          if (object.userData.isObstacle === false) continue; // Skip non-obstacles

          const objRadius = object.userData.radius || 0.8;
          let objHeight = object.userData.height || 2.0;
          const combinedRadius = 0.5 + objRadius; // collision cylinder size
          const combinedRadiusSq = combinedRadius * combinedRadius;

          const dx = state.position.x - object.position.x;
          const dz = state.position.z - object.position.z;
          const distanceSq = dx * dx + dz * dz;

          if (distanceSq < combinedRadiusSq && distanceSq > 0.01) {
            let objTop = object.position.y + objHeight;
            if (object.userData.type === 'rock') {
                 const dist = Math.sqrt(distanceSq);
                 const dropOffRatio = Math.min(1.0, Math.pow(dist / combinedRadius, 1.5));
                 objTop -= dropOffRatio * objHeight * 0.35;
            }

            // Check if player is clearly above the obstacle
            // If they are falling onto it, nextY might be slightly below objTop
            if (state.position.y >= objTop - 0.25 || nextY >= objTop - 0.5) {
                // Let the player stand on it, do not push out horizontally
                continue;
            }

            const pushDir = new THREE.Vector3(dx, 0, dz).normalize();
            const currentDist = Math.sqrt(distanceSq);
            const moveOutDist = combinedRadius - currentDist;
            state.position.addScaledVector(pushDir, moveOutDist);

            if (state.speed > 0.1) {
              const movingDot = moveVec.dot(pushDir);
              
              if (movingDot < -0.6) {
                if (state.isGrounded) {
                  state.jumpPhase = JumpPhase.PUSHING;
                  playerDirectionAngle = Math.atan2(-pushDir.x, -pushDir.z);
                  
                  // Slow down sliding against wall when pushing
                  const tangent = new THREE.Vector3(-pushDir.z, 0, pushDir.x);
                  const tangentDot = state.velocity.dot(tangent);
                  state.position.addScaledVector(tangent, -tangentDot * dt * 0.95);
                }
                // Bonk! Stop forward momentum instantly when hitting wall head-on
                state.velocity.set(0, 0, 0);
                state.speed = 0;
              } else {
                // Glancing blow - keep tangential velocity, but cancel out any velocity pointing INTO the rock
                const tangent = new THREE.Vector3(-pushDir.z, 0, pushDir.x);
                // Ensure tangent points in the direction of velocity
                if (state.velocity.dot(tangent) < 0) {
                    tangent.negate();
                }
                const tangentSpeed = Math.abs(state.velocity.dot(tangent));
                
                // Allow a slight friction drag on glancing hits
                state.velocity.copy(tangent).multiplyScalar(tangentSpeed * 0.8);
                state.speed = state.velocity.length();
              }
            }
          }
        }
      }

      // --- VERTICAL COLLISION DETECTION & FLOOR CALCULATION ---
      let floorH = worldGrid.getGroundHeight(state.position.x, state.position.z);
      for (const chunk of activeChunks.values()) {
        for (const object of chunk.clutterMeshes) {
          if (object.userData.isObstacle === false) continue;
          
          const objRadius = object.userData.radius || 0.8;
          let objHeight = object.userData.height || 2.0;
          
          // Require the player to actually be *above* the obstacle to stand on it
          // instead of just touching the 0.5 padded outer collision box
          const standRadius = objRadius + 0.2; // tighter standing bounding box
          const standRadiusSq = standRadius * standRadius;

          const dx = state.position.x - object.position.x;
          const dz = state.position.z - object.position.z;
          const distSq = dx * dx + dz * dz;
          if (distSq < standRadiusSq) {
             let objTop = object.position.y + objHeight;
             if (object.userData.type === 'rock') {
                 const dist = Math.sqrt(distSq);
                 const dropOffRatio = Math.min(1.0, Math.pow(dist / standRadius, 1.5));
                 objTop -= dropOffRatio * objHeight * 0.35;
             }
             
             // Check if we are above the object to step on it.
             // Increased threshold so they don't 'snap' up wildly.
             if (state.position.y >= objTop - 0.5) {
                if (objTop > floorH) {
                  floorH = objTop;
                }
             }
          }
        }
      }

      // Apply vertical changes
      if (!state.isGrounded && state.jumpPhase !== JumpPhase.PREP) {
        if (state.verticalVelocity < 2 && state.jumpPhase === JumpPhase.LAUNCH) {
          state.jumpPhase = JumpPhase.APEX;
        }

        if (nextY <= floorH) {
           nextY = floorH;
           state.verticalVelocity = 0;
           state.isGrounded = true;
           state.jumpPhase = state.speed > 0.1 ? JumpPhase.RUNNING : JumpPhase.IDLE;
        } else if (nextY <= waterSurfaceY && floorH < waterSurfaceY && !isSwimmingNow) {
           // We fell into the water, dampen vertical velocity but do not snap to water level
           state.verticalVelocity *= 0.5;
        }
      } else if (state.isGrounded) {
         // If walking off an edge or swimming upwards from the floor:
         if (nextY > floorH + 0.1) {
             // We are falling or swimming up!
             state.isGrounded = false;
             if (!isSwimmingNow) {
                 state.verticalVelocity = -2;
             }
         } else {
             nextY = floorH;
         }
      }
      state.position.y = nextY;

      // Check if we are swimming 
      (state as any).isSwimming = state.position.y <= waterSurfaceY + 0.1 && worldGrid.getGroundHeight(state.position.x, state.position.z) < waterSurfaceY;

      if ((state as any).isSwimming) {
          state.wetness = 1.0;
      } else if (state.wetness && state.wetness > 0) {
          state.wetness = Math.max(0, state.wetness - dt * 0.05); // Takes 20 seconds to dry
      }

      // Update actual visual group coordinates inside scene
      playerRootGroup.position.copy(state.position);

      // Add gentle bobbing when treading water at the surface
      if ((state as any).isSwimming && state.position.y >= waterSurfaceY - 0.05) {
          playerRootGroup.position.y += Math.sin(globalTime * 3) * 0.08;
          
          if (Math.random() < 0.1 && state.speed > 0.5) {
              const r = ripples.find(rip => rip.userData.age > 0.6);
              if (r) {
                  r.position.set(state.position.x, waterSurfaceY + 0.02, state.position.z);
                  r.userData.age = 0;
                  r.visible = true;
              }
          }
      }

      // Update ripples
      for (const r of ripples) {
          if (r.userData.age <= 0.6) {
              r.userData.age += dt;
              r.scale.setScalar(1 + r.userData.age * 3);
              (r.material as THREE.Material).opacity = 0.5 * (1 - r.userData.age / 0.6);
          } else {
              r.visible = false;
          }
      }

      // Apply wetness effect to character materials
      if (state.wetness && state.wetness > 0) {
          animator.group.traverse((child: any) => {
              if (child.isMesh && child.material) {
                  const material = child.material as THREE.MeshStandardMaterial;
                  if (!material.userData.originalColor) {
                      material.userData.originalColor = material.color.clone();
                      material.userData.originalRoughness = material.roughness;
                  }
                  const origColor = material.userData.originalColor;
                  const origRough = material.userData.originalRoughness !== undefined ? material.userData.originalRoughness : 1.0;
                  
                  // Darken color and reduce roughness when wet
                  const targetColor = origColor.clone().multiplyScalar(1 - state.wetness! * 0.4);
                  material.color.lerp(targetColor, 0.1);
                  material.roughness = THREE.MathUtils.lerp(material.roughness, origRough - (state.wetness! * 0.6), 0.1);
              }
          });
      } else if (state.wetness === 0) {
          animator.group.traverse((child: any) => {
              if (child.isMesh && child.material) {
                  const material = child.material as THREE.MeshStandardMaterial;
                  if (material.userData.originalColor) {
                      material.color.lerp(material.userData.originalColor, 0.1);
                      material.roughness = THREE.MathUtils.lerp(material.roughness, material.userData.originalRoughness, 0.1);
                  }
              }
          });
      }

      lanternLight.position.set(state.position.x, state.position.y + 2, state.position.z);

      // Gradual natural health auto-recovery on green grass plains (regenerate 3 health per second)
      if (state.health < 100) {
        state.health = Math.min(100, state.health + dt * 3.5);
      }

      // Mutate HUD Green Health Scale based trace
      healthFill.scale.x = state.health / 100;
      if (state.health < 25) {
        // Warning flashing when low health
        healthFill.material = hudMaterials.dangerRed;
      } else {
        healthFill.material = hudMaterials.solidGreen;
      }

      // --- CAM ORBIT CAMERA LOGIC ---
      if (camActive) {
        const dx = camCurrentX - camStartX;
        const dy = camCurrentY - camStartY;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > 5) {
          // Analog Stick ratio normalized over standard 45px knob deflection threshold
          const ratioX = Math.min(1, Math.max(-1, dx / 45));
          const ratioY = Math.min(1, Math.max(-1, dy / 45));
          
          // Snappy, incredibly responsive continuous orbital speeds
          cameraYaw -= ratioX * 5.0 * dt;
          cameraPitch = Math.max(-1.4, Math.min(1.4, cameraPitch + ratioY * 1.8 * dt));
        }
      }

      // Keep orbital focus locked on explorer chest height
      const heightScale = animator.targetHeight / 2.2;
      let focalPointHeight = animator.targetHeight * 0.65;
      if (state.isProne) {
        focalPointHeight = animator.targetHeight * 0.15;
      } else if (state.isCrouching) {
        focalPointHeight = animator.targetHeight * 0.42;
      }
      const focalPoint = state.position.clone().add(new THREE.Vector3(0, focalPointHeight, 0));

      // Calculate dynamic distance: Zoom in when looking up or down
      const pitchRatio = Math.abs(cameraPitch) / 1.4;
      const scaledBaseDistance = baseCameraDistance * heightScale;
      let currentCamDist = scaledBaseDistance - ((3.8 * heightScale) * pitchRatio);

      // Dampen the running zoom-out lag specifically for the bulkier character (base_male_0)
      if (animator.currentModelUrl && animator.currentModelUrl.includes('base_male_0')) {
        const speedFactor = Math.min(1.0, state.speed / 18);
        currentCamDist -= speedFactor * 1.25;
      }

      const dynamicOffset = new THREE.Vector3(
        currentCamDist * Math.sin(cameraYaw) * Math.cos(cameraPitch),
        currentCamDist * Math.sin(cameraPitch),
        currentCamDist * Math.cos(cameraYaw) * Math.cos(cameraPitch)
      );
      
      const targetCamPos = focalPoint.clone().add(dynamicOffset);
      camera.position.lerp(targetCamPos, dt * 6.5);
      
      camera.lookAt(focalPoint);

      // Lock our custom warm headlight directly to the camera center
      headLight.position.copy(camera.position);

      // --- UNDERWATER CAMERA FILTER ---
      if (state.position.y < waterSurfaceY - 0.2) {
         // Deep aqua fog and background when submerged
         (scene.fog as THREE.FogExp2).color.setHex(0x082b4a);
         (scene.fog as THREE.FogExp2).density = 0.08;
         (scene.background as THREE.Color).setHex(0x082b4a);
      } else {
         // Above water slate fog
         (scene.fog as THREE.FogExp2).color.setHex(0x050508);
         (scene.fog as THREE.FogExp2).density = 0.015;
         (scene.background as THREE.Color).setHex(0x050508);
      }

      // Apply screen shake effect on collision with stones
      if (cameraShake > 0.01) {
        camera.position.x += (Math.random() - 0.5) * cameraShake * 1.2;
        camera.position.y += (Math.random() - 0.5) * cameraShake * 1.2;
        cameraShake = THREE.MathUtils.lerp(cameraShake, 0, dt * 6);
      }

      // --- ANIMATE VISUAL MASCOT JOINT COMPOSITIONS ---
      animator.update(state, dt);

      // --- RENDER REMOTE PLAYERS ---
      const nowMs = performance.now();
      const nearbyPeers = networkManager.getNearbyPeers(state.position, 500);
      const nearbyPeerIds = new Set(nearbyPeers.map(p => p.id));

      for (const peer of nearbyPeers) {
        const peerId = peer.id;
        if (peerId === networkManager.sessionId) {
          continue; // Extra safeguard to never render our own player as a remote peer
        }
        let remAnim = remoteAnimators.get(peerId);
        if (!remAnim) {
           remAnim = new CharacterAnimator(true);
           scene.add(remAnim.group);
           remAnim.group.position.copy(peer.state.position);
           if (peer.state.animationState) {
              remAnim.currentActionName = peer.state.animationState;
           }
           remAnim.loadModelAndAnimations(peer.state.modelUrl).catch(e => console.error(e));
           remoteAnimators.set(peerId, remAnim);
           peer.animator = remAnim;
        } else if (peer.state.modelUrl && remAnim.currentModelUrl !== peer.state.modelUrl) {
           // Swap model on the fly if they changed characters
           const currentAction = remAnim.currentActionName;
           remAnim.loadModelAndAnimations(peer.state.modelUrl).catch(e => console.error(e));
           remAnim.currentActionName = currentAction;
           peer.animator = remAnim;
        } else {
           peer.animator = remAnim;
        }

        // Interpolate visual positions smoothly
        remAnim.group.position.lerp(peer.state.position, dt * 10);
        
        // Match rotation (shortcut for direction interpolation)
        const targetQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), peer.state.direction || 0);
        remAnim.group.quaternion.slerp(targetQ, dt * 15);
        
        // Step animation
        remAnim.update(peer.state, dt);
        
        // Update Player Nametag
        if (peer.state.displayName) {
           remAnim.updateNametag(peer.state.displayName);
        }

        // Apply Customizations
        remAnim.setCustomization(peer.state.customColor || null, peer.state.customScale || 1.0);
      }
      
      // Cleanup disconnected or distant peers
      remoteAnimators.forEach((anim, peerId) => {
        if (!nearbyPeerIds.has(peerId)) {
          scene.remove(anim.group);
          remoteAnimators.delete(peerId);
        }
      });

      // --- ROTATE COMPASS OVERLAY DIAL ---
      // The compass dial rotation copies camera viewport yaw precisely so that the red arrow always faces absolute North!
      const forwardVec = new THREE.Vector3();
      camera.getWorldDirection(forwardVec);
      const viewHeading = Math.atan2(forwardVec.x, forwardVec.z);
      // Rotate cylinder
      dialCylinder.rotation.y = viewHeading;

      // --- STAMINA NATURAL RECOVERY TICK ---
      if (state.isGrounded && state.jumpPhase !== JumpPhase.PREP) {
        const staminaRegenSpeed = 18;
        currentStamina = Math.min(100, currentStamina + staminaRegenSpeed * dt);
      }

      // --- CHRONO SPEED/FPS & TELEMETRY SYNC ---
      frames++;
      const nowTime = performance.now();
      if (nowTime > lastFpsUpdate + 500) {
        const currentFps = Math.round((frames * 1000) / (nowTime - lastTime));
        setFps(currentFps);
        frames = 0;
        lastTime = nowTime;
        lastFpsUpdate = nowTime;
      }

      // Sync state updates at highly responsive yet resource-friendly 12Hz frame-rate (approx 80ms ticks)
      if (globalTime > lastStateUpdate + 0.08) {
        setHealth(Math.round(state.health));
        setStamina(Math.round(currentStamina));
        setPx(state.position.x);
        setPz(state.position.z);
        setJumpPhase(state.jumpPhase);

        state.direction = playerRootGroup.rotation.y;

        // Network Broadcast
        state.displayName = localStorage.getItem('xyrtania_display_name') || 'Anonymous';
        state.modelUrl = animator.currentModelUrl;
        state.currentAnimation = animator.currentActionName;
        state.animationState = animator.currentActionName;
        state.customColor = animator.customColor || undefined;
        state.customScale = animator.customScale;
        animator.updateNametag(state.displayName);
        networkManager.broadcastState(state);

        // Derive cardinal heading direction
        let deg = Math.round((viewHeading * 180) / Math.PI);
        if (deg < 0) deg += 360;
        setHeadingDegrees(deg);

        const directions = [
          { name: 'N', min: 337.5, max: 22.5 },
          { name: 'NE', min: 22.5, max: 67.5 },
          { name: 'E', min: 67.5, max: 112.5 },
          { name: 'SE', min: 112.5, max: 157.5 },
          { name: 'S', min: 157.5, max: 202.5 },
          { name: 'SW', min: 202.5, max: 247.5 },
          { name: 'W', min: 247.5, max: 292.5 },
          { name: 'NW', min: 292.5, max: 337.5 }
        ];
        let card = 'N';
        for (const d of directions) {
          if (d.name === 'N') {
            if (deg >= d.min || deg < d.max) { card = d.name; break; }
          } else {
            if (deg >= d.min && deg < d.max) { card = d.name; break; }
          }
        }
        setHeading(card);

        // Surrounding dynamic chunks tracker
        const cx = Math.floor((state.position.x + 20) / 40);
        const cz = Math.floor((state.position.z + 20) / 40);
        setChunkCx(cx);
        setChunkCz(cz);

        lastStateUpdate = globalTime;
      }

      // --- 9. DUAL RENDER PASS EXECUTION ---
      // Clear viewport canvas colors
      renderer.clear();

      // PASS 1: Render 3D World (Main scene)
      renderer.render(scene, camera);

      // PASS 2: Render our canvas-primitives HUD overlays on top of the 3D main viewport
      renderer.clearDepth();
      renderer.render(hudScene, hudCamera);
    };

    // Kickstart recursive request frames
    frameId = requestAnimationFrame(gameLoop);

    // Clean up memory allocations on component unmount
    return () => {
      cancelAnimationFrame(frameId);
      networkManager.disconnect();
      networkManagerRef.current = null;
      window.removeEventListener('keydown', keyPressHandler);
      window.removeEventListener('keyup', keyReleaseHandler);
      window.removeEventListener('resize', layoutUI);

      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);

      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);

      worldGrid.disposeAll();
      renderer.dispose();
      
      // Dispose HUD materials
      Object.values(hudMaterials).forEach((m) => m.dispose());
    };
  }, []);

  return (
    <div className={isFakeFullscreen ? "fixed inset-0 z-[99999] w-full h-[100dvh] bg-[#050508] text-slate-300 font-sans overflow-hidden" : "w-screen h-[100dvh] bg-[#050508] text-slate-300 font-sans relative overflow-hidden"}>
      {/* Character Loading Error Banner */}
      {lastLoadError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-950/80 border border-red-500/40 backdrop-blur-md text-red-200 px-4 py-2.5 rounded-lg text-xs font-mono tracking-wide z-[100] shadow-[0_0_15px_rgba(239,68,68,0.25)] flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-ping"></div>
          <span>{lastLoadError}</span>
          <button onClick={() => setLastLoadError(null)} className="text-red-400 hover:text-red-200 ml-2 font-sans text-sm font-bold cursor-pointer">✕</button>
        </div>
      )}

      {/* PWA Cryptographic Identity */}
      <AccountUI 
        netStatus={netStatus}
        netRoomId={netRoomId}
        netEndpoint={netEndpoint}
        netPeersCount={netPeersCount}
        peerNames={peerNames}
        connectionMode={connectionMode}
        onChangeConnectionMode={handleConnectionModeChange}
      />
      
      {/* Gamepad Connection Overlay */}
      {gamepadName && (
        <div className="absolute bottom-4 left-4 bg-black/60 border border-cyan-500/30 backdrop-blur text-cyan-400 px-3 py-1 rounded text-[10px] font-mono tracking-wider z-50 pointer-events-none flex flex-col items-start gap-1">
           <div className="flex items-center gap-1.5">
             <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></div>
             {gamepadName}
           </div>
           <div id="gamepad-debug" className="text-[9px] text-cyan-200/70 whitespace-pre"></div>
        </div>
      )}

      {/* Cinematic Background Grid Underlay */}
      <div className="absolute inset-0 opacity-40 pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #1a1a2e 0%, #050508 100%)' }}></div>
        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(0, 242, 255, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 242, 255, 0.04) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      </div>

      {/* Visual Translucent Virtual Joystick */}
      <div 
        ref={joystickRef}
        className="absolute w-24 h-24 rounded-full bg-black/45 backdrop-blur-md border border-cyan-500/25 shadow-2xl z-40 pointer-events-none transition-opacity duration-150"
        style={{ display: 'none', transform: 'translate(-50%, -50%)' }}
      >
        <div className="absolute inset-2 border border-cyan-400/10 rounded-full"></div>
        <div 
          ref={joystickKnobRef}
          className="absolute w-10 h-10 left-[28px] top-[28px] rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 border border-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.6)] flex items-center justify-center transition-transform duration-75"
        >
          <div className="w-3" style={{ borderTop: '2px solid rgba(255, 255, 255, 0.35)' }}></div>
        </div>
      </div>

      {/* Visual Translucent Virtual Look Joystick */}
      <div 
        ref={lookRef}
        className="absolute w-24 h-24 rounded-full bg-black/45 backdrop-blur-md border border-amber-500/25 shadow-2xl z-40 pointer-events-none transition-opacity duration-150"
        style={{ display: 'none', transform: 'translate(-50%, -50%)' }}
      >
        <div className="absolute inset-2 border border-amber-400/10 rounded-full"></div>
        <div 
          ref={lookKnobRef}
          className="absolute w-10 h-10 left-[28px] top-[28px] rounded-full bg-gradient-to-br from-amber-400 to-orange-500 border border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.6)] flex items-center justify-center transition-transform duration-75"
        >
          <div className="w-3" style={{ borderTop: '2px solid rgba(255, 255, 255, 0.45)' }}></div>
        </div>
      </div>

      {/* HUD UI Elements */}
      <div className="absolute top-4 right-4 z-50 flex gap-2 items-center">
        <button
          onClick={() => setShowCustomizer(!showCustomizer)}
          className={`bg-black/60 border ${showCustomizer ? 'border-cyan-400 text-cyan-300' : 'border-cyan-500/30 text-cyan-400'} p-2 rounded hover:bg-black/80 transition-colors backdrop-blur pointer-events-auto flex items-center justify-center`}
          title="Customize Character"
        >
          <Palette className="w-5 h-5" />
        </button>
        <button
          onClick={() => {
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen().catch((err) => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
              });
            } else {
              if (document.exitFullscreen) {
                document.exitFullscreen();
              }
            }
          }}
          className="bg-black/60 border border-cyan-500/30 text-cyan-400 p-2 rounded hover:bg-black/80 transition-colors backdrop-blur pointer-events-auto flex items-center justify-center"
          title="Toggle Fullscreen"
        >
          <Maximize className="w-5 h-5" />
        </button>
        <button
          onClick={() => switchCharacterRef.current()}
          className="bg-black/60 border border-cyan-500/30 text-cyan-400 px-4 py-2 rounded font-mono text-sm uppercase hover:bg-black/80 transition-colors backdrop-blur pointer-events-auto"
        >
          Switch Character (C)
        </button>
      </div>

      {/* Character Customizer Overlay */}
      {showCustomizer && (
        <div className="absolute top-20 right-4 w-64 bg-black/80 backdrop-blur-md border border-cyan-500/30 rounded-lg p-4 z-50 pointer-events-auto flex flex-col gap-4 shadow-2xl">
          <div className="flex justify-between items-center border-b border-cyan-500/30 pb-2">
            <h3 className="text-cyan-400 font-mono text-sm uppercase tracking-wider">Customizer</h3>
            <button onClick={() => setShowCustomizer(false)} className="text-cyan-500 hover:text-cyan-300">
              ✕
            </button>
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="text-xs text-cyan-200 font-mono tracking-wide">Skin Color</label>
            <div className="flex gap-2">
              <input 
                type="color" 
                value={customColor} 
                onChange={(e) => setCustomColor(e.target.value)}
                className="w-full h-8 rounded cursor-pointer bg-transparent border border-cyan-500/50"
              />
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="text-xs text-cyan-200 font-mono tracking-wide flex justify-between">
              <span>Height / Scale</span>
              <span>{customScale.toFixed(2)}x</span>
            </label>
            <input 
              type="range" 
              min="0.5" 
              max="1.5" 
              step="0.05"
              value={customScale}
              onChange={(e) => setCustomScale(parseFloat(e.target.value))}
              className="w-full accent-cyan-400"
            />
          </div>

          <div className="border-t border-cyan-500/30 pt-3 flex flex-col gap-2">
            <label className="text-xs text-cyan-200 font-mono tracking-wide flex justify-between">
              <span>Graphics Quality</span>
              <span className="text-[10px] text-cyan-400 uppercase font-bold">{graphicsQuality}</span>
            </label>
            <div className="grid grid-cols-3 gap-1 bg-black/40 p-1 rounded border border-cyan-500/20">
              {(['low', 'medium', 'high'] as const).map((q) => (
                <button
                  key={q}
                  onClick={() => setGraphicsQuality(q)}
                  className={`py-1 text-[10px] font-mono uppercase rounded transition-all cursor-pointer ${
                    graphicsQuality === q
                      ? 'bg-cyan-500 text-black font-bold shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                      : 'text-cyan-400 hover:bg-cyan-500/10'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
            <p className="text-[9px] text-cyan-200/50 leading-normal">
              Adjusts WebGL internal scaling and shadows to maintain 60 FPS on high-DPI displays.
            </p>
          </div>
        </div>
      )}

      {/* Main Viewport Content - WebGL Canvas inside the underlaid layout */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full block select-none touch-none cursor-pointer pointer-events-auto"
          style={{ width: '100%', height: '100%', display: 'block' }}
          id="game-canvas"
        />
      </div>
    </div>
  );
}
