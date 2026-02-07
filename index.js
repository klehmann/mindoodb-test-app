// Set up global error handler to catch module loading errors
const originalErrorHandler = global.ErrorUtils?.getGlobalHandler?.();
global.ErrorUtils = global.ErrorUtils || {};
global.ErrorUtils.setGlobalHandler = global.ErrorUtils.setGlobalHandler || function() {};
global.ErrorUtils.getGlobalHandler = global.ErrorUtils.getGlobalHandler || function() { return originalErrorHandler; };

// CRITICAL: Install atob/btoa polyfills FIRST
// JavaScriptCore (iOS) doesn't have these functions built-in
// They are needed by @automerge/automerge/automerge.wasm.base64.js to decode the base64 WASM
// Using pure JavaScript implementation to work in Expo Go (no native module required)

const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

// atob: decode base64 string to ASCII string
function atobPolyfill(input) {
  if (typeof input !== 'string') {
    throw new TypeError('Expected string');
  }
  // Remove any whitespace
  const str = input.replace(/[\s]/g, '');
  if (str.length % 4 !== 0) {
    throw new Error('Invalid base64 string');
  }

  let output = '';
  for (let i = 0; i < str.length; i += 4) {
    const a = base64Chars.indexOf(str.charAt(i));
    const b = base64Chars.indexOf(str.charAt(i + 1));
    const c = base64Chars.indexOf(str.charAt(i + 2));
    const d = base64Chars.indexOf(str.charAt(i + 3));

    if (a === -1 || b === -1 || c === -1 || d === -1) {
      throw new Error('Invalid base64 character');
    }

    output += String.fromCharCode((a << 2) | (b >> 4));
    if (c !== 64) {
      output += String.fromCharCode(((b & 15) << 4) | (c >> 2));
    }
    if (d !== 64) {
      output += String.fromCharCode(((c & 3) << 6) | d);
    }
  }
  return output;
}

// btoa: encode ASCII string to base64 string
function btoaPolyfill(input) {
  if (typeof input !== 'string') {
    throw new TypeError('Expected string');
  }

  let output = '';
  for (let i = 0; i < input.length; i += 3) {
    const a = input.charCodeAt(i);
    const b = i + 1 < input.length ? input.charCodeAt(i + 1) : 0;
    const c = i + 2 < input.length ? input.charCodeAt(i + 2) : 0;

    output += base64Chars.charAt(a >> 2);
    output += base64Chars.charAt(((a & 3) << 4) | (b >> 4));
    output += i + 1 < input.length ? base64Chars.charAt(((b & 15) << 2) | (c >> 6)) : '=';
    output += i + 2 < input.length ? base64Chars.charAt(c & 63) : '=';
  }
  return output;
}

// Install on all global objects to ensure availability everywhere
if (typeof global.atob === 'undefined') {
  global.atob = atobPolyfill;
}
if (typeof global.btoa === 'undefined') {
  global.btoa = btoaPolyfill;
}

// Also set on globalThis (modern JavaScript standard)
if (typeof globalThis !== 'undefined') {
  if (typeof globalThis.atob === 'undefined') {
    globalThis.atob = atobPolyfill;
  }
  if (typeof globalThis.btoa === 'undefined') {
    globalThis.btoa = btoaPolyfill;
  }
}

// Also set on window if it exists (for browser-style code)
if (typeof window !== 'undefined') {
  if (typeof window.atob === 'undefined') {
    window.atob = atobPolyfill;
  }
  if (typeof window.btoa === 'undefined') {
    window.btoa = btoaPolyfill;
  }
}

console.log('Installed atob/btoa polyfills (pure JS) on global, globalThis, and window');

// Override console.error to capture more details
const originalConsoleError = console.error;
console.error = function(...args) {
  originalConsoleError.apply(console, args);
  // If it's a decode error, log extra details
  const errorStr = args.join(' ');
  if (errorStr.includes('decode') || errorStr.includes('Cannot read property')) {
    console.log('=== DETAILED ERROR ANALYSIS ===');
    console.log('TextDecoder type:', typeof TextDecoder);
    console.log('TextDecoder value:', TextDecoder);
    if (typeof TextDecoder !== 'undefined') {
      console.log('TextDecoder.prototype:', TextDecoder.prototype);
      console.log('TextDecoder.prototype.decode:', TextDecoder.prototype?.decode);
    }
    console.log('Error args:', args);
    const stackArg = args.find(arg => arg?.stack);
    if (stackArg) {
      console.log('Stack:', stackArg.stack);
    }
  }
};

// Load polyfills FIRST - order matters!
// CRITICAL: TextDecoder MUST be available before URL polyfill loads
import { polyfillWebCrypto } from 'expo-standard-web-crypto';

