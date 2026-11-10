/**
 * Storage Layer
 * Manages approved decisions using Forge storage API
 */

const { storage } = require('@forge/api');

const STORAGE_PREFIX = 'decision-catch';
const DECISIONS_KEY = `${STORAGE_PREFIX}:decisions`;
const DRIFT_RESOLUTIONS_KEY = `${STORAGE_PREFIX}:drift-resolutions`;

/**
 * Save an approved decision
 * @param {Object} decision - Decision object to save
 * @returns {Promise<Object>} Saved decision with ID
 */
async function saveDecision(decision) {
  const decisions = await getAllDecisions();
  
  const savedDecision = {
    id: generateId(),
    text: decision.text,
    sourceIssueId: decision.sourceIssueId,
    sourceIssueKey: decision.sourceIssueKey,
    commentId: decision.commentId,
    commentUrl: decision.commentUrl,
    author: decision.author,
    timestamp: decision.timestamp || Date.now(),
    topics: decision.topics || [],
    keywords: decision.keywords || [],
    projectId: decision.projectId,
    approved: true,
    approvedBy: decision.approvedBy,
    approvedAt: Date.now(),
  };

  decisions.push(savedDecision);
  await storage.set(DECISIONS_KEY, decisions);
  
  return savedDecision;
}

/**
 * Get all approved decisions
 * @param {string} projectId - Optional project filter
 * @returns {Promise<Array>} Array of decisions
 */
async function getAllDecisions(projectId = null) {
  const decisions = await storage.get(DECISIONS_KEY) || [];
  
  if (projectId) {
    return decisions.filter(d => d.projectId === projectId);
  }
  
  return decisions;
}

/**
 * Get decisions for a specific issue
 * @param {string} issueId
 * @returns {Promise<Array>} Array of decisions
 */
async function getDecisionsForIssue(issueId) {
  const decisions = await storage.get(DECISIONS_KEY) || [];
  return decisions.filter(d => d.sourceIssueId === issueId);
}

/**
 * Update a decision
 * @param {string} decisionId
 * @param {Object} updates
 * @returns {Promise<Object>} Updated decision
 */
async function updateDecision(decisionId, updates) {
  const decisions = await storage.get(DECISIONS_KEY) || [];
  const index = decisions.findIndex(d => d.id === decisionId);
  
  if (index === -1) {
    throw new Error('Decision not found');
  }

  decisions[index] = {
    ...decisions[index],
    ...updates,
    updatedAt: Date.now(),
  };

  await storage.set(DECISIONS_KEY, decisions);
  return decisions[index];
}

/**
 * Delete a decision
 * @param {string} decisionId
 * @returns {Promise<boolean>}
 */
async function deleteDecision(decisionId) {
  const decisions = await storage.get(DECISIONS_KEY) || [];
  const filtered = decisions.filter(d => d.id !== decisionId);
  
  if (filtered.length === decisions.length) {
    return false; // Not found
  }

  await storage.set(DECISIONS_KEY, filtered);
  return true;
}

/**
 * Save a drift resolution (when user marks drift as intentional or not a conflict)
 * @param {Object} resolution
 * @returns {Promise<Object>}
 */
async function saveDriftResolution(resolution) {
  const resolutions = await storage.get(DRIFT_RESOLUTIONS_KEY) || [];
  
  const savedResolution = {
    id: generateId(),
    issueId: resolution.issueId,
    issueKey: resolution.issueKey,
    decisionId: resolution.decisionId,
    resolutionType: resolution.resolutionType, // 'intentional_change' or 'not_a_conflict'
    notes: resolution.notes,
    resolvedBy: resolution.resolvedBy,
    resolvedAt: Date.now(),
    supersedingDecisionId: resolution.supersedingDecisionId, // If intentional change, new decision ID
  };

  resolutions.push(savedResolution);
  await storage.set(DRIFT_RESOLUTIONS_KEY, resolutions);
  
  return savedResolution;
}

/**
 * Get drift resolutions for an issue
 * @param {string} issueId
 * @returns {Promise<Array>}
 */
async function getDriftResolutions(issueId) {
  const resolutions = await storage.get(DRIFT_RESOLUTIONS_KEY) || [];
  return resolutions.filter(r => r.issueId === issueId);
}

/**
 * Check if a drift has been resolved
 * @param {string} issueId
 * @param {string} decisionId
 * @returns {Promise<Object|null>}
 */
async function isDriftResolved(issueId, decisionId) {
  const resolutions = await storage.get(DRIFT_RESOLUTIONS_KEY) || [];
  return resolutions.find(r => r.issueId === issueId && r.decisionId === decisionId) || null;
}

/**
 * Generate a unique ID
 * @returns {string}
 */
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Clear all storage (for testing/reset)
 * @returns {Promise<void>}
 */
async function clearAllStorage() {
  await storage.delete(DECISIONS_KEY);
  await storage.delete(DRIFT_RESOLUTIONS_KEY);
}

module.exports = {
  saveDecision,
  getAllDecisions,
  getDecisionsForIssue,
  updateDecision,
  deleteDecision,
  saveDriftResolution,
  getDriftResolutions,
  isDriftResolved,
  clearAllStorage,
};
