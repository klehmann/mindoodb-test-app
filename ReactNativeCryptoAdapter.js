/**
 * React Native Crypto Adapter for MindooDB
 * 
 * Auto-detects and uses the best available crypto implementation:
 * 1. react-native-quick-crypto (native, fast) - for dev builds and production
 * 2. ExpoGoCryptoAdapter (JS-only, slower) - fallback for Expo Go
 * 
 * This allows the app to work in both Expo Go and native builds.
 */

let subtle, getRandomValues;
let quickCryptoAvailable = false;
let ExpoGoCryptoAdapter = null;

// Try to load react-native-quick-crypto (native implementation)
try {
  const quickCrypto = require('react-native-quick-crypto');
  subtle = quickCrypto.subtle;
  getRandomValues = quickCrypto.getRandomValues;
  
  // Check if subtle is actually available (it won't be in Expo Go)
  if (subtle && typeof subtle.generateKey === 'function') {
    quickCryptoAvailable = true;
    console.log('Using react-native-quick-crypto (native implementation)');
  }
} catch (e) {
  // react-native-quick-crypto not available (e.g., in Expo Go)
  quickCryptoAvailable = false;
}

// Try to load ExpoGoCryptoAdapter (JS-only fallback)
if (!quickCryptoAvailable) {
  try {
    const expoCrypto = require('./expo/crypto');
    ExpoGoCryptoAdapter = expoCrypto.ExpoGoCryptoAdapter;
    console.log('Using ExpoGoCryptoAdapter (JavaScript-only implementation for Expo Go)');
  } catch (e) {
    console.error('Failed to load ExpoGoCryptoAdapter:', e);
  }
}

/**
 * React Native Crypto Adapter
 * Auto-selects the best available crypto implementation
 */
export class ReactNativeCryptoAdapter {
  constructor() {
    if (quickCryptoAvailable) {
      // Use native implementation
      this.adapter = null; // We'll use the global subtle/getRandomValues
    } else if (ExpoGoCryptoAdapter) {
      // Use JS-only fallback
      this.adapter = new ExpoGoCryptoAdapter();
    } else {
      throw new Error(
        'No crypto implementation available. ' +
        'Either react-native-quick-crypto (native) or ExpoGoCryptoAdapter (JS) must be available.'
      );
    }
  }

  getSubtle() {
    if (quickCryptoAvailable) {
      if (!subtle) {
        throw new Error('react-native-quick-crypto subtle is not available');
      }
      return subtle;
    } else if (this.adapter) {
      return this.adapter.getSubtle();
    } else {
      throw new Error('No crypto implementation available');
    }
  }

  getRandomValues(array) {
    if (quickCryptoAvailable) {
      if (!getRandomValues) {
        throw new Error('react-native-quick-crypto getRandomValues is not available');
      }
      return getRandomValues(array);
    } else if (this.adapter) {
      return this.adapter.getRandomValues(array);
    } else {
      throw new Error('No crypto implementation available');
    }
  }
}

// Export availability check
export const isQuickCryptoAvailable = quickCryptoAvailable;
