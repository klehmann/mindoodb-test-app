module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/expo'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
  testPathIgnorePatterns: ['/node_modules/', '/__mocks__/'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },
  moduleNameMapper: {
    '^expo-standard-web-crypto$': '<rootDir>/expo/crypto/__tests__/__mocks__/expo-standard-web-crypto.ts',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(node-forge)/)',
  ],
  collectCoverageFrom: [
    'expo/**/*.ts',
    '!expo/**/*.d.ts',
    '!expo/**/__tests__/**',
    '!expo/**/__mocks__/**',
  ],
};
