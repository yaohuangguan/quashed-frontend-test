// Starts a throwaway PostgreSQL cluster with the local binaries and applies the
// Supabase migrations. Used by the API tests and by the local API server.
import { execFileSync } from "node:child_process";
import { chmodSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import postgres from "postgres";

const MIGRATIONS = join(import.meta.dirname, "..", "supabase", "migrations");
const PG_BIN = process.env.PG_BIN ?? "/usr/lib/postgresql/16/bin";

export type LocalCluster = { url: string; stop: () => void };

/** Postgres refuses to run as root, so drop to the postgres user when needed. */
function run(command: string, args: string[]) {
  const binary = join(PG_BIN, command);
  if (process.getuid?.() === 0) execFileSync("runuser", ["-u", "postgres", "--", binary, ...args], { stdio: "ignore" });
  else execFileSync(binary, args, { stdio: "ignore" });
}

/** Asks the OS for a free TCP port. */
export function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      probe.close(() => (typeof address === "object" && address ? resolve(address.port) : reject(new Error("No port"))));
    });
  });
}

export async function startCluster(): Promise<LocalCluster> {
  const dir = mkdtempSync(join(tmpdir(), "digitallly-pg-"));
  chmodSync(dir, 0o777);
  const data = join(dir, "data");
  run("initdb", ["-D", data, "-U", "postgres", "--auth=trust", "-E", "UTF8"]);
  const port = await freePort();
  // -w waits until the server accepts connections.
  run("pg_ctl", [
    "start", "-w", "-D", data, "-l", join(dir, "server.log"),
    "-o", `-p ${port} -k ${dir} -c listen_addresses=localhost -c fsync=off`,
  ]);
  return {
    url: `postgres://postgres@localhost:${port}/postgres`,
    stop() {
      run("pg_ctl", ["stop", "-m", "immediate", "-D", data]);
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

/** Drops the public schema and applies every migration in order. */
export async function migrate(url: string) {
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  await sql.unsafe("drop schema if exists public cascade; create schema public;");
  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) {
    await sql.unsafe(readFileSync(join(MIGRATIONS, file), "utf8"));
  }
  await sql.end();
}
