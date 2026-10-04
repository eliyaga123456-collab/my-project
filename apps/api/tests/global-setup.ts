import { migrate } from "../src/db/migrate";

export default async function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgres://postgres@localhost:5432/unsaid_test";
  await migrate(url, () => undefined);
}
