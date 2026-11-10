# Demo Data for Decision Catch

This document provides sample Jira issues and comments to seed a demo project for the video demonstration.

## Project Setup

**Project Name**: Payments API  
**Project Key**: PAY  
**Description**: A payment processing API for e-commerce

## Issues to Create

### Issue 1: PAY-1 - Choose database technology

**Type**: Task  
**Summary**: Evaluate and select database for Payments API  
**Description**:
```
Need to choose a database that supports:
- High transaction volume
- ACID compliance
- Good JSON support for flexible schemas
- Strong community and tooling
```

**Comments**:
1. By Sarah Chen (5 days ago):
   ```
   I looked at PostgreSQL vs MongoDB. For payments, we need ACID guarantees.
   Recommendation: PostgreSQL with JSONB for flexible fields.
   ```

2. By Marcus Johnson (4 days ago):
   ```
   Agreed. We decided to use PostgreSQL for the main database because of 
   better JSON support and transaction guarantees. MongoDB doesn't give us 
   the consistency we need for financial data.
   ```

3. By Sarah Chen (4 days ago):
   ```
   Perfect. Also decided: we'll use Redis for caching to reduce DB load.
   ```

### Issue 2: PAY-2 - Define MVP scope

**Type**: Epic  
**Summary**: Payment API v1.0 MVP Scope  
**Description**:
```
Define what goes into v1 and what's deferred to v2.

Must-have:
- Credit card processing
- Webhook notifications
- Refund support

Nice-to-have (needs discussion):
- SSO for merchant dashboard
- Advanced fraud detection
- Multi-currency support
```

**Comments**:
1. By Alex Rivera (3 days ago):
   ```
   Let's keep v1 lean. Decision: no SSO implementation in v1, deferred to v2.
   
   Merchants can use simple API keys for now. SSO is complex and not 
   critical for launch.
   ```

2. By Sarah Chen (3 days ago):
   ```
   Agreed. Also out of scope for v1:
   - Multi-currency (USD only)
   - Advanced fraud (we'll use Stripe's basic checks)
   
   We will include:
   - Refunds (critical for merchant trust)
   - Webhooks (async is better than polling)
   ```

### Issue 3: PAY-3 - Frontend framework selection

**Type**: Task  
**Summary**: Choose frontend framework for merchant dashboard  
**Description**:
```
Need to pick a framework for the merchant dashboard UI.

Options:
- React (most popular, big ecosystem)
- Vue (simpler, faster to learn)
- Svelte (modern, less boilerplate)
```

**Comments**:
1. By Jordan Lee (2 days ago):
   ```
   I've worked with all three. For this project, I recommend React because:
   - Most of the team knows it
   - Better third-party library support
   - Easier to hire React devs
   
   Going with React and Next.js for SSR.
   ```

2. By Marcus Johnson (2 days ago):
   ```
   Makes sense. Confirmed: we're using React + Next.js for the dashboard frontend.
   ```

### Issue 4: PAY-4 - Authentication approach

**Type**: Story  
**Summary**: Implement API authentication  
**Description**:
```
We need secure authentication for merchant API access.

Options discussed:
- API keys (simple)
- OAuth 2.0 (standard, more complex)
- JWT (stateless)
```

**Comments**:
1. By Sarah Chen (1 day ago):
   ```
   Decision: we'll use JWT tokens for API authentication. Here's why:
   
   - Stateless (no DB lookup per request)
   - Standard format (works with existing libs)
   - Short-lived with refresh tokens for security
   
   We won't use OAuth for now - too complex for our merchant count.
   Simple JWT with username/password login is sufficient.
   ```

### Issue 5: PAY-5 - Merchant SSO Integration (⚠️ Drift!)

**Type**: Story  
**Summary**: Add SSO login for merchant dashboard  
**Description**:
```
Merchant ABC Corp is requesting SSO integration with their Okta instance.

Requirements:
- SAML 2.0 support
- Support for Okta, Auth0, Azure AD
- Auto-provisioning of users

Implementation plan:
- Using OAuth libraries for SSO
- Start with Okta, then expand
```

