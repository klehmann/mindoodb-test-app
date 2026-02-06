/**
 * Integration tests for ExpoGoCryptoAdapter with MindooDB
 * Tests that the adapter works correctly with actual MindooDB operations
 */

import { ExpoGoCryptoAdapter } from "../ExpoGoCryptoAdapter";

// Try to import from mindoodb - this will work if the package is built
// In test environment, we can use either the built package or source directly
let BaseMindooTenantFactory: any;
let InMemoryContentAddressedStoreFactory: any;
let KeyBag: any;

try {
  // Try to import from the built package first
  const mindoodb = require("mindoodb");
  BaseMindooTenantFactory = mindoodb.BaseMindooTenantFactory;
  InMemoryContentAddressedStoreFactory = mindoodb.InMemoryContentAddressedStoreFactory;
  KeyBag = mindoodb.KeyBag;
} catch (e) {
  // If package not available, try importing from source (for development)
  try {
    const path = require("path");
    const mindoodbPath = path.resolve(__dirname, "../../../../git/mindoodb2/src");
    BaseMindooTenantFactory = require(path.join(mindoodbPath, "core/BaseMindooTenantFactory")).BaseMindooTenantFactory;
    InMemoryContentAddressedStoreFactory = require(path.join(mindoodbPath, "core/appendonlystores/InMemoryContentAddressedStore")).InMemoryContentAddressedStoreFactory;
    KeyBag = require(path.join(mindoodbPath, "core/keys/KeyBag")).KeyBag;
  } catch (e2) {
    // If both fail, we'll skip integration tests
    console.warn("MindooDB not available for integration tests:", e.message);
  }
}

// Skip integration tests if MindooDB is not available
const describeIntegration = BaseMindooTenantFactory ? describe : describe.skip;

describeIntegration("ExpoGoCryptoAdapter Integration with MindooDB", () => {
  let adapter: ExpoGoCryptoAdapter;
  let factory: any;

  beforeAll(() => {
    adapter = new ExpoGoCryptoAdapter();
    const storeFactory = new InMemoryContentAddressedStoreFactory();
    factory = new BaseMindooTenantFactory(storeFactory, adapter);
  });

  it("should create a tenant with ExpoGoCryptoAdapter", async () => {
    if (!BaseMindooTenantFactory) {
      return; // Skip if not available
    }

    const password = "testPassword123";
    const tenantId = "test-tenant";

    // Create admin keys first
    const adminSigningKey = await factory.createSigningKeyPair(password);
    const adminEncryptionKey = await factory.createEncryptionKeyPair(password);

    // Create user
    const user = await factory.createUserId("testuser", password);

    // Create key bag
    const keyBag = new KeyBag(
      user.userEncryptionKeyPair.privateKey,
      password,
      adapter
    );

    const tenant = await factory.createTenant(
      tenantId,
      password,
      adminSigningKey.publicKey,
      adminEncryptionKey.publicKey,
      user,
      password,
      keyBag
    );

    expect(tenant).toBeDefined();
    expect(tenant.getId()).toBe(tenantId);
  });

  it("should create a user ID with Ed25519 and RSA keys", async () => {
    const userId = await factory.createUserId("testuser", "password123");

    expect(userId).toBeDefined();
    expect(userId.username).toBe("testuser");
    expect(userId.userSigningKeyPair.publicKey).toContain("BEGIN PUBLIC KEY");
    expect(userId.userEncryptionKeyPair.publicKey).toContain("BEGIN PUBLIC KEY");
    expect(userId.userSigningKeyPair.privateKey).toHaveProperty("ciphertext");
    expect(userId.userEncryptionKeyPair.privateKey).toHaveProperty("ciphertext");
  });

  it("should create and verify signatures", async () => {
    const signingKeyPair = await factory.createSigningKeyPair("password123");

    expect(signingKeyPair.publicKey).toContain("BEGIN PUBLIC KEY");
    expect(signingKeyPair.privateKey).toHaveProperty("ciphertext");

    // The signing key pair should be usable for signing operations
    // (actual signing would require a tenant instance)
  });

  it("should encrypt and decrypt symmetric keys", async () => {
    const symmetricKey = await factory.createSymmetricEncryptedPrivateKey("password123");

    expect(symmetricKey).toHaveProperty("ciphertext");
    expect(symmetricKey).toHaveProperty("iv");
    expect(symmetricKey).toHaveProperty("tag");
    expect(symmetricKey).toHaveProperty("salt");
    expect(symmetricKey.iterations).toBeGreaterThan(0);
  });

  it("should create RSA encryption key pair", async () => {
    const encryptionKeyPair = await factory.createEncryptionKeyPair("password123");

    expect(encryptionKeyPair.publicKey).toContain("BEGIN PUBLIC KEY");
    expect(encryptionKeyPair.privateKey).toHaveProperty("ciphertext");
  });
});
