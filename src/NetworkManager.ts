import { joinRoom, Room, MessageAction } from '@trystero-p2p/mqtt';
import { PlayerState } from './types';
import * as THREE from 'three';

export interface RemotePlayer {
  id: string;
  state: PlayerState;
  lastUpdate: number;
}

export class NetworkManager {
  private room: Room;
  public peers: Map<string, RemotePlayer> = new Map();
  
  private stateAction: MessageAction<any>;
  
  public onPeerJoin?: (id: string) => void;
  public onPeerLeave?: (id: string) => void;

  constructor(appId: string, roomName: string) {
    const config = {
      appId,
      rtcConfig: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          },
          {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          },
          {
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          }
        ]
      }
    };
    this.room = joinRoom(config, roomName);
    
    this.room.onPeerJoin = (peerId) => {
      console.log(`Peer joined: ${peerId}`);
      this.peers.set(peerId, {
        id: peerId,
        state: this.createEmptyState(),
        lastUpdate: performance.now()
      });
      if (this.onPeerJoin) this.onPeerJoin(peerId);
    };
    
    this.room.onPeerLeave = (peerId) => {
      console.log(`Peer left: ${peerId}`);
      this.peers.delete(peerId);
      if (this.onPeerLeave) this.onPeerLeave(peerId);
    };
    
    this.stateAction = this.room.makeAction<any>('state');
    
    this.stateAction.onMessage = (data, context) => {
       const peerId = context.peerId;
       const peer = this.peers.get(peerId);
       if (peer) {
          peer.state.position.set(data.position.x, data.position.y, data.position.z);
          peer.state.velocity.set(data.velocity.x, data.velocity.y, data.velocity.z);
          peer.state.isGrounded = data.isGrounded;
          peer.state.speed = data.speed;
          peer.state.verticalVelocity = data.verticalVelocity;
          peer.state.jumpPhase = data.jumpPhase;
          peer.state.jumpProgress = data.jumpProgress;
          peer.state.direction = data.direction;
          (peer.state as any).isSwimming = data.isSwimming;
          
          peer.lastUpdate = performance.now();
       }
    };
  }
  
  public broadcastState(state: PlayerState) {
    // Only broadcast basic scalar/string/array properties to avoid serialization issues
    const syncState = {
       position: { x: state.position.x, y: state.position.y, z: state.position.z },
       velocity: { x: state.velocity.x, y: state.velocity.y, z: state.velocity.z },
       isGrounded: state.isGrounded,
       speed: state.speed,
       verticalVelocity: state.verticalVelocity,
       jumpPhase: state.jumpPhase,
       jumpProgress: state.jumpProgress,
       direction: state.direction,
       isSwimming: (state as any).isSwimming || false
    };
    this.stateAction.send(syncState);
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
      const now = performance.now();
      for (const peer of this.peers.values()) {
         // remove dead peers who haven't updated in 10 seconds
         if (now - peer.lastUpdate > 10000) {
             continue;
         }
         
         const dist = peer.state.position.distanceTo(center);
         if (dist < maxDistance) {
            nearby.push(peer);
         }
      }
      nearby.sort((a, b) => a.state.position.distanceTo(center) - b.state.position.distanceTo(center));
      return nearby.slice(0, 30); // Limiting bubble rendering
  }

  public disconnect() {
      if (this.room) {
          this.room.leave();
      }
  }
}
