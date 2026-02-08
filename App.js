import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';

// Lazy load MindooDB imports - defer until component mounts to avoid blocking app registration
let BaseMindooTenantFactory, InMemoryContentAddressedStoreFactory, KeyBag, PUBLIC_INFOS_KEY_ID;
let QuickCryptoAdapter = null;
let ReactNativeCryptoAdapter = null;
let VirtualViewFactory, ColumnSorting, TotalMode, VirtualViewDataChange;
let mindoodbLoaded = false;
let mindoodbLoadError = null;
let mindoodbLoading = false;

function loadMindooDB() {
  if (mindoodbLoading || mindoodbLoaded) {
    return;
  }
  mindoodbLoading = true;
  
  try {
    console.log('Loading MindooDB...');
    const mindoodb = require('mindoodb');
    BaseMindooTenantFactory = mindoodb.BaseMindooTenantFactory;
    InMemoryContentAddressedStoreFactory = mindoodb.InMemoryContentAddressedStoreFactory;
    KeyBag = mindoodb.KeyBag;
    PUBLIC_INFOS_KEY_ID = mindoodb.PUBLIC_INFOS_KEY_ID;
    // Keep both adapters available; choose at runtime
    QuickCryptoAdapter = mindoodb.QuickCryptoAdapter;
    ReactNativeCryptoAdapter = mindoodb.ReactNativeCryptoAdapter;
    // Load virtual view classes
    VirtualViewFactory = mindoodb.VirtualViewFactory;
    ColumnSorting = mindoodb.ColumnSorting;
    TotalMode = mindoodb.TotalMode;
    VirtualViewDataChange = mindoodb.VirtualViewDataChange;
    mindoodbLoaded = true;
    console.log('MindooDB loaded successfully');
    console.log('QuickCryptoAdapter:', typeof QuickCryptoAdapter);
    console.log('ReactNativeCryptoAdapter:', typeof ReactNativeCryptoAdapter);
  } catch (error) {
    console.error('Failed to load MindooDB:', error);
    mindoodbLoadError = error;
  } finally {
    mindoodbLoading = false;
  }
}

