// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Enable package exports support for conditional exports (react-native, browser, node)
config.resolver && (config.resolver.unstable_enablePackageExports = true);

// Enable symlink resolution for linked packages
config.resolver && (config.resolver.unstable_enableSymlinks = true);

const mindoodbPath = path.resolve(__dirname, '../../git/mindoodb2');
const automergeGeneratedPath = path.resolve(__dirname, '../../git/react-native-automerge-generated');

// Add local linked packages to watchFolders
config.watchFolders = [
  mindoodbPath,
  automergeGeneratedPath,
];

// Configure resolver to find @babel/runtime in the test app's node_modules
// This ensures Metro can resolve @babel/runtime when it's referenced from mindoodb
const originalResolveRequest = config.resolver.resolveRequest;

config.resolver = {
  ...config.resolver,
  // Add both node_modules directories to resolve modules from linked packages
  nodeModulesPaths: [
    path.resolve(__dirname, 'node_modules'),
    path.resolve(mindoodbPath, 'node_modules'),
  ],
  extraNodeModules: {
    '@babel/runtime': path.resolve(__dirname, 'node_modules/@babel/runtime'),
    'punycode': path.resolve(__dirname, 'node_modules/punycode'),
    'buffer': path.resolve(__dirname, 'node_modules/buffer'),
    // Provide crypto polyfills for React Native build
    'node-forge': path.resolve(__dirname, 'node_modules/node-forge'),
    'tweetnacl': path.resolve(__dirname, 'node_modules/tweetnacl'),
    'expo-standard-web-crypto': path.resolve(__dirname, 'node_modules/expo-standard-web-crypto'),
    // For react-native-automerge-generated (linked package)
    'uniffi-bindgen-react-native': path.resolve(__dirname, 'node_modules/uniffi-bindgen-react-native'),
  },
  // Prefer react-native builds, then browser, then module, then main
  resolverMainFields: ['react-native', 'browser', 'module', 'main'],
  // Resolve platform-specific modules
  platforms: ['ios', 'android', 'native', 'web'],
  // Custom resolver for special cases
  resolveRequest: (context, moduleName, platform) => {
    // Debug: Log resolution attempts from mindoodb reactnative build
    if (context.originModulePath && context.originModulePath.includes('reactnative/crypto')) {
      console.log(`[Metro] Resolving from reactnative/crypto: ${moduleName} (from ${path.basename(context.originModulePath)})`);
    }
    
    // Block any imports from mindoodb's node directory
    if (context.originModulePath && context.originModulePath.includes('mindoodb')) {
      if (moduleName.includes('/node/') || moduleName.includes('\\node\\') || moduleName.includes('dist/node')) {
        console.error(`[Metro] Blocked node import from mindoodb: ${moduleName}`);
        throw new Error(`Cannot import from mindoodb node build in React Native. Use react-native build instead.`);
      }
    }
    
    // Force mindoodb to use react-native build
    if (moduleName === 'mindoodb') {
      const reactNativeBuild = path.resolve(mindoodbPath, 'dist/reactnative/index.js');
      try {
        const fs = require('fs');
        if (fs.existsSync(reactNativeBuild)) {
          console.log(`[Metro] Resolving mindoodb to react-native build: ${reactNativeBuild}`);
          return {
            filePath: reactNativeBuild,
            type: 'sourceFile',
          };
        }
      } catch (e) {
        console.warn(`[Metro] Failed to resolve react-native build for mindoodb:`, e);
      }
    }
    
    // Handle @automerge/automerge imports — resolve to slim.cjs
    // We use UseApi(nativeApi) from react-native-automerge-generated
    // instead of WASM auto-init, so slim.cjs is the correct entry point.
    if (moduleName === '@automerge/automerge' || moduleName.startsWith('@automerge/automerge/')) {
      const automergePath = path.resolve(mindoodbPath, 'node_modules/@automerge/automerge');
      const slimBuild = path.resolve(automergePath, 'dist/cjs/slim.cjs');
      try {
        const fs = require('fs');
        if (fs.existsSync(slimBuild)) {
          return {
            filePath: slimBuild,
            type: 'sourceFile',
          };
        }
      } catch (e) {
        console.warn(`[Metro] Failed to resolve slim build for ${moduleName}:`, e);
      }
    }
    
    // Resolve crypto dependencies from test app's node_modules when imported from mindoodb
    const cryptoDeps = ['node-forge', 'tweetnacl', 'expo-standard-web-crypto'];
    if (cryptoDeps.includes(moduleName) && 
        context.originModulePath && context.originModulePath.includes('mindoodb2')) {
      const modulePath = path.resolve(__dirname, 'node_modules', moduleName);
      try {
        const fs = require('fs');
        const pkgJson = require(path.resolve(modulePath, 'package.json'));
        const mainFile = path.resolve(modulePath, pkgJson.main || 'index.js');
        if (fs.existsSync(mainFile)) {
          console.log(`[Metro] Resolving ${moduleName} for mindoodb: ${mainFile}`);
          return {
            filePath: mainFile,
            type: 'sourceFile',
          };
        }
      } catch (e) {
        console.warn(`[Metro] Failed to resolve ${moduleName}:`, e.message);
      }
    }
    
    // Ensure punycode is available (needed by whatwg-url-without-unicode)
    if (moduleName === 'punycode') {
      const punycodePath = path.resolve(__dirname, 'node_modules/punycode');
      try {
        const fs = require('fs');
        if (fs.existsSync(punycodePath)) {
          const punycodeMain = path.resolve(punycodePath, require(path.resolve(punycodePath, 'package.json')).main || 'punycode.js');
          if (fs.existsSync(punycodeMain)) {
            console.log(`[Metro] Resolving punycode: ${punycodeMain}`);
            return {
              filePath: punycodeMain,
              type: 'sourceFile',
            };
          }
        }
      } catch (e) {
        // Fall through to default resolution
      }
    }
    
    // Use default resolution for other modules
    if (originalResolveRequest) {
      return originalResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
  },
};

// Configure transformer
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

module.exports = config;
