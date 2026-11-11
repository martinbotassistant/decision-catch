/**
 * Backend resolver functions for Decision Catch panel
 */

const Resolver = require('@forge/resolver').default;
const { requestJira } = require('@forge/bridge');
const { extractDecisions, adfToText } = require('./decision-extractor');
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
  saveDismissal,
  getDismissals,
  isDismissed,
  hashText,
  clearAllStorage,
} = require('./storage');
const { fetchIssueData } = require('./jira-api');

const resolver = new Resolver();

/**
 * Build ADF comment for drift resolution
 * @param {Object} drift
 * @param {string} resolutionType
 * @param {string} resolvedBy
 * @param {string} notes
 * @returns {Object} ADF document
 */
function buildDriftResolutionComment(drift, resolutionType, resolvedBy, notes) {
  const resolutionLabel = resolutionType === 'intentional_change' 
    ? 'intentional change' 
    : 'not a conflict';
  
  const content = [
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: '🎯 Decision Catch: drift "',
        },
        {
          type: 'text',
          text: drift.explanation,
          marks: [{ type: 'em' }],
        },
        {
          type: 'text',
          text: `" resolved as ${resolutionLabel} by ${resolvedBy}.`,
        },
      ],
    },
  ];

  if (notes) {
    content.push({
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Note: ',
          marks: [{ type: 'strong' }],
        },
        {
          type: 'text',
          text: notes,
        },
      ],
    });
  }

  return {
    version: 1,
    type: 'doc',
    content,
  };
}

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
    
    // Get approved decisions for this issue and project
    const issueDecisions = await getDecisionsForIssue(issueData.id);
    const projectDecisions = await getAllDecisions(issueData.fields.project.id);
    
    // Get dismissals for this issue
    const dismissals = await getDismissals(issueData.id);
    const dismissedHashes = new Set(dismissals.map(d => d.textHash));
    
    // Build set of approved decision text hashes
    const approvedHashes = new Set(projectDecisions.map(d => hashText(d.text)));
    
    // Filter out dismissed candidates and those matching approved decisions
    const filteredCandidates = candidates.filter(candidate => {
      const candidateHash = hashText(candidate.text);
      // Skip if dismissed
      if (dismissedHashes.has(candidateHash)) {
        return false;
      }
      // Skip if already approved
      if (approvedHashes.has(candidateHash)) {
        return false;
      }
      return true;
    });
    
    // Detect drift on every panel load
    const issueText = `${issueData.fields.summary} ${adfToText(issueData.fields.description)}`;
    const drifts = detectDrift(issueText, projectDecisions, { currentIssueKey: issueData.key });
    
    // Separate unresolved and resolved drifts
    const unresolvedDrifts = [];
    const resolvedDrifts = [];
    for (const drift of drifts) {
      const resolution = await isDriftResolved(issueData.id, drift.decision.id);
      if (!resolution) {
        unresolvedDrifts.push(drift);
      } else {
        resolvedDrifts.push({
          ...drift,
          resolution,
        });
      }
    }
    
    return {
      issueId: issueData.id,
      issueKey: issueData.key,
      candidates: filteredCandidates,
      approvedDecisions: issueDecisions,
      drifts: unresolvedDrifts,
      resolvedDrifts,
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
    const decisionText = editedText || candidate.text;
    
    // Check for duplicate approval (same text already approved in project)
    const projectDecisions = await getAllDecisions(projectId);
    const textHash = hashText(decisionText);
    const isDuplicate = projectDecisions.some(d => hashText(d.text) === textHash);
    
    if (isDuplicate) {
      return { success: false, error: 'This decision has already been approved' };
    }
    
    const decision = {
      text: decisionText,
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
  const { candidate, issueId } = req.payload;
  
  try {
    const accountId = req.context.accountId;
    
    const dismissal = {
      issueId,
      text: candidate.text,
      dismissedBy: accountId,
    };
    
    await saveDismissal(dismissal);
    return { success: true };
  } catch (error) {
    console.error('Error dismissing candidate:', error);
    return { success: false, error: error.message };
  }
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
  const { issueId, issueKey, decisionId, drift, resolutionType, notes } = req.payload;
  
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
    
    // Save resolution to storage first
    const saved = await saveDriftResolution(resolution);
    
    // Best-effort: Post Jira comment and add label
    const warnings = [];
    
    // Try to post comment
    try {
      const commentBody = buildDriftResolutionComment(
        drift,
        resolutionType,
        accountId,
        notes
      );
      
      await requestJira(`/rest/api/3/issue/${issueKey}/comment`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body: commentBody }),
      });
    } catch (commentError) {
      console.error('Failed to post Jira comment:', commentError);
      warnings.push('Could not post Jira comment');
    }
    
    // Try to add label
    try {
      await requestJira(`/rest/api/3/issue/${issueKey}`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          update: {
            labels: [{ add: 'decision-drift-resolved' }],
          },
        }),
      });
    } catch (labelError) {
      console.error('Failed to add Jira label:', labelError);
      warnings.push('Could not add label to issue');
    }
    
    return { 
      success: true, 
      resolution: saved,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
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

/**
 * Reset all Decision Catch data (admin only)
 */
resolver.define('resetAllData', async (req) => {
  try {
    const counts = await clearAllStorage();
    return { success: true, counts };
  } catch (error) {
    console.error('Error resetting data:', error);
    return { success: false, error: error.message };
  }
});

const handler = resolver.getDefinitions();
module.exports = { handler };
