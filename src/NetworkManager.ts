import { Client, Room } from 'colyseus.js';
import { PlayerState } from './types';
import * as THREE from 'three';

export interface RemotePlayer {
  id: string;
  state: PlayerState;
  lastUpdate: number;
}

export class NetworkManager {
  private client: Client;
  private room?: Room;
  public peers: Map<string, RemotePlayer> = new Map();
  
  public onPeerJoin?: (id: string) => void;
  public onPeerLeave?: (id: string) => void;
  
  private lastKnownState?: PlayerState;

  constructor(appId: string, roomName: string) {
    // Dynamic endpoint fallback for development vs production
    const endpoint = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
      ? 'ws://localhost:2567' 
      : 'wss://' + window.location.host;
      
    this.client = new Client(endpoint);
    this.connectToServer();
  }

  private async connectToServer() {
    try {
      this.room = await this.client.joinOrCreate("xyrtania_room");
      console.log("Joined colyseus room!", this.room.roomId);

      this.room.state.players.onAdd((player: any, sessionId: string) => {
          if (sessionId === this.room?.sessionId) {
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
          peer.state.modelUrl = player.avatarId;
          peer.state.isCrouching = player.isCrouching;
          peer.state.isProne = player.isProne;

          if (this.onPeerJoin) this.onPeerJoin(sessionId);

          player.onChange((changes: any[]) => {
              const peerToUpdate = this.peers.get(sessionId);
              if (!peerToUpdate) return;
              peerToUpdate.lastUpdate = performance.now();
              
              changes.forEach(change => {
                  if (change.field === 'x') peerToUpdate.state.position.x = change.value;
                  else if (change.field === 'y') peerToUpdate.state.position.y = change.value;
                  else if (change.field === 'z') peerToUpdate.state.position.z = change.value;
                  else if (change.field === 'rotation') peerToUpdate.state.direction = change.value;
                  else if (change.field === 'avatarId') peerToUpdate.state.modelUrl = change.value;
                  else if (change.field === 'isCrouching') peerToUpdate.state.isCrouching = change.value;
                  else if (change.field === 'isProne') peerToUpdate.state.isProne = change.value;
                  // If currentAnimation is needed, we could map it to a new field on state, but
                  // our CharacterAnimator automatically derives animations from velocity and crouch states.
              });
          });
      });

      this.room.state.players.onRemove((player: any, sessionId: string) => {
          console.log("Player left:", sessionId);
          this.peers.delete(sessionId);
          if (this.onPeerLeave) this.onPeerLeave(sessionId);
      });

    } catch (e: any) {
      console.warn("Colyseus connection unavailable (waiting for Render URL):", e?.message || e);
    }
  }

  public broadcastState(state: PlayerState) {
    this.lastKnownState = state;
    
    if (this.room) {
        this.room.send("move", {
            x: state.position.x,
            y: state.position.y,
            z: state.position.z,
            rotation: state.direction,
            avatarId: state.modelUrl,
            currentAnimation: state.isProne ? "prone" : state.isCrouching ? "crouch" : "idle",
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
      for (const peer of this.peers.values()) {
         const dist = peer.state.position.distanceTo(center);
         if (dist < maxDistance) {
            nearby.push(peer);
         }
      }
      nearby.sort((a, b) => a.state.position.distanceTo(center) - b.state.position.distanceTo(center));
      return nearby.slice(0, 30);
  }

  public disconnect() {
      if (this.room) {
          this.room.leave();
      }
  }
}
