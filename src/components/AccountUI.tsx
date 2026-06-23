import React, { useState, useEffect } from 'react';
import { useCryptoAuth } from '../auth/useCryptoAuth';

export const AccountUI: React.FC = () => {
  const { session, displayName, isSyncing, lastSyncTime, recover, createNew, resetLocal, updateCharacter } = useCryptoAuth();
  const [isRecovering, setIsRecovering] = useState(false);
  const [phraseInput, setPhraseInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [nameInput, setNameInput] = useState('');

  useEffect(() => {
    if (displayName) setNameInput(displayName);
  }, [displayName]);

  if (!session) {
    return null; 
  }

  const handleRecover = () => {
    if (recover(phraseInput)) {
      setIsRecovering(false);
      setPhraseInput('');
      setErrorMsg('');
    } else {
      setErrorMsg('Invalid 12-word passphrase.');
    }
  };

  const handleSyncName = async () => {
    await updateCharacter({ displayName: nameInput, level: 1, gold: 0, currentChunk: '0,0' });
  };

  return (
    <div className="absolute top-4 right-4 z-50 pointer-events-auto flex flex-col items-end gap-2">
      {/* Background Syncing Indicator HUD */}
      {isSyncing && (
        <div className="bg-emerald-900/80 border border-emerald-500 rounded px-3 py-1 flex items-center gap-2 shadow-[0_0_10px_rgba(16,185,129,0.5)]">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping"></div>
          <span className="text-emerald-100 text-xs font-mono">Syncing to Cloudflare D1...</span>
        </div>
      )}

      <div className="bg-black/80 text-white p-4 rounded shadow-lg w-80 text-sm font-mono border border-gray-700">
        <div className="flex justify-between items-start mb-2">
            <h2 className="text-emerald-400 font-bold">PWA Identity (No Email)</h2>
            {lastSyncTime && (
                <span className="text-[10px] text-gray-500" title="Last auto-sync timestamp">
                    Synced: {new Date(lastSyncTime).toLocaleTimeString()}
                </span>
            )}
        </div>
        
        <div className="mb-4">
          <p className="text-gray-400 text-xs">Player ID (Public):</p>
          <p className="truncate text-gray-200 select-all" title={session.playerId}>
            {session.playerId.substring(0, 10)}...{session.playerId.slice(-8)}
          </p>
        </div>
        
        <div className="mb-4 relative">
          <p className="text-gray-400 text-xs mb-1">Display Name (Visible to others):</p>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={nameInput} 
              onChange={(e) => setNameInput(e.target.value)}
              className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white text-xs w-full outline-none"
              placeholder="Enter name..."
            />
            <button 
              onClick={handleSyncName}
              disabled={isSyncing || nameInput === displayName}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 rounded px-2 py-1 text-xs whitespace-nowrap"
            >
              {isSyncing ? '...' : 'Sync CF'}
            </button>
          </div>
        </div>

        {isRecovering ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-yellow-500">Enter your 12-word recovery phrase:</p>
            <textarea
              className="bg-gray-900 border border-gray-600 rounded p-1 text-white text-xs w-full h-16 outline-none resize-none"
              value={phraseInput}
              onChange={(e) => setPhraseInput(e.target.value)}
              placeholder="word word word..."
            />
            {errorMsg && <p className="text-red-400 text-xs">{errorMsg}</p>}
            <div className="flex gap-2">
              <button onClick={handleRecover} className="bg-emerald-600 hover:bg-emerald-500 rounded px-2 py-1 flex-1">Recover</button>
              <button onClick={() => setIsRecovering(false)} className="bg-gray-700 hover:bg-gray-600 rounded px-2 py-1">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="bg-gray-900 p-2 rounded relative group cursor-pointer border border-gray-700">
                <span className="text-xs text-gray-400 absolute -top-2 left-2 bg-black px-1">12-Word Passphrase (Keep Secret)</span>
                <p className="text-xs text-gray-300 select-all leading-tight italic blur-sm hover:blur-none transition-all duration-300 break-words">
                  {session.mnemonic}
                </p>
            </div>
            
            <div className="flex justify-between gap-2">
              <button onClick={() => setIsRecovering(true)} className="bg-blue-600/50 hover:bg-blue-600/80 rounded px-2 py-1 text-xs text-blue-200 border border-blue-800">
                Recover Device
              </button>
              <button onClick={createNew} className="bg-red-900/50 hover:bg-red-700/80 rounded px-2 py-1 text-xs text-red-200 border border-red-800" title="Generates a whole new ID">
                New Identity
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
