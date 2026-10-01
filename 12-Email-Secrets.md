# 12 — Email & Secrets

## Email integration
Treat email as a separate capability from desktop filesystem permissions.

## Providers
Gmail and Microsoft Outlook.

## Example
email.search -> fetch messages -> return structured data -> AI summarizes the result.

## Send/reply
Email send and reply actions should follow a configurable confirmation policy.

## Secrets management
Never store passwords or API keys as plain text configuration.

## Storage options
- Windows Credential Manager
- Encrypted local store
- OS keychain
- Environment variables

## Response rule
Sensitive values must be redacted and never returned as raw secrets.
Example: API_KEY=********.