// Vitest global setup: gives the API tests a real, freshly migrated Postgres.
//
// If TEST_DATABASE_URL is set, that database is used (it must be disposable:
// the public schema is dropped and recreated). Otherwise a throwaway cluster
// is started with the local PostgreSQL binaries and removed afterwards.
import type { TestProject } from "vitest/node";
import { migrate, startCluster, type LocalCluster } from "./local-postgres.ts";

let cluster: LocalCluster | undefined;

export async function setup(project: TestProject) {
  let url = process.env.TEST_DATABASE_URL;
  if (!url) {
    cluster = await startCluster();
    url = cluster.url;
  }
  await migrate(url);
  project.provide("databaseUrl", url);
}

export function teardown() {
  cluster?.stop();
}

declare module "vitest" {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}