**Comments**:
1. By Alex Rivera (Today):
   ```
   Wait - didn't we decide SSO was out of scope for v1? 
   Check PAY-124, we explicitly deferred this to v2.
   
   Let's not start this until we ship v1 and get customer feedback.
   ```

**Expected**: Decision Catch should flag this issue with a drift warning pointing to PAY-2's decision.

### Issue 6: PAY-6 - Switch to MongoDB (⚠️ Drift!)

**Type**: Task  
**Summary**: Migrate database to MongoDB  
**Description**:
```
Team discussion outcome: switching from PostgreSQL to MongoDB.

Reasons:
- Better horizontal scaling
- More flexible schema
- Native JSON support

Plan:
- Set up MongoDB Atlas
- Write migration scripts
- Update all database queries
```

**Expected**: Decision Catch should flag this issue with a drift warning pointing to PAY-1's decision to use PostgreSQL.

### Issue 7: PAY-7 - Angular dashboard prototype (⚠️ Drift!)

**Type**: Spike  
**Summary**: Build dashboard prototype with Angular  
**Description**:
```
Creating a quick prototype of the merchant dashboard using Angular 
to explore some Material Design components.

This is just a spike to evaluate the UI components before building 
the real thing.
```

**Expected**: Decision Catch should flag this with a drift warning about using Angular instead of the decided React + Next.js (from PAY-3).

## Demo Flow

1. **Setup**: Create the PAY project and first 4 issues with comments (no drift)
2. **Approve decisions**: 
   - Open PAY-1, approve "decided to use PostgreSQL" and "we'll use Redis"
   - Open PAY-2, approve "no SSO in v1" and "out of scope" decisions
   - Open PAY-3, approve "using React + Next.js"
   - Open PAY-4, approve "we'll use JWT tokens"

3. **Create drift issues**: Create PAY-5, PAY-6, PAY-7

4. **Demo drift detection**:
   - Open PAY-5 → see drift warning about SSO being out of scope
   - Open PAY-6 → see drift warning about using MongoDB vs PostgreSQL
   - Open PAY-7 → see drift warning about Angular vs React

5. **Resolve drift**:
   - On PAY-5, mark as "Not a conflict" (explain it's for v2)
   - On PAY-6, mark as "Intentional change" (architecture evolution)
   - On PAY-7, mark as "Not a conflict" (just a prototype spike)

6. **Rovo agent demo**:
   - Ask: "List all decisions for project PAY"
   - Ask: "Check PAY-6 for drift"
   - Ask: "Explain what changed since the database decision"

## Automation Script (Optional)

You can manually create these via the Jira UI, or use the Jira REST API:

```bash
# This is pseudo-code - adapt for your Jira instance
# Requires jq and curl

PROJECT_KEY="PAY"
BASE_URL="https://your-site.atlassian.net"

# Create issues and add comments using Jira REST API v3
# /rest/api/3/issue
# /rest/api/3/issue/{issueIdOrKey}/comment

# See Jira API docs: https://developer.atlassian.com/cloud/jira/platform/rest/v3/
```

For the demo video, manually creating 7 issues takes about 10 minutes and ensures everything looks good.

## Expected Panel States

### PAY-1 (after decisions approved)
- Candidates: 0 (all approved)
- Approved decisions: 2
  - "decided to use PostgreSQL for the main database"
  - "we'll use Redis for caching"
- Drifts: 0

### PAY-2 (after decisions approved)
- Candidates: 0
- Approved decisions: 2
  - "no SSO implementation in v1, deferred to v2"
  - "out of scope for v1" (multi-currency, advanced fraud)
- Drifts: 0

### PAY-5 (SSO issue - drift!)
- Candidates: 0 (no new decisions)
- Approved decisions: 0 (for this issue)
- Drifts: 1
  - Type: scope_violation
  - Explanation: "Issue includes SSO, but it was decided as out of scope"
  - Points to: PAY-2

### PAY-6 (MongoDB issue - drift!)
- Candidates: 0
- Approved decisions: 0
- Drifts: 1
  - Type: alternative
  - Explanation: "Issue uses MongoDB instead of decided PostgreSQL"
  - Points to: PAY-1

---

This demo data creates a realistic narrative of a team building a payment API, with clear decisions and understandable drift scenarios.
