# Security Policy

## Reporting a Vulnerability

If you discover a security issue in Photonic, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, email: **thephoenixfactory@outlook.com**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact

## Response

- Acknowledgment within 48 hours
- Fix or mitigation within 7 days for critical issues

## Scope

Photonic runs **locally** and does not communicate with external servers. The main attack surface is:

- The local HTTP server (uvicorn, bound to `127.0.0.1`)
- File system access during photo scanning
- SQLite database operations

## What is NOT in scope

- Issues requiring physical access to the user's machine
- Vulnerabilities in third-party dependencies (report upstream)
