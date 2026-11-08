import postgres from "postgres";
import { afterAll, beforeEach, describe, expect, inject, it } from "vitest";
import { createApp } from "./app.ts";

const KEY = "sb_publishable_test_key";
// 2026-03-10 11:30 UTC is already 2026-03-11 in Auckland (UTC+13).
const NOW = new Date("2026-03-10T11:30:00Z");
const TODAY_NZ = "2026-03-11";

const sql = postgres(inject("databaseUrl"), { max: 4, onnotice: () => {} });
const loggedErrors: unknown[] = [];
const handle = createApp({
  sql,
  apiKeys: [KEY],
  now: () => NOW,
  logError: (event, fields) => loggedErrors.push({ event, ...fields }),
});

afterAll(() => sql.end());
beforeEach(async () => {
  await sql`truncate public.feedback, public.orders, public.connections`;
  loggedErrors.length = 0;
});

function call(method: string, path: string, body?: unknown, key: string | null = KEY) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (key !== null) headers.apikey = key;
  return handle(
    new Request(`http://localhost/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

async function connect(providerId: string): Promise<string> {
  const res = await call("POST", "/connections", { providerId });
  expect(res.status).toBe(201);
  return ((await res.json()) as { connectionId: string }).connectionId;
}

const cloudidDetails = {
  firstName: "Steven",
  surname: "Baker",
  address: "100 Queen Street",
  dataPlan: "30 Gb",
  contractStartDate: "2026-04-10",
  additionalServices: ["Dedicated IP"],
  currentProvider: "Spark",
};
const pronteDetails = {
  firstName: "Steven",
  surname: "Baker",
  address: "100 Queen Street",
  dataPlan: "Unlimited",
  contractStartDate: "2026-04-10",
  needsRouter: true,
};
const payment = { cardLast4: "1121", expiryMonth: 12, expiryYear: 2026, cardHolder: "Steven Baker" };

async function countRows(table: "connections" | "orders" | "feedback") {
  const [row] = await sql<{ n: number }[]>`select count(*)::int as n from ${sql("public." + table)}`;
  return row!.n;
}

describe("API key", () => {
  const writes: [string, string, unknown][] = [
    ["POST", "/connections", { providerId: "cloudid" }],
    ["POST", "/orders", { connectionId: crypto.randomUUID(), details: {}, payment: {} }],
    ["POST", "/feedback", { orderId: crypto.randomUUID(), message: "hi" }],
  ];
  const reads = ["/providers", "/providers/cloudid/purchase-options", "/addresses?q=100"];

  it.each([null, "", "sb_publishable_wrong"])("refuses key %j on every endpoint and writes nothing", async (key) => {
    for (const path of reads) {
      const res = await call("GET", path, undefined, key);
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: { code: "INVALID_API_KEY" } });
    }
    for (const [method, path, body] of writes) {
      expect((await call(method, path, body, key)).status).toBe(401);
    }
    expect(await countRows("connections")).toBe(0);
  });

  it("refuses every request when no keys are configured", async () => {
    const closed = createApp({ sql, apiKeys: [], now: () => NOW, logError: () => {} });
    const res = await closed(new Request("http://localhost/api/providers", { headers: { apikey: "" } }));
    expect(res.status).toBe(401);
  });

  it("answers CORS preflight without a key", async () => {
    const res = await handle(new Request("http://localhost/api/orders", { method: "OPTIONS" }));
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-headers")).toBe("apikey, content-type");
  });
});

describe("GET /providers", () => {
  it("lists the catalog in display order and marks only the cheapest", async () => {
    const res = await call("GET", "/providers");
    expect(res.status).toBe(200);
    const { providers } = (await res.json()) as { providers: Record<string, unknown>[] };
    expect(providers.map((p) => [p.id, p.monthlyPriceCents, p.isCheapest])).toEqual([
      ["cloudid", 10688, false],
      ["pronete", 9845, true],
      ["tebiobio", 13236, false],
    ]);
    expect(providers[0]!.features).toMatchObject({
      yearlyPayment: { type: "price", amountCents: 100000, per: "year" },
      roaming: { type: "excluded" },
      router: { type: "price", amountCents: 1200, per: "month" },
    });
    expect(Number.isNaN(Date.parse(providers[0]!.retrievedAt as string))).toBe(false);
    expect(Object.keys(providers[0]!).sort()).toEqual(
      ["features", "id", "isCheapest", "monthlyPriceCents", "name", "retrievedAt", "tagline"],
    );
  });

  it("also answers on the local CLI path", async () => {
    const res = await handle(new Request("http://localhost/functions/v1/api/providers", { headers: { apikey: KEY } }));
    expect(res.status).toBe(200);
  });
});

describe("GET /providers/:id/purchase-options", () => {
  it("returns the provider's form and today's date in Auckland", async () => {
    const res = await call("GET", "/providers/pronete/purchase-options");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      providerId: "pronete",
      providerName: "Pronete",
      form: {
        dataPlans: ["10 Gb", "20 Gb", "30 Gb", "Unlimited"],
        fields: ["contractStartDate", "dataPlan", "needsRouter"],
        additionalServices: [],
      },
      currentProviders: ["Vodafone", "Spark", "Sky", "My Republic"],
      earliestStartDate: TODAY_NZ,
    });
  });

  it("returns 404 for an unknown provider", async () => {
    const res = await call("GET", "/providers/nope/purchase-options");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: { code: "PROVIDER_NOT_FOUND" } });
  });
});

describe("GET /addresses", () => {
  it.each([
    ["100 queen", ["100 Queen Street", "100 Queen Street #B"]],
    ["1", []],
    ["", []],
    ["%", []],
    ["10_", []],
  ])("q=%j returns %j", async (q, expected) => {
    const res = await call("GET", `/addresses?q=${encodeURIComponent(q)}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ addresses: expected });
  });

  it("returns at most five matches", async () => {
    await sql`insert into public.address_suggestions (line) select 'Zed Street ' || g from generate_series(1, 8) g`;
    try {
      const { addresses } = (await (await call("GET", "/addresses?q=zed")).json()) as { addresses: string[] };
      expect(addresses).toHaveLength(5);
    } finally {
      await sql`delete from public.address_suggestions where line like 'Zed Street %'`;
    }
  });

  it("rejects a query over 100 characters and accepts exactly 100", async () => {
    expect((await call("GET", `/addresses?q=${"a".repeat(101)}`)).status).toBe(400);
    expect((await call("GET", `/addresses?q=${"a".repeat(100)}`)).status).toBe(200);
  });
});

