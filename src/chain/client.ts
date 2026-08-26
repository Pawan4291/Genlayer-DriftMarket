/**
 * Server-side GenLayer chain client.
 * Uses genlayer-js to connect to testnet-bradbury (or studionet for local dev).
 * NEVER import this in client components — it reads process.env directly.
 */
import { createClient, createAccount } from "genlayer-js";
import { testnetBradbury, studionet, localnet } from "genlayer-js/chains";

function resolveChain() {
  const network = process.env.GENLAYER_NETWORK ?? "testnetBradbury";
  if (network === "studionet") return studionet;
  if (network === "localnet") return localnet;
  return testnetBradbury;
}

/** Read-only client (no account needed) */
export function getReadClient() {
  return createClient({
    chain: resolveChain(),
  });
}

/** Write client — requires AGENT_SERVICE_PRIVATE_KEY in env */
export function getWriteClient() {
  const pk = process.env.AGENT_SERVICE_PRIVATE_KEY;
  if (!pk) {
    throw new Error(
      "AGENT_SERVICE_PRIVATE_KEY is not set — cannot submit signed transactions"
    );
  }
  const account = createAccount(pk as `0x${string}`);
  return createClient({
    chain: resolveChain(),
    account,
  });
}

export const CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}` | undefined) ?? undefined;
