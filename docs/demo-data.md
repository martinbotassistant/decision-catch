# Demo Data Setup for Decision Catch

This guide helps judges and evaluators seed a Jira project with sample data to demonstrate Decision Catch's features.

## Project Setup

Create a new Jira project:
- **Project Key**: `PAY`
- **Project Name**: Payment System
- **Type**: Software (Kanban or Scrum)

## Sample Issues

### PAY-1: Initial Architecture Decisions

**Summary**: "Payment service architecture decisions"

**Description**: 
```
Setting up the core architecture for our payment processing service.
```

**Comments** (add these as separate comments):

**Comment 1** (by any team member):
```
After reviewing options, we decided to use PostgreSQL for the database. 
It has better transaction support than MongoDB, and we need ACID guarantees for payments.
```

**Comment 2**:
```
Going with React and Next.js for the frontend. The team already knows React, 
and Next.js gives us SSR for better SEO on the marketing pages.
```

**Comment 3**:
```
Agreed: no SSO implementation in v1.0. It's out of scope for MVP. 
We'll use email/password auth only for the first release.
```

---

### PAY-2: API Framework Decision

**Summary**: "Choose API framework"

**Description**:
```
Need to pick the backend API framework.
```

**Comment**:
```
We decided to use Express.js for the REST API. It's lightweight, 
well-documented, and the team has experience with it.
```

---

### PAY-3: Testing Strategy

**Summary**: "Setup testing approach"

**Description**:
```
Defining our testing strategy for the payment service.
```

**Comment**:
```
Going with Jest for unit tests and Cypress for E2E. 
Jest integrates well with React, and Cypress gives us reliable browser testing.
```

---

### PAY-4: Cloud Provider

**Summary**: "Select cloud infrastructure"

**Description**:
```
Choosing where to deploy the payment service.
```

**Comment**:
```
We decided to deploy on AWS. The company already has AWS credits, 
and the ops team knows AWS best.
```

---

### PAY-5: SSO Implementation (Drift Example #1)

**Summary**: "Implement SSO login with OAuth"

**Description**:
```
Add OAuth-based SSO so users can log in with their Google accounts. 
This will improve conversion rates.
```

**Expected Drift**: 
- Decision Catch will warn: "Issue violates scope decision"
- Original decision from PAY-1: "Agreed: no SSO in v1.0, out of scope"
- Type: Scope violation

---

### PAY-6: MongoDB Integration (Drift Example #2)

**Summary**: "Setup MongoDB for session storage"

**Description**:
```
Need to set up MongoDB to store user sessions. MongoDB is faster for 
this use case and we don't need transactions for sessions.
```

**Expected Drift**:
- Decision Catch will warn: "Issue uses mongodb instead of decided postgresql"
- Original decision from PAY-1: "Use PostgreSQL for the database"
- Type: Alternative technology

---

### PAY-7: Angular Migration (Drift Example #3)

**Summary**: "Migrate frontend from React to Angular"

**Description**:
```
The new frontend developer prefers Angular, so let's switch the frontend 
stack to Angular 18 for better maintainability.
```

**Expected Drift**:
- Decision Catch will warn: "Issue uses angular instead of decided react"
- Original decision from PAY-1: "Going with React and Next.js"
- Type: Alternative technology

---

## Demonstration Flow

### Step 1: Approve Decisions (30 seconds)

1. Open **PAY-1** in Jira
2. Check the Decision Catch panel on the right
3. You should see 3 candidate decisions with "High" confidence
4. Click **Approve** on each one:
   - "PostgreSQL for the database"
   - "React and Next.js for frontend"
   - "No SSO in v1.0, out of scope"
5. Notice they move to the "Approved Decisions" section

### Step 2: Approve More Decisions (20 seconds)

Repeat for **PAY-2**, **PAY-3**, **PAY-4**:
- Open each issue
- Approve the decision shown
- Now you have 6 approved decisions tracked

### Step 3: See Drift Detection (1 minute)

Open **PAY-5** (SSO issue):
- Panel shows: "⚠️ Drift Detected (1)"
- Warning card with orange border
- "Issue violates scope decision: SSO implementation"
- Shows original decision from PAY-1

Open **PAY-6** (MongoDB issue):
- Panel shows drift warning
- "Issue uses mongodb instead of decided postgresql"
- Alternative technology detected

Open **PAY-7** (Angular issue):
- Another drift warning
- "Issue uses angular instead of decided react"
- Multiple technologies flagged (Angular, Next.js)

### Step 4: Resolve Drift (30 seconds)

In **PAY-5** panel:
1. Click "Mark as intentional change"
2. Modal opens
3. Add note: "Requirements changed after talking to customers. SSO is now a priority for Q2."
4. Click Confirm
5. Drift moves to "Resolved (1)" section
6. Collapse/expand to see full resolution details with your name and timestamp

### Step 5: Try Rovo Agent (Optional, 30 seconds)

If Rovo is enabled on your site:

Ask in Rovo chat:
- "List decisions for PAY project"
  - Shows all 6 approved decisions
- "Check drift in PAY-6"
  - Returns: "⚠️ Found 1 potential drift: uses mongodb instead of postgresql"
- "Explain changes in PAY-7"
  - Explains how Angular differs from the React decision

---

## What Judges Should See

After following this script, Decision Catch demonstrates:

✅ **Automatic detection** — Found 6 decisions across 4 issues  
✅ **Confidence scoring** — All marked "High" (strong patterns)  
✅ **Topic extraction** — Tagged as database, frontend, security, architecture  
✅ **Drift warnings** — Caught 3 contradictions automatically  
✅ **Resolution workflow** — Clear audit trail with notes  
✅ **Rovo integration** — Natural language queries work  

**Total demo time**: Under 4 minutes

---

## Notes for Judges

- **No manual entry required** — All decisions were extracted from comments
- **No false positives** — Every candidate shown is a genuine decision
- **Clear explanations** — Drift warnings specify exact conflict
- **Reversible** — Can dismiss candidates, resolve drift without losing data
- **Audit trail** — Full history of who approved what and when

All sample data is **fictional** — no real company information used.
