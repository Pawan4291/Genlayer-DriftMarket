/**
 * GET /api/validators — returns live validator info from the GenLayer network.
 * Used by ValidatorStrip component.
 */
import { NextResponse } from "next/server";
import { getReadClient } from "@/chain/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const client = getReadClient();
    const validators = await client.getActiveValidators();
    return NextResponse.json({ validators });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("GET /api/validators error:", message);
    // Return empty — frontend shows loading state, not fake data
    return NextResponse.json({ validators: [], error: message });
  }
}
