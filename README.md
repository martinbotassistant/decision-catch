# Decision Catch

> Automatically catch decisions made in Jira comments and prevent contradicting work from slipping through

**Decision Catch** is an Atlassian Forge app for Codegeist 2026 (Category: Apps for Software Teams) that automatically detects technical decisions buried in issue comments and alerts teams when new work contradicts them.

## 🎯 The Problem

Software teams make critical technical decisions in Jira comments:
- "We decided to use PostgreSQL for the database"
- "Agreed: no SSO implementation in v1.0"
- "Going with React for the frontend"

**These decisions get lost.** Weeks later, someone creates a task that quietly contradicts them. Nobody notices until it's deployed.

Atlassian's native decision tracking requires manual entry (Confluence DACI templates) and doesn't check for conflicts. **Decision Catch automates both discovery and conflict detection.**

## ✨ What It Does

Decision Catch gives your team three superpowers:

### 1. 🔍 **Automatic Detection** — Finds decisions in your existing issues

Scans issue descriptions and comments for decision patterns:
- Affirmative: "we decided to use", "going with", "chosen"
- Negative: "won't use", "out of scope for v1"
- Technology choices: "using PostgreSQL", "selected React"

Shows them in a Jira issue panel with confidence scores (High/Med/Low) and topic tags (database, security, architecture).

**No LLMs, no external APIs** — pure deterministic pattern matching that's fast, explainable, and free.

### 2. ✅ **Team Review** — Approve what matters

One-click approval saves decisions with full context:
- Source issue and timestamp
- Author and decision text (editable)
- Extracted keywords and topics
- Dismiss false positives to keep signal clean

### 3. ⚠️ **Drift Warnings** — Prevent contradictions before they ship

When someone creates work that contradicts an approved decision, the panel shows:
- **Type**: Alternative technology, scope violation, or negation
- **Explanation**: "Issue uses MongoDB instead of decided PostgreSQL"
- **Original decision**: Link to source issue

Team can resolve drift as "intentional change" (with notes) or "not a conflict". Resolved items stay visible in a collapsed section with full audit trail.

### 4. 🤖 **Rovo Agent (Bonus)** — AI-powered decision lookup

Three Rovo actions for natural language queries:
- **List decisions** for an issue or project (e.g. "show me decisions for PAY project")
- **Check drift** in a specific issue (e.g. "does PAY-6 contradict any decisions?")
- **Explain changes** since a decision (e.g. "how does this differ from our PostgreSQL decision?")

Fully optional — panel works standalone.

## 📸 Screenshots

*(Demo screenshots showing the panel, drift warnings, and Rovo agent in action)*

1. **Candidate decisions panel** with confidence scores and topics
2. **Drift warning** showing MongoDB vs PostgreSQL conflict
3. **Resolved drift section** with audit trail
4. **Admin settings** page with data management
5. **Rovo agent** responding to "check drift in PAY-6"

## 🏗️ Architecture

### Tech Stack
- **Runtime**: Node.js 24 (Atlassian Forge)
- **Storage**: Forge Storage API (no external database required)
- **UI**: Forge UI Kit (@forge/react) with React 18
- **Testing**: Jest with 114 unit tests
- **Zero external dependencies** for core logic

### Code Structure
```
src/
├── decision-extractor.js    # Core: finds decisions via patterns
├── drift-detector.js        # Core: detects contradictions
├── storage.js               # Forge Storage API wrapper
├── resolvers.js             # Backend: panel data & actions
├── rovo.js                  # Rovo agent actions
├── jira-api.js              # Jira REST API helpers
└── frontend/
    ├── index.jsx            # Issue panel UI
    └── admin.jsx            # Admin settings page

tests/
├── decision-extractor.test.js  # 44 tests
├── drift-detector.test.js      # 30 tests
├── resolvers.test.js           # 20 tests
└── rovo.test.js                # 20 tests

manifest.yml                 # Forge app definition
```

### How It Works

1. **Detection**: Scans issue text with regex patterns for decision keywords
2. **Scoring**: Confidence based on pattern strength + team language markers
3. **Storage**: Approved decisions saved to Forge Storage (scoped per installation)
4. **Drift Check**: On panel load, compares issue text against project decisions
5. **Matching**: Keyword overlap + negation detection + category awareness (e.g., database techs)

## 🚀 Installation (For Judges)

