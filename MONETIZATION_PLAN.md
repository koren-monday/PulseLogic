# PulseLogic Monetization Implementation Plan

## Overview

Implementing a 4-tier monetization system:
1. **Free** - Limited features, server-provided Gemini key
2. **Free + BYOK** - Enhanced features with user's own API keys
3. **Paid** - Premium features, server-provided Gemini key
4. **Paid + BYOK** - Unlimited everything (current behavior)

---

## Tier Feature Matrix

| Feature | Free | Free+BYOK | Paid | Paid+BYOK |
|---------|------|-----------|------|-----------|
| Data range | 7 days | 30 days | 180 days | Unlimited |
| Reports per period | 1/week | Unlimited | 1/day | Unlimited |
| Chat (follow-ups) | No | Unlimited | 1 question | Unlimited |
| Daily Snapshot | No | Yes | 1/day | Unlimited |
| Models | Gemini 3 Flash only | Any with key | Gemini 3 Flash | Any with key |
| Report history | Latest only | Full | Full | Full |

---

## Implementation Phases

### Phase 1: Core Types & Schema

**Files to create/modify:**
- `server/src/types/subscription.ts` - New file for tier types
- `server/src/services/firestore.service.ts` - Add subscription schema
- `client/src/types/subscription.ts` - Client-side tier types

**Schema additions:**
```typescript
interface UserSubscription {
  tier: 'free' | 'paid';
  hasByok: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: string;
  status: 'active' | 'cancelled' | 'past_due';
}

interface UsageLimits {
  reportsThisPeriod: number;
  lastReportDate: string;
  chatMessagesToday: number;
  snapshotsToday: number;
  periodStart: string; // For weekly reset (free) or daily reset (paid)
}
```

### Phase 2: Usage Tracking Service

**Files to create:**
- `server/src/services/usage.service.ts` - Track and enforce limits

**Key functions:**
- `getUserTierInfo(userId)` - Returns effective tier (considering BYOK)
- `canCreateReport(userId)` - Check report limit
- `canSendChatMessage(userId)` - Check chat limit
- `canUseSnapshot(userId)` - Check snapshot limit
- `getDataDaysLimit(userId)` - Return max days allowed
- `incrementUsage(userId, type)` - Increment counters
- `resetDailyUsage()` - Cron job or on-demand reset

### Phase 3: Server-Side API Key Management

**Files to modify:**
- `server/src/services/llm/models.ts` - Add server-side Gemini key
- `.env` / `server/.env` - Add `GEMINI_SERVER_API_KEY`

**Logic:**
- Free tier: Use server's Gemini key, force `gemini-3-flash-preview` model
- BYOK tiers: Use user's provided key
- Paid without BYOK: Use server's Gemini key

### Phase 4: API Endpoint Modifications

**Files to modify:**
- `server/src/routes/analyze.routes.ts` - Add tier enforcement
- `server/src/routes/garmin.routes.ts` - Add data range limits
- `server/src/routes/user.routes.ts` - Add subscription endpoints

**New endpoints:**
```
GET  /api/user/subscription - Get current tier & limits
POST /api/user/subscription/check-limits - Check if action allowed
POST /api/user/subscription/webhook - Stripe webhook
```

**Modified endpoints:**
- `POST /api/analyze` - Check report limits, enforce model restrictions
- `POST /api/analyze/chat` - Check chat limits, enforce message count
- `POST /api/garmin/data` - Enforce data range limits

### Phase 5: Stripe Integration

**Files to create:**
- `server/src/services/stripe.service.ts` - Stripe SDK integration
- `server/src/routes/subscription.routes.ts` - Checkout & portal

**Dependencies to add:**
- `stripe` package

**Implementation:**
- Create Stripe products/prices for monthly subscription
- Checkout flow for upgrading
- Customer portal for management
- Webhook handling for subscription events

### Phase 6: Client-Side UI Changes

**Files to modify:**
- `client/src/utils/storage.ts` - Add subscription storage
- `client/src/services/api.ts` - Add subscription API calls
- `client/src/App.tsx` - Pass subscription context
- `client/src/pages/DataStep.tsx` - Limit day selection
- `client/src/pages/AnalysisStep.tsx` - Hide/disable chat, show upgrade prompts
- `client/src/components/QuickDailySnapshot.tsx` - Check limit
- `client/src/components/SettingsModal.tsx` - Show tier, upgrade button

**New components:**
- `client/src/components/SubscriptionBanner.tsx` - Show current tier
- `client/src/components/UpgradeModal.tsx` - Pricing & checkout
- `client/src/components/UsageLimitReached.tsx` - Limit exceeded message

### Phase 7: Context & State Management

**Files to create:**
- `client/src/contexts/SubscriptionContext.tsx` - Global subscription state

**Provides:**
- Current tier info
- Usage limits
- Helper functions (`canChat()`, `canCreateReport()`, etc.)
- Upgrade modal trigger

---

## Detailed Implementation Steps

### Step 1: Add Subscription Types (Server)
1. Create `server/src/types/subscription.ts` with tier types
2. Export from `server/src/types/index.ts`

### Step 2: Add Subscription Types (Client)
1. Create `client/src/types/subscription.ts`
2. Export from `client/src/types/index.ts`

### Step 3: Extend Firestore Schema
1. Add `subscription` field to user document
2. Add `usage` subcollection for tracking
3. Add helper functions for subscription CRUD

### Step 4: Create Usage Service
1. Implement usage tracking functions
2. Add period reset logic (weekly for free, daily for paid)
3. Add BYOK detection logic

### Step 5: Add Server Gemini Key
1. Add env variable `GEMINI_SERVER_API_KEY`
2. Modify `createModel()` to use server key when needed
3. Add tier check to determine key source

