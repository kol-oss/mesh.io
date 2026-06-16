import type { Config } from "jest";

export default {
  testEnvironment: "node",
  transform: {
    "^.+\\.[tj]sx?$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.jest.json" }],
  },
  transformIgnorePatterns: ["/node_modules/(?!uuid/)"],
  testMatch: ["**/tests/**/*.test.ts", "**/__tests__/**/*.test.ts", "**/?(*.)+(spec|test).ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testTimeout: 30000,
} satisfies Config;
