/**
 * Backend resolver functions for Decision Catch panel
 */

const Resolver = require('@forge/resolver');
const { extractDecisions } = require('./decision-extractor');
const { detectDrift } = require('./drift-detector');
const {
  saveDecision,
  getAllDecisions,
  getDecisionsForIssue,
  updateDecision,
  deleteDecision,
  saveDriftResolution,
  getDriftResolutions,
  isDriftResolved,
} = require('./storage');
const { fetchIssueData } = require('./jira-api');

const resolver = new Resolver();

/**
 * Get panel data for an issue
 * Returns candidate decisions, approved decisions, and drift warnings
 */
resolver.define('getPanelData', async (req) => {
  const context = req.context;
  const issueKey = context?.extension?.issue?.key;
  const issueId = context?.extension?.issue?.id;
  
  if (!issueKey && !issueId) {
    return {
      error: 'No issue context available',
    };
  }

  try {
    // Fetch issue data from Jira (using issueKey is more reliable)
    const issueData = await fetchIssueData(issueKey || issueId);
    
    // Extract candidate decisions from description and comments
    const candidates = [];
    
    // Check description
    if (issueData.fields.description) {
      const descCandidates = extractDecisions(issueData.fields.description, {
        source: 'description',
        author: issueData.fields.creator?.displayName,
        timestamp: new Date(issueData.fields.created).getTime(),
      });
      candidates.push(...descCandidates);
    }
    
    // Check comments
    if (issueData.fields.comment?.comments) {
      issueData.fields.comment.comments.forEach(comment => {
        const commentCandidates = extractDecisions(comment.body, {
          source: 'comment',
          commentId: comment.id,
          author: comment.author?.displayName,
          timestamp: new Date(comment.created).getTime(),
        });
        candidates.push(...commentCandidates);
      });
    }
    
    // Get approved decisions for this issue
    const issueDecisions = await getDecisionsForIssue(issueData.id);
    
    // Get all project decisions for drift detection (always check on load)
    const projectDecisions = await getAllDecisions(issueData.fields.project.id);
    
    // Detect drift on every panel load
    const issueText = `${issueData.fields.summary} ${issueData.fields.description || ''}`;
    const drifts = detectDrift(issueText, projectDecisions);
    
    // Filter out resolved drifts
    const unresolvedDrifts = [];
    for (const drift of drifts) {
      const resolution = await isDriftResolved(issueData.id, drift.decision.id);
      if (!resolution) {
        unresolvedDrifts.push(drift);
      }
    }
    
    return {
      issueId: issueData.id,
      issueKey: issueData.key,
      candidates,
      approvedDecisions: issueDecisions,
      drifts: unresolvedDrifts,
      projectDecisionCount: projectDecisions.length,
      projectId: issueData.fields.project.id,
    };
  } catch (error) {
    console.error('Error in getPanelData:', error);
    return {
      error: error.message,
      issueId,
      issueKey,
    };
  }
});

/**
 * Approve a decision candidate
 */
resolver.define('approveDecision', async (req) => {
  const { candidate, issueId, issueKey, projectId, editedText } = req.payload;
  
  try {
    const accountId = req.context.accountId;
    
    const decision = {
      text: editedText || candidate.text,
      sourceIssueId: issueId,
      sourceIssueKey: issueKey,
      commentId: candidate.metadata?.commentId,
      author: candidate.metadata?.author,
      timestamp: candidate.metadata?.timestamp,
      topics: candidate.topics,
      keywords: candidate.keywords,
      projectId,
      approvedBy: accountId,
    };
    
    const saved = await saveDecision(decision);
    return { success: true, decision: saved };
  } catch (error) {
    console.error('Error approving decision:', error);
    return { success: false, error: error.message };
  }
});

/**
 * Dismiss a decision candidate
 */
resolver.define('dismissDecision', async (req) => {
  // For candidates, we don't need to store dismissals (they just disappear from UI)
  // This is a no-op that returns success
  return { success: true };
});

/**
 * Update an approved decision
 */
resolver.define('updateDecision', async (req) => {
  const { decisionId, updates } = req.payload;
  
  try {
    const updated = await updateDecision(decisionId, updates);
    return { success: true, decision: updated };
  } catch (error) {
    console.error('Error updating decision:', error);
    return { success: false, error: error.message };
  }
});

/**
 * Delete an approved decision
 */
resolver.define('deleteDecision', async (req) => {
  const { decisionId } = req.payload;
  
  try {
    const deleted = await deleteDecision(decisionId);
    return { success: deleted };
  } catch (error) {
    console.error('Error deleting decision:', error);
    return { success: false, error: error.message };
  }
});

/**
 * Resolve a drift warning
 */
resolver.define('resolveDrift', async (req) => {
  const { issueId, issueKey, decisionId, resolutionType, notes } = req.payload;
  
  try {
    const accountId = req.context.accountId;
    
    const resolution = {
      issueId,
      issueKey,
      decisionId,
      resolutionType, // 'intentional_change' or 'not_a_conflict'
      notes,
      resolvedBy: accountId,
    };
    
    // If intentional change, we might want to create a superseding decision
    // For MVP, just record the resolution
    
    const saved = await saveDriftResolution(resolution);
    return { success: true, resolution: saved };
  } catch (error) {
    console.error('Error resolving drift:', error);
    return { success: false, error: error.message };
  }
});

/**
 * Get all decisions for a project
 */
resolver.define('getProjectDecisions', async (req) => {
  const { projectId } = req.payload;
  
  try {
    const decisions = await getAllDecisions(projectId);
    return { success: true, decisions };
  } catch (error) {
    console.error('Error getting project decisions:', error);
    return { success: false, error: error.message };
  }
});

module.exports = resolver.getDefinitions();

// Export handler for manifest
exports.handler = resolver.getDefinitions();
