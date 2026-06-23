import { Wallet, verifyMessage } from 'ethers';

export interface AuthSession {
  playerId: string;
  privateKey: string;
  mnemonic: string;
}

export class CryptoAuth {
  private static readonly STORAGE_KEY = 'xyrtania_auth_session';

  /**
   * Initializes or loads the cryptographic session.
   * Uses Web Crypto SecureRandom (via ethers under the hood) to generate a secure ECDSA key pair.
   */
  public static initSession(): AuthSession {
    const existing = localStorage.getItem(this.STORAGE_KEY);
    if (existing) {
      try {
        return JSON.parse(existing) as AuthSession;
      } catch (e) {
        console.error('Failed to parse existing local session, creating new one', e);
      }
    }
    return this.generateNewSession();
  }

  /**
   * Generates a completely new 12-word phrase and corresponding ECDSA keypair.
   * Saves to PWA localStorage.
   */
  public static generateNewSession(): AuthSession {
    // Generate a fresh random wallet. This uses underlying secure entropy.
    const wallet = Wallet.createRandom();
    
    if (!wallet.mnemonic) {
      throw new Error('Failed to generate mnemonic');
    }

    const session: AuthSession = {
      playerId: wallet.address,       // Anonymous Public ID
      privateKey: wallet.privateKey,  // Local Private Key
      mnemonic: wallet.mnemonic.phrase // 12-word BIP-39 recovery phrase
    };

    this.saveSession(session);
    return session;
  }

  /**
   * Recovers a session from a 12-word passphrase.
   */
  public static recoverFromPassphrase(phrase: string): AuthSession | null {
    try {
      const wallet = Wallet.fromPhrase(phrase.trim());
      const session: AuthSession = {
        playerId: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: phrase.trim()
      };
      this.saveSession(session);
      return session;
    } catch (error) {
      console.error('Invalid recovery phrase', error);
      return null;
    }
  }

  /**
   * Clears the current session locally.
   */
  public static clearSession() {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  private static saveSession(session: AuthSession) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
  }

  /**
   * Signs a payload exactly as requested for the Cloudflare Worker endpoint.
   * Strict one character per Player ID enforcement happens when we verify the signer's address on the backend.
   */
  public static async signPayload(payload: any, privateKey: string): Promise<{ payload: any; signature: string; timestamp: number; signerId: string }> {
    const wallet = new Wallet(privateKey);
    const timestamp = Date.now();
    const dataToSign = JSON.stringify({ ...payload, timestamp });
    
    const signature = await wallet.signMessage(dataToSign);
    
    return {
      payload,
      signature,
      timestamp,
      signerId: wallet.address
    };
  }

  /**
   * Post to our Cloudflare Pages/Worker backend.
   */
  public static async registerOrUpdateCharacter(characterData: any, privateKey: string) {
    const signedRequest = await this.signPayload(characterData, privateKey);

    console.log('Dispatching to Cloudflare Worker:', signedRequest);
    
    try {
      // In production you would point this to your specific worker domain.
      const workerUrl = import.meta.env.VITE_CF_WORKER_URL || 'http://localhost:8787/api/sync';
      
      const response = await fetch(workerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signedRequest)
      });
      return await response.json();
    } catch (err) {
      console.warn('Could not connect to Cloudflare Worker. Returning fake success locally:', err);
      // Fallback for local development if wrangler is not running
      return { success: true, fakeResponse: true };
    }
  }
}
