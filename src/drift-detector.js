/**
 * Drift Detector
 * Compares new work items against approved decisions to detect contradictions.
 * Uses keyword overlap and negation patterns for explainable drift detection.
 */

// Negation/contradiction patterns
const NEGATION_PATTERNS = [
  /\bnot\s+using\b/i,
  /\bwithout\s+using\b/i,
  /\bwon't\s+use\b/i,
  /\bremoving\b/i,
  /\breplacing\b/i,
  /\bswitching\s+(from|away)/i,
  /\bmigrating\s+from\b/i,
  /\bdeprecating\b/i,
  /\bmoving\s+away\b/i,
];

// Affirmative technology usage patterns
const USAGE_PATTERNS = [
  /\busing\s+(\w+)/i,
  /\bimplementing\s+(\w+)/i,
  /\badding\s+(\w+)/i,
  /\bintegrating\s+(\w+)/i,
  /\bwith\s+(\w+)/i,
];

/**
 * Check if an issue text drifts from approved decisions
 * @param {string} issueText - The issue summary + description to check
 * @param {Array} approvedDecisions - Array of approved decision objects
 * @returns {Array} Array of drift warnings
 */
function detectDrift(issueText, approvedDecisions) {
  if (!issueText || !Array.isArray(approvedDecisions)) {
    return [];
  }

  const drifts = [];
  const lowerIssueText = issueText.toLowerCase();
  const issueKeywords = extractKeywordsFromText(issueText);

  // Track strongest drift per decision (avoid duplicates)
  const decisionDrifts = new Map();

  for (const decision of approvedDecisions) {
    const decisionKeywords = decision.keywords || [];
    const decisionTopics = decision.topics || [];
    
    // Check for keyword overlap (relevance)
    const overlap = calculateKeywordOverlap(issueKeywords, decisionKeywords);
    
    // Need some relevance to check for drift
    if (overlap < 0.2 && decisionTopics.length === 0) {
      continue;
    }

    // Check for contradictions
    const contradiction = detectContradiction(
      lowerIssueText,
      decision.text.toLowerCase(),
      decisionKeywords
    );

    if (contradiction) {
      const drift = {
        decision,
        type: contradiction.type,
        explanation: contradiction.explanation,
        confidence: contradiction.confidence,
        matchedPhrase: contradiction.matchedPhrase,
      };

      // Keep only the strongest drift per decision
      const existing = decisionDrifts.get(decision.id);
      if (!existing || contradiction.confidence > existing.confidence) {
        decisionDrifts.set(decision.id, drift);
      }
    }
  }

  // Convert map to array and sort by severity (confidence)
  const sortedDrifts = Array.from(decisionDrifts.values())
    .sort((a, b) => {
      // Scope violations first (highest confidence)
      if (a.type === 'scope_violation' && b.type !== 'scope_violation') return -1;
      if (b.type === 'scope_violation' && a.type !== 'scope_violation') return 1;
      // Then by confidence
      return b.confidence - a.confidence;
    });

  return sortedDrifts;
}

/**
 * Detect if issue text contradicts a decision
 * @param {string} issueText - Lowercase issue text
 * @param {string} decisionText - Lowercase decision text
 * @param {Array} decisionKeywords - Keywords from the decision
 * @returns {Object|null} Contradiction details or null
 */
