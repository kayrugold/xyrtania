import { Client, Room } from 'colyseus.js';
import { PlayerState } from './types';
import * as THREE from 'three';

export interface RemotePlayer {
  id: string;
  state: PlayerState;
  lastUpdate: number;
  animator?: any;
}

export class NetworkManager {
  private client: Client;
  private room?: Room;
  public peers: Map<string, RemotePlayer> = new Map();
  private isDisconnected = false;
  private isReconnecting = false;
  
  public onPeerJoin?: (id: string) => void;
  public onPeerLeave?: (id: string) => void;
  public onPeerAnimationStateChange?: (id: string, animationState: string) => void;
  public onPeerDisplayNameChange?: (id: string, displayName: string) => void;
  
  private lastKnownState?: PlayerState;
  private lastSentAnimation?: string;

  public get sessionId(): string | undefined {
    return this.room?.sessionId;
  }

  constructor(appId: string, roomName: string) {
    // Fallback to local server on localhost, otherwise connect to user's Render server
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const endpoint = isLocal 
      ? 'ws://localhost:3000' 
      : 'wss://xyrtania-server.onrender.com';
      
    this.client = new Client(endpoint);
    this.connectToServer();
  }

  private async connectToServer() {
    this.peers.clear(); // Clear any old stale peer references from previous connections
    try {
      const initialDisplayName = localStorage.getItem('xyrtania_display_name') || 'Anonymous';
      const initialAvatarId = '/assets/character/base_male.fbx'; // default

      const savedRoomId = localStorage.getItem('xyrtania_last_room_id');
      const savedSessionId = localStorage.getItem('xyrtania_last_session_id');

      let room: Room;
      if (savedRoomId && savedSessionId) {
        try {
          console.log(`Attempting silent reconnect to room: ${savedRoomId}, session: ${savedSessionId}...`);
          room = await this.client.reconnect(savedRoomId, savedSessionId);
          console.log("Successfully reconnected using stored session credentials!");
        } catch (reconnectErr) {
          console.warn("Silent reconnection failed, falling back to join or create:", reconnectErr);
          localStorage.removeItem('xyrtania_last_room_id');
          localStorage.removeItem('xyrtania_last_session_id');
          room = await this.client.joinOrCreate("xyrtania_room", {
              displayName: initialDisplayName,
              avatarId: initialAvatarId
          });
        }
      } else {
        room = await this.client.joinOrCreate("xyrtania_room", {
            displayName: initialDisplayName,
            avatarId: initialAvatarId
        });
      }

      if (this.isDisconnected) {
          room.leave();
          return;
      }
      this.room = room;
      console.log("Joined colyseus room!", this.room.roomId);

      this.setupRoomListeners(room);

    } catch (e: any) {
      if (!this.isDisconnected) {
          console.warn("Colyseus connection unavailable:", e?.message || e);
      }
    }
  }

  private setupRoomListeners(room: Room) {
      // Persist credentials for mobile/reload silent reconnection
      localStorage.setItem('xyrtania_last_room_id', room.roomId);
      localStorage.setItem('xyrtania_last_session_id', room.sessionId);

      room.state.players.onAdd((player: any, sessionId: string) => {
          if (sessionId === room.sessionId) {
              this.peers.delete(sessionId);
              return; // Ignore local player
          }
          
          console.log("Player joined:", sessionId);
          this.peers.set(sessionId, {
              id: sessionId,
              state: this.createEmptyState(),
              lastUpdate: performance.now()
          });

          const peer = this.peers.get(sessionId)!;
          peer.state.position.set(player.x, player.y, player.z);
          peer.state.direction = player.rotation;
          peer.state.modelUrl = player.avatarId || '/assets/character/base_male.fbx';
          peer.state.displayName = player.displayName;
          peer.state.currentAnimation = player.currentAnimation || 'neutral_idle';
          peer.state.animationState = player.animationState || 'neutral_idle';
          peer.state.isCrouching = player.isCrouching;
          peer.state.isProne = player.isProne;

          if (this.onPeerJoin) this.onPeerJoin(sessionId);

          player.onChange(() => {
              const peerToUpdate = this.peers.get(sessionId);
              if (!peerToUpdate) return;
              peerToUpdate.lastUpdate = performance.now();
              
              peerToUpdate.state.position.x = player.x;
              peerToUpdate.state.position.y = player.y;
              peerToUpdate.state.position.z = player.z;
              peerToUpdate.state.direction = player.rotation;
              peerToUpdate.state.modelUrl = player.avatarId || '/assets/character/base_male.fbx';
              
              const oldDisplayName = peerToUpdate.state.displayName;
              peerToUpdate.state.displayName = player.displayName;
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
          if (this.onPeerLeave) this.onPeerLeave(sessionId);
      });

      room.onLeave((code) => {
          console.log("Left room with code:", code);
          // 1000 is normal/consented close
          if (code !== 1000 && !this.isDisconnected) {
              this.handleReconnection(room.roomId, room.sessionId);
          } else {
              localStorage.removeItem('xyrtania_last_room_id');
              localStorage.removeItem('xyrtania_last_session_id');
          }
      });
  }

  private async handleReconnection(roomId: string, sessionId: string) {
      if (this.isReconnecting || this.isDisconnected) return;
      this.isReconnecting = true;
      console.log(`Lost connection unexpectedly. Attempting seamless reconnection for session ${sessionId} in room ${roomId}...`);

      let attempts = 0;
      const maxAttempts = 10; // increase maxAttempts for mobile reconnection resiliency
      
      while (attempts < maxAttempts && !this.isDisconnected) {
          try {
              attempts++;
              console.log(`Reconnection attempt ${attempts}/${maxAttempts}...`);
              const reconnectedRoom = await this.client.reconnect(roomId, sessionId);
              
              // Successfully reconnected!
              this.room = reconnectedRoom;
              this.isReconnecting = false;
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
          this.connectToServer();
      }
  }

  public broadcastState(state: PlayerState) {
    this.lastKnownState = state;
    
    if (this.room) {
        const currentAnim = state.animationState || state.currentAnimation || 'neutral_idle';
        if (currentAnim !== this.lastSentAnimation) {
            this.room.send("setAnimation", currentAnim);
            this.lastSentAnimation = currentAnim;
        }

        this.room.send("move", {
            x: state.position.x,
            y: state.position.y,
            z: state.position.z,
            rotation: state.direction,
            avatarId: state.modelUrl,
            displayName: state.displayName,
            currentAnimation: currentAnim,
            animationState: currentAnim,
            isCrouching: state.isCrouching || false,
            isProne: state.isProne || false
        });
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
      const localId = this.room?.sessionId;
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

  public disconnect() {
      this.isDisconnected = true;
      if (this.room) {
          this.room.leave();
      }
  }
}
