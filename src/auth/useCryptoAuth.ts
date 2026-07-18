import { useState, useEffect } from 'react';
import { CryptoAuth, AuthSession } from './CryptoAuth';

export function useCryptoAuth() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [displayName, setDisplayName] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  useEffect(() => {
    // On load, fetch existing or create new session (Serverless PWA friendly - no standard signup)
    const init = CryptoAuth.initSession();
    setSession(init);
    
    // Load local display name if it exists (acting as quick cache before we'd normally fetch from Cloudflare)
    const savedName = localStorage.getItem('xyrtania_display_name');
    if (savedName) {
      setDisplayName(savedName);
    } else {
      const generated = 'Anonymous ' + Math.floor(Math.random() * 1000);
      setDisplayName(generated);
      localStorage.setItem('xyrtania_display_name', generated);
    }

    // Attempt to fetch fresh identity from the server
    const fetchIdentity = async () => {
      if (init && init.playerId) {
        try {
          const res = await CryptoAuth.fetchCharacter(init.playerId);
          if (res && res.success && res.character && res.character.displayName) {
             setDisplayName(res.character.displayName);
             localStorage.setItem('xyrtania_display_name', res.character.displayName);
             localStorage.setItem('xyrtania_setup_complete', 'true');
             
             // Restore customization if present
             if (res.character.customColor) localStorage.setItem('xy_customColor', res.character.customColor);
             if (res.character.customScale) localStorage.setItem('xy_customScale', res.character.customScale);
             if (res.character.torsoVisible) localStorage.setItem('xy_torsoVisible', res.character.torsoVisible);
             if (res.character.morphTargets) localStorage.setItem('xy_morphTargets', res.character.morphTargets);
             if (res.character.headStyle) localStorage.setItem('xy_headStyle', res.character.headStyle);
          }
        } catch (e) {
          console.warn('Failed to fetch character data:', e);
        }
      }
    };
    fetchIdentity();
  }, []);

  // 5-minute background sync timer
  useEffect(() => {
    if (!session || !displayName) return;
    
    const intervalId = setInterval(() => {
      console.log("Triggering 5-minute background Cloudflare auto-sync...");
      updateCharacter({ displayName, level: 1, gold: Math.floor(Math.random() * 100), currentChunk: '0,0' });
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(intervalId);
  }, [session, displayName]);

  const recover = async (phrase: string): Promise<boolean> => {
    const recoveredSession = CryptoAuth.recoverFromPassphrase(phrase);
    if (recoveredSession) {
      setSession(recoveredSession);
      try {
        const res = await CryptoAuth.fetchCharacter(recoveredSession.playerId);
        if (res && res.success && res.character && res.character.displayName) {
          setDisplayName(res.character.displayName);
          localStorage.setItem('xyrtania_display_name', res.character.displayName);
          localStorage.setItem('xyrtania_setup_complete', 'true');
          
          if (res.character.customColor) localStorage.setItem('xy_customColor', res.character.customColor);
          if (res.character.customScale) localStorage.setItem('xy_customScale', res.character.customScale);
          if (res.character.torsoVisible) localStorage.setItem('xy_torsoVisible', res.character.torsoVisible);
          if (res.character.morphTargets) localStorage.setItem('xy_morphTargets', res.character.morphTargets);
          if (res.character.headStyle) localStorage.setItem('xy_headStyle', res.character.headStyle);
        }
      } catch(e) {
        console.warn('Failed to fetch recovered character', e);
      }
      return true;
    }
    return false;
  };

  const createNew = () => {
    const newSession = CryptoAuth.generateNewSession();
    setSession(newSession);
  };
  
  const resetLocal = () => {
    CryptoAuth.clearSession();
    setSession(null);
  };

  const updateCharacter = async (stats: any) => {
    if (!session) return;
    
    // Inject customization into stats payload for Cloudflare
    stats.customColor = localStorage.getItem('xy_customColor');
    stats.customScale = localStorage.getItem('xy_customScale');
    stats.torsoVisible = localStorage.getItem('xy_torsoVisible');
    stats.morphTargets = localStorage.getItem('xy_morphTargets');
    stats.headStyle = localStorage.getItem('xy_headStyle');

    
    // Auto-update display name if passed
    if (stats.displayName) {
      setDisplayName(stats.displayName);
      localStorage.setItem('xyrtania_display_name', stats.displayName);
    }
    
    setIsSyncing(true);
    await CryptoAuth.registerOrUpdateCharacter(stats, session.privateKey);
    setLastSyncTime(Date.now());
    setIsSyncing(false);
  };

  return { session, displayName, isSyncing, lastSyncTime, recover, createNew, updateCharacter, resetLocal };
}