describe("connections", () => {
  it("creates a connection for a known provider", async () => {
    const id = await connect("tebiobio");
    const [row] = await sql`select provider_id, disconnected_at from public.connections where id = ${id}`;
    expect(row).toEqual({ provider_id: "tebiobio", disconnected_at: null });
  });

  it.each([
    [{ providerId: "nope" }, 404, "PROVIDER_NOT_FOUND"],
    [{ providerId: "cloudid", extra: 1 }, 400, "VALIDATION_FAILED"],
    [{ providerId: "DROP TABLE" }, 400, "VALIDATION_FAILED"],
    ["not json", 400, "VALIDATION_FAILED"],
  ])("rejects %j and writes nothing", async (body, status, code) => {
    const res = await call("POST", "/connections", body);
    expect(res.status).toBe(status);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe(code);
    expect(await countRows("connections")).toBe(0);
  });

  it("disconnects, and a second disconnect keeps the first time", async () => {
    const id = await connect("cloudid");
    expect((await call("DELETE", `/connections/${id}`)).status).toBe(204);
    const [first] = await sql`select disconnected_at from public.connections where id = ${id}`;
    expect(first!.disconnected_at).toBeInstanceOf(Date);
    expect((await call("DELETE", `/connections/${id}`)).status).toBe(204);
    const [second] = await sql`select disconnected_at from public.connections where id = ${id}`;
    expect(second!.disconnected_at).toEqual(first!.disconnected_at);
  });

  it.each([crypto.randomUUID(), "not-a-uuid"])("returns 404 when disconnecting %s", async (id) => {
    const res = await call("DELETE", `/connections/${id}`);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: { code: "CONNECTION_NOT_FOUND" } });
  });
});

