import { encodeEdits, decodeEdits } from './TerrainCodec';
import { Client, Room } from 'colyseus.js';
import { PlayerState } from './types';
import * as THREE from 'three';
import { joinRoom, selfId } from '@trystero-p2p/torrent';
import { CryptoAuth } from './auth/CryptoAuth';

export interface RemotePlayer {
  id: string;
  state: PlayerState;
  lastUpdate: number;
  animator?: any;
}

export class NetworkManager {
  private client: Client;
  private room?: Room;
  private p2pRoom?: any;
  private p2pActions?: { sendMove?: any; sendAnimation?: any };
  private appId: string;
  private roomName: string;
  
  public peers: Map<string, RemotePlayer> = new Map();
  private isDisconnected = false;
  private isReconnecting = false;
  
  public connectionMode: 'colyseus_render' | 'colyseus_local' | 'p2p' = 'colyseus_render';
  public status: 'connected' | 'disconnected' | 'reconnecting' = 'disconnected';
  public roomId?: string;
  public serverEndpoint: string;
  
  public onPeerJoin?: (id: string) => void;
  public onPeerLeave?: (id: string) => void;
  public onPeerAnimationStateChange?: (id: string, animationState: string) => void;
  public onPeerDisplayNameChange?: (id: string, displayName: string) => void;
  public onTerrainEdit?: (edits: any[]) => void;
  public onAdminStatus?: (isAdmin: boolean) => void;
  
  public onStatusChange?: (status: 'connected' | 'disconnected' | 'reconnecting', roomId?: string) => void;
  public onPeersChange?: (peersCount: number) => void;
  
  private lastKnownState?: PlayerState;
  private lastSentAnimation?: string;

  public get sessionId(): string | undefined {
    if (this.connectionMode !== 'p2p') {
      return this.room?.sessionId;
    } else {
      return selfId;
    }
  }

  constructor(appId: string, roomName: string) {
    this.appId = appId;
    this.roomName = roomName;
    
    // Retrieve connection mode preference
    let savedMode = localStorage.getItem('xyrtania_connection_mode') as 'colyseus_render' | 'colyseus_local' | 'p2p';
    
    // Support upgrading old 'colyseus' string if it is stored in localStorage
    if (savedMode as any === 'colyseus' || savedMode as any === 'colyseus_render' || savedMode as any === 'p2p') {
      savedMode = 'colyseus_local';
      localStorage.setItem('xyrtania_connection_mode', 'colyseus_local');
    }
    
    if (savedMode === 'p2p') {
      this.connectionMode = 'p2p';
      // Fallback endpoint value just in case
      this.serverEndpoint = 'wss://xyrtania-server.onrender.com';
      this.client = new Client(this.serverEndpoint);
      this.connectToP2P();
    } else if (savedMode === 'colyseus_local') {
      this.connectionMode = 'colyseus_local';
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      this.serverEndpoint = `${protocol}//${window.location.host}`;
      this.client = new Client(this.serverEndpoint);
      this.connectToServer();
    } else {
      // Default to Local Colyseus Server!
      this.connectionMode = 'colyseus_local';
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      this.serverEndpoint = `${protocol}//${window.location.host}`;
      this.client = new Client(this.serverEndpoint);
      this.connectToServer();
    }
  }

