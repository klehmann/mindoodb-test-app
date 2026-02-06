/**
 * Mock for expo-standard-web-crypto
 * Uses Node.js crypto for getRandomValues in tests
 */

const crypto = require("crypto");

export default {
  getRandomValues: (array: Uint8Array): Uint8Array => {
    const randomBytes = crypto.randomBytes(array.length);
    array.set(randomBytes);
    return array;
  },
};
