# Security Policy

## Reporting a vulnerability

Please report security issues privately. Do not open a public issue for a
vulnerability, and do not include exploit details in a public discussion.

Report through GitHub's private vulnerability reporting on this repository
(Security → Report a vulnerability). If that is unavailable, contact a
maintainer directly and ask for a private channel before sharing details.

Please include:

- what the issue allows an attacker to do;
- the affected route, component or dependency;
- reproduction steps or a proof of concept;
- any suggested mitigation.

We aim to acknowledge reports within a few days and to publish a fix and an
advisory once a patch is available.

## Scope

In scope:

- the web application and its API routes;
- the data ingestion service and adapters;
- the database schema and row-level security policies;
- authentication and authorization of any optional hosted components;
- dependency vulnerabilities that affect RiskSense in practice.

Out of scope:

- vulnerabilities in third-party data providers, map tile servers or other
  external services (report those to the provider);
- denial of service through sheer request volume against a public deployment
  without a rate limit;
- findings that require a compromised device or a malicious browser extension.

## Security design notes

- **No secrets in the client.** Provider keys are read only in server-side code
  and route handlers. Only variables prefixed `NEXT_PUBLIC_` are exposed, and
  none of those are credentials.
- **Read-only public API.** Public endpoints expose hazard events only. No
  private user data and no provider credentials are ever returned.
- **Community reports are untrusted.** They are rate limited, coarsened in
  location for privacy, stored separately from source events, marked unverified,
  and can never trigger an automated response.
- **No automatic dispatch.** RiskSense never places a call or contacts a
  responder on the user's behalf.
- **Least privilege.** Any persistence uses the anon key on the client and a
  service-role key only in server code, never in the browser bundle.
- **Upstream input is validated.** Adapter payloads are parsed with schema
  validation, and unexpected shapes become a reported degraded status rather than
  being trusted.
- **Error messages do not leak internals.** User-facing errors describe what
  failed, not stack traces or configuration.

## Handling of personal data

RiskSense is designed to hold as little personal data as possible. Location is
used in the browser to focus the map and match alerts, and alert areas are stored
in the user's own browser storage by default. If a deployment enables persisted
reports, the schema stores a coarsened location and no account identifiers beyond
what the operator configures.

## Supported versions

Security fixes are applied to the default branch. Deployments should track it or
a tagged release.
