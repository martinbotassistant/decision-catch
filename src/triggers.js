/**
 * Forge trigger handlers for issue events
 */

const { detectDrift } = require('./drift-detector');
const { getAllDecisions } = require('./storage');
const { fetchIssueData } = require('./jira-api');

/**
 * Handler for issue created event
 * Checks new issues for drift against approved decisions
 */
async function onIssueCreated(event) {
  try {
    const { issue } = event;
    
    if (!issue || !issue.id) {
      console.log('Invalid issue data in event');
      return;
    }

    // Fetch full issue data
    const issueData = await fetchIssueData(issue.id);
    
    // Get project decisions
    const projectDecisions = await getAllDecisions(issueData.fields.project.id);
    
    if (projectDecisions.length === 0) {
      // No decisions to check against
      return;
    }

    // Check for drift
    const issueText = `${issueData.fields.summary} ${issueData.fields.description || ''}`;
    const drifts = detectDrift(issueText, projectDecisions);

    if (drifts.length > 0) {
      console.log(`Detected ${drifts.length} potential drift(s) in new issue ${issue.key}`);
      // In a production app, you might want to:
      // - Add a comment to the issue
      // - Send a notification
      // - Update a custom field
      // For MVP, drift is shown in the panel when user opens it
    }
  } catch (error) {
    console.error('Error in onIssueCreated:', error);
  }
}

/**
 * Handler for issue updated event
 * Re-checks issues for drift when they're updated
 */
async function onIssueUpdated(event) {
  try {
    const { issue, changelog } = event;
    
    if (!issue || !issue.id) {
      console.log('Invalid issue data in event');
      return;
    }

    // Only check drift if description or summary changed
    const relevantFields = ['summary', 'description'];
    const hasRelevantChanges = changelog?.items?.some(item => 
      relevantFields.includes(item.field)
    );

    if (!hasRelevantChanges) {
      return; // No need to check drift
    }

    // Fetch full issue data
    const issueData = await fetchIssueData(issue.id);
    
    // Get project decisions
    const projectDecisions = await getAllDecisions(issueData.fields.project.id);
    
    if (projectDecisions.length === 0) {
      return;
    }

    // Check for drift
    const issueText = `${issueData.fields.summary} ${issueData.fields.description || ''}`;
    const drifts = detectDrift(issueText, projectDecisions);

    if (drifts.length > 0) {
      console.log(`Detected ${drifts.length} potential drift(s) in updated issue ${issue.key}`);
    }
  } catch (error) {
    console.error('Error in onIssueUpdated:', error);
  }
}

module.exports = {
  onIssueCreated,
  onIssueUpdated,
};
