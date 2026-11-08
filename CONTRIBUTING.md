# Contributing to RiskSense

Thank you for helping build a public-safety tool. This document explains what is
most useful to contribute and how to do it without breaking the guarantees the
platform makes to its users.

By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

## The one rule that matters

RiskSense tells people about danger. Anything that makes it less accurate or less
honest is a regression, no matter how good it looks.

Concretely, a contribution must not:

- invent events, coordinates, severity, statuses or emergency instructions;
- present a satellite detection as a confirmed incident;
- present an ordinary forecast as an emergency warning;
- assume a universal emergency number;
- state or imply that a location is safe because nothing is displayed;
- present estimated or synthetic statistics as measured data.

## Ways to contribute

### Add a hazard data source (highest value)

1. **Confirm the access terms.** The source must be publicly accessible, permit
   automated retrieval, and have clear attribution requirements. If the terms are
   ambiguous, open an issue before writing code.
2. **Write one adapter.** Create `packages/data-sources/adapters/<name>.ts`
   implementing `HazardAdapter`. See
   [docs/development.md](docs/development.md#adding-a-hazard-source).
3. **Normalize honestly.** Map only fields the source actually provides. Do not
   infer coordinates, severity or status. Set `isDetection` correctly. Keep the
   raw payload under `raw`.
4. **Degrade gracefully.** A timeout or an unexpected payload must return a
   status, not throw into the aggregation. Use `statusFor` and
   `fetchWithTimeout` from `packages/data-sources/types.ts`.
5. **Register it.** Add the adapter to `packages/data-sources/registry.ts`.
6. **Validate the response.** Parse upstream JSON with a zod schema so a schema
   change upstream becomes a reported "degraded" status rather than bad data.
7. **Document it.** Add a row to [docs/data-sources.md](docs/data-sources.md) with
   the license, cadence and known limitations.
8. **Test it.** Add a fixture-based test that feeds a recorded payload through
   the adapter and asserts the normalized output.

### Correct emergency contact data (highest urgency)

Emergency numbers change and vary by region within a country. Edit
`packages/shared/emergency-data.ts` and include the **official government
source** you verified the number against. Set `verified: false` if you cannot
confirm it against a government page — the UI will then say the number is not
verified, which is better than being confidently wrong.

### Report a bug

Use the bug report template. Include what you expected, what happened, your
browser, and — where relevant — the event id or source id involved.

### Request a feature

Use the feature request template and describe the user need before the
implementation. Features that improve accuracy, coverage, clarity or
accessibility are prioritised over features that add decoration.

### Improve translations

Interface strings live in `apps/web/src/lib/i18n.ts`. Event content stays in the
language its source published and is never machine-translated into a warning.

## Development workflow

```bash
npm install
npm run dev          # http://localhost:3000
npm run typecheck    # must pass
npm run lint         # must pass
npm run test         # must pass
```

Before opening a pull request:

1. `npm run typecheck && npm run lint && npm run test`
2. Verify the affected pages manually. For map or feed changes, confirm real
   events still render and that the source panel reports feed health.
3. Update documentation for anything user-visible.
4. Keep the pull request focused on one concern.

## Code standards

- **TypeScript**, strict. Avoid `any`; prefer explicit types at module
  boundaries.
- **No source-specific logic outside adapters.** If the map, feed or engine
  needs to know about a provider, the adapter is wrong.
- **Comments explain why, not what.** Keep them for non-obvious invariants,
  measurement choices and deliberate trade-offs. Do not narrate the diff.
- **No mock data in the production event feed.** If demo data is ever needed for
  a presentation, keep it in a separate, clearly labelled module that is never
  wired into the live API.
- **Accessibility.** Interactive controls need accessible names and keyboard
  reachability. Map controls are a common failure point.

## Commit and pull request conventions

- Write a plain-language commit subject in the imperative mood.
- Describe the change and its user impact in the pull request.
- Link the issue it closes, if any.
- Note any data source added, and its license.

## License of contributions

By contributing you agree that your contribution is licensed under the
[Apache License 2.0](LICENSE), the same license as the project.
