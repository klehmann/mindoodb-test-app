# MindooDB Test App

Expo React Native test application for MindooDB with **native Automerge backend** (Rust via UniFFI).

## Purpose

Tests the integration of:
- **MindooDB** (`/Users/klehmann/git/mindoodb2`) - local npm link
- **react-native-automerge-generated** (`/Users/klehmann/git/react-native-automerge-generated`) - native Rust Automerge bindings
- **react-native-quick-crypto** (v1.0.7) - native crypto via NitroModules

Uses **Hermes runtime** with native Automerge (no WebAssembly needed).

## Prerequisites

- Node.js 20 (use `nvm use 20`)
- npm or yarn
- Expo CLI (automatically via `npx`)
- Xcode (for iOS builds)
- Android Studio (for Android builds)

## Installation

```bash
npm install
```

## Development

```bash
# Start Expo Development Server
npm start

# For iOS
npm run ios

# For Android
npm run android
```

## Architecture

```
App.js (MindooDB test)
       │
MindooDB (npm link → /Users/klehmann/git/mindoodb2)
       │
@automerge/automerge/slim + UseApi(nativeApi)
       │
react-native-automerge-generated (file: → /Users/klehmann/git/react-native-automerge-generated)
       │
Native Rust Automerge (v0.7.3) via UniFFI + JSI
```

## Testing

The app tests:
1. Tenant creation with encrypted keys
2. User registration in directory
3. Document creation and modification with native Automerge
4. Change iteration and cursor tracking
5. PBKDF2 key derivation (310,000 iterations)
6. Native crypto operations (AES-GCM, RSA, Ed25519)

Run the test via the "Run Test" button in the app.

## Project Structure

- `App.js` - Main component with MindooDB integration test
- `index.js` - Native Automerge initialization + polyfills
- `ReactNativeCryptoAdapter.js` - Crypto adapter for MindooDB
- `app.json` - Expo configuration
- `patches/` - patch-package fixes for react-native and react-native-quick-crypto

## Key Features

- **Native Automerge** - Uses Rust instead of WebAssembly for CRDT operations
- **Hermes compatible** - No JSC WebAssembly requirement
- **Native crypto** - react-native-quick-crypto via NitroModules (patched for JSC ArrayBuffer and randomFillSync fixes)
- **Offline-first** - MindooDB with local content-addressed storage
