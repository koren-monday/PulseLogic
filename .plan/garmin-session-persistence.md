# Garmin Session Persistence Implementation Plan

## Goal
Enable persistent Garmin sessions so users don't need to re-authenticate with MFA after the initial login, similar to how connect.garmin.com remembers logins.

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend       │────▶│  Token Storage  │
│                 │     │                 │     │  (File-based)   │
│ localStorage:   │     │ GarminService:  │     │                 │
│ - sessionId     │     │ - exportToken() │     │ oauth1.json     │
│ - credentials   │     │ - loadToken()   │     │ oauth2.json     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Implementation Checklist

### Phase 1: Backend Token Persistence
- [ ] **1.1** Create token storage module (`server/src/services/token-storage.ts`)
  - [ ] Define `GarminTokens` interface matching library types
  - [ ] Implement `saveTokens(userId, tokens)` - encrypts and saves to file
  - [ ] Implement `loadTokens(userId)` - loads and decrypts tokens
  - [ ] Implement `deleteTokens(userId)` - removes stored tokens
  - [ ] Use user's email hash as filename for privacy

- [ ] **1.2** Update `GarminService` class (`server/src/services/garmin.service.ts`)
  - [ ] Add `exportTokens()` method to get current OAuth tokens
  - [ ] Add `restoreFromTokens(tokens)` method to restore session
  - [ ] Add `getUserId()` to identify the current user for token storage
  - [ ] Persist tokens after successful login/MFA completion

- [ ] **1.3** Add new API endpoints (`server/src/routes/garmin.routes.ts`)
  - [ ] `POST /api/garmin/restore` - restore session from stored tokens
  - [ ] Update logout to optionally clear stored tokens
  - [ ] Return `canRestore: true` in status when tokens exist

### Phase 2: Frontend Session Persistence
- [ ] **2.1** Update storage utilities (`client/src/utils/storage.ts`)
  - [ ] Change session storage from `sessionStorage` to `localStorage`
  - [ ] Add `storeCredentialsHash(hash)` for token lookup
  - [ ] Add `getCredentialsHash()` for restore attempts
  - [ ] Add `clearGarminAuth()` to clear all auth data on logout

- [ ] **2.2** Add session restore flow (`client/src/services/api.ts`)
  - [ ] Add `restoreGarminSession()` API function
  - [ ] Update `checkGarminStatus()` to include restore capability info

- [ ] **2.3** Update login flow (`client/src/pages/LoginPage.tsx`)
  - [ ] Attempt session restore on mount before showing login form
  - [ ] Show "Restoring session..." state during restore attempt
  - [ ] Fall back to login form if restore fails

### Phase 3: Security Considerations
- [ ] **3.1** Encrypt tokens at rest using environment secret
- [ ] **3.2** Token files stored in `.garmin-tokens/` directory (gitignored)
- [ ] **3.3** Add token expiry validation before restore attempt
- [ ] **3.4** Clear tokens on explicit logout (but not on session timeout)

## File Changes Summary

| File | Change |
|------|--------|
| `server/src/services/token-storage.ts` | **NEW** - Token persistence module |
| `server/src/services/garmin.service.ts` | Add token export/restore methods |
| `server/src/routes/garmin.routes.ts` | Add `/restore` endpoint, update `/logout` |
| `client/src/utils/storage.ts` | Switch to localStorage, add auth helpers |
| `client/src/services/api.ts` | Add `restoreGarminSession()` |
| `client/src/pages/LoginPage.tsx` | Add auto-restore on mount |
| `.gitignore` | Add `.garmin-tokens/` |

## Security Notes
- OAuth tokens are sensitive - encryption at rest is essential
- Tokens tied to user email hash, not plaintext credentials
- Refresh tokens have ~1 year validity (per Garmin)
- Library auto-refreshes OAuth2 tokens when needed