// Install react-native-quick-crypto polyfills if available
try {
  const quickCrypto = require('react-native-quick-crypto');
  if (typeof quickCrypto.install === 'function') {
    quickCrypto.install();
    console.log('react-native-quick-crypto install() called');
  }
} catch (quickCryptoError) {
  console.warn('react-native-quick-crypto install() not available:', quickCryptoError.message);
}

// Set up Web Crypto API with subtle support for React Native
try {
  // First, set up basic crypto (getRandomValues)
  if (typeof window !== 'undefined') {
    polyfillWebCrypto();
    console.log('Called polyfillWebCrypto() for getRandomValues');
  }

  // Note: react-native-webview-crypto requires a React component to be rendered
  // It will automatically set up global.crypto.subtle when the WebView initializes
  // We'll handle this in App.js by rendering the PolyfillCrypto component
  if (typeof window !== 'undefined') {
    try {
      const { Platform } = require('react-native');
      if (Platform.OS !== 'web') {
        // Just require it to set up the global.crypto.subtle object
        // The actual WebView will be rendered in App.js
        require('react-native-webview-crypto');
        console.log('react-native-webview-crypto module loaded (WebView will be rendered in App)');
      } else {
        console.log('Running on web - using native Web Crypto API');
      }
    } catch (webviewCryptoError) {
      console.warn('react-native-webview-crypto not available, subtle API may not work:', webviewCryptoError.message);
      // Continue - some operations might still work
    }
  }
} catch (cryptoPolyfillError) {
  console.error('Failed to set up crypto polyfills:', cryptoPolyfillError);
  // Continue - might work with just getRandomValues for some operations
}

// Set up TextDecoder polyfill FIRST - URL polyfill needs it
// CRITICAL: Must be set up BEFORE any URL parsing happens
try {
  // Load text-encoding and ensure it's available globally
  const textEncoding = require('text-encoding');

  // Set up TextDecoder/TextEncoder on all possible global objects
  if (textEncoding.TextDecoder) {
    global.TextDecoder = textEncoding.TextDecoder;
    global.TextEncoder = textEncoding.TextEncoder;

    // Also set on globalThis if available
    if (typeof globalThis !== 'undefined') {
      globalThis.TextDecoder = textEncoding.TextDecoder;
      globalThis.TextEncoder = textEncoding.TextEncoder;
    }

    // Also set on window if available
    if (typeof window !== 'undefined') {
      window.TextDecoder = textEncoding.TextDecoder;
      window.TextEncoder = textEncoding.TextEncoder;
    }

    console.log('TextDecoder polyfill loaded and set globally');
    console.log('TextDecoder available on global:', typeof global.TextDecoder);
    console.log('TextDecoder available on globalThis:', typeof globalThis?.TextDecoder);

    // Verify it's actually callable
    try {
      const testDecoder = new global.TextDecoder();
      const testResult = testDecoder.decode(new Uint8Array([72, 101, 108, 108, 111])); // "Hello"
      console.log('TextDecoder test successful:', testResult === 'Hello');
    } catch (testError) {
      console.error('TextDecoder test failed:', testError);
    }
  } else {
    throw new Error('text-encoding module did not export TextDecoder');
  }
} catch (polyfillError) {
  console.error('Failed to load text-encoding polyfill:', polyfillError);
  console.error('Stack:', polyfillError.stack);
  throw polyfillError; // Don't continue without TextDecoder
}

// Verify punycode is available (needed by whatwg-url-without-unicode)
try {
  const punycode = require('punycode');
  console.log('punycode loaded:', typeof punycode);
  console.log('punycode.ucs2:', typeof punycode?.ucs2);
  console.log('punycode.ucs2.decode:', typeof punycode?.ucs2?.decode);

  if (!punycode || !punycode.ucs2 || !punycode.ucs2.decode) {
    console.error('punycode.ucs2 is not available!');
    console.error('punycode:', punycode);
  } else {
    // Test it works
    try {
      const testResult = punycode.ucs2.decode('abc');
      console.log('punycode.ucs2.decode test successful:', Array.isArray(testResult));
    } catch (testError) {
      console.error('punycode.ucs2.decode test failed:', testError);
    }
  }
} catch (punycodeError) {
  console.error('Failed to load punycode:', punycodeError);
  console.error('Stack:', punycodeError.stack);
}

// Now load URL polyfill - it needs TextDecoder and punycode to be available
try {
  require('react-native-url-polyfill/auto');
  console.log('URL polyfill loaded');
} catch (urlPolyfillError) {
  console.error('Failed to load URL polyfill:', urlPolyfillError);
  console.error('Stack:', urlPolyfillError.stack);
  // Don't throw - URL might work without the polyfill in some cases
}