function detectContradiction(issueText, decisionText, decisionKeywords) {
  // Type 1: Check for scope violations first (highest priority)
  for (const keyword of decisionKeywords) {
    const decisionIsNegative = 
      decisionText.includes(`no ${keyword}`) ||
      decisionText.includes(`not ${keyword}`) ||
      decisionText.includes(`won't ${keyword}`) ||
      (decisionText.includes('excluded') && decisionText.includes(keyword)) ||
      (decisionText.includes('out of scope') && decisionText.includes(keyword)) ||
      (decisionText.includes('deferred') && decisionText.includes(keyword));

    if (decisionIsNegative) {
      // Check if issue mentions this keyword in affirmative context
      if (issueText.includes(keyword)) {
        return {
          type: 'scope_violation',
          explanation: `Issue implements "${keyword}", but decision was to exclude it from scope`,
          confidence: 0.85,
          matchedPhrase: keyword,
        };
      }
    }
  }

  // Type 2: Check for alternative technology usage
  for (const keyword of decisionKeywords) {
    const decisionIsAffirmative = 
      decisionText.includes(`use ${keyword}`) ||
      decisionText.includes(`using ${keyword}`) ||
      decisionText.includes(`chose ${keyword}`) ||
      decisionText.includes(`selected ${keyword}`) ||
      decisionText.includes(`going with ${keyword}`) ||
      decisionText.includes(`decided ${keyword}`);

    if (decisionIsAffirmative) {
      // Check for use of a different technology in the same category
      const issueUsage = extractUsedTechnologies(issueText);
      
      if (issueUsage.length > 0) {
        for (const usedTech of issueUsage) {
          if (usedTech !== keyword) {
            const sameCategory = hasSameCategory(keyword, usedTech);
            if (sameCategory) {
              return {
                type: 'alternative',
                explanation: `Issue uses "${usedTech}" instead of decided "${keyword}"`,
                confidence: 0.75,
                matchedPhrase: usedTech,
              };
            }
          }
        }
      }

      // Check for explicit negation in issue
      for (const pattern of NEGATION_PATTERNS) {
        const match = pattern.exec(issueText);
        if (match && issueText.includes(keyword)) {
          return {
            type: 'negation',
            explanation: `Issue avoids "${keyword}", but decision was to use it`,
            confidence: 0.7,
            matchedPhrase: match[0],
          };
        }
      }
    }
  }

  return null;
}

/**
 * Extract keywords from text for comparison
 * @param {string} text
 * @returns {Set} Set of keywords
 */
function extractKeywordsFromText(text) {
  const keywords = new Set();
  const lowerText = text.toLowerCase();
  
  // Common tech terms
  const techTerms = [
    'postgres', 'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch',
    'react', 'vue', 'angular', 'svelte', 'next', 'nuxt',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'k8s',
    'rest', 'graphql', 'grpc', 'api', 'microservice',
    'oauth', 'jwt', 'sso', 'saml', 'auth0',
    'typescript', 'javascript', 'python', 'java', 'go', 'rust',
    'express', 'fastapi', 'django', 'spring', 'nestjs',
  ];

  techTerms.forEach(term => {
    if (lowerText.includes(term)) {
      keywords.add(term);
    }
  });

  return keywords;
}

/**
 * Calculate keyword overlap between two sets
 * @param {Set} set1
 * @param {Array} arr2
 * @returns {number} Overlap ratio 0-1
 */
function calculateKeywordOverlap(set1, arr2) {
  if (set1.size === 0 || arr2.length === 0) {
    return 0;
  }

  let matches = 0;
  arr2.forEach(keyword => {
    if (set1.has(keyword)) {
      matches++;
    }
  });

  return matches / Math.max(set1.size, arr2.length);
}

/**
 * Extract technologies being used from text
 * @param {string} text - Lowercase text
 * @returns {Array} Array of technology names
 */
function extractUsedTechnologies(text) {
  const technologies = [];
  
  for (const pattern of USAGE_PATTERNS) {
    const match = pattern.exec(text);
    if (match && match[1]) {
      technologies.push(match[1].toLowerCase());
    }
  }

  return technologies;
}

/**
 * Check if two technologies are in the same category
 * @param {string} tech1
 * @param {string} tech2
 * @returns {boolean}
 */
function hasSameCategory(tech1, tech2) {
  const categories = {
    database: ['postgres', 'postgresql', 'mysql', 'mongodb', 'redis', 'dynamodb', 'cassandra'],
    frontend: ['react', 'vue', 'angular', 'svelte', 'ember'],
    backend: ['express', 'fastapi', 'django', 'spring', 'nestjs', 'flask'],
    cloud: ['aws', 'azure', 'gcp', 'cloudflare', 'heroku'],
    auth: ['oauth', 'jwt', 'sso', 'saml', 'auth0', 'okta'],
  };

  for (const [category, techs] of Object.entries(categories)) {
    if (techs.includes(tech1.toLowerCase()) && techs.includes(tech2.toLowerCase())) {
      return true;
    }
  }

  return false;
}

module.exports = {
  detectDrift,
  detectContradiction,
  extractKeywordsFromText,
  calculateKeywordOverlap,
  hasSameCategory,
};
