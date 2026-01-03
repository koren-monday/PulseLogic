# Subscription Simplification Implementation Plan

## Overview
Remove BYOK (Bring Your Own Key) option and simplify to 2 tiers (free/paid) with server-managed API keys.

---

## Tier Definitions

### Free Tier
| Feature | Value |
|---------|-------|
| Data fetch range | 7 or 30 days |
| Reports | 1 per week |
| Follow-up questions | 1 per report |
| AI Model | Gemini 3 Flash (server-provided) |
| Daily Snapshot | Not available |
| Report history | Latest only |

### Paid Tier
| Feature | Value |
|---------|-------|
| Data fetch range | 7, 30, 180, or 360 days |
| LLM Communications | 10 per day (reports + chat combined) |
| AI Model | Gemini 3 Flash OR Gemini 3 Pro |
| Daily Snapshot | 1 per day |
| Report history | Full access |

---

## Server-Side API Keys

Two environment variables:
- `GEMINI_API_KEY_FREE` - Used for free tier (Gemini 3 Flash only)
- `GEMINI_API_KEY_PAID` - Used for paid tier (both Flash and Pro)

**Local Development**: Add to `.env` file (gitignored)
**Production**: Set via hosting platform's environment variables UI

---

## Files to Modify

### Phase 1: Server Types & Configuration

#### 1.1 `server/src/types/subscription.ts`
- Remove `free_byok` and `paid_byok` tier configs
- Update `free` tier:
  - `maxDataDays: 30` (allow 7 or 30)
  - `maxReportsPerPeriod: 1`
  - `reportPeriod: 'weekly'`
  - `maxChatMessagesPerReport: 1`
  - `maxSnapshotsPerDay: 0`
  - `allowedModels: ['gemini-3-flash-preview']`
- Update `paid` tier:
  - `maxDataDays: 360`
  - `maxLLMCommunicationsPerDay: 10` (NEW: replaces report/chat limits)
  - `maxSnapshotsPerDay: 1`
  - `allowedModels: ['gemini-3-flash-preview', 'gemini-3-pro-preview']`
  - `canViewReportHistory: true`
- Remove `hasByok` from `EffectiveTier` interface
- Remove `getTierKey()` function (no longer needed)

#### 1.2 `server/src/services/llm/models.ts`
- Remove `MODEL_REGISTRY` for openai/anthropic (keep google only)
- Update to use two server keys:
  - `GEMINI_API_KEY_FREE`
  - `GEMINI_API_KEY_PAID`
- Add `getApiKeyForTier(tier: SubscriptionTier): string`
- Remove `LLMProvider` type (only Google now)
- Simplify model list to just Flash and Pro

#### 1.3 `server/src/services/usage.service.ts`
- Remove `checkHasByok()` function entirely
- Remove all `hasByok` parameters and logic
- Update `canCreateReport()` to use new limits
- Add `canUseLLM(userId: string): Promise<LimitCheckResult>` for paid tier daily limit
- Rename/refactor to track `llmCommunicationsToday` instead of separate report/chat
- Update `recordReportCreated()` to increment `llmCommunicationsToday`
- Update `recordChatMessage()` to increment `llmCommunicationsToday`