// Ensure crypto is available on window for BrowserCryptoAdapter
// expo-standard-web-crypto should set it up, but let's make sure it's on window
if (typeof window !== 'undefined') {
  // Check if crypto is available globally (from expo-standard-web-crypto)
  if (typeof crypto !== 'undefined') {
    // Set it on window if not already there
    if (!window.crypto) {
      window.crypto = crypto;
      console.log('Set window.crypto from global crypto');
    }

    // Also ensure it's on global
    if (typeof global !== 'undefined' && !global.crypto) {
      global.crypto = crypto;
    }

    // Also on globalThis
    if (typeof globalThis !== 'undefined' && !globalThis.crypto) {
      globalThis.crypto = crypto;
    }
  } else {
    console.error('crypto is not available globally after importing expo-standard-web-crypto!');
  }

  // Verify crypto is available
  console.log('crypto available on window:', typeof window.crypto);
  console.log('crypto.subtle available:', typeof window.crypto?.subtle);
  console.log('crypto.getRandomValues available:', typeof window.crypto?.getRandomValues);

  // Check if subtle is missing and provide helpful error
  if (window.crypto && !window.crypto.subtle) {
    console.warn('window.crypto.subtle is not available!');
    console.warn('This is required for MindooDB. You need to install react-native-webview-crypto');
    console.warn('Run: npm install react-native-webview react-native-webview-crypto');
    console.warn('Then restart your dev server.');
  }
}

// ============================================================================
// Initialize Automerge with NATIVE Rust backend (no WASM needed!)
// ============================================================================
console.log('=== Initializing Automerge with native Rust backend ===');

try {
  // Import the native adapter
  const { nativeApi } = require('react-native-automerge-generated');
  console.log('Native automerge adapter loaded');

  // Import slim automerge and call UseApi
  const AutomergeSlim = require('@automerge/automerge/slim');
  console.log('Automerge slim loaded');

  AutomergeSlim.use(nativeApi);
  console.log('use(nativeApi) called - Automerge now using native Rust backend');

  // Quick verification
  console.log('[verification] About to call init()...');
  const doc = AutomergeSlim.init();
  console.log('[verification] init() returned, typeof:', typeof doc);
  console.log('[verification] STATE symbol present:', !!doc[Symbol.for('_am_meta')]);
  console.log('[verification] OBJECT_ID symbol present:', !!doc[Symbol.for('_am_objectId')]);
  console.log('[verification] OBJECT_ID value:', doc[Symbol.for('_am_objectId')]);
  console.log('[verification] STATE value:', doc[Symbol.for('_am_meta')] ? 'present' : 'missing');

  console.log('[verification] About to call change()...');

  // Manually check what _obj() would return
  const OBJECT_ID = Symbol.for('_am_objectId');
  const objIdFromSymbol = Reflect.get(doc, OBJECT_ID);
  console.log('[verification] Reflect.get(doc, OBJECT_ID):', objIdFromSymbol);
  console.log('[verification] objIdFromSymbol === "_root":', objIdFromSymbol === '_root');
  console.log('[verification] objIdFromSymbol !== "_root":', objIdFromSymbol !== '_root');

  const doc2 = AutomergeSlim.change(doc, d => { d.test = 'native works'; });
  const saved = AutomergeSlim.save(doc2);
  const loaded = AutomergeSlim.load(saved);
  console.log('Native automerge verification: init/change/save/load OK, bytes:', saved.length);

  console.log('=== Automerge native backend ready ===');
} catch (nativeInitError) {
  console.error('=== ERROR DURING NATIVE AUTOMERGE INITIALIZATION ===');
  console.error('Error message:', nativeInitError.message);
  console.error('Error name:', nativeInitError.name);
  console.error('Stack trace:', nativeInitError.stack);
  throw nativeInitError;
}

// Register the app
try {
  console.log('About to import registerRootComponent...');
  const registerRootComponent = require('expo/src/launch/registerRootComponent').default;
  console.log('registerRootComponent imported:', typeof registerRootComponent);

  console.log('About to import App...');
  const App = require('./App').default;
  console.log('App imported:', typeof App);

  console.log('About to register app...');
  registerRootComponent(App);
  console.log('App registered successfully!');
} catch (error) {
  console.error('=== ERROR DURING APP REGISTRATION ===');
  console.error('Error message:', error.message);
  console.error('Error name:', error.name);
  console.error('Full error:', error);
  console.error('Stack trace:', error.stack);

  // Try to get more details about the decode error
  if (error.message && error.message.includes('decode')) {
    console.error('=== DECODE ERROR DETAILS ===');
    console.error('This appears to be a TextDecoder.decode() error');
    console.error('TextDecoder available:', typeof TextDecoder);
    if (typeof TextDecoder !== 'undefined') {
      console.error('TextDecoder prototype:', TextDecoder.prototype);
      console.error('TextDecoder.decode available:', typeof TextDecoder.prototype.decode);
    }
  }

  // Re-throw to show the error
  throw error;
}
