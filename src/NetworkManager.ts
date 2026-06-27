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
  private isDisconnected = false;
  
  public onPeerJoin?: (id: string) => void;
  public onPeerLeave?: (id: string) => void;
  
  private lastKnownState?: PlayerState;

  public get sessionId(): string | undefined {
    return this.room?.sessionId;
  }

  constructor(appId: string, roomName: string) {
    // Dynamic endpoint to connect to the current host's embedded Colyseus server
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const endpoint = `${protocol}//${host}`;
      
    this.client = new Client(endpoint);
    this.connectToServer();
  }

  private async connectToServer() {
    try {
      const room = await this.client.joinOrCreate("xyrtania_room");
      if (this.isDisconnected) {
          room.leave();
          return;
      }
      this.room = room;
      console.log("Joined colyseus room!", this.room.roomId);

      this.room.state.players.onAdd((player: any, sessionId: string) => {
          if (sessionId === this.room?.sessionId) {
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
              peerToUpdate.state.isCrouching = player.isCrouching;
              peerToUpdate.state.isProne = player.isProne;
          });
      });

      this.room.state.players.onRemove((player: any, sessionId: string) => {
          console.log("Player left:", sessionId);
          this.peers.delete(sessionId);
          if (this.onPeerLeave) this.onPeerLeave(sessionId);
      });

    } catch (e: any) {
      if (!this.isDisconnected) {
          console.warn("Colyseus connection unavailable:", e?.message || e);
      }
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
