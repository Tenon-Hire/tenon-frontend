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
    '!<rootDir>/src/**/page.tsx',
    '!<rootDir>/src/**/layout.tsx',
    '!<rootDir>/src/app/api/**',
    '!<rootDir>/src/app/(private)/(recruiter)/dashboard/simulations/new/**',
    '!<rootDir>/src/components/layout/**',
    '!<rootDir>/src/components/common/Input.tsx',
    '!<rootDir>/src/lib/auth0.ts',
    '!<rootDir>/src/lib/starterCode.ts',
    '!<rootDir>/src/middleware.ts',
  ],
  coverageThreshold: {
    global: {
      statements: 85,
      branches: 70,
      functions: 85,
      lines: 90,
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