  public setConnectionMode(mode: 'colyseus_render' | 'colyseus_local' | 'p2p') {
    if (this.connectionMode === mode) return;
    
    localStorage.setItem('xyrtania_connection_mode', mode);
    this.disconnect();
    
    this.connectionMode = mode;
    this.isDisconnected = false;
    
    if (mode === 'colyseus_render') {
      this.serverEndpoint = 'wss://xyrtania-server.onrender.com';
      this.client = new Client(this.serverEndpoint);
      this.connectToServer();
    } else if (mode === 'colyseus_local') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      this.serverEndpoint = `${protocol}//${window.location.host}`;
      this.client = new Client(this.serverEndpoint);
      this.connectToServer();
    } else {
      this.connectToP2P();
    }
  }

  private async connectToP2P() {
    this.peers.clear();
    if (this.onPeersChange) this.onPeersChange(0);
    this.status = 'reconnecting';
    if (this.onStatusChange) this.onStatusChange(this.status);
    
    try {
      console.log(`Connecting to Trystero P2P Torrent room: ${this.roomName}...`);
      
      const config = { appId: 'xyrtania-world-1' };
      this.p2pRoom = joinRoom(config, this.roomName);
      this.roomId = `p2p-${this.roomName}`;
      this.status = 'connected';
      
      if (this.onStatusChange) this.onStatusChange(this.status, this.roomId);
      
      const [sendMove, getMove] = this.p2pRoom.makeAction('move');
      const [sendAnimation, getAnimation] = this.p2pRoom.makeAction('animation');
      
      this.p2pActions = { sendMove, sendAnimation };
      
      this.p2pRoom.onPeerJoin((peerId: string) => {
        console.log("P2P Player connected:", peerId);
        
        this.peers.set(peerId, {
          id: peerId,
          state: this.createEmptyState(),
          lastUpdate: performance.now()
        });
        
        if (this.lastKnownState) {
          sendMove(this.serializeState(this.lastKnownState), peerId);
        }
        
        if (this.onPeersChange) this.onPeersChange(this.peers.size);
        if (this.onPeerJoin) this.onPeerJoin(peerId);
      });
      
      this.p2pRoom.onPeerLeave((peerId: string) => {
        console.log("P2P Player disconnected:", peerId);
        this.peers.delete(peerId);
        if (this.onPeersChange) this.onPeersChange(this.peers.size);
        if (this.onPeerLeave) this.onPeerLeave(peerId);
      });
      
      getMove((data: any, peerId: string) => {
        let peer = this.peers.get(peerId);
        if (!peer) {
          this.peers.set(peerId, {
            id: peerId,
            state: this.createEmptyState(),
            lastUpdate: performance.now()
          });
          peer = this.peers.get(peerId)!;
          if (this.onPeersChange) this.onPeersChange(this.peers.size);
          if (this.onPeerJoin) this.onPeerJoin(peerId);
        }
        
        peer.lastUpdate = performance.now();
        
        // Apply deserialized state
        if (data.x !== undefined) peer.state.position.x = data.x;
        if (data.y !== undefined) peer.state.position.y = data.y;
        if (data.z !== undefined) peer.state.position.z = data.z;
        if (data.rotation !== undefined) peer.state.direction = data.rotation;
        
        if (data.customColor !== undefined) peer.state.customColor = data.customColor;
        if (data.morphTargets !== undefined) peer.state.morphTargets = data.morphTargets;
        if (data.customScale !== undefined) peer.state.customScale = data.customScale;
        
        if (data.displayName !== undefined && data.displayName !== peer.state.displayName) {
          peer.state.displayName = data.displayName;
          if (this.onPeerDisplayNameChange) {
            this.onPeerDisplayNameChange(peerId, data.displayName);
          }
        }
        
        if (data.avatarId !== undefined) peer.state.modelUrl = data.avatarId;
        
        if (data.animationState !== undefined && data.animationState !== peer.state.animationState) {
          peer.state.animationState = data.animationState;
          if (this.onPeerAnimationStateChange) {
            this.onPeerAnimationStateChange(peerId, data.animationState);
          }
        }
        peer.state.currentAnimation = data.currentAnimation || 'neutral_idle';
        peer.state.isCrouching = !!data.isCrouching;
        peer.state.isProne = !!data.isProne;
      });
      
      getAnimation((data: any, peerId: string) => {
        const peer = this.peers.get(peerId);
        if (peer && data.animationState !== undefined && data.animationState !== peer.state.animationState) {
          peer.state.animationState = data.animationState;
          if (this.onPeerAnimationStateChange) {
            this.onPeerAnimationStateChange(peerId, data.animationState);
          }
        }
      });
      
    } catch (e: any) {
      console.error("P2P Room connection failed:", e);
      this.status = 'disconnected';
      if (this.onStatusChange) this.onStatusChange(this.status);
    }
  }

  private async connectToServer() {
    this.peers.clear(); // Clear any old stale peer references from previous connections
    if (this.onPeersChange) this.onPeersChange(0);
    this.status = 'reconnecting';
    if (this.onStatusChange) this.onStatusChange(this.status);
    
    try {
      const initialDisplayName = localStorage.getItem('xyrtania_display_name') || 'Anonymous';
      const initialAvatarId = '/assets/character/Xyrtania_Male_NoMorphs.glb'; // default

      // Clean up any stale old-format session variables
      localStorage.removeItem('xyrtania_last_room_id');
      localStorage.removeItem('xyrtania_last_session_id');
      
      const session = CryptoAuth.initSession();

      const savedToken = localStorage.getItem('xyrtania_reconnection_token');

      let room: Room;
      if (savedToken) {
        try {
          console.log(`Attempting silent reconnect using stored reconnection token...`);
          room = await this.client.reconnect(savedToken);
          console.log("Successfully reconnected using stored session credentials!");
        } catch (reconnectErr) {
          console.warn("Silent reconnection failed, falling back to join or create:", reconnectErr);
          localStorage.removeItem('xyrtania_reconnection_token');
          room = await this.client.joinOrCreate("xyrtania_room", {
              displayName: initialDisplayName,
              avatarId: initialAvatarId,
              playerId: session.playerId
          });
        }
      } else {
        room = await this.client.joinOrCreate("xyrtania_room", {
            displayName: initialDisplayName,
            avatarId: initialAvatarId,
            playerId: session.playerId
        });
      }

      if (this.isDisconnected) {
          try {
              if (room.connection) room.connection.close();
          } catch(e) {}
          room.leave();
          this.status = 'disconnected';
          if (this.onStatusChange) this.onStatusChange(this.status);
          return;
      }
      this.room = room;
      this.roomId = room.roomId;
      this.status = 'connected';
      if (this.onStatusChange) this.onStatusChange(this.status, this.roomId);
      console.log("Joined colyseus room!", this.room.roomId);

      this.setupRoomListeners(room);

    } catch (e: any) {
      this.status = 'disconnected';
      if (this.onStatusChange) this.onStatusChange(this.status);
      if (!this.isDisconnected) {
          console.warn("Colyseus connection unavailable:", e?.message || e);
      }
    }
  }

  private setupRoomListeners(room: Room) {
      room.onMessage("terrain_edit_error", (data: any) => {
        console.error("Terrain edit rejected by server:", data);
        alert("Terrain edit rejected: " + JSON.stringify(data, null, 2));
        if (this.onAdminStatus) {
            this.onAdminStatus(false);
        }
      });
      room.onMessage("admin_status", (data: any) => {
        if (this.onAdminStatus) {
            this.onAdminStatus(data.isAdmin);
        }
      });
      room.onMessage("TERRAIN_EDIT", (edits: any[]) => {
        if (this.onTerrainEdit) {
          this.onTerrainEdit(edits);
        }
      });
      room.onMessage("TERRAIN_EDIT_BIN", (binaryData: any) => {
        if (this.onTerrainEdit) {
          const edits = decodeEdits(binaryData);
          this.onTerrainEdit(edits);
        }
      });
      
      // Persist reconnection token for mobile/reload silent reconnection
      if (room.reconnectionToken) {
          localStorage.setItem('xyrtania_reconnection_token', room.reconnectionToken);
      }

      room.state.players.onAdd((player: any, sessionId: string) => {
          if (sessionId === room.sessionId) {
              this.peers.delete(sessionId);
              if (this.onPeersChange) this.onPeersChange(this.peers.size);
              return; // Ignore local player
          }
          
          console.log("Player joined:", sessionId);
          this.peers.set(sessionId, {
              id: sessionId,
              state: this.createEmptyState(),
              lastUpdate: performance.now()
          });
          if (this.onPeersChange) this.onPeersChange(this.peers.size);

          const peer = this.peers.get(sessionId)!;
          peer.state.position.set(player.x, player.y, player.z);
          peer.state.direction = player.rotation;
          peer.state.modelUrl = player.avatarId || '/assets/character/Xyrtania_Male_NoMorphs.glb';
          peer.state.displayName = player.displayName;
          peer.state.currentAnimation = player.currentAnimation || 'neutral_idle';
          peer.state.animationState = player.animationState || 'neutral_idle';
          peer.state.isCrouching = player.isCrouching;
          peer.state.isProne = player.isProne;
          try {
              peer.state.morphTargets = player.morphTargetsJson ? JSON.parse(player.morphTargetsJson) : {};
          } catch(e) { peer.state.morphTargets = {}; }

          if (this.onPeerJoin) this.onPeerJoin(sessionId);

          player.onChange(() => {
              const peerToUpdate = this.peers.get(sessionId);
              if (!peerToUpdate) return;
              peerToUpdate.lastUpdate = performance.now();
              
              peerToUpdate.state.position.x = player.x;
              peerToUpdate.state.position.y = player.y;
              peerToUpdate.state.position.z = player.z;
              peerToUpdate.state.direction = player.rotation;
              peerToUpdate.state.modelUrl = player.avatarId || '/assets/character/Xyrtania_Male_NoMorphs.glb';
              
              const oldDisplayName = peerToUpdate.state.displayName;
              peerToUpdate.state.displayName = player.displayName;
              if (player.morphTargetsJson !== undefined) {
                  try {
                      peerToUpdate.state.morphTargets = JSON.parse(player.morphTargetsJson);
                  } catch(e) {}
              }
              if (player.displayName !== undefined && player.displayName !== oldDisplayName) {
                  if (this.onPeerDisplayNameChange) {
                      this.onPeerDisplayNameChange(sessionId, player.displayName);
                  }
              }

              const oldAnim = peerToUpdate.state.animationState;
              peerToUpdate.state.animationState = player.animationState || 'neutral_idle';
              if (player.animationState !== undefined && player.animationState !== oldAnim) {
                  if (this.onPeerAnimationStateChange) {
                      this.onPeerAnimationStateChange(sessionId, player.animationState);
                  }
                  if (peerToUpdate.animator) {
                      const playFn = peerToUpdate.animator.playAction || peerToUpdate.animator.play;
                      if (playFn) {
                          playFn.call(peerToUpdate.animator, player.animationState, 0.25);
                      }
                  }
              }

              peerToUpdate.state.currentAnimation = player.currentAnimation || 'neutral_idle';
              peerToUpdate.state.isCrouching = player.isCrouching;
              peerToUpdate.state.isProne = player.isProne;
          });
      });

      room.state.players.onRemove((player: any, sessionId: string) => {
          console.log("Player left:", sessionId);
          this.peers.delete(sessionId);
          if (this.onPeersChange) this.onPeersChange(this.peers.size);
          if (this.onPeerLeave) this.onPeerLeave(sessionId);
      });

      room.onLeave((code) => {
          console.log("Left room with code:", code);
          this.status = 'disconnected';
          this.roomId = undefined;
          this.peers.clear();
          if (this.onPeersChange) this.onPeersChange(0);
          if (this.onStatusChange) this.onStatusChange(this.status);
          // 1000 is normal/consented close
          if (code !== 1000 && !this.isDisconnected) {
              const token = room.reconnectionToken || localStorage.getItem('xyrtania_reconnection_token');
              if (token) {
                  this.handleReconnection(token);
              } else {
                  this.connectToServer();
              }
          } else {
              localStorage.removeItem('xyrtania_reconnection_token');
          }
      });
  }

  private async handleReconnection(token: string) {
      if (this.isReconnecting || this.isDisconnected) return;
      this.isReconnecting = true;
      this.status = 'reconnecting';
      if (this.onStatusChange) this.onStatusChange(this.status);
      console.log(`Lost connection unexpectedly. Attempting seamless reconnection using reconnection token...`);

      let attempts = 0;
      const maxAttempts = 10; // increase maxAttempts for mobile reconnection resiliency
      
      while (attempts < maxAttempts && !this.isDisconnected) {
          try {
              attempts++;
              console.log(`Reconnection attempt ${attempts}/${maxAttempts}...`);
              const reconnectedRoom = await this.client.reconnect(token);
              
              // Successfully reconnected!
              this.room = reconnectedRoom;
              this.roomId = reconnectedRoom.roomId;
              this.isReconnecting = false;
              this.status = 'connected';
              if (this.onStatusChange) this.onStatusChange(this.status, this.roomId);
              console.log("Successfully reconnected to existing session!");
              
              this.setupRoomListeners(reconnectedRoom);
              return;
          } catch (error) {
              console.warn(`Reconnection attempt ${attempts} failed:`, error);
              // Exponential backoff
              await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, attempts), 5000)));
          }
      }

      this.isReconnecting = false;
      if (!this.isDisconnected) {
          console.log("Reconnection attempts exhausted. Joining or creating a new room session...");
          localStorage.removeItem('xyrtania_reconnection_token');
          this.connectToServer();
      }
  }

  private serializeState(state: PlayerState) {
    const currentAnim = state.animationState || state.currentAnimation || 'neutral_idle';
    return {
        x: typeof state.position.x === 'number' ? state.position.x : 0,
        y: typeof state.position.y === 'number' ? state.position.y : 0,
        z: typeof state.position.z === 'number' ? state.position.z : 0,
        rotation: typeof state.direction === 'number' ? state.direction : 0,
        avatarId: state.modelUrl || "",
        displayName: state.displayName || "Anonymous",
        currentAnimation: currentAnim,
        animationState: currentAnim,
        customColor: state.customColor || "",
        customScale: typeof state.customScale === 'number' ? state.customScale : 1.0,
        isCrouching: !!state.isCrouching,
        morphTargetsJson: JSON.stringify(state.morphTargets || {}),
        morphTargets: state.morphTargets || {},
        isProne: !!state.isProne
    };
  }

  public broadcastState(state: PlayerState) {
    this.lastKnownState = state;
    
    if (this.connectionMode !== 'p2p') {
      if (this.room) {
          const currentAnim = state.animationState || state.currentAnimation || 'neutral_idle';
          if (currentAnim !== this.lastSentAnimation) {
              this.room.send("setAnimation", currentAnim);
              this.lastSentAnimation = currentAnim;
          }

          this.room.send("move", this.serializeState(state));
      }
    } else {
      if (this.p2pActions?.sendMove) {
          const currentAnim = state.animationState || state.currentAnimation || 'neutral_idle';
          if (currentAnim !== this.lastSentAnimation) {
              if (this.p2pActions.sendAnimation) {
                  this.p2pActions.sendAnimation({ animationState: currentAnim });
              }
              this.lastSentAnimation = currentAnim;
          }
          this.p2pActions.sendMove(this.serializeState(state));
      }
    }
  }
  
  private createEmptyState(): PlayerState {
      return {
          position: new THREE.Vector3(),
          velocity: new THREE.Vector3(),
          isGrounded: true,
          speed: 0,
          verticalVelocity: 0,
          jumpPhase: 0,
          jumpProgress: 0,
          isSwimming: false
      } as any;
  }
  
  public getNearbyPeers(center: THREE.Vector3, maxDistance: number): RemotePlayer[] {
      const nearby: RemotePlayer[] = [];
      const localId = this.sessionId;
      for (const peer of this.peers.values()) {
         if (localId && peer.id === localId) {
            continue; // Ensure local player is never returned as a nearby peer
         }
         const dist = peer.state.position.distanceTo(center);
         if (dist < maxDistance) {
            nearby.push(peer);
         }
      }
      nearby.sort((a, b) => a.state.position.distanceTo(center) - b.state.position.distanceTo(center));
      return nearby.slice(0, 30);
  }



  private terrainEditBuffer: Map<string, any> = new Map();
  private terrainEditTimeout: any = null;

  public verifyAdminSecret(secret: string) {
    if (this.room) {
      if (this.connectionMode === 'colyseus_render') {
        // Older Render server doesn't support verify_secret message and will crash.
        // Send a probe TERRAIN_EDIT instead.
        this.room.send("TERRAIN_EDIT", { secret, edits: [] });
        if (this.onAdminStatus) {
            this.onAdminStatus(true);
        }
      } else {
        this.room.send("verify_secret", { secret });
      }
    }
  }

  public sendTerrainEdit(secret: string, edits: any[]) {
    if (this.connectionMode === 'p2p') return;
    
    for (const edit of edits) {
      const key = `${edit.vx}_${edit.vz}`;
      const existing = this.terrainEditBuffer.get(key) || { vx: edit.vx, vz: edit.vz };
      if (edit.h !== undefined) existing.h = edit.h;
      if (edit.c !== undefined) existing.c = edit.c;
      this.terrainEditBuffer.set(key, existing);
    }
    
    if (!this.terrainEditTimeout) {
      this.terrainEditTimeout = setTimeout(() => {
        if (this.room && this.terrainEditBuffer.size > 0) {
          const batchedEdits = Array.from(this.terrainEditBuffer.values());
          // Send edits as JSON for ease to server, server broadcasts as binary.
          // Or we can send binary to server too? For now JSON is fine for client->server,
          // as the payload is small per batch. We keep it as JSON to avoid updating server schema.
          this.room.send("TERRAIN_EDIT", { secret, edits: batchedEdits });
          this.terrainEditBuffer.clear();
        }
        this.terrainEditTimeout = null;
      }, 50); // 20hz batching
    }
  }


  public disconnect() {
      this.isDisconnected = true;
      if (this.room) {
          try {
              if (this.room.connection) this.room.connection.close();
          } catch(e) {}
          this.room.leave();
          this.room = undefined;
      }
      if (this.p2pRoom) {
          try {
              this.p2pRoom.leave();
          } catch (e) {
              console.warn("Error leaving P2P room:", e);
          }
          this.p2pRoom = undefined;
          this.p2pActions = undefined;
      }
  }
}
