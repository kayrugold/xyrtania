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
      setDisplayName('Anonymous ' + Math.floor(Math.random() * 1000));
    }
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

  const recover = (phrase: string): boolean => {
    const recoveredSession = CryptoAuth.recoverFromPassphrase(phrase);
    if (recoveredSession) {
      setSession(recoveredSession);
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
