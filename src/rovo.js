/**
 * Rovo Agent Actions for Decision Catch
 */

const { adfToText } = require('./decision-extractor');
const { detectDrift } = require('./drift-detector');
const { getAllDecisions, getDecisionsForIssue } = require('./storage');
const { fetchIssueData } = require('./jira-api');

/**
 * List decisions for an issue or project
 * @param {Object} req - Rovo action request
 * @returns {Promise<Object>}
 */
async function listDecisions(req) {
  try {
    const { issueKey, projectId } = req.payload?.inputs || {};

    if (issueKey) {
      // Fetch issue to get its ID
      const issueData = await fetchIssueData(issueKey);
      const decisions = await getDecisionsForIssue(issueData.id);
      
      return {
        success: true,
        message: `Found ${decisions.length} decision(s) for issue ${issueKey}`,
        decisions: decisions.map(d => ({
          text: d.text,
          topics: d.topics,
          approvedBy: d.approvedBy,
          approvedAt: new Date(d.approvedAt).toISOString(),
          sourceIssue: d.sourceIssueKey,
        })),
      };
    }

    if (projectId) {
      const decisions = await getAllDecisions(projectId);
      
      return {
        success: true,
        message: `Found ${decisions.length} decision(s) for project ${projectId}`,
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
      message: 'Please provide either issueKey or projectId',
    };
  } catch (error) {
    console.error('Error in listDecisions:', error);
    return {
      success: false,
      message: `Error: ${error.message}`,
    };
  }
}

/**
 * Check if an issue has drift from approved decisions
 * @param {Object} req - Rovo action request
 * @returns {Promise<Object>}
 */
async function checkDrift(req) {
  try {
    const { issueKey } = req.payload?.inputs || {};

    if (!issueKey) {
      return {
        success: false,
        message: 'Please provide an issueKey',
      };
    }

    // Fetch issue data
    const issueData = await fetchIssueData(issueKey);
    
    // Get project decisions
    const projectDecisions = await getAllDecisions(issueData.fields.project.id);

    if (projectDecisions.length === 0) {
      return {
        success: true,
        message: `No decisions recorded for this project yet`,
        drifts: [],
      };
    }

    // Check for drift
    const issueText = `${issueData.fields.summary} ${adfToText(issueData.fields.description)}`;
    const drifts = detectDrift(issueText, projectDecisions);

    return {
      success: true,
      message: drifts.length > 0 
        ? `Found ${drifts.length} potential drift(s) in ${issueKey}`
        : `No drift detected in ${issueKey}`,
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
      message: `Error: ${error.message}`,
    };
  }
}

/**
 * Explain what has changed since a decision was made
 * @param {Object} req - Rovo action request
 * @returns {Promise<Object>}
 */
async function explainChanges(req) {
  try {
    const { issueKey, decisionText } = req.payload?.inputs || {};

    if (!issueKey) {
      return {
        success: false,
        message: 'Please provide an issueKey',
      };
    }

    // Fetch issue data
    const issueData = await fetchIssueData(issueKey);
    
    // Get decisions for this issue's project
    const projectDecisions = await getAllDecisions(issueData.fields.project.id);

    // Find the specific decision if decisionText provided
    let targetDecision = null;
    if (decisionText) {
      targetDecision = projectDecisions.find(d => 
        d.text.toLowerCase().includes(decisionText.toLowerCase())
      );
    }

    if (!targetDecision && projectDecisions.length > 0) {
      targetDecision = projectDecisions[0]; // Use most recent
    }

    if (!targetDecision) {
      return {
        success: false,
        message: 'No matching decision found',
      };
    }

    // Compare issue with decision
    const issueText = `${issueData.fields.summary} ${adfToText(issueData.fields.description)}`;
    const drifts = detectDrift(issueText, [targetDecision]);

    const hasChanges = drifts.length > 0;

    return {
      success: true,
      message: hasChanges 
        ? `Issue ${issueKey} deviates from the decision made in ${targetDecision.sourceIssueKey}`
        : `Issue ${issueKey} aligns with the decision made in ${targetDecision.sourceIssueKey}`,
      decision: {
        text: targetDecision.text,
        decidedAt: new Date(targetDecision.timestamp).toISOString(),
        sourceIssue: targetDecision.sourceIssueKey,
      },
      changes: hasChanges ? drifts.map(d => ({
        type: d.type,
        explanation: d.explanation,
      })) : [],
    };
  } catch (error) {
    console.error('Error in explainChanges:', error);
    return {
      success: false,
      message: `Error: ${error.message}`,
    };
  }
}

module.exports = {
  listDecisions,
  checkDrift,
  explainChanges,
};
