import type { DeepString } from "../../types";
import type { en } from "../en";
import { app } from "./app";
import { auth } from "./auth";
import { common } from "./common";
import { pub } from "./public";
import { site } from "./site";
/** Typed against `en`: a missing or extra key is a compile error. */
export const he: DeepString<typeof en> = { common, site, auth, public: pub, app };