### Prerequisites
- Atlassian account with Jira Cloud site
- [Forge CLI](https://developer.atlassian.com/platform/forge/getting-started/) installed:
  ```bash
  npm install -g @forge/cli
  ```
- Node.js 18+ (for running tests locally)

### Quick Start

```bash
# 1. Clone and test
git clone <repo-url>
cd decision-catch
npm install
npm test    # All 114 tests should pass

# 2. Deploy to Forge
forge login             # Authenticate with Atlassian
forge register          # Get an app ID (first time only)
forge deploy            # Upload to Forge infrastructure

# 3. Install to your Jira site
forge install           # Choose your site, grant permissions
```

### Required Permissions

Decision Catch requests these Jira scopes (all justified):

| Scope | Why Needed | Used Where |
|-------|------------|------------|
| `read:jira-work` | Read issue descriptions, comments, project data | Panel data loading, drift detection |
| `write:jira-work` | Post resolution comments, add labels | Optional: drift resolution trail |
| `read:jira-user` | Display resolver name with avatar | Resolution audit in panel |
| `storage:app` | Save approved decisions, resolutions, dismissals | All persistence |

**Privacy**: No data leaves Atlassian infrastructure. All storage is Forge Storage API (scoped per installation).

## 🎬 Demo Walkthrough

### 1. Setup (30 seconds)
Create a Jira project "PAY" (Payment System) with these sample issues:

**PAY-1**: Initial decisions (in comments)
- "We decided to use PostgreSQL for the database"
- "Going with React and Next.js for the frontend"
- "Agreed: no SSO implementation in v1.0, out of scope"

**PAY-2**, **PAY-3**, **PAY-4**: More decisions (see `docs/demo-data.md` for full script)

### 2. Approve Decisions (30 seconds)
- Open **PAY-1**
- Decision Catch panel shows 3 candidates with High confidence
- Click **Approve** on each → saved with timestamp and source link

### 3. See Drift Detection (1 minute)
- Create **PAY-5**: "Implement SSO via OAuth"
  - Panel warns: "Issue violates scope decision: agreed no SSO in v1"
  - Shows original decision from PAY-1
- Create **PAY-6**: "Setup MongoDB database"
  - Panel warns: "Issue uses mongodb instead of decided postgresql"
  - Shows alternative technology conflict

### 4. Resolve Drift (30 seconds)
- In PAY-5, click "Mark as intentional change"
- Add note: "Requirements changed, SSO now priority"
- Drift moves to "Resolved" section with full audit trail

### 5. Try Rovo Agent (30 seconds) *[Optional, requires Rovo enabled]*
- Ask: "Check drift in PAY-6"
- Agent responds: "⚠️ Found 1 potential drift: uses mongodb instead of postgresql"

**Total demo time**: Under 4 minutes

Full demo data script: [`docs/demo-data.md`](docs/demo-data.md)

## 🧪 Testing

```bash
npm test    # Run all 114 unit tests (passes offline, no credentials needed)
```

### Test Suite Breakdown
- **decision-extractor.test.js** (44 tests): Pattern matching, confidence scoring, topic extraction, ADF parsing
- **drift-detector.test.js** (30 tests): Contradiction detection, keyword overlap, category matching, deduplication
- **resolvers.test.js** (20 tests): Panel API, approval flow, drift resolution, storage
- **rovo.test.js** (20 tests): Rovo actions with different input shapes, context fallback, error handling

All core logic is tested with fixtures (sample Jira comments). No Atlassian API mocking required.

## 📋 Codegeist 2026 Submission

**Category**: Apps for Software Teams  
**Bonus Target**: Best Rovo Agent (3 actions: list, check, explain)

**What makes this special**:
- ✅ Solves a real pain: decisions lost in comments causing drift
- ✅ Zero external dependencies or APIs — purely Forge
- ✅ 114 unit tests covering all core logic
- ✅ Production-ready: handles errors, validates inputs, never throws
- ✅ Rovo agent with contextual input reading (works from panel or chat)
- ✅ Privacy-first: all data stays in Forge Storage

**Built from scratch for Codegeist 2026** — no existing codebase reused.

## 🔒 Privacy & Data

**What we store** (all in Forge Storage, scoped per installation):
- Approved decisions: text, source issue, approver, timestamp
- Drift resolutions: resolution type, resolver, notes, timestamp
- Dismissed candidates: issue ID + candidate text (prevents re-showing)

**What we DON'T store**:
- User passwords or tokens
- Issue content (re-fetched on demand via Jira API)
- Any data outside Atlassian infrastructure

**Data access**: Only Jira site admins can install. Only users with issue access can see decisions from those issues.

## 🚧 Known Limitations

1. **English-focused**: Non-Latin scripts filtered (Hebrew, Arabic, etc.)
2. **Pattern-based**: May miss subtle/creative phrasing (by design for MVP)
3. **Forward-only**: Doesn't analyze historical issues (manual backfill possible)
4. **No ML**: Category detection is rule-based, not learned

All limitations are architectural choices for a reliable MVP. Post-hackathon, we can add LLM fallback for edge cases.

## 📦 Version History

### v3.0.0 (Codegeist Submission Candidate)
- **Rovo agent bug fix**: Fixed input reading to handle Forge's top-level payload structure (payload.issueKey, not payload.payload.inputs.issueKey)
- **Context fallback**: Rovo actions now use context.jira.issueKey when no explicit input provided
- **Project key support**: Accept 'PAY' as well as numeric project ID, auto-resolve via Jira API
- **Better messages**: Concise, human-readable summaries in Rovo responses
- **20 Rovo unit tests**: Cover all input shapes, error handling, empty states
- **Panel polish**: Professional look with no emoji in headings, warning border for active drift, muted empty states
- **Admin page polish**: Clear descriptions, card-based layout with design tokens
- **Submission-ready docs**: README rewritten for judges, demo data guide, clean repo
- **Test count**: 114 passing (94 resolvers/extractors/detectors + 20 Rovo)

### v2.12.0 (Visual Redesign)
- **Modern card-based UI**: Clean borders, rounded corners, and subtle backgrounds using Atlassian design tokens
- **Token-based styling**: All styling uses `xcss` with design tokens (`border.width`, `border.radius.200`, `color.border`, `elevation.surface`, `space.150`, `space.200`)
- **Improved hierarchy**: Card headers with `Inline spread="space-between"` positioning status lozenges on the right
- **Consistent spacing**: Uniform padding and spacing throughout all sections
- **Muted resolved items**: Resolved drift items visually distinguished with reduced opacity while remaining readable
- **Better readability**: Clear section headers with counts, improved typography with `size="small"` for metadata
- **No functional changes**: All 94 tests passing; behavior, resolvers, and Jira integration unchanged

### v2.11.1 (Review fixes)
- Backend Jira calls use `@forge/api` (`asUser()` with `asApp()` fallback, `route` tag) instead of frontend-only `@forge/bridge`; non-2xx responses now surface as warnings
- Resolver shown by name via UI Kit `User` component; comment @mentions the resolver
- Resolved section expanded by default; resolution shows date and time

### v2.11.0 (Resolved Drift Persistence & Jira Integration)
- **Resolved drift stays visible**: Drift warnings stay in panel after resolution, marked with green "RESOLVED" badge
- **Resolution details displayed**: Shows resolution type (intentional change/not a conflict), resolver accountId, and timestamp
- **Collapsible Resolved section**: Resolved drifts appear below active ones in a toggleable section
- **Optional comment on resolution**: Modal prompts for optional free-text note when resolving drift
- **Jira native trail**: Posts ADF comment to issue activity and adds "decision-drift-resolved" label (best-effort)
- **Persistence**: Resolutions survive reloads; re-running detection doesn't bring resolved drifts back as open
- **New scope**: Added `read:jira-user` to manifest (requires app upgrade/consent)
- **Test coverage**: 92 passing tests (89 → 92), including resolved drift separation, persistence, and re-detection prevention

### v2.10.0 (Live Bug Fixes from Demo)
- **Fix #1**: Import clearAllStorage in resolvers.js (resetAllData was failing)
- **Fix #2**: Scope drift precision - keyword must be object of negation within ~20 chars OR in exclusion phrase within ~25 chars, uses whole-word matching, skips SCOPE_STOPWORDS (decision, define, scope, v1, v2, etc.)
- **Fix #3**: Same-issue skip - decisions never drift from the issue they were made in (detectDrift accepts currentIssueKey option, all callers pass it)
- **Fix #4**: Drift deduplication - drifts with identical explanations are filtered out
- **Fix #5**: Alternative detection improved - "switching from PostgreSQL to MongoDB" now correctly yields "uses mongodb instead of postgresql" (when issue names decided tech, other same-category techs count; substring pairs like postgres/postgresql ignored)
- **Test coverage**: 89 passing tests (80 → 89), added comprehensive live demo scenarios (PAY-5, PAY-6, PAY-7), same-issue skip, stopwords, deduplication, and switching patterns

### v2.9.0 (Admin Page & Extractor Fix)
- **Admin page**: Added Jira admin settings page with danger button to reset all Decision Catch data
- **Storage reset**: Reset counts returned (decisions, drift resolutions, dismissals)
- **Confirmation modal**: Two-step confirmation before destructive reset action
- **Extractor fix**: "Also decided:" sentences no longer filtered (regression from v2.8.0)
- **Test coverage**: 80 passing tests (79 → 80), added tests for decision marker exception

### v2.8.0 (Polish Pass for Demo)
- **Candidate lifecycle**: Candidates disappear after Approve/Dismiss (no duplicates on reload)
- **Dismissal storage**: Dismissed candidates persisted per issue and filtered from panel
- **Duplicate prevention**: Prevents approving the same decision text twice
- **Extractor precision**: Filters out questions (?), fragments (:), bullets (-), and task sentences
- **Drift quality**: Improved scope violation detection (PAY-5 SSO now flags correctly), better messages ("uses X instead of Y"), strongest drift per decision, severity-based ordering
- **UX improvements**: Spinner while loading, optimistic state updates on Approve/Dismiss, "Approved by X on date" metadata, cleaner header (removed duplicate title)
- **Test coverage**: 79 passing tests (up from 67), including new tests for dismissals, precision filters, duplicate prevention, and drift deduplication

*(Earlier versions trimmed for brevity — see git history for full changelog)*

## 📄 License

MIT License

## 🙏 Built For

**Codegeist 2026** — Atlassian's annual app hackathon  
**Category**: Apps for Software Teams  
**Demo project**: PAY (Payment System) — fictional project, no real company data used

---

**Decision Catch** — Never lose another decision in a comment thread.
