import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  collectCoverageFrom: [
    '<rootDir>/src/**/*.{ts,tsx}',
    '!<rootDir>/src/**/*.d.ts',
    '!**/.DS_Store',
  ],
  coverageThreshold: {
    global: {
      statements: 99,
      branches: 99,
      functions: 99,
      lines: 99,
    },
    './src/**/*.{ts,tsx}': {
      statements: 99,
      branches: 99,
      functions: 99,
      lines: 99,
    },
  },
  coverageReporters: ['text', 'lcov', 'json', 'json-summary'],
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/tests/e2e/',
  ],
};

export default createJestConfig(customJestConfig);
