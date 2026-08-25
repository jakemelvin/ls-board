# CI and production monitoring

## Continuous integration

GitHub Actions runs on each pull request and push to `main`:

- dependency installation locked to `pnpm-lock.yaml`;
- ESLint, TypeScript verification, and the production build;
- deterministic Playwright smoke coverage for login, expiration handling, registration, and QR parsing.

The CI smoke suite does not authenticate with the remote backend. Its requests to the configured API endpoint are intercepted by the tests. Backend security-contract checks remain opt-in (`RUN_BACKEND_SECURITY_CONTRACT=1`) and must run only against a dedicated test environment with non-production accounts.

## Vercel monitoring

`@vercel/analytics` is enabled only in production. `ProductionMonitoring` adds two aggregate custom-event sources:

- `client_error` / `error` for uncaught browser errors;
- `client_error` / `unhandled_rejection` for unhandled promise rejections.

At most five of these events are sent per page lifetime. Error messages, URLs, user identifiers, tokens, request bodies, and other business data are deliberately excluded.

After connecting the repository to Vercel, enable Web Analytics in the project dashboard and create alert policies for an unusual increase in `client_error` events and degraded Web Vitals. Route alerts to the production on-call channel. Review the dashboard weekly and use the Playwright artifact attached to a failed CI run for reproduction evidence.

## Required configuration

CI requires no repository secret. A Vercel deployment needs its normal project linkage and the production environment variables listed in `.env.local.template`, especially `NEXT_PUBLIC_API_BASE_URL` and the Firebase public configuration when push notifications are enabled. Do not put API credentials or bearer tokens in GitHub Actions variables or `NEXT_PUBLIC_*` values.
