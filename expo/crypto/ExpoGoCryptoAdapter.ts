/**
 * Expo Go Crypto Adapter
 * Tries to use native SubtleCrypto if available, otherwise falls back to JavaScript-only implementation
 * Uses pure JS crypto libraries since native modules don't work in Expo Go
 */

import { SubtleCryptoPolyfill } from "./SubtleCryptoPolyfill";
import crypto from "expo-standard-web-crypto";

/**
 * Check if native SubtleCrypto is available and supports RSA key generation
 */
function isNativeSubtleCryptoAvailable(): boolean {
  try {
    // Check if global crypto.subtle exists
    if (typeof globalThis !== 'undefined' && (globalThis as any).crypto?.subtle) {
      const subtle = (globalThis as any).crypto.subtle;
      // Check if it has generateKey method
      if (typeof subtle.generateKey === 'function') {
        console.log('[ExpoGoCryptoAdapter] Native SubtleCrypto detected');
        return true;
      }
    }
    // Also check window.crypto.subtle (for web contexts)
    if (typeof window !== 'undefined' && (window as any).crypto?.subtle) {
      const subtle = (window as any).crypto.subtle;
      if (typeof subtle.generateKey === 'function') {
        console.log('[ExpoGoCryptoAdapter] Native SubtleCrypto detected (window)');
        return true;
      }
    }
  } catch (error) {
    console.log('[ExpoGoCryptoAdapter] Error checking for native SubtleCrypto:', error);
  }
  return false;
}

/**
 * Get native SubtleCrypto if available
 */
function getNativeSubtleCrypto(): SubtleCrypto | null {
  try {
    if (typeof globalThis !== 'undefined' && (globalThis as any).crypto?.subtle) {
      return (globalThis as any).crypto.subtle;
    }
    if (typeof window !== 'undefined' && (window as any).crypto?.subtle) {
      return (window as any).crypto.subtle;
    }
  } catch (error) {
    console.log('[ExpoGoCryptoAdapter] Error getting native SubtleCrypto:', error);
  }
  return null;
}

/**
 * Expo Go Crypto Adapter
 * Tries to use native SubtleCrypto if available, otherwise uses JavaScript-only crypto libraries
 */
export class ExpoGoCryptoAdapter {
  private subtle: SubtleCrypto;
  private isNative: boolean;

  constructor() {
    const nativeSubtle = getNativeSubtleCrypto();
    if (nativeSubtle) {
      this.subtle = nativeSubtle;
      this.isNative = true;
      console.log('[ExpoGoCryptoAdapter] Using native SubtleCrypto (faster)');
    } else {
      this.subtle = new SubtleCryptoPolyfill() as unknown as SubtleCrypto;
      this.isNative = false;
      console.log('[ExpoGoCryptoAdapter] Using JavaScript-only SubtleCrypto polyfill (slower)');
    }
  }

  /**
   * Get the SubtleCrypto interface
   */
  getSubtle(): SubtleCrypto {
    return this.subtle;
  }

  /**
   * Get random values using expo-standard-web-crypto
   */
  getRandomValues(array: Uint8Array): Uint8Array {
    return crypto.getRandomValues(array);
  }

  /**
   * Check if using native SubtleCrypto
   */
  isUsingNativeSubtle(): boolean {
    return this.isNative;
  }
}
