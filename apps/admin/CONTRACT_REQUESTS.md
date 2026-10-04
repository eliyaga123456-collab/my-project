# Contract requests (admin -> API)

1. `/admin/*` returns 403 `email_not_verified` for staff whose email is unverified. Fine, but a moderator promoted via SQL must also be verified;
   document it in the seed/runbook. In the browser the Users page showed a generic "Something went wrong" error for such a moderator (unverified), not investigated further.
2. `AdminReportDto` has no `source` summary (hashed ref or whether the source is already banned/suspended). It would let the Reports card show
   "source already banned" and disable the Ban source button. Not required.
3. There is no endpoint to list or lift banned sources (`banned_sources`), so a "Ban source" cannot be undone from the admin UI. Suggest
   `GET /admin/banned-sources` and `POST /admin/banned-sources/:id/lift`.
