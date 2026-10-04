import { solveChallenge } from "@unsaid/api-client";
import type { ChallengeDto } from "@unsaid/shared";
import { sha256 } from "./sha256";

/** Solves the server's proof-of-work challenge using the pure-JS sha256 (sync, yields to the UI periodically). */
export function solvePow(c: ChallengeDto): Promise<{ id: string; nonce: string }> {
  return solveChallenge(c, sha256);
}