describe("POST /orders", () => {
  it("stores the order with the last four card digits", async () => {
    const connectionId = await connect("cloudid");
    const res = await call("POST", "/orders", { connectionId, details: cloudidDetails, payment });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { orderId: string };
    expect(body).toEqual({ orderId: body.orderId, providerName: "Cloudid", contractStartDate: "2026-04-10" });

    const [row] = await sql`
      select *, contract_start_date::text as start from public.orders where id = ${body.orderId}`;
    expect(row).toMatchObject({
      connection_id: connectionId,
      provider_id: "cloudid",
      first_name: "Steven",
      surname: "Baker",
      address: "100 Queen Street",
      data_plan: "30 Gb",
      start: "2026-04-10",
      additional_services: ["Dedicated IP"],
      needs_router: null,
      current_provider: "Spark",
      card_last4: "1121",
      card_holder: "Steven Baker",
      card_expiry_month: 12,
      card_expiry_year: 2026,
    });
    expect(row!.request_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it.each([
    ["a full card number", { ...payment, cardNumber: "4111222233331121" }, "payment"],
    ["a CVV", { ...payment, cvv: "987" }, "payment"],
  ])("refuses a payment carrying %s, so it never reaches the server's storage", async (_label, body, path) => {
    const connectionId = await connect("cloudid");
    const res = await call("POST", "/orders", { connectionId, details: cloudidDetails, payment: body });
    expect(res.status).toBe(400);
    const { error } = (await res.json()) as { error: { fields: { path: string }[] } };
    expect(error.fields.map((f) => f.path)).toContain(path);
    expect(await countRows("orders")).toBe(0);
  });

  it("stores Pronete's router answer", async () => {
    const connectionId = await connect("pronete");
    const res = await call("POST", "/orders", { connectionId, details: pronteDetails, payment });
    expect(res.status).toBe(201);
    const [row] = await sql`select needs_router, additional_services, current_provider from public.orders`;
    expect(row).toEqual({ needs_router: true, additional_services: [], current_provider: null });
  });

  it.each([
    ["a question Pronete does not ask", { ...pronteDetails, currentProvider: "Spark" }, "details.currentProvider"],
    ["a missing router answer", { ...pronteDetails, needsRouter: undefined }, "details.needsRouter"],
    ["a plan Pronete does not sell", { ...pronteDetails, dataPlan: "40 Gb" }, "details.dataPlan"],
    ["a blank first name", { ...pronteDetails, firstName: "   " }, "details.firstName"],
    ["a 101-character surname", { ...pronteDetails, surname: "x".repeat(101) }, "details.surname"],
    ["yesterday in Auckland", { ...pronteDetails, contractStartDate: "2026-03-10" }, "details.contractStartDate"],
    ["an impossible date", { ...pronteDetails, contractStartDate: "2026-02-30" }, "details.contractStartDate"],
  ])("rejects %s and stores nothing", async (_label, details, path) => {
    const connectionId = await connect("pronete");
    const res = await call("POST", "/orders", { connectionId, details, payment });
    expect(res.status).toBe(400);
    const { error } = (await res.json()) as { error: { code: string; fields: { path: string }[] } };
    expect(error.code).toBe("VALIDATION_FAILED");
    expect(error.fields.map((f) => f.path)).toContain(path);
    expect(await countRows("orders")).toBe(0);
  });

  it("accepts today in Auckland and a 100-character surname", async () => {
    const connectionId = await connect("pronete");
    const details = { ...pronteDetails, contractStartDate: TODAY_NZ, surname: "x".repeat(100) };
    expect((await call("POST", "/orders", { connectionId, details, payment })).status).toBe(201);
  });

  it.each([
    ["last month", { expiryMonth: 2, expiryYear: 2026 }, 400],
    ["this month", { expiryMonth: 3, expiryYear: 2026 }, 201],
    ["three last digits", { cardLast4: "121" }, 400],
    ["letters as last digits", { cardLast4: "11a1" }, 400],
  ])("card with %s returns %i", async (_label, change, status) => {
    const connectionId = await connect("cloudid");
    const res = await call("POST", "/orders", { connectionId, details: cloudidDetails, payment: { ...payment, ...change } });
    expect(res.status).toBe(status);
    expect(await countRows("orders")).toBe(status === 201 ? 1 : 0);
  });

  it("answers a repeated identical request with the existing order", async () => {
    const connectionId = await connect("cloudid");
    const body = { connectionId, details: cloudidDetails, payment };
    const first = await call("POST", "/orders", body);
    expect(first.status).toBe(201);
    const retry = await call("POST", "/orders", body);
    expect(retry.status).toBe(200);
    expect(await retry.json()).toEqual(await first.json());
    expect(await countRows("orders")).toBe(1);
  });

  it("still answers the retry after the user disconnected", async () => {
    const connectionId = await connect("cloudid");
    const body = { connectionId, details: cloudidDetails, payment };
    const { orderId } = (await (await call("POST", "/orders", body)).json()) as { orderId: string };
    await call("DELETE", `/connections/${connectionId}`);
    const retry = await call("POST", "/orders", body);
    expect(retry.status).toBe(200);
    expect(((await retry.json()) as { orderId: string }).orderId).toBe(orderId);
  });

  it("refuses a different request on a connection that already has an order", async () => {
    const connectionId = await connect("cloudid");
    expect((await call("POST", "/orders", { connectionId, details: cloudidDetails, payment })).status).toBe(201);
    const changed = { ...cloudidDetails, dataPlan: "10 Gb" };
    const res = await call("POST", "/orders", { connectionId, details: changed, payment });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: { code: "ORDER_ALREADY_EXISTS" } });
    const rows = await sql`select data_plan from public.orders`;
    expect(rows).toEqual([{ data_plan: "30 Gb" }]);
  });

  it("creates exactly one order when the same request arrives twice at once", async () => {
    const connectionId = await connect("cloudid");
    const body = { connectionId, details: cloudidDetails, payment };
    const responses = await Promise.all([call("POST", "/orders", body), call("POST", "/orders", body)]);
    expect(responses.map((r) => r.status).sort()).toEqual([200, 201]);
    const [a, b] = (await Promise.all(responses.map((r) => r.json()))) as { orderId: string }[];
    expect(a!.orderId).toBe(b!.orderId);
    expect(await countRows("orders")).toBe(1);
    expect(loggedErrors).toEqual([]);
  });

  it("refuses an order on a disconnected connection", async () => {
    const connectionId = await connect("cloudid");
    await call("DELETE", `/connections/${connectionId}`);
    const res = await call("POST", "/orders", { connectionId, details: cloudidDetails, payment });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: { code: "CONNECTION_CLOSED" } });
    expect(await countRows("orders")).toBe(0);
  });

  it("returns 404 for an unknown connection", async () => {
    const res = await call("POST", "/orders", { connectionId: crypto.randomUUID(), details: cloudidDetails, payment });
    expect(res.status).toBe(404);
  });

  it("rejects a body over 16 KB", async () => {
    const connectionId = await connect("cloudid");
    const details = { ...cloudidDetails, address: "x".repeat(17 * 1024) };
    const res = await call("POST", "/orders", { connectionId, details, payment });
    expect(res.status).toBe(413);
    expect(await countRows("orders")).toBe(0);
  });
});

