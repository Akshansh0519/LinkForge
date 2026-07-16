import type { Config } from 'jest'

const config: Config = {
  // Use transform instead of preset so we can pass ts-jest options
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  clearMocks: true,
  collectCoverageFrom: ['src/**/*.ts', '!src/index.ts', '!src/types/**'],
  transform: {
    // isolatedModules: true required by ts-jest when tsconfig uses module: Node16
    // Scoped here so it doesn't affect the production tsc build
    '^.+\\.tsx?$': ['ts-jest', { isolatedModules: true }],
  },
}

export default config
