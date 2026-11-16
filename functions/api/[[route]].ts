// Cloudflare Pages Function: every /api/* request goes to the Relay router.
import { handle } from "../../api/router.ts";
import type { Env } from "../../api/router.ts";

export const onRequest = (context: { request: Request; env: Env }) => handle(context.request, context.env);