export default function App() {
  const [testStatus, setTestStatus] = useState('idle'); // idle, running, success, error
  const [testResults, setTestResults] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [fullErrorText, setFullErrorText] = useState('');
  const [mindoodbLoadState, setMindoodbLoadState] = useState({ loaded: mindoodbLoaded, error: mindoodbLoadError });

  // Load MindooDB after component mounts (defer to avoid blocking app registration)
  useEffect(() => {
    if (!mindoodbLoaded && !mindoodbLoading && !mindoodbLoadError) {
      loadMindooDB();
      // Update state after loading attempt (check periodically until loaded or error)
      const checkInterval = setInterval(() => {
        if (mindoodbLoaded || mindoodbLoadError) {
          setMindoodbLoadState({ loaded: mindoodbLoaded, error: mindoodbLoadError });
          clearInterval(checkInterval);
        }
      }, 100);
      
      // Cleanup interval after 5 seconds
      setTimeout(() => clearInterval(checkInterval), 5000);
    }
  }, []);

  // Show error if MindooDB failed to load
  if (!mindoodbLoadState.loaded && mindoodbLoadState.error) {
    return (
      <View style={styles.container}>
        <StatusBar style="auto" />
        <Text style={styles.title}>MindooDB Test App</Text>
        <Text style={styles.errorText}>Failed to load MindooDB:</Text>
        <ScrollView style={styles.resultsScroll}>
          <Text style={styles.resultsText}>
            {mindoodbLoadState.error?.message || 'Unknown error'}{'\n\n'}
            {mindoodbLoadState.error?.stack || ''}
          </Text>
        </ScrollView>
        <Button
          title="Copy Error"
          onPress={async () => {
            try {
              await Clipboard.setStringAsync(
                `MindooDB Load Error:\n${mindoodbLoadState.error?.message || 'Unknown error'}\n\n${mindoodbLoadState.error?.stack || ''}`
              );
              Alert.alert('Copied!', 'Error details copied to clipboard');
            } catch (err) {
              Alert.alert('Error', `Failed to copy: ${err.message}`);
            }
          }}
          color="#FF3B30"
        />
      </View>
    );
  }

  const runTest = async () => {
    setIsRunning(true);
    setTestStatus('running');
    setTestResults('Starting test...\n');
    
    // Validate all imports are available
    console.log('=== Validating Imports ===');
    console.log('BaseMindooTenantFactory:', typeof BaseMindooTenantFactory);
    console.log('InMemoryContentAddressedStoreFactory:', typeof InMemoryContentAddressedStoreFactory);
    console.log('KeyBag:', typeof KeyBag);
    console.log('PUBLIC_INFOS_KEY_ID:', PUBLIC_INFOS_KEY_ID);
    console.log('QuickCryptoAdapter:', typeof QuickCryptoAdapter);
    console.log('ReactNativeCryptoAdapter:', typeof ReactNativeCryptoAdapter);
    
    if (!mindoodbLoadState.loaded) {
      if (mindoodbLoadState.error) {
        throw new Error(`MindooDB modules failed to load: ${mindoodbLoadState.error.message}`);
      }
      throw new Error('MindooDB modules are still loading. Please wait and try again.');
    }
    if (!BaseMindooTenantFactory) {
      throw new Error('BaseMindooTenantFactory is undefined');
    }
    if (!InMemoryContentAddressedStoreFactory) {
      throw new Error('InMemoryContentAddressedStoreFactory is undefined');
    }
    if (!KeyBag) {
      throw new Error('KeyBag is undefined');
    }
    if (!QuickCryptoAdapter || !ReactNativeCryptoAdapter) {
      throw new Error('Crypto adapters are not available');
    }
    console.log('=== All imports validated ===\n');

    try {
      // Setup tenant (similar to test setup)
      setTestResults(prev => prev + 'Step 1: Creating store factory...\n');
      
      let storeFactory;
      try {
        storeFactory = new InMemoryContentAddressedStoreFactory();
        console.log('Step 1: Store factory created');
        setTestResults(prev => prev + 'Step 1: ✓ Store factory created\n');
      } catch (err) {
        throw new Error(`Failed at Step 1 (store factory): ${err.message}`, { cause: err });
      }
      
      setTestResults(prev => prev + 'Step 2: Creating crypto adapter - OS: ' + Platform.OS + '\n');
      
      // Configurable fallback: default is native-only (can be toggled in app.json)
      const allowJsFallback = !!Constants?.expoConfig?.extra?.allowJsCryptoFallback;
      // Use native crypto by default; optionally allow JS fallback
      let cryptoAdapter;
      let quickCrypto;
      try {
        if (allowJsFallback) {
          cryptoAdapter = new ReactNativeCryptoAdapter();
          const isNative = cryptoAdapter.isUsingNativeCrypto;
          console.log('Step 2: ReactNativeCryptoAdapter created, using native crypto:', isNative);
          setTestResults(prev => prev + `Step 2: ✓ ReactNativeCryptoAdapter created (${isNative ? 'native crypto' : 'JS polyfill'})\n`);
          if (!isNative) {
            setTestResults(prev => prev + '⚠️ JS crypto fallback enabled by config\n');
          }
        } else {
          quickCrypto = require('react-native-quick-crypto');
          cryptoAdapter = new QuickCryptoAdapter(quickCrypto);
          console.log('Step 2: QuickCryptoAdapter created (native crypto)');
          setTestResults(prev => prev + 'Step 2: ✓ QuickCryptoAdapter created (native crypto)\n');
        }
        // Log quick-crypto module shape for debugging
        const qc = quickCrypto || require('react-native-quick-crypto');
        const hasSubtle = !!qc?.subtle;
        const hasGenerateKey = typeof qc?.subtle?.generateKey === 'function';
        const hasCreateHash = typeof qc?.createHash === 'function';
        console.log('QuickCrypto module loaded:', {
          hasSubtle,
          hasGenerateKey,
          hasCreateHash,
          keys: Object.keys(qc || {}).slice(0, 10),
        });
        setTestResults(prev => prev + `Step 2: QuickCrypto loaded (subtle: ${hasSubtle}, generateKey: ${hasGenerateKey}, createHash: ${hasCreateHash})\n`);
      } catch (err) {
        console.error('Step 2: Error creating crypto adapter:', err);
        if (allowJsFallback) {
          throw new Error(`Failed at Step 2 (crypto adapter): ${err.message}`, { cause: err });
        }
        throw new Error(
          `Native crypto is required, but QuickCryptoAdapter failed to initialize: ${err.message}`,
          { cause: err }
        );
      }
      
      // Test getSubtle()
      console.log('Step 2: Testing getSubtle()...');
      const subtle = cryptoAdapter.getSubtle();
      console.log('Step 2: getSubtle() returned:', typeof subtle);
      setTestResults(prev => prev + 'Step 2: ✓ getSubtle() works\n');

      // Check ExpoCrypto native module availability
      try {
        const ExpoCrypto = require('expo-crypto');
        const hasGetRandomBytes = typeof ExpoCrypto.getRandomBytesAsync === 'function';
        console.log('ExpoCrypto module loaded:', hasGetRandomBytes ? 'getRandomBytesAsync available' : 'missing getRandomBytesAsync');
        setTestResults(prev => prev + `Step 2: ExpoCrypto ${hasGetRandomBytes ? 'available' : 'missing getRandomBytesAsync'}\n`);
      } catch (expoCryptoError) {
        console.warn('ExpoCrypto module failed to load:', expoCryptoError.message);
        setTestResults(prev => prev + `Step 2: ExpoCrypto not available (${expoCryptoError.message})\n`);
      }

      // Additional native crypto diagnostics (helps detect partial native support)
      if (quickCrypto) {
        setTestResults(prev => prev + 'Step 2: Running native crypto diagnostics...\n');
        try {
          const quickCrypto = require('react-native-quick-crypto');

          // Test Hash.createHash().digest()
          try {
            const hash = quickCrypto.createHash('sha256');
            hash.update('mindoodb-test');
            const digestHex = hash.digest('hex');
            console.log('Native Hash.digest() ok, sha256:', digestHex.slice(0, 16) + '...');
            setTestResults(prev => prev + '  ✓ Hash.digest() works\n');
            setTestResults(prev => prev + '  ✓ Nitro Hash hybrid object registered\n');
          } catch (hashError) {
            console.error('Native Hash.digest() failed:', hashError);
            setTestResults(prev => prev + `  ✗ Hash.digest() failed: ${hashError.message}\n`);
          }

          // Test SubtleCrypto.digest()
          try {
            const data = new Uint8Array([9, 8, 7, 6]);
            await quickCrypto.subtle.digest('SHA-256', data);
            console.log('Native SubtleCrypto.digest() ok');
            setTestResults(prev => prev + '  ✓ SubtleCrypto.digest() works\n');
          } catch (subtleError) {
            console.error('Native SubtleCrypto.digest() failed:', subtleError);
            setTestResults(prev => prev + `  ✗ SubtleCrypto.digest() failed: ${subtleError.message}\n`);
          }

          // Test getRandomValues
          try {
            const buf = new Uint8Array(8);
            quickCrypto.getRandomValues(buf);
            console.log('Native getRandomValues() ok');
            setTestResults(prev => prev + '  ✓ getRandomValues() works\n');
          } catch (rngError) {
            console.error('Native getRandomValues() failed:', rngError);
            setTestResults(prev => prev + `  ✗ getRandomValues() failed: ${rngError.message}\n`);
          }
        } catch (diagError) {
          console.error('Native crypto diagnostics failed to run:', diagError);
          setTestResults(prev => prev + `  ✗ Diagnostics failed: ${diagError.message}\n`);
        }
      }
      
      setTestResults(prev => prev + 'Step 3: Creating BaseMindooTenantFactory...\n');
      
      let factory;
      try {
        factory = new BaseMindooTenantFactory(storeFactory, cryptoAdapter);
        console.log('Step 3: Factory created');
        setTestResults(prev => prev + 'Step 3: ✓ BaseMindooTenantFactory created\n');
      } catch (err) {
        throw new Error(`Failed at Step 3 (factory): ${err.message}`, { cause: err });
      }

      setTestResults(prev => prev + 'Step 4: Creating admin user...\n');
      const adminUserPassword = "adminpass123";
      let adminUser;
      try {
        console.log('Step 4: Testing crypto readiness...');
        const testData = new Uint8Array([1, 2, 3]);
        await subtle.digest('SHA-256', testData);
        console.log('Step 4: ✓ Crypto is ready');
        
        console.log('Step 4: Calling factory.createUserId...');
        const createUserIdStart = Date.now();
        adminUser = await factory.createUserId("CN=admin/O=testtenant", adminUserPassword);
        const createUserIdTime = Date.now() - createUserIdStart;
        console.log('Step 4: Admin user created in', createUserIdTime, 'ms');
        setTestResults(prev => prev + `Step 4: ✓ Admin user created (${createUserIdTime}ms)\n`);
      } catch (err) {
        console.error('Step 4: Error:', err);
        throw new Error(`Failed at Step 4 (createUserId): ${err.message}`, { cause: err });
      }

      setTestResults(prev => prev + 'Creating admin signing key pair...\n');
      const adminSigningKeyPassword = "adminsigningpass123";
      const adminSigningKeyPair = await factory.createSigningKeyPair(adminSigningKeyPassword);

      setTestResults(prev => prev + 'Creating admin encryption key pair...\n');
      const adminEncryptionKeyPair = await factory.createEncryptionKeyPair("adminencpass123");

      setTestResults(prev => prev + 'Creating tenant encryption key...\n');
      const tenantEncryptionKeyPassword = "tenantkeypass123";
      const tenantEncryptionKey = await factory.createSymmetricEncryptedPrivateKey(tenantEncryptionKeyPassword);

      setTestResults(prev => prev + 'Creating $publicinfos symmetric key...\n');
      const publicInfosKey = await factory.createSymmetricEncryptedPrivateKey("publicinfospass123");

      setTestResults(prev => prev + 'Creating KeyBag...\n');
      const adminKeyBag = new KeyBag(
        adminUser.userEncryptionKeyPair.privateKey,
        adminUserPassword,
        cryptoAdapter
      );

      setTestResults(prev => prev + 'Adding $publicinfos key to KeyBag...\n');
      await adminKeyBag.decryptAndImportKey(PUBLIC_INFOS_KEY_ID, publicInfosKey, "publicinfospass123");

      setTestResults(prev => prev + 'Creating tenant...\n');
      const tenantId = "test-tenant-expo-app";
      const tenant = await factory.openTenantWithKeys(
        tenantId,
        tenantEncryptionKey,
        tenantEncryptionKeyPassword,
        adminSigningKeyPair.publicKey,
        adminEncryptionKeyPair.publicKey,
        adminUser,
        adminUserPassword,
        adminKeyBag
      );

      setTestResults(prev => prev + 'Registering admin user in directory...\n');
      const directory = await tenant.openDirectory();
      const publicAdminUser = factory.toPublicUserId(adminUser);
      await directory.registerUser(
        publicAdminUser,
        adminSigningKeyPair.privateKey,
        adminSigningKeyPassword
      );

      // Now run the document creation and iteration test
      setTestResults(prev => prev + '\n=== Starting Document Test ===\n');
      const db = await tenant.openDB("test-db");

      const numDocs = 10;
      const createdDocs = [];

      setTestResults(prev => prev + `Creating ${numDocs} documents...\n`);
      const baseTime = Date.now();

      const categories = ['Sales', 'Engineering', 'Marketing'];
      const priorities = ['High', 'Medium', 'Low'];
      const names = ['Project Alpha', 'Project Beta', 'Project Gamma', 'Task Delta', 'Initiative Epsilon',
                     'Campaign Zeta', 'Feature Eta', 'Update Theta', 'Report Iota', 'Analysis Kappa'];

      for (let i = 0; i < numDocs; i++) {
        if (i % 100 === 0) {
          setTestResults(prev => prev + `  Created ${i}/${numDocs} documents...\n`);
        }

        const doc = await db.createDocument();
        const docId = doc.getId();

        await db.changeDoc(doc, (d) => {
          const data = d.getData();
          data.index = i;
          data.timestamp = baseTime + i;
          data.category = categories[i % categories.length];
          data.priority = priorities[i % priorities.length];
          data.name = names[i];
          data.amount = (i + 1) * 1000; // $1000, $2000, ..., $10000
        });

        const updatedDoc = await db.getDocument(docId);
        createdDocs.push({
          docId: docId,
          lastModified: updatedDoc.getLastModified()
        });

        // Debug first document
        if (i === 0) {
          const debugData = updatedDoc.getData();
          console.log('=== DEBUG: First document data ===');
          console.log('Raw getData():', debugData);
          console.log('typeof debugData:', typeof debugData);
          console.log('Object.keys:', Object.keys(debugData));
          console.log('category value:', debugData.category);
          console.log('typeof category:', typeof debugData.category);
          console.log('priority value:', debugData.priority);
          console.log('name value:', debugData.name);
          console.log('amount value:', debugData.amount);
          console.log('typeof amount:', typeof debugData.amount);
          setTestResults(prev => prev + `DEBUG: category="${debugData.category}" priority="${debugData.priority}"\n`);
        }

        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 1));
      }

      setTestResults(prev => prev + 'Syncing store changes...\n');
      await db.syncStoreChanges();

      setTestResults(prev => prev + 'Iterating through all documents...\n');
      const processedDocs = [];
      let processedCount = 0;
      
      for await (const { doc, cursor } of db.iterateChangesSince(null)) {
        processedDocs.push({
          docId: doc.getId(),
          lastModified: doc.getLastModified(),
          cursor
        });
        processedCount++;
        
        if (processedCount % 100 === 0) {
          setTestResults(prev => prev + `  Processed ${processedCount} documents...\n`);
        }
      }

      // Verify results
      setTestResults(prev => prev + '\n=== Verifying Results ===\n');
      
      const allProcessed = processedDocs.length === numDocs;
      setTestResults(prev => prev + `Documents processed: ${processedDocs.length}/${numDocs} ${allProcessed ? '✓' : '✗'}\n`);

      // Verify order
      let orderCorrect = true;
      for (let i = 1; i < processedDocs.length; i++) {
        const prev = processedDocs[i - 1];
        const curr = processedDocs[i];

        if (prev.lastModified === curr.lastModified) {
          if (prev.docId.localeCompare(curr.docId) > 0) {
            orderCorrect = false;
            break;
          }
        } else {
          if (prev.lastModified > curr.lastModified) {
            orderCorrect = false;
            break;
          }
        }
      }
      setTestResults(prev => prev + `Order correct: ${orderCorrect ? '✓' : '✗'}\n`);

      // Verify cursor tracking
      let cursorCorrect = true;
      for (let i = 0; i < processedDocs.length; i++) {
        const result = processedDocs[i];
        if (result.cursor.docId !== result.docId || result.cursor.lastModified !== result.lastModified) {
          cursorCorrect = false;
          break;
        }
      }
      setTestResults(prev => prev + `Cursor tracking correct: ${cursorCorrect ? '✓' : '✗'}\n`);

      if (!allProcessed || !orderCorrect || !cursorCorrect) {
        setTestStatus('error');
        setTestResults(prev => prev + '\n❌ TEST FAILED!\n');
        console.error('=== TEST FAILED: processed=' + processedDocs.length + '/' + numDocs + ' order=' + orderCorrect + ' cursor=' + cursorCorrect + ' ===');
        return;
      }

      // === Virtual View Test ===
      setTestResults(prev => prev + '\n=== Creating Virtual View ===\n');

      const view = await VirtualViewFactory.createView()
        .addCategoryColumn("category", {
          title: "Category",
          sorting: ColumnSorting.ASCENDING,
        })
        .addSortedColumn("priority", ColumnSorting.DESCENDING)
        .addSortedColumn("name", ColumnSorting.ASCENDING)
        .addDisplayColumn("index")
        .addTotalColumn("amount", TotalMode.SUM)
        .withDB("test-db", db, (doc) => {
          // Include all documents
          return true;
        })
        .buildAndUpdate();

      setTestResults(prev => prev + 'Virtual view created and populated\n');

      // Navigate the view
      const nav = VirtualViewFactory.createNavigator(view).build();
      nav.expandAll();

      setTestResults(prev => prev + '\n=== Virtual View Structure ===\n');

      let entryCount = 0;
      for await (const entry of nav.entriesForward()) {
        const indent = "  ".repeat(entry.getLevel());

        if (entry.isCategory()) {
          const totalAmount = entry.getColumnValue("amount");
          const docCount = entry.getChildDocumentCount();
          setTestResults(prev => prev +
            `${indent}📁 ${entry.getCategoryValue()} (${docCount} docs, Total: $${totalAmount})\n`);
        } else {
          const values = entry.getColumnValues();
          setTestResults(prev => prev +
            `${indent}📄 ${values.name} [${values.priority}] - $${values.amount}\n`);
        }
        entryCount++;
      }

      setTestResults(prev => prev + `\nView entries: ${entryCount}\n`);

      // Verify view structure
      const root = view.getRoot();
      const categoryCount = root.getChildCount();
      const totalDocCount = root.getDescendantDocumentCount();

      setTestResults(prev => prev + `Categories: ${categoryCount}\n`);
      setTestResults(prev => prev + `Total documents: ${totalDocCount}\n`);

      if (totalDocCount !== numDocs || categoryCount !== 3) {
        setTestStatus('error');
        setTestResults(prev => prev + '\n❌ VIRTUAL VIEW TEST FAILED!\n');
        console.error('=== VIRTUAL VIEW TEST FAILED: categories=' + categoryCount + '/3 totalDocs=' + totalDocCount + '/' + numDocs + ' ===');
        return;
      }

      // === Document Modification Test ===
      setTestResults(prev => prev + '\n=== Testing Document Modification ===\n');

      // Get the first document (Project Alpha) and modify it
      const firstDocId = createdDocs[0].docId;
      setTestResults(prev => prev + `Modifying document: ${firstDocId}\n`);

      // Read current values before modification
      const beforeDoc = await db.getDocument(firstDocId);
      const beforeData = beforeDoc.getData();
      setTestResults(prev => prev + `Before: ${beforeData.name} - ${beforeData.category}/${beforeData.priority}/$${beforeData.amount}\n`);

      // Change Project Alpha from Sales/High/$1000 to Marketing/Low/$99999
      await db.changeDoc(beforeDoc, (d) => {
        const data = d.getData();
        data.category = "Marketing";
        data.priority = "Low";
        data.amount = 99999;
        data.name = "Project Alpha (Modified)";
      });

      setTestResults(prev => prev + 'Document modified, updating virtual view...\n');

      // Verify the document was actually modified
      const modifiedDoc = await db.getDocument(firstDocId);
      const modifiedData = modifiedDoc.getData();

      setTestResults(prev => prev + `\nVerifying document ${firstDocId}:\n`);
      setTestResults(prev => prev + `  category: ${modifiedData.category} (expected: Marketing)\n`);
      setTestResults(prev => prev + `  priority: ${modifiedData.priority} (expected: Low)\n`);
      setTestResults(prev => prev + `  amount: ${modifiedData.amount} (expected: 99999)\n`);
      setTestResults(prev => prev + `  name: ${modifiedData.name} (expected: Project Alpha (Modified))\n`);

      // Update the virtual view - this will re-query the database
      setTestResults(prev => prev + `\nCalling view.update() to refresh from database...\n`);
      await view.update();

      setTestResults(prev => prev + 'Virtual view updated from database\n');

      setTestResults(prev => prev + '\n=== Updated Virtual View Structure ===\n');

      // Navigate the updated view
      const updatedNav = VirtualViewFactory.createNavigator(view).build();
      updatedNav.expandAll();

      let foundModified = false;
      let marketingTotal = 0;
      let marketingDocs = 0;
      let salesDocs = 0;
      let allCategories = {};

      for await (const entry of updatedNav.entriesForward()) {
        const indent = "  ".repeat(entry.getLevel());

        if (entry.isCategory()) {
          const categoryName = entry.getCategoryValue();
          const totalAmount = entry.getColumnValue("amount");
          const docCount = entry.getChildDocumentCount();

          allCategories[categoryName] = { docs: docCount, total: totalAmount };

          if (categoryName === "Marketing") {
            marketingTotal = totalAmount;
            marketingDocs = docCount;
          } else if (categoryName === "Sales") {
            salesDocs = docCount;
          }

          setTestResults(prev => prev +
            `${indent}📁 ${categoryName} (${docCount} docs, Total: $${totalAmount})\n`);
        } else {
          const values = entry.getColumnValues();

          if (values.name === "Project Alpha (Modified)") {
            foundModified = true;
            setTestResults(prev => prev +
              `${indent}📄 ${values.name} [${values.priority}] in ${values.category || '?'} - $${values.amount} ⭐\n`);
          } else {
            setTestResults(prev => prev +
              `${indent}📄 ${values.name} [${values.priority}] - $${values.amount}\n`);
          }
        }
      }

      setTestResults(prev => prev + `\nAll categories: ${JSON.stringify(allCategories, null, 2)}\n`);

      // Verify the modification was caught
      // Original: Sales had 4 docs (0,3,6,9), Marketing had 3 docs (2,5,8)
      // After: Sales should have 3 docs, Marketing should have 4 docs
      const expectedMarketingTotal = 3000 + 6000 + 9000 + 99999; // All 4 Marketing docs
      const expectedSalesDocs = 3; // Was 4, now 3 (removed Project Alpha)
      const expectedMarketingDocs = 4; // Was 3, now 4 (added Project Alpha)
      const modificationCorrect = foundModified && marketingDocs === expectedMarketingDocs;
      const totalCorrect = marketingTotal === expectedMarketingTotal;
      const salesCorrect = salesDocs === expectedSalesDocs;

      setTestResults(prev => prev + `\n=== Verification Results ===\n`);
      setTestResults(prev => prev + `Modified doc found in view: ${foundModified}\n`);
      setTestResults(prev => prev + `Sales category now has: ${salesDocs} docs (expected ${expectedSalesDocs}) ${salesCorrect ? '✓' : '✗'}\n`);
      setTestResults(prev => prev + `Marketing category now has: ${marketingDocs} docs (expected ${expectedMarketingDocs}) ${modificationCorrect ? '✓' : '✗'}\n`);
      setTestResults(prev => prev + `Marketing total: $${marketingTotal} (expected $${expectedMarketingTotal}) ${totalCorrect ? '✓' : '✗'}\n`);

      if (foundModified && modificationCorrect && totalCorrect && salesCorrect) {
        setTestStatus('success');
        setTestResults(prev => prev + '\n✅ ALL TESTS PASSED (including modification)!\n');
        console.log('=== ALL TESTS PASSED: Documents, virtual view, and modification verified ===');
      } else {
        setTestStatus('error');
        setTestResults(prev => prev + '\n❌ MODIFICATION TEST FAILED!\n');
        setTestResults(prev => prev + `  found=${foundModified}, marketing=${modificationCorrect}, total=${totalCorrect}, sales=${salesCorrect}\n`);
        console.error('=== MODIFICATION TEST FAILED: found=' + foundModified + ' marketing=' + modificationCorrect + ' total=' + totalCorrect + ' sales=' + salesCorrect + ' ===');
      }
    } catch (error) {
      setTestStatus('error');
      
      const errorDetails = {
        message: error?.message || 'Unknown error',
        stack: error?.stack || '',
        name: error?.name || 'Error',
        toString: error?.toString?.() || String(error),
        ...(error?.cause && { cause: error.cause }),
      };
      
      const errorText = `❌ ERROR: ${errorDetails.message}\n\n` +
        `Error Type: ${errorDetails.name}\n\n` +
        `Stack Trace:\n${errorDetails.stack || 'No stack trace available'}\n\n` +
        `Timestamp: ${new Date().toISOString()}`;
      
      const fullText = testResults + errorText;
      setFullErrorText(fullText);
      setTestResults(prev => prev + errorText);
      
      console.error('Test error:', error);
      console.error('Error details:', errorDetails);
    } finally {
      setIsRunning(false);
    }
  };

  const copyErrorToClipboard = async () => {
    try {
      const textToCopy = fullErrorText || testResults;
      await Clipboard.setStringAsync(textToCopy);
      Alert.alert('Copied!', 'Error details copied to clipboard');
    } catch (error) {
      Alert.alert('Error', `Failed to copy: ${error.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <Text style={styles.title}>MindooDB Test App</Text>
      <Text style={styles.subtitle}>Test local MindooDB package</Text>

      <View style={styles.buttonContainer}>
        <Button
          title={isRunning ? "Running Test..." : "Run Test (10 docs)"}
          onPress={runTest}
          disabled={isRunning}
          color="#007AFF"
        />
      </View>

      {isRunning && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Running test...</Text>
        </View>
      )}

      {testStatus !== 'idle' && (
        <View style={styles.resultsContainer}>
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsTitle}>Test Results:</Text>
            {testStatus === 'error' && (
              <Button
                title="Copy Error"
                onPress={copyErrorToClipboard}
                color="#FF3B30"
              />
            )}
          </View>
          <ScrollView style={styles.resultsScroll}>
            <Text style={styles.resultsText}>{testResults}</Text>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  buttonContainer: {
    marginBottom: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  resultsContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  resultsScroll: {
    flex: 1,
  },
  resultsText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#333',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
});
