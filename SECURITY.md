# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 0.1.x   | ✅ Yes    |

## Reporting a Vulnerability

StreetCheck is a civic safety platform. We take security seriously.

**Do not open a public GitHub issue for security vulnerabilities.**

To report a vulnerability:

1. Email the maintainer directly via the GitHub profile contact
2. Include: description of the vulnerability, steps to reproduce, potential impact
3. You will receive an acknowledgement within 48 hours
4. We aim to release a fix within 7 days of confirmation

## Scope

In scope:

- SQL injection or data exposure via API endpoints
- Authentication bypass
- Exposure of environment variables or API keys
- XSS vulnerabilities in the React client

Out of scope:

- Denial of service via the public API (rate limiting is applied)
- Issues in third-party dependencies (report to the upstream project)

## Security Measures

- All API inputs validated with Zod schemas
- Helmet.js HTTP security headers on all responses
- Rate limiting: 200 requests / 15 min per IP on all endpoints
- No PII stored — all reports use anonymous client-generated UUIDs
- Secrets scanned on every commit via Gitleaks
- Dependencies audited on every CI run via `npm audit`
