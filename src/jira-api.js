/**
 * Jira API helpers using Forge API
 */

const api = require('@forge/api');

/**
 * Fetch issue data including description and comments
 * @param {string} issueIdOrKey - Issue ID or key
 * @returns {Promise<Object>} Issue data
 */
async function fetchIssueData(issueIdOrKey) {
  const response = await api.asApp().requestJira(`/rest/api/3/issue/${issueIdOrKey}?expand=renderedFields,names,schema,operations,editmeta,changelog,versionedRepresentations,comment`, {
    headers: {
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch issue: ${error}`);
  }

  return await response.json();
}

/**
 * Get project information
 * @param {string} projectIdOrKey
 * @returns {Promise<Object>}
 */
async function fetchProjectData(projectIdOrKey) {
  const response = await api.asApp().requestJira(`/rest/api/3/project/${projectIdOrKey}`, {
    headers: {
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch project: ${error}`);
  }

  return await response.json();
}

/**
 * Search for issues in a project
 * @param {string} projectKey
 * @param {Object} options - Search options
 * @returns {Promise<Array>}
 */
async function searchIssues(projectKey, options = {}) {
  const jql = options.jql || `project = ${projectKey}`;
  const maxResults = options.maxResults || 50;
  
  const response = await api.asApp().requestJira(`/rest/api/3/search`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      jql,
      maxResults,
      fields: options.fields || ['summary', 'description', 'created', 'updated']
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to search issues: ${error}`);
  }

  const data = await response.json();
  return data.issues || [];
}

module.exports = {
  fetchIssueData,
  fetchProjectData,
  searchIssues,
};
