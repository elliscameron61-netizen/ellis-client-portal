import { config } from "dotenv";
import path from "path";
import { defineConfig } from "vitest/config";

config();

const devUrl =
  process.env.DATABASE_URL ??
  "postgresql://ellis:ellis@localhost:5432/ellis_portal?schema=public";
const testUrl =
  process.env.TEST_DATABASE_URL ??
  devUrl.replace(/\/ellis_portal(\?|$)/, "/ellis_portal_test$1");

process.env.DATABASE_URL = testUrl;
process.env.NODE_ENV = "test";
process.env.APP_URL = process.env.APP_URL || "http://localhost:3000";

export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false,
    globalSetup: ["./tests/global-setup.ts"],
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
    env: {
      DATABASE_URL: testUrl,
      NODE_ENV: "test",
      APP_URL: process.env.APP_URL,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
