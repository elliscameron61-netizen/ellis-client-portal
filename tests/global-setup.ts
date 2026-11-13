import { config } from "dotenv";
import { execSync } from "child_process";

export default function setup() {
  config();
  const configured = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || "";
  const testUrl = configured.includes("ellis_portal_test")
    ? configured
    : configured.replace(/\/ellis_portal(\?|$)/, "/ellis_portal_test$1");
  if (!testUrl.includes("ellis_portal_test")) {
    throw new Error("Set TEST_DATABASE_URL to the ellis_portal_test database before running tests.");
  }
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: testUrl },
  });
}