#### 1.4 `server/src/services/firestore.service.ts`
- Remove `apiKeys` from `UserSettings` interface
- Add `lifeContexts` as a first-class user setting (already exists, just ensure it's used)
- Update `UsageRecord` to track `llmCommunicationsToday`

#### 1.5 `server/.env.example`
- Remove `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_AI_API_KEY`
- Remove `GEMINI_SERVER_API_KEY`
- Add:
  ```
  # Gemini API Keys (server-provided for all users)
  GEMINI_API_KEY_FREE=your-free-tier-key
  GEMINI_API_KEY_PAID=your-paid-tier-key
  ```

### Phase 2: Server Routes

#### 2.1 `server/src/routes/analyze.routes.ts`
- Remove model/provider selection from request
- Add `useAdvancedModel?: boolean` flag for paid users
- Get tier from user, select appropriate key
- Increment `llmCommunicationsToday` on use

#### 2.2 `server/src/routes/subscription.routes.ts`
- Update `/tier` response to remove `hasByok`
- Add `llmCommunicationsRemaining` for paid tier

### Phase 3: Client Types & Configuration

#### 3.1 `client/src/types/subscription.ts`
- Mirror server changes (remove BYOK configs)
- Remove `hasByok` from `EffectiveTier`
- Update tier limits

#### 3.2 `client/src/types/index.ts`
- Remove `LLMProvider` type (or simplify to just 'google')
- Remove `apiKeys` from `UserSettings`

#### 3.3 `client/src/utils/storage.ts`
- Remove `storeApiKey()`, `getApiKey()` functions
- Keep `UserSettings` but without `apiKeys`

### Phase 4: Client UI Changes

#### 4.1 `client/src/pages/ConfigStep.tsx`
- Remove entire "LLM Provider & Model" section
- Keep only Garmin authentication
- Rename to focus on just connection
- Auto-continue once Garmin authenticated

#### 4.2 `client/src/components/SettingsModal.tsx`
- Complete rewrite: Remove LLM settings
- Rename to "Profile Settings" or "User Settings"
- Add LifeContextSelector here
- Keep modal structure but new content

#### 4.3 `client/src/pages/DataStep.tsx`
- Update `DATA_DAY_OPTIONS` to include 360 days for paid
- Lock 180/360 for free tier
- Remove `getAvailableProvider()` (no user keys)
- Update QuickDailyInsight to use server API

#### 4.4 `client/src/pages/AnalysisStep.tsx`
- Add prominent "Update Life Context" link/button
- For paid tier: Add model choice (Flash vs Pro)
- Remove provider/model selection dropdowns
- Update to call server with `useAdvancedModel` flag

#### 4.5 `client/src/components/Header.tsx`
- Update settings icon to open new User Settings modal
- Ensure Life Context is accessible

#### 4.6 `client/src/components/QuickDailyInsight.tsx`
- Remove `provider`, `apiKey`, `model` props
- Fetch from server endpoint instead

#### 4.7 `client/src/contexts/SubscriptionContext.tsx`
- Remove `hasByok` from context
- Add `llmCommunicationsRemaining` for paid tier

### Phase 5: API Updates

#### 5.1 `client/src/services/api.ts`
- Remove model/provider from analysis request
- Add `useAdvancedModel?: boolean` parameter
- Update QuickDailyInsight to server-side call
- Remove any BYOK-related sync

#### 5.2 `client/src/hooks/` (various)
- Update `useAnalysis` hook for new parameters
- Remove `useModelRegistry` hook if no longer needed

---

## New UI Flow

### ConfigStep (Simplified)
1. User enters Garmin credentials
2. After successful auth → auto-continue to DataStep

### DataStep
1. Select data range (free: 7/30, paid: +180/360)
2. Fetch data
3. Continue to analysis

### AnalysisStep (Updated)
1. "Update Life Context" link → opens settings modal
2. For paid users: "Use Advanced Analysis (Gemini Pro)" toggle
3. Generate Analysis button
4. Chat interface (1 follow-up free, 10/day pool paid)

### Settings Modal (New)
- Life Context management
- No LLM/API key settings

---

## Data Migration
No migration needed - BYOK keys were stored in Firestore but will simply be ignored. The `apiKeys` field in user settings can remain (unused) or be cleaned up in a future pass.

---

## Testing Checklist
- [ ] Free tier can generate 1 report/week
- [ ] Free tier gets 1 follow-up per report
- [ ] Free tier cannot access 180/360 day options
- [ ] Free tier cannot use Daily Snapshot
- [ ] Paid tier can use 10 LLM calls/day
- [ ] Paid tier can choose Flash vs Pro
- [ ] Paid tier can use Daily Snapshot once/day
- [ ] Paid tier has full report history
- [ ] Life Context accessible from settings
- [ ] Life Context link visible in analysis flow
- [ ] Server uses correct API key per tier
