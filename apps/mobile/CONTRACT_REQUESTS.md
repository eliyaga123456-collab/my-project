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
