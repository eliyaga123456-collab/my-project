# Contract requests (mobile -> API / shared)

1. **Push + notification payload keys.** `NotificationDto.data` is `Record<string,string> | null` and the push payload shape is
   undocumented. Mobile assumes `data.messageId` (UUID of the message) in both the in-app notification and the Expo push `data`
   to deep-link to `/message/:id`. Please document/guarantee this key (fallback is the inbox tab).
2. **Proof-of-work details.** Mobile reads `ApiError.details.challenge` (a `ChallengeDto`) on `428 challenge_required` and falls back
   to `GET /public/challenge` if absent. Please confirm `details.challenge` is always present, and that `difficulty` is kept low
   enough for a JS (Hermes) sha256 loop (roughly <= 18 bits).
3. **Answer share URL.** `ReplyDto` only has `answerId`; mobile builds `${EXPO_PUBLIC_WEB_URL}/a/{answerId}` itself. Prefer a
   server-provided `shareUrl` on `ReplyDto` so the origin has one source of truth.
4. **Avatar URLs.** `ProfileDto.avatarUrl` may be absolute or relative (`/api/v1/media/:key`). Mobile resolves relative values against
   `EXPO_PUBLIC_API_URL`. Please confirm which form the API returns.
5. **Block response.** `POST /messages/:id/block` returns `BlockDto` but the message is archived server-side; returning the updated
   `MessageDto` too would save a refetch (mobile just removes the card from the current list).
6. **Not-found detection on public pages.** Mobile distinguishes 404 by `ApiError.code === "not_found"` (via `friendly`); account
   suspended/banned public profiles should consistently return 404 (per API.md) so the page shows "Link not found".
7. **Email verification deep link.** `POST /auth/verify-email` / `reset-password` tokens arrive by email as web links. Mobile has no
   handler for `ear://verify?token=` or `ear://reset?token=`; if the emails should open the app, define those links.
8. **Session user-agent.** `SessionDto.userAgent` for mobile is the RN/okhttp/CFNetwork UA; consider storing a friendly device label from
   `x-client: mobile` + an optional `x-device-name` header.
9. **PoW cost on Hermes.** Live difficulty is 16 bits; the JS solver takes ~40-850 ms in Node/V8 (measured). Hermes is typically several times slower, so
   keep difficulty <= 18 for mobile, or let the API send easier challenges to `x-client: mobile`.
10. **Admin tools need a verified email** (`email_not_verified` 403 on `/admin/*`). Moderators created by changing the role in the DB must also have
    `email_verified_at` set; the admin UI showed a generic error in that case.
11. **Localised client-side strings in the packages.** `ApiError.friendly` (api-client) and the zod messages in `@unsaid/shared` (username/password/message
    length, "Write a little more", ...) are English-only. Mobile re-implements them with its own Hebrew/English dictionaries (`src/lib/errors.ts`, `src/lib/validation.ts`),
    matching zod issue *codes*. Please either expose message *codes*/params instead of English text, or accept a locale in `friendly`.
12. **Brand copy in `@unsaid/tokens`.** `brand.tagline`, `brand.dedication`, `brand.dedicationSr` and `brand.fullName` are English only; mobile keeps Hebrew copy in
    `src/i18n/he.ts` (`brand.*`). A `{ en, he }` shape in tokens would give web and mobile one source of truth.
13. **Machine-readable reasons for `link_paused`.** Mobile no longer pattern-matches the (now localised) message to tell a *closed* round from a *paused* link; it re-reads
    the public profile's `linkState`. A `details.reason: "closed" | "paused"` on the 423 would avoid the extra request.