describe("POST /feedback", () => {
  async function placeOrder(): Promise<string> {
    const connectionId = await connect("cloudid");
    const res = await call("POST", "/orders", { connectionId, details: cloudidDetails, payment });
    return ((await res.json()) as { orderId: string }).orderId;
  }

  it("stores one message per order", async () => {
    const orderId = await placeOrder();
    expect((await call("POST", "/feedback", { orderId, message: "  I loved the experience overall.  " })).status).toBe(204);
    const rows = await sql`select message from public.feedback where order_id = ${orderId}`;
    expect(rows).toEqual([{ message: "I loved the experience overall." }]);

    const again = await call("POST", "/feedback", { orderId, message: "Again" });
    expect(again.status).toBe(409);
    expect(await countRows("feedback")).toBe(1);
  });

  it.each([
    ["an empty message", "   ", 400],
    ["2001 characters", "x".repeat(2001), 400],
    ["2000 characters", "x".repeat(2000), 204],
  ])("handles %s", async (_label, message, status) => {
    const orderId = await placeOrder();
    expect((await call("POST", "/feedback", { orderId, message })).status).toBe(status);
    expect(await countRows("feedback")).toBe(status === 204 ? 1 : 0);
  });

  it("returns 404 for an unknown order", async () => {
    const res = await call("POST", "/feedback", { orderId: crypto.randomUUID(), message: "Hi" });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: { code: "ORDER_NOT_FOUND" } });
  });
});

describe("Data API roles", () => {
  it.each(["anon", "authenticated"])("%s cannot read or write any table", async (role) => {
    for (const table of ["providers", "address_suggestions", "connections", "orders", "feedback"]) {
      const attempt = sql.begin(async (tx) => {
        await tx.unsafe(`set local role ${role}`);
        await tx.unsafe(`select 1 from public.${table} limit 1`);
      });
      await expect(attempt, table).rejects.toMatchObject({ code: "42501" });
    }
  });
});

describe("routing", () => {
  it.each([
    ["GET", "/nope", 404, "NOT_FOUND"],
    ["DELETE", "/providers", 405, "METHOD_NOT_ALLOWED"],
    ["GET", "/orders", 405, "METHOD_NOT_ALLOWED"],
  ])("%s %s returns %i", async (method, path, status, code) => {
    const res = await call(method, path);
    expect(res.status).toBe(status);
    expect(await res.json()).toEqual({ error: { code } });
  });
});
