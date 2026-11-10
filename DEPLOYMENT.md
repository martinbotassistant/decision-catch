# Decision Catch - Deployment Guide

This guide covers how to build and deploy Decision Catch to a live Jira Cloud site.

## Prerequisites

- Node.js 18+ and npm
- Forge CLI installed: `npm install -g @forge/cli`
- Atlassian account with Jira Cloud site
- Admin permissions on the Jira site

## Installation Steps

### 1. Install Dependencies

```bash
cd /workspace
npm install
```

This installs:
- `@forge/api` - Forge API client
- `@forge/resolver` - Backend resolvers
- `@forge/react` - UI Kit for React-based panel
- `react` - React library
- Jest and testing utilities (dev dependencies)

### 2. Verify Tests Pass

```bash
npm test
```

Expected output:
```
Test Suites: 3 passed, 3 total
Tests:       57 passed, 57 total
```

All tests must pass before deploying.

### 3. Login to Forge

```bash
forge login
```

This opens a browser window to authenticate with your Atlassian account.

### 4. Deploy the App

```bash
forge deploy
```

This:
- Packages the app code
- Uploads it to Atlassian's infrastructure
- Assigns a version number
- Takes ~30-60 seconds

Expected output:
```
✓ Deploying your app (version X.X.X)
✓ App deployed successfully
```

### 5. Install to Jira Site

```bash
forge install
```

Select your Jira site from the list. This:
- Installs the app on the selected site
- Grants the required permissions
- Registers the modules (panel, triggers, Rovo agent)

Required permissions:
- `read:jira-work` - Read issue data
- `write:jira-work` - (future: add comments, custom fields)
- `storage:app` - Store approved decisions

### 6. Verify Installation

1. Navigate to any Jira issue on your site
2. Look for the "Decision Catch" panel on the right side
3. The panel should load and show:
   - "Loading Decision Catch..." (briefly)
   - Then the main UI with sections for candidates, approved decisions, and drift warnings

If the panel doesn't appear, check:
- App is installed: Settings → Apps → Manage apps → Find "Decision Catch"
- Permissions are granted
- Forge logs: `forge logs --tail`

## Build Process

**Decision Catch uses UI Kit (@forge/react) which requires NO build step.**

Unlike custom UI apps that need Webpack/Vite, UI Kit apps:
- Run React code directly in Forge's runtime
- Are deployed as-is with `forge deploy`
- No `npm run build` needed

The manifest points `function: resolver` to `frontend/index.run`, which exports the React app directly.

## Deployment Architecture

```
manifest.yml
├── jira:issuePanel (Decision Catch panel)
│   ├── function: resolver → frontend/index.jsx (React UI)
│   └── resolver: backend-resolver → resolvers.js (API calls)
├── function: issue-created-trigger → triggers.js
├── function: issue-updated-trigger → triggers.js
├── rovo:agent (Decision Catch Rovo agent)
│   └── actions → rovo.js
└── action: list-decisions, check-drift, explain-changes
```

### Data Flow

1. User opens Jira issue → Panel loads
2. Panel calls `invoke('getPanelData')` → `resolvers.js`
3. Resolver fetches issue from Jira API → `jira-api.js`
4. Extracts decisions → `decision-extractor.js`
5. Detects drift → `drift-detector.js`
6. Stores/retrieves approved decisions → `storage.js`
7. Returns data to panel → Rendered in React

## Storage

Decisions are stored using Forge Storage API:
- Key: `decision-catch:decisions`
- Value: JSON array of approved decisions
- Persists across app redeployments
- Isolated per installation (cannot see other sites' data)

Storage limits:
- 10 MB per key
- Approximately ~10,000 decisions per project

## Updating the App

After making code changes:

```bash
# Run tests
npm test

# Deploy new version
forge deploy

# Upgrade existing installations
forge install --upgrade
```

No need to rebuild - just deploy and upgrade.

## Troubleshooting

### Panel doesn't load

```bash
forge logs --tail
```

Look for errors in:
- Frontend rendering
- Resolver calls
- Jira API requests

Common issues:
- Missing permissions: Re-grant in Jira settings
- Storage errors: Check storage limits
- Network errors: Check `*.atlassian.net` in external fetch permissions

### Triggers not firing

Check trigger registration:

```bash
forge deploy
```

Triggers must be registered in manifest:
- `avi:jira:created:issue`
- `avi:jira:updated:issue`

Verify with:
```bash
forge logs --tail
```

Create/update an issue and watch for trigger execution logs.

### Rovo agent not responding

Rovo agents require:
- Atlassian Intelligence enabled on the site
- `action` modules properly defined in manifest
- Input schemas matching action parameters

Check Rovo logs in the Atlassian Admin console.

## Demo Setup

See `docs/demo-data.md` for creating demo issues PAY-1 through PAY-7.

Quick setup:
1. Create project "PAY" (Payments API)
2. Create issues PAY-1 to PAY-4 with decision comments
3. Approve decisions in each issue's panel
4. Create drift issues PAY-5, PAY-6, PAY-7
5. Open drift issues → see warnings

Record demo video following `docs/video-script.md` (4:20 duration).

## Production Checklist

Before submitting to Codegeist:

- [ ] All tests passing (`npm test`)
- [ ] App deployed without errors
- [ ] Panel loads on real issues
- [ ] Approve/dismiss buttons work
- [ ] Drift detection triggers on panel load
- [ ] Drift resolution (intentional change, not a conflict) persists
- [ ] Rovo agent responds to queries
- [ ] Demo data seeded (PAY-1 to PAY-7)
- [ ] Video recorded (under 4:30 minutes)

## Forge CLI Commands Reference

```bash
# Login
forge login

# Deploy (upload code)
forge deploy

# Install to site
forge install

# Install to specific site
forge install --site <site-name>

# Upgrade existing installation
forge install --upgrade

# View logs (real-time)
forge logs --tail

# View logs for specific function
forge logs --tail --function resolver

# Uninstall from site
forge uninstall

# Validate manifest
forge lint

# Get app info
forge settings
```

## Support

If deployment fails:
1. Check `forge logs --tail` for errors
2. Verify manifest: `forge lint`
3. Ensure permissions are correct
4. Check Forge CLI version: `forge --version` (should be latest)
5. Consult Forge docs: https://developer.atlassian.com/platform/forge/

---

**Ready to deploy!** Follow the steps above to get Decision Catch running on your Jira Cloud site.
