/**
 * Jira API helpers using Forge API
 */

const api = require('@forge/api');
const { route } = require('@forge/api');

/**
 * Fetch issue data including description and comments
 * @param {string} issueIdOrKey - Issue ID or key
 * @returns {Promise<Object>} Issue data
 */
async function fetchIssueData(issueIdOrKey) {
  const fields = 'summary,description,project,comment,creator,created';
  const response = await api.asApp().requestJira(route`/rest/api/3/issue/${issueIdOrKey}?fields=${fields}`, {
    headers: {
      'Accept': 'application/json'
    }
  });

  const bodyText = await response.text();
  if (!response.ok) {
    throw new Error(`Failed to fetch issue ${issueIdOrKey}: ${response.status} ${bodyText}`);
  }

  let data;
  try {
    data = JSON.parse(bodyText);
  } catch (err) {
    throw new Error(`Failed to parse issue ${issueIdOrKey}: ${bodyText.slice(0, 300)}`);
  }

  if (!data || !data.fields) {
    console.error('Unexpected issue payload', {
      issueIdOrKey,
      status: response.status,
      keys: data && Object.keys(data),
      body: bodyText.slice(0, 500),
    });
    throw new Error(`Unexpected issue payload for ${issueIdOrKey}: missing fields`);
  }

  return data;
}

/**
 * Get project information
 * @param {string} projectIdOrKey
 * @returns {Promise<Object>}
 */
async function fetchProjectData(projectIdOrKey) {
  const response = await api.asApp().requestJira(route`/rest/api/3/project/${projectIdOrKey}`, {
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
  
  const response = await api.asApp().requestJira(route`/rest/api/3/search`, {
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
