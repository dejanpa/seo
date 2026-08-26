import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type * as LoginEventsModule from "./login-events";

// Real in-memory SQLite: the point of these tests is what actually lands in the
// row, and that the hook cannot break a sign-in.

vi.mock("cloudflare:workers", () => ({ env: { DATABASE_PROVIDER: "d1" } }));

let client: Client;
let recordLoginEvent: typeof LoginEventsModule.recordLoginEvent;

beforeAll(async () => {
  client = createClient({ url: "file::memory:" });
  const testDb = drizzle(client);
  // testDb only exists at runtime, so the module under test must load after
  // this mock — the one sanctioned use of doMock + dynamic import.
  vi.doMock("@/db", () => ({ db: testDb }));

  await client.executeMultiple(`
    CREATE TABLE user_login_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  ({ recordLoginEvent } = await import("./login-events"));
});

afterAll(() => {
  client.close();
});

beforeEach(async () => {
  await client.execute("DELETE FROM user_login_events");
});

async function loginRows() {
  return (await client.execute("SELECT * FROM user_login_events")).rows;
}

describe("recordLoginEvent", () => {
  it("records the sign-in with an ISO timestamp", async () => {
    await recordLoginEvent({
      userId: "u1",
      ipAddress: "203.0.113.9",
      userAgent: "Mozilla/5.0",
    });

    const [row] = await loginRows();
    expect(row).toMatchObject({
      user_id: "u1",
      ip_address: "203.0.113.9",
      user_agent: "Mozilla/5.0",
    });
    expect(row?.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/);
  });

  it("ignores impersonated sessions", async () => {
    await recordLoginEvent({ userId: "u1", impersonatedBy: "admin-1" });

    await expect(loginRows()).resolves.toHaveLength(0);
  });

  it("never breaks the sign-in when the write fails", async () => {
    await client.execute("DROP TABLE user_login_events");
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(recordLoginEvent({ userId: "u1" })).resolves.toBeUndefined();

    await client.execute(`
      CREATE TABLE user_login_events (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  });
});
