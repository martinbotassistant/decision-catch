# Decision Catch - Demo Video Script

**Duration**: 4 minutes 20 seconds  
**Format**: Screen recording with voiceover  
**Tone**: Professional, clear, problem-focused

---

## 🎬 Script

### INTRO (0:00 - 0:25) [25 seconds]

**[Screen: Jira board with PAY project, showing multiple issues]**

**Narration:**
> "Hey everyone! I'm excited to show you Decision Catch - our entry for Codegeist 2026.
>
> Here's the problem: teams make important decisions in Jira comments every day. 'We're using PostgreSQL.' 'No SSO in v1.' These decisions get lost.
>
> Then someone creates a task that contradicts them, and nobody notices until it's too late. Decision Catch solves this."

---

### THE PROBLEM (0:25 - 1:05) [40 seconds]

**[Screen: Open issue PAY-123 "Choose database technology"]**

**Narration:**
> "Let me show you. Here's PAY-123 where the team chose their database. Scroll down to the comments..."

**[Screen: Scroll to comment]**

> "Here - Marcus wrote 'We decided to use PostgreSQL for the main database because of better JSON support and transaction guarantees.'
>
> That's a decision. It should be tracked. But in normal Jira, it just sits here in the comments, and three weeks from now, nobody will remember."

**[Screen: Open Decision Catch panel on the right]**

> "With Decision Catch, look at the panel on the right. It automatically found this decision as a candidate."

---

### CATCH & APPROVE (1:05 - 2:00) [55 seconds]

**[Screen: Decision Catch panel showing candidate]**

**Narration:**
> "The panel shows the text, a confidence score - this one is high confidence because of the explicit 'decided to' language - and it extracted topics like 'database' from the keywords.
>
> All of this uses deterministic heuristics. No paid APIs, no LLMs - just smart pattern matching that's explainable and debuggable."

**[Screen: Click 'Approve' button]**

> "Let me approve this decision. Now it's tracked permanently with the source issue, author, and timestamp."

**[Screen: Show approved decisions section expanding]**

> "Here it is in the approved decisions list. Let me quickly approve one more from issue PAY-124..."

**[Screen: Switch to PAY-124, show comment about SSO scope, approve it]**

> "This one: 'no SSO implementation in v1, deferred to v2.' Approved."

---

### DRIFT DETECTION (2:00 - 3:15) [75 seconds]

**[Screen: Back to board view]**

**Narration:**
> "Now here's where it gets powerful. Let's say two weeks later, a developer who wasn't in that conversation creates a new issue."

**[Screen: Open issue PAY-130 "Merchant SSO Integration"]**

> "PAY-130: Add SSO login for merchant dashboard. The description says they're planning to implement OAuth for SSO."

**[Screen: Open Decision Catch panel]**

> "Watch what happens when we open the Decision Catch panel."

**[Screen: Panel loads, shows drift warning with yellow background]**

> "Boom - drift detected! It says: 'Issue includes SSO, but it was decided as out of scope.'
>
> It shows the type - scope violation - an explanation, and links back to the original decision in PAY-124.
>
> The developer immediately sees: wait, we explicitly decided NOT to do this in v1."

**[Screen: Show action buttons]**

> "They can mark it as 'intentional change' if the decision evolved, or 'not a conflict' if it's actually fine. This creates an audit trail."

**[Screen: Quick cut to PAY-131 showing MongoDB drift]**

> "Here's another example - someone wants to switch to MongoDB, but we decided on PostgreSQL. Decision Catch catches this too, explains it's an 'alternative technology,' and links the original decision."

---

### ROVO BONUS (3:15 - 3:55) [40 seconds]

**[Screen: Open Rovo chat interface]**

**Narration:**
> "For the bonus points: we built a Rovo agent. You can ask it questions directly."

**[Screen: Type and send: "List all decisions for project PAY"]**

> "List all decisions for project PAY."

**[Screen: Agent responds with formatted list]**

> "It returns all approved decisions with topics, dates, and source issues."

**[Screen: Type and send: "Check PAY-131 for drift"]**

**[Screen: Agent responds with drift analysis]**

> "Check PAY-131 for drift. It analyzes the issue and explains the contradiction with a confidence score.
>
> The panel works perfectly without Rovo - this is just an AI-powered bonus layer."

---

### CLOSE (3:55 - 4:20) [25 seconds]

**[Screen: Back to Jira board, zoom out to show multiple issues]**

**Narration:**
> "So that's Decision Catch. It catches decisions automatically, lets you approve and track them, and warns you when new work contradicts them - all with zero configuration and no external APIs.
>
> It's built with Forge, fully integrated with Jira, has 100% test coverage on the core logic, and includes a Rovo agent.
>
> Check out the repo for the full code, tests, and deployment guide. Thanks for watching, and good luck to all Codegeist participants!"

**[Screen: Fade to title card]**

**Title Card:**
```
Decision Catch
Codegeist 2026

Categories:
✓ Apps for Software Teams
✓ Best Rovo Agent
✓ Best Use of Teamwork Graph

GitHub: [Your Repo URL]
```

---

## 📋 Production Notes

### Pre-recording Checklist
- [ ] Clean Jira project with PAY issues seeded (see demo-data.md)
- [ ] Approve decisions in PAY-123 and PAY-124 before recording
- [ ] Create drift issues PAY-130, PAY-131 (but don't open them yet)
- [ ] Clear browser cache/cookies for clean panel loads
- [ ] Test Rovo agent with sample queries
- [ ] Close all unnecessary browser tabs
- [ ] Set browser zoom to 100%

### Recording Settings
- **Resolution**: 1920x1080 (Full HD)
- **Frame rate**: 30fps minimum
- **Audio**: Clear voiceover, no background noise
- **Screen**: Show only Jira browser window (hide bookmarks bar, extensions)

### Editing Tips
- Speed up scrolling/navigation slightly (1.2x) to save time
- Add subtle zoom-ins on important UI elements (drift warnings, confidence scores)
- Use lower-thirds text for key terms: "Candidate Decision," "Drift Warning," "Confidence Score"
- Background music: Soft, minimal (or none)
- Export format: MP4 (H.264), max 500MB for upload

### Timing Breakdown
- Intro: 25s (keep it punchy)
- Problem: 40s (show real Jira workflow)
- Catch & Approve: 55s (core feature)
- Drift Detection: 75s (the "wow" moment)
- Rovo: 40s (bonus points)
- Close: 25s (wrap up)
- **Total: 4:20** (under 4:30 limit)

### Backup Plans
- If drift doesn't show immediately, say "the panel checks on load" and refresh
- If Rovo is slow, have a pre-recorded clip ready to cut in
- Practice the narration 2-3 times to stay natural and on-time

---

## 🎯 Key Messages to Hit

1. **Problem is universal**: Every team loses decisions in comments
2. **Solution is simple**: Automatic detection, no config needed
3. **Explainable**: Show confidence scores and pattern matching
4. **Actionable**: Drift warnings with clear explanations
5. **Well-built**: Mention tests, Forge integration, Rovo agent

Good luck! 🚀
