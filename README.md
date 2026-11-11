# Decision Catch

**Decision Catch** is an Atlassian Forge app for Codegeist 2026 that automatically detects decisions made in Jira comments and warns when new work items contradict them.

## 🎯 Problem

Teams make important decisions in Jira comments like:
- "We decided to use PostgreSQL for the database"
- "Agreed: no SSO implementation in v1"
- "Going with React for the frontend"

These decisions get lost. Later, someone creates a task that quietly contradicts them. Nobody notices until it's too late.

Atlassian natively only records decisions manually (Confluence DACI template). Nothing automatically detects drift.

**Decision Catch solves this.**

## ✨ Features

### 1. 🔍 Catch
Scans Jira work items (descriptions and comments) for candidate decisions using deterministic heuristics:
- Affirmative decisions: "we decided to use", "going with", "chosen"
- Negative decisions: "won't use", "out of scope", "not doing"
- Technology choices: "using X for Y", "selected Z"

**No paid APIs or LLMs required** - pure pattern matching that's explainable and debuggable.

### 2. ✅ Approve
A Jira issue panel (UI Kit) that shows:
- **Candidate decisions** found in the issue
- Confidence scores (High/Medium/Low)
- Topic categorization (database, security, architecture, etc.)
- Approve/Dismiss actions
- Edit decision text before approving

Approved decisions are stored with:
- Source issue and comment links
- Author and timestamp
- Keywords and topics for matching

### 3. ⚠️ Drift Detection
When an issue is created or updated, Decision Catch:
- Compares it against all approved decisions in the project
- Detects contradictions using keyword overlap and negation patterns
- Shows drift warnings in the panel with:
  - Type: negation, alternative technology, or scope violation
  - Explanation: "Issue uses MongoDB instead of decided PostgreSQL"
  - Link to original decision
- Lets users mark drift as "intentional change" or "not a conflict"

### 4. 🤖 Rovo Agent (Bonus)
A Rovo agent "Decision Catch" with actions:
- **List decisions** for an issue or project
- **Check drift** for a specific issue
- **Explain changes** since a decision was made

The panel works fully without Rovo - the agent is an AI-powered bonus interface.

### 5. 🔗 Teamwork Graph (Optional)
Can use Teamwork Graph Preview API to find related items. Behind a feature flag, degrades gracefully if unavailable.

## 🏗️ Architecture

```
src/
├── decision-extractor.js   # Core heuristics for finding decisions
├── drift-detector.js       # Contradiction detection logic
├── storage.js              # Forge storage API wrapper
├── index.js                # Main Forge resolver (panel API)
├── triggers.js             # Issue created/updated event handlers
├── rovo.js                 # Rovo agent actions
└── jira-api.js             # Jira API helpers

tests/
├── decision-extractor.test.js  # Unit tests for extraction
└── drift-detector.test.js      # Unit tests for drift detection

static/decision-catch/build/
└── index.html              # UI panel (HTML/CSS/JS)

manifest.yml                # Forge app manifest
```

### Technology Stack
- **Runtime**: Node.js 24.x (Forge standard)
- **Storage**: Forge Storage API (no external database)
- **UI**: Forge UI Kit (@forge/react v10) with React components
  - Uses `ButtonGroup` (not ButtonSet), `Lozenge` (not Badge for text labels)
  - Button labels as children, not `text` prop
  - Proper UI Kit patterns for Jira panel rendering
- **Testing**: Jest
- **No external dependencies** for core logic (decision extraction and drift detection)

## 🚀 Setup & Deployment

