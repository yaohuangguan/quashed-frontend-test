// Runs the `api` Edge Function code under Node against a throwaway local
// Postgres, for end-to-end tests and offline development. The deployed
// function uses the same createApp; only this entry point differs.
//
//   node scripts/local-api.ts            -> http://localhost:54321/api
//   PORT=4000 node scripts/local-api.ts
import { createServer } from "node:http";
import postgres from "postgres";
import { createApp } from "../supabase/functions/api/app.ts";
import { migrate, startCluster } from "./local-postgres.ts";

export const LOCAL_API_KEY = "sb_publishable_local_development_key";
const port = Number(process.env.PORT ?? 54321);

const cluster = await startCluster();
await migrate(cluster.url);
const sql = postgres(cluster.url, { max: 5, onnotice: () => {} });
const handle = createApp({
  sql,
  apiKeys: [LOCAL_API_KEY],
  now: () => new Date(),
  logError: (event, fields) => console.error(JSON.stringify({ event, ...fields })),
});

const server = createServer(async (req, res) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (typeof value === "string") headers.set(name, value);
  }
  const body = req.method === "GET" || req.method === "HEAD" ? undefined : Buffer.concat(chunks);
  const response = await handle(new Request(`http://localhost:${port}${req.url}`, { method: req.method, headers, body }));
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
});

function shutdown() {
  server.close();
  void sql.end().finally(() => {
    cluster.stop();
    process.exit(0);
  });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

server.listen(port, () => console.log(`Local API on http://localhost:${port}/api (apikey: ${LOCAL_API_KEY})`));
