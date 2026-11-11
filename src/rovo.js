/**
 * Rovo Agent Actions for Decision Catch
 */

const { adfToText } = require('./decision-extractor');
const { detectDrift } = require('./drift-detector');
const { getAllDecisions, getDecisionsForIssue } = require('./storage');
const { fetchIssueData, fetchProjectData } = require('./jira-api');

/**
 * Extract inputs from Rovo payload with context fallback
 * @param {Object} payload - Rovo action payload
 * @returns {Object} Extracted inputs
 */
function getInputs(payload) {
  // Rovo actions receive inputs at top level: payload.issueKey, payload.projectId
  // Also check nested paths for compatibility and fallback to context
  const issueKey = payload.issueKey 
    || payload.inputs?.issueKey 
    || payload.payload?.inputs?.issueKey
    || payload.context?.jira?.issueKey;
  
  const projectId = payload.projectId 
    || payload.inputs?.projectId 
    || payload.payload?.inputs?.projectId;
  
  const projectKey = payload.projectKey
    || payload.inputs?.projectKey
    || payload.payload?.inputs?.projectKey
    || payload.context?.jira?.projectKey;
  
  const decisionText = payload.decisionText 
    || payload.inputs?.decisionText 
    || payload.payload?.inputs?.decisionText;

  return { issueKey, projectId, projectKey, decisionText };
}

/**
 * Resolve project key to numeric ID
 * @param {string} projectKeyOrId - Project key (e.g. 'PAY') or numeric ID
 * @returns {Promise<string>} Numeric project ID
 */
async function resolveProjectId(projectKeyOrId) {
  // If already numeric, return as-is
  if (/^\d+$/.test(projectKeyOrId)) {
    return projectKeyOrId;
  }
  
  // Fetch project to get ID
  const projectData = await fetchProjectData(projectKeyOrId);
  return projectData.id;
}

/**
 * List decisions for an issue or project
 * @param {Object} payload - Rovo action payload
 * @returns {Promise<Object>}
 */
async function listDecisions(payload) {
  try {
    const { issueKey, projectId, projectKey } = getInputs(payload);

    if (issueKey) {
      const issueData = await fetchIssueData(issueKey);
      const decisions = await getDecisionsForIssue(issueData.id);
      
      if (decisions.length === 0) {
        return {
          success: true,
          message: `No decisions found for issue ${issueKey}`,
          decisions: [],
        };
      }

      const summary = decisions.map(d => `• ${d.text.slice(0, 80)}${d.text.length > 80 ? '...' : ''} (from ${d.sourceIssueKey})`).join('\n');
      
      return {
        success: true,
        message: `Found ${decisions.length} decision(s) for issue ${issueKey}:\n${summary}`,
        decisions: decisions.map(d => ({
          text: d.text,
          topics: d.topics,
          approvedBy: d.approvedBy,
          approvedAt: new Date(d.approvedAt).toISOString(),
          sourceIssue: d.sourceIssueKey,
        })),
      };
    }

    const resolvedProjectId = projectId || (projectKey ? await resolveProjectId(projectKey) : null);
    
    if (resolvedProjectId) {
      const decisions = await getAllDecisions(resolvedProjectId);
      
      if (decisions.length === 0) {
        return {
          success: true,
          message: `No decisions tracked yet for project ${projectKey || projectId}`,
          decisions: [],
        };
      }

      const summary = decisions.slice(0, 5).map(d => `• ${d.text.slice(0, 80)}${d.text.length > 80 ? '...' : ''}`).join('\n');
      const more = decisions.length > 5 ? `\n...and ${decisions.length - 5} more` : '';
      
      return {
        success: true,
        message: `Found ${decisions.length} decision(s) for project ${projectKey || projectId}:\n${summary}${more}`,
        decisions: decisions.map(d => ({
          text: d.text,
          topics: d.topics,
          approvedBy: d.approvedBy,
          approvedAt: new Date(d.approvedAt).toISOString(),
          sourceIssue: d.sourceIssueKey,
        })),
      };
    }

    return {
      success: false,
      message: 'Please provide either an issue key (e.g. PAY-6) or project key/ID (e.g. PAY)',
    };
  } catch (error) {
    console.error('Error in listDecisions:', error);
    return {
      success: false,
      message: `Failed to list decisions: ${error.message}`,
    };
  }
}

