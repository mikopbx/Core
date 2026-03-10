# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest release | Yes |
| Previous release | Security fixes only |
| Older versions | No |

We recommend always running the latest version of MikoPBX. Updates can be applied through the web interface, console, or by pulling a new Docker image.

## Reporting a Vulnerability

If you discover a security vulnerability in MikoPBX, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please send an email to **support@mikopbx.com** with:

- A description of the vulnerability
- Steps to reproduce the issue
- The potential impact
- Any suggested fix (if available)

### What to Expect

- **Acknowledgment**: We will acknowledge your report within 48 hours.
- **Assessment**: We will assess the vulnerability and determine its severity.
- **Fix**: We will work on a fix and coordinate the release with you.
- **Credit**: We will credit you in the release notes (unless you prefer to remain anonymous).

## Security Best Practices

When deploying MikoPBX, we recommend:

1. **Change default credentials** immediately after installation (default: `admin`/`admin`)
2. **Enable the firewall** and restrict access to management ports
3. **Enable Fail2Ban** to protect against brute-force attacks
4. **Use HTTPS** for the web interface (Let's Encrypt module available in marketplace)
5. **Keep MikoPBX updated** to the latest version
6. **Restrict SIP access** to known IP ranges when possible
7. **Use strong passwords** for all SIP extensions and web accounts

## Scope

The following are in scope for security reports:

- MikoPBX Core (this repository)
- Official MikoPBX modules
- The web administration interface
- The REST API
- Authentication and authorization mechanisms

The following are out of scope:

- Third-party modules not developed by MIKO LLC
- Vulnerabilities in upstream dependencies (report these to the respective projects)
- Social engineering attacks
- Denial of service attacks