### Prerequisites
- Node.js 18+ and npm
- [Forge CLI](https://developer.atlassian.com/platform/forge/getting-started/) installed: `npm install -g @forge/cli`
- Atlassian account with Jira site (Cloud)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd decision-catch
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run tests**
   ```bash
   npm test
   ```
   All unit tests should pass. Tests run entirely offline with no Atlassian credentials needed.

4. **Login to Forge**
   ```bash
   forge login
   ```
   This will open a browser to authenticate with your Atlassian account.

5. **Register the app** (first time only)
   ```bash
   forge register
   ```
   This creates a new app ID in your Atlassian developer console.

6. **Deploy the app**
   ```bash
   forge deploy
   ```
   This packages and uploads the app code to Atlassian's infrastructure.

7. **Install to your Jira site**
   ```bash
   forge install
   ```
   Select your Jira site and follow the prompts. This requires admin permissions.

8. **Grant permissions**
   - Navigate to your Jira site
   - Go to Settings → Apps → Manage apps
   - Find "Decision Catch" and grant the required permissions:
     - `read:jira-work` - to read issue data
     - `write:jira-work` - to create comments/custom fields (optional)

### Verification

1. Open any Jira issue
2. Look for the "Decision Catch" panel on the right side
3. Add a comment like: "We decided to use PostgreSQL for the database"
4. Refresh the panel - you should see it as a candidate decision
5. Click "Approve" to save it
6. Create a new issue with "using MongoDB" in the description
7. Open that issue's Decision Catch panel - you should see a drift warning

## 📊 Demo Setup

See `docs/demo-data.md` for a script to seed demo data in a test Jira project.

## 🎬 Video Script

See `docs/video-script.md` for the complete demo walkthrough (under 4:30 minutes).

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Watch mode for development
npm run test:watch
```

### Test Coverage
- `decision-extractor.js`: Pattern matching, confidence scoring, topic extraction
- `drift-detector.js`: Contradiction detection, keyword overlap, category matching

Both modules are tested with fixtures representing real Jira comments. No mocking of Atlassian APIs needed for core logic.

## 📋 Codegeist 2026 Requirements

### Category: Apps for Software Teams ✅
Decision Catch helps software teams track technical decisions and prevent drift.

### Bonus Targets
- ✅ **Best Rovo agent**: Rovo agent with 3 actions (list, check, explain)
- 🎯 **Best use of Teamwork Graph**: Optional integration behind feature flag

### Technical Requirements ✅
1. **Forge app**: `manifest.yml` with Forge modules ✅
2. **Jira integration**: Issue panel, triggers, storage ✅
3. **Original work**: Built from scratch for this hackathon ✅
4. **Deployable**: Complete setup instructions included ✅

## 🔒 Security & Privacy

- **No external API calls** in MVP (all heuristic-based)
- **No credentials required** for core functionality
- Data stored using Forge Storage API (isolated per installation)
- Minimal Jira scopes: read-only for core features
- No PII collected beyond standard Jira author names

## 🛣️ Roadmap

Post-hackathon enhancements:
- **LLM-based extraction**: Plug in OpenAI/Anthropic for higher accuracy (interface already designed)
- **Decision templates**: Pre-defined decision types (ADRs, RFCs)
- **Slack notifications**: Alert when drift is detected
- **Analytics dashboard**: Decision velocity, drift rate over time
- **Confluence integration**: Link to ADR documents
- **GitHub integration**: Sync decisions with PR descriptions

## 📋 Version History

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

### v2.7.0 (Live Deploy Success)
- Native UI Kit issue panel with dynamic resolver bridge
- Drift detection runs on every panel load
- ADF text parsing for Jira v3 descriptions and comments
- Fixed all deployment blockers

## 🐛 Known Limitations

1. **Heuristic-based**: May miss subtle decisions or have false positives (by design for MVP)
2. **English only**: Non-Latin scripts (Hebrew, Arabic, etc.) are filtered out
3. **No historical analysis**: Only checks issues going forward (can add backfill script)
4. **Simple keyword matching**: Category detection is rule-based, not ML
5. **Offline deployment**: Cannot verify `forge deploy` without Atlassian credentials

## 📝 What's Verified vs. Needs Live Deploy

### ✅ Verified (offline)
- All unit tests pass (`npm test`)
- Code structure follows Forge conventions
- Manifest syntax is valid
- No secrets in repo
- Documentation complete

### 🔄 Needs verification on live Jira site
- Panel renders correctly in Jira UI
- Storage API persists decisions
- Triggers fire on issue events
- Rovo agent responds to queries
- Permissions work correctly

The app is **ready to deploy** with `forge deploy` and `forge install` on a real Jira site.

## 👥 Team

Built for Codegeist 2026 by [Your Name/Team].

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

This is a hackathon submission. Post-hackathon, contributions welcome via issues and PRs.

## 🙏 Acknowledgments

- Atlassian Forge team for the platform
- Codegeist 2026 for the opportunity
- Software teams everywhere who lose decisions in comment threads

---

**Made with ☕ for Codegeist 2026**