/**
 * Check if an issue has drift from approved decisions
 * @param {Object} payload - Rovo action payload
 * @returns {Promise<Object>}
 */
async function checkDrift(payload) {
  try {
    const { issueKey } = getInputs(payload);

    if (!issueKey) {
      return {
        success: false,
        message: 'Please provide an issue key (e.g. PAY-6)',
      };
    }

    const issueData = await fetchIssueData(issueKey);
    const projectDecisions = await getAllDecisions(issueData.fields.project.id);

    if (projectDecisions.length === 0) {
      return {
        success: true,
        message: `No decisions tracked yet for project ${issueData.fields.project.key}. Approve some decisions first to enable drift detection.`,
        drifts: [],
      };
    }

    const issueText = `${issueData.fields.summary} ${adfToText(issueData.fields.description)}`;
    const drifts = detectDrift(issueText, projectDecisions, { currentIssueKey: issueData.key });

    if (drifts.length === 0) {
      return {
        success: true,
        message: `✓ No drift detected in ${issueKey}. Issue aligns with ${projectDecisions.length} approved decision(s).`,
        drifts: [],
      };
    }

    const summary = drifts.map(d => `• ${d.explanation} (original: ${d.decision.sourceIssueKey})`).join('\n');
    
    return {
      success: true,
      message: `⚠️ Found ${drifts.length} potential drift(s) in ${issueKey}:\n${summary}`,
      drifts: drifts.map(d => ({
        type: d.type,
        explanation: d.explanation,
        confidence: d.confidence,
        originalDecision: d.decision.text,
        originalIssue: d.decision.sourceIssueKey,
      })),
    };
  } catch (error) {
    console.error('Error in checkDrift:', error);
    return {
      success: false,
      message: `Failed to check drift: ${error.message}`,
    };
  }
}

/**
 * Explain what has changed since a decision was made
 * @param {Object} payload - Rovo action payload
 * @returns {Promise<Object>}
 */
async function explainChanges(payload) {
  try {
    const { issueKey, decisionText } = getInputs(payload);

    if (!issueKey) {
      return {
        success: false,
        message: 'Please provide an issue key (e.g. PAY-6)',
      };
    }

    const issueData = await fetchIssueData(issueKey);
    const projectDecisions = await getAllDecisions(issueData.fields.project.id);

    if (projectDecisions.length === 0) {
      return {
        success: false,
        message: `No decisions tracked yet for project ${issueData.fields.project.key}. Approve some decisions first.`,
      };
    }

    let targetDecision = null;
    if (decisionText) {
      targetDecision = projectDecisions.find(d => 
        d.text.toLowerCase().includes(decisionText.toLowerCase())
      );
      
      if (!targetDecision) {
        return {
          success: false,
          message: `No decision matching "${decisionText}" found. Try listing decisions for this project first.`,
        };
      }
    } else {
      targetDecision = projectDecisions[0];
    }

    const issueText = `${issueData.fields.summary} ${adfToText(issueData.fields.description)}`;
    const drifts = detectDrift(issueText, [targetDecision], { currentIssueKey: issueData.key });
    const hasChanges = drifts.length > 0;

    if (hasChanges) {
      const changes = drifts.map(d => d.explanation).join('; ');
      return {
        success: true,
        message: `Issue ${issueKey} deviates from decision in ${targetDecision.sourceIssueKey}: ${changes}`,
        decision: {
          text: targetDecision.text,
          decidedAt: new Date(targetDecision.timestamp).toISOString(),
          sourceIssue: targetDecision.sourceIssueKey,
        },
        changes: drifts.map(d => ({
          type: d.type,
          explanation: d.explanation,
        })),
      };
    }

    return {
      success: true,
      message: `✓ Issue ${issueKey} aligns with decision from ${targetDecision.sourceIssueKey}: "${targetDecision.text.slice(0, 100)}${targetDecision.text.length > 100 ? '...' : ''}"`,
      decision: {
        text: targetDecision.text,
        decidedAt: new Date(targetDecision.timestamp).toISOString(),
        sourceIssue: targetDecision.sourceIssueKey,
      },
      changes: [],
    };
  } catch (error) {
    console.error('Error in explainChanges:', error);
    return {
      success: false,
      message: `Failed to explain changes: ${error.message}`,
    };
  }
}

module.exports = {
  listDecisions,
  checkDrift,
  explainChanges,
};
