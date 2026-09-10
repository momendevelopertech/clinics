/**
 * Next.js server boot hook. Runs once when the Node.js runtime starts.
 * @see https://nextjs.org/docs/app/guides/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") {
    return;
  }

  const { assertProductionSecrets } = await import("./lib/boot-env");
  assertProductionSecrets();
}