### Step 6: Modify Garmin Data Endpoint
1. Get user's tier before fetching
2. Cap `days` parameter to tier limit
3. Return warning if capped

### Step 7: Modify Analyze Endpoint
1. Check report creation limit
2. Force model to Gemini Flash for non-BYOK free tier
3. Increment usage counter on success
4. Return tier info in response

### Step 8: Modify Chat Endpoint
1. Check chat message limit
2. For Paid (non-BYOK): limit to 1 message per report
3. For Free (non-BYOK): reject all chat
4. Return remaining messages in response

### Step 9: Add Subscription API Endpoints
1. GET subscription status
2. POST create checkout session
3. POST Stripe webhook handler
4. GET customer portal URL

### Step 10: Implement Stripe Integration
1. Install Stripe SDK
2. Create products in Stripe dashboard
3. Implement checkout session creation
4. Implement webhook handling
5. Add subscription status sync

### Step 11: Create Subscription Context (Client)
1. Create context provider
2. Add subscription fetch on login
3. Expose tier checks as hooks

### Step 12: Update DataStep Component
1. Limit date range options based on tier
2. Show "upgrade for more" on locked options
3. Pass tier info to day selector

### Step 13: Update AnalysisStep Component
1. Disable chat input for Free (non-BYOK)
2. Show "1 question remaining" for Paid (non-BYOK)
3. Disable model selector for non-BYOK free
4. Show upgrade prompts

### Step 14: Update QuickDailySnapshot
1. Check snapshot limit before fetching
2. Show limit reached message
3. Add upgrade prompt

### Step 15: Update SettingsModal
1. Show current subscription tier
2. Show usage stats
3. Add "Upgrade" button
4. Link to Stripe customer portal

### Step 16: Add Upgrade Flow
1. Create pricing modal
2. Redirect to Stripe checkout
3. Handle success/cancel returns
4. Sync subscription after checkout

### Step 17: Add Visual Tier Indicators
1. Add tier badge to header
2. Add usage indicators
3. Add upgrade banners where relevant

---

## Key Design Decisions

### BYOK Detection
A user is considered BYOK if they have at least one valid API key configured in their settings. The `hasByok` flag is computed, not stored:
```typescript
const hasByok = Object.values(settings.apiKeys).some(key => !!key);
```

### Rate Limit Periods
- **Free tier**: Weekly reset (reports)
- **Paid tier**: Daily reset (reports, chat, snapshots)
- Reset at midnight UTC

### Chat Limit Enforcement
For Paid (non-BYOK), limit 1 chat message per *report session*, not globally. Track via `reportId + messageCount` in report metadata.

### Model Restriction
Non-BYOK users can only select from a restricted model list (just Gemini Flash). The server enforces this even if client tries to bypass.

### Data Range Enforcement
Server-side enforcement in Garmin data endpoint. Client shows limited options but server validates.

### Graceful Degradation
- If Stripe unavailable: Show error, don't break app
- If usage service fails: Log error, allow action (fail open for UX)
- If server key quota exceeded: Queue or show temporary error

---

## Migration Strategy

1. **Deploy with all users as "free" by default**
2. Existing reports and data preserved
3. Users with API keys get "free + BYOK" automatically
4. No forced action required from users

---

## Testing Checklist

- [ ] Free tier can only select 7 days
- [ ] Free tier uses Gemini Flash only
- [ ] Free tier limited to 1 report/week
- [ ] Free tier cannot chat
- [ ] Free tier cannot use snapshot
- [ ] Free + BYOK gets 30 days
- [ ] Free + BYOK can chat unlimited
- [ ] Free + BYOK can use any model they have key for
- [ ] Paid tier gets 180 days
- [ ] Paid tier limited to 1 report/day
- [ ] Paid tier limited to 1 chat message per report
- [ ] Paid tier limited to 1 snapshot/day
- [ ] Paid + BYOK has no limits
- [ ] Stripe checkout works
- [ ] Stripe webhook updates subscription
- [ ] Subscription cancellation works
- [ ] Usage counters reset correctly

---

## Files Changed Summary

### New Files (14)
```
server/src/types/subscription.ts
server/src/services/usage.service.ts
server/src/services/stripe.service.ts
server/src/routes/subscription.routes.ts
server/src/middleware/subscription.middleware.ts
client/src/types/subscription.ts
client/src/contexts/SubscriptionContext.tsx
client/src/hooks/useSubscription.ts
client/src/components/SubscriptionBanner.tsx
client/src/components/UpgradeModal.tsx
client/src/components/UsageLimitReached.tsx
client/src/components/TierBadge.tsx
client/src/pages/PricingPage.tsx
client/src/pages/CheckoutSuccessPage.tsx
```

### Modified Files (12)
```
server/src/types/index.ts
server/src/services/firestore.service.ts
server/src/services/llm/models.ts
server/src/routes/analyze.routes.ts
server/src/routes/garmin.routes.ts
server/src/routes/user.routes.ts
server/src/index.ts
client/src/types/index.ts
client/src/services/api.ts
client/src/App.tsx
client/src/pages/DataStep.tsx
client/src/pages/AnalysisStep.tsx
client/src/components/QuickDailySnapshot.tsx
client/src/components/SettingsModal.tsx
client/src/components/Header.tsx
```

---

## Environment Variables Required

```env
# Server
GEMINI_SERVER_API_KEY=your-gemini-api-key
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_ID=price_xxx

# Client
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
```

---

## Estimated Scope

- **Backend**: ~800-1000 lines of new code
- **Frontend**: ~600-800 lines of new code
- **Dependencies**: stripe (server), @stripe/stripe-js (client)
