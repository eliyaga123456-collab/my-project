import type { Locale } from "../config";
import { en } from "./en";
import { he } from "./he";

export type Dictionary = typeof en;
export const dictionaries: Record<Locale, Dictionary> = { en, he };
