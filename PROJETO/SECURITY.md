# Security Policy

## Supported Version
This repository currently supports only the `main` branch.

## Reporting a Vulnerability
If you find a security issue, do not open a public issue with exploit details.
Report privately to the repository owner first and include:
- what was affected
- how to reproduce
- potential impact

## Repository Security Defaults
- Secrets must never be committed to Git.
- Environment files are ignored by default (`.env*`, except `.env.example`).
- CI runs automated secret scanning on push and pull request.
- Dependency review runs automatically on pull requests.

## Secret Rotation Checklist
If any token/key is exposed (even in screenshots):
1. Rotate the key immediately in the provider dashboard.
2. Update Vercel environment variables.
3. Redeploy affected environments.
4. Invalidate old sessions/tokens when supported.
