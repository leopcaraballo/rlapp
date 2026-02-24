import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: "./",
});

// Add any custom config to be passed to Jest
const config: Config = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testEnvironment: "jest-environment-jsdom",
  collectCoverageFrom: ["<rootDir>/src/**/*.{ts,tsx}"],
  coveragePathIgnorePatterns: ["/node_modules/"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@test/(.*)$": "<rootDir>/test/$1",
  },
  testMatch: [
    "<rootDir>/test/hooks/**/*.spec.ts",
    "<rootDir>/test/hooks/**/*.test.ts",
    "<rootDir>/test/hooks/**/*.spec.tsx",
    "<rootDir>/test/hooks/**/*.test.tsx",
    "<rootDir>/test/app/**/*.spec.ts",
    "<rootDir>/test/app/**/*.test.ts",
    "<rootDir>/test/app/**/*.spec.tsx",
    "<rootDir>/test/app/**/*.test.tsx",
    "<rootDir>/test/components/**/*.spec.ts",
    "<rootDir>/test/components/**/*.test.ts",
    "<rootDir>/test/components/**/*.spec.tsx",
    "<rootDir>/test/components/**/*.test.tsx",
    "<rootDir>/test/config/**/*.spec.ts",
    "<rootDir>/test/config/**/*.test.ts",
    "<rootDir>/test/config/**/*.spec.tsx",
    "<rootDir>/test/config/**/*.test.tsx",
    "<rootDir>/test/domain/**/*.spec.ts",
    "<rootDir>/test/domain/**/*.test.ts",
    "<rootDir>/test/domain/**/*.spec.tsx",
    "<rootDir>/test/domain/**/*.test.tsx",
    "<rootDir>/test/lib/**/*.spec.ts",
    "<rootDir>/test/lib/**/*.test.ts",
    "<rootDir>/test/lib/**/*.spec.tsx",
    "<rootDir>/test/lib/**/*.test.tsx",
    "<rootDir>/test/mocks/**/*.spec.ts",
    "<rootDir>/test/mocks/**/*.test.ts",
    "<rootDir>/test/mocks/**/*.spec.tsx",
    "<rootDir>/test/mocks/**/*.test.tsx",
    "<rootDir>/test/services/**/*.spec.ts",
    "<rootDir>/test/services/**/*.test.ts",
    "<rootDir>/test/services/**/*.spec.tsx",
    "<rootDir>/test/services/**/*.test.tsx",
  ],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config);
