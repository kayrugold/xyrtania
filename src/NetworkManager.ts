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
  private pingAction: MessageAction<any>;
  private ackAction: MessageAction<any>;
  
  public onPeerJoin?: (id: string) => void;
  public onPeerLeave?: (id: string) => void;
  
  private lastKnownState?: PlayerState;
  
  private heartbeatInterval: any;
  private cleanupInterval: any;

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
      console.log(`Peer joined (Trystero event): ${peerId}`);
      this.handlePresence(peerId, {});
      
      // If we have an active state to share, we should immediately broadcast to the new peer
      if (this.lastKnownState) {
          this.broadcastState(this.lastKnownState);
      }
    };
    
    this.room.onPeerLeave = (peerId) => {
      console.log(`Peer left (Trystero event): ${peerId}`);
      this.removePeer(peerId);
    };
    
    this.stateAction = this.room.makeAction<any>('state');
    this.pingAction = this.room.makeAction<any>('ping');
    this.ackAction = this.room.makeAction<any>('ack');
    
    this.pingAction.onMessage = (data, context) => {
        const peerId = context.peerId;
        this.handlePresence(peerId, data);
        if (this.lastKnownState) {
            this.ackAction.send({ displayName: this.lastKnownState.displayName }, peerId);
            this.stateAction.send(this.getSyncState(this.lastKnownState), peerId);
        }
    };

    this.ackAction.onMessage = (data, context) => {
        const peerId = context.peerId;
        this.handlePresence(peerId, data);
    };

    this.stateAction.onMessage = (data, context) => {
       const peerId = context.peerId;
       this.handlePresence(peerId, data);
       
       const peer = this.peers.get(peerId);
       if (peer && data && data.position) {
           peer.state.position.set(data.position.x, data.position.y, data.position.z);
           peer.state.velocity.set(data.velocity.x, data.velocity.y, data.velocity.z);
           peer.state.isGrounded = data.isGrounded;
           peer.state.speed = data.speed;
           peer.state.verticalVelocity = data.verticalVelocity;
           peer.state.jumpPhase = data.jumpPhase;
           peer.state.jumpProgress = data.jumpProgress;
           peer.state.direction = data.direction;
           (peer.state as any).isSwimming = data.isSwimming;
       }
    };

    // Heartbeat ping loop (The "Hear Me" Loop)
    this.heartbeatInterval = setInterval(() => {
        if (this.lastKnownState) {
            this.pingAction.send({ displayName: this.lastKnownState.displayName, modelUrl: this.lastKnownState.modelUrl });
        }
    }, 4000);

    // Stale peer cleanup loop
    this.cleanupInterval = setInterval(() => {
        const now = performance.now();
        for (const [peerId, peer] of this.peers.entries()) {
            if (now - peer.lastUpdate > 12000) {
                console.log(`Peer stale, cleaning up: ${peerId}`);
                this.removePeer(peerId);
            }
        }
    }, 5000);
  }

  private handlePresence(peerId: string, data: any) {
      if (!this.peers.has(peerId)) {
          console.log(`Discovered peer via presence/state: ${peerId}`);
          this.peers.set(peerId, {
              id: peerId,
              state: this.createEmptyState(),
              lastUpdate: performance.now()
          });
          const peer = this.peers.get(peerId)!;
          if (data && data.displayName) {
             peer.state.displayName = data.displayName;
          }
          if (data && data.modelUrl) {
             peer.state.modelUrl = data.modelUrl;
          }
          if (this.onPeerJoin) this.onPeerJoin(peerId);
      } else {
          const peer = this.peers.get(peerId)!;
          peer.lastUpdate = performance.now();
          if (data && data.displayName) {
             peer.state.displayName = data.displayName;
          }
          if (data && data.modelUrl) {
             peer.state.modelUrl = data.modelUrl;
          }
      }
  }

  private removePeer(peerId: string) {
      if (this.peers.has(peerId)) {
          this.peers.delete(peerId);
          if (this.onPeerLeave) this.onPeerLeave(peerId);
      }
  }
  
  private getSyncState(state: PlayerState) {
    return {
       displayName: state.displayName,
       modelUrl: state.modelUrl,
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
  }

  public broadcastState(state: PlayerState) {
    this.lastKnownState = state;
    this.stateAction.send(this.getSyncState(state));
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
      return nearby.slice(0, 30); // Limiting bubble rendering
  }

  public disconnect() {
      if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
      if (this.cleanupInterval) clearInterval(this.cleanupInterval);
      if (this.room) {
          this.room.leave();
      }
  }
}
