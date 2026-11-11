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

// Technology catalog with aliases
const TECH_CATALOG = {
  // Relational/SQL databases (primary database category)
  relationalDb: ['postgresql', 'postgres', 'mysql', 'mariadb', 'sqlserver', 'oracle', 'sqlite', 'cockroachdb'],
  // Document/NoSQL databases (also primary database category for drift detection)
  documentDb: ['mongodb', 'dynamodb', 'cassandra', 'couchdb', 'firestore', 'cosmosdb'],
  // Caches (separate category)
  cache: ['redis', 'memcached', 'elasticache', 'varnish'],
  // Message queues (separate category)
  queue: ['kafka', 'rabbitmq', 'sqs', 'pubsub', 'kinesis', 'servicebus'],
  // Frontend frameworks
  frontend: ['react', 'vue', 'angular', 'svelte', 'ember', 'solid', 'preact', 'nextjs', 'nuxt', 'gatsby'],
  // Backend frameworks
  backend: ['express', 'fastapi', 'django', 'spring', 'nestjs', 'flask', 'rails', 'laravel', 'aspnet'],
  // Cloud providers
  cloud: ['aws', 'azure', 'gcp', 'cloudflare', 'heroku', 'digitalocean', 'vercel', 'netlify'],
  // Auth methods (note: sso removed from alternatives - it's a capability, not an auth method)
  auth: ['oauth', 'oauth2', 'jwt', 'saml', 'auth0', 'okta', 'cognito'],
};

// Ambiguous tech names that need context cues (common English words or proper nouns)
const AMBIGUOUS_TECHS = {
  // DB
  'oracle': ['database', 'db', 'store', 'storage', 'persist'],
  'firestore': ['database', 'db', 'store', 'storage', 'persist'],
  // Frontend
  'solid': ['framework', 'frontend', 'ui', 'component', 'app', 'js', '.js'],
  'ember': ['framework', 'frontend', 'ui', 'component', 'app', 'js', '.js'],
  'preact': ['framework', 'frontend', 'ui', 'component', 'app', 'js', '.js'],
  // Backend
  'express': ['framework', 'backend', 'api', 'server', 'js', '.js'],
  'spring': ['framework', 'backend', 'api', 'server', 'boot'],
  'flask': ['framework', 'backend', 'api', 'server', 'python'],
  'rails': ['framework', 'backend', 'api', 'server', 'ruby'],
  // Cloud
  'aws': ['deploy', 'host', 'hosting', 'infra', 'cloud', 'region', 'lambda', 'ec2', 's3'],
  'azure': ['deploy', 'host', 'hosting', 'infra', 'cloud', 'region'],
  'gcp': ['deploy', 'host', 'hosting', 'infra', 'cloud', 'region'],
  'vercel': ['deploy', 'host', 'hosting', 'infra', 'cloud'],
  'netlify': ['deploy', 'host', 'hosting', 'infra', 'cloud'],
  'heroku': ['deploy', 'host', 'hosting', 'infra', 'cloud'],
  'cloudflare': ['deploy', 'host', 'hosting', 'infra', 'cloud', 'cdn'],
  'digitalocean': ['deploy', 'host', 'hosting', 'infra', 'cloud'],
  // Queue
  'kafka': ['queue', 'message', 'stream', 'event', 'broker'],
};

// Qualified forms that make ambiguous techs unambiguous
const QUALIFIED_FORMS = {
  'solid': ['solidjs', 'solid.js'],
  'spring': ['spring boot', 'spring framework', 'springframework'],
  'oracle': ['oracle db', 'oracle database'],
  'express': ['express.js', 'expressjs'],
  'ember': ['ember.js', 'emberjs'],
  'rails': ['ruby on rails', 'rails framework'],
  'flask': ['flask framework', 'flask app'],
  'firestore': ['firebase firestore', 'cloud firestore'],
  'preact': ['preact.js', 'preactjs'],
  'vercel': ['vercel deploy', 'vercel.com'],
  'netlify': ['netlify deploy', 'netlify.com'],
};

// Aliases map: tech -> canonical name
const TECH_ALIASES = {
  'postgres': 'postgresql',
  'mongo': 'mongodb',
  'k8s': 'kubernetes',
  'next': 'nextjs',
  'oauth2': 'oauth',
};

// Build a flat list of all known technologies
const ALL_TECHS = Object.values(TECH_CATALOG).flat();

/**
 * Check if an issue text drifts from approved decisions
 * @param {string} issueText - The issue summary + description to check
 * @param {Array} approvedDecisions - Array of approved decision objects
 * @returns {Array} Array of drift warnings
 */
function detectDrift(issueText, approvedDecisions, options = {}) {
  if (!issueText || !Array.isArray(approvedDecisions)) {
    return [];
  }

  const drifts = [];
  const lowerIssueText = issueText.toLowerCase();
  const issueKeywords = extractKeywordsFromText(issueText);

  // Track strongest drift per decision (avoid duplicates)
  const decisionDrifts = new Map();

  for (const decision of approvedDecisions) {
    // A decision never drifts from the issue it was made in
    if (options.currentIssueKey && decision.sourceIssueKey === options.currentIssueKey) {
      continue;
    }
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
  const seenExplanations = new Set();
  const sortedDrifts = Array.from(decisionDrifts.values())
    .filter((d) => {
      if (seenExplanations.has(d.explanation)) return false;
      seenExplanations.add(d.explanation);
      return true;
    })
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
const SCOPE_STOPWORDS = new Set(['decision', 'decided', 'define', 'scope', 'v1', 'v2', 'implementation', 'implement', 'use', 'using', 'deferred', 'later']);

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function detectContradiction(issueText, decisionText, decisionKeywords) {
  // Type 1: Check for scope violations first (highest priority)
  for (const keyword of decisionKeywords) {
    if (SCOPE_STOPWORDS.has(keyword)) continue;
    const kw = escapeRegExp(keyword);
    // The keyword must be the object of a negation/exclusion ("no SSO", "SSO is out of scope", "SSO deferred")
    const decisionIsNegative =
      new RegExp(`\\b(no|not|without|won't|exclude|excluding|skip|drop)\\b[^.;]{0,20}\\b${kw}\\b`).test(decisionText) ||
      new RegExp(`\\b${kw}\\b[^.;]{0,25}\\b(out of scope|excluded|deferred)\\b`).test(decisionText);

    if (decisionIsNegative) {
      // Check if issue mentions this keyword as a whole word
      if (new RegExp(`\\b${kw}\\b`).test(issueText)) {
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
      // Get canonical form of decided tech
      const decidedTech = normalizeAlias(keyword);
      const decidedCategory = getTechCategory(decidedTech);
      
      if (decidedCategory) {
        // Find ANY mention of technologies in the same category (not negated)
        const mentionedTechs = findTechMentions(issueText);
        
        for (const mentionedTech of mentionedTechs) {
          const normalizedMention = normalizeAlias(mentionedTech);
          
          // Skip if it's the same tech or an alias
          if (normalizedMention === decidedTech) continue;
          
          // Check if it's in a conflicting category
          const mentionCategory = getTechCategory(normalizedMention);
          if (shouldFlagAsAlternative(decidedCategory, mentionCategory)) {
            return {
              type: 'alternative',
              explanation: `Issue uses "${mentionedTech}" instead of decided "${keyword}"`,
              confidence: 0.75,
              matchedPhrase: mentionedTech,
            };
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
 * Normalize tech aliases to canonical form
 * @param {string} tech - Technology name
 * @returns {string} Canonical name
 */
function normalizeAlias(tech) {
  const lower = tech.toLowerCase();
  return TECH_ALIASES[lower] || lower;
}

/**
 * Get the category of a technology
 * @param {string} tech - Technology name (normalized)
 * @returns {string|null} Category name or null
 */
function getTechCategory(tech) {
  for (const [category, techs] of Object.entries(TECH_CATALOG)) {
    if (techs.includes(tech)) {
      return category;
    }
  }
  return null;
}

/**
 * Check if mentioned category should flag as alternative to decided category
 * Relational and document DBs are treated as same "primary database" category
 * @param {string} decidedCategory
 * @param {string} mentionedCategory
 * @returns {boolean}
 */
function shouldFlagAsAlternative(decidedCategory, mentionedCategory) {
  if (!decidedCategory || !mentionedCategory) return false;
  
  // Relational and document DBs are both "primary database" - flag as alternatives
  const primaryDbCategories = ['relationalDb', 'documentDb'];
  if (primaryDbCategories.includes(decidedCategory) && primaryDbCategories.includes(mentionedCategory)) {
    return true;
  }
  
  // Same category = alternative
  return decidedCategory === mentionedCategory;
}

/**
 * Check if a tech mention has required context (for ambiguous techs)
 * @param {string} text - Lowercase text
 * @param {string} tech - Technology name
 * @param {number} matchIndex - Index of the match in text
 * @returns {boolean}
 */
function hasRequiredContext(text, tech, matchIndex) {
  // Not ambiguous -> no context required
  if (!AMBIGUOUS_TECHS[tech]) {
    return true;
  }
  
  // Check for qualified forms first (e.g., "Spring Boot", "Oracle DB")
  const qualifiedForms = QUALIFIED_FORMS[tech] || [];
  for (const form of qualifiedForms) {
    if (text.includes(form)) {
      return true;
    }
  }
  
  // Check for context cues within ±4 words (~30 chars)
  const contextStart = Math.max(0, matchIndex - 30);
  const contextEnd = Math.min(text.length, matchIndex + tech.length + 30);
  const context = text.slice(contextStart, contextEnd);
  
  const requiredCues = AMBIGUOUS_TECHS[tech];
  for (const cue of requiredCues) {
    // Use word boundary for whole-word match (except for .js which has a dot)
    if (cue === '.js') {
      if (context.includes('.js')) {
        return true;
      }
    } else {
      const cueRegex = new RegExp(`\\b${escapeRegExp(cue)}\\b`, 'i');
      if (cueRegex.test(context)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Find all technology mentions in text (not negated, with context for ambiguous techs)
 * @param {string} text - Lowercase text
 * @returns {Array} Array of mentioned technology names
 */
function findTechMentions(text) {
  const mentions = [];
  
  for (const tech of ALL_TECHS) {
    // Check for whole-word match
    const regex = new RegExp(`\\b${escapeRegExp(tech)}\\b`, 'gi');
    const match = regex.exec(text);
    
    if (match) {
      const matchIndex = match.index;
      
      // Check if this mention has required context (for ambiguous techs)
      if (!hasRequiredContext(text, tech, matchIndex)) {
        continue;
      }
      
      // Find the sentence containing this match (approx: look 100 chars before)
      const contextStart = Math.max(0, matchIndex - 100);
      const context = text.slice(contextStart, matchIndex + tech.length + 50);
      
      // Check for negation patterns in the context
      const isNegated = 
        /\bnot\s+\w*\s*\w*\s*$/.test(text.slice(contextStart, matchIndex)) ||  // "not ... tech"
        /\bno\s+\w*\s*\w*\s*$/.test(text.slice(contextStart, matchIndex)) ||    // "no ... tech"
        /\bavoid\s+\w*\s*\w*\s*$/.test(text.slice(contextStart, matchIndex)) || // "avoid ... tech"
        /\binstead of\s+\w*\s*\w*\s*$/.test(text.slice(contextStart, matchIndex)) || // "instead of tech"
        /\brather than\s+\w*\s*\w*\s*$/.test(text.slice(contextStart, matchIndex)) || // "rather than tech"
        context.includes(`migrate away from ${tech}`) ||
        context.includes(`moving away from ${tech}`);
      
      if (!isNegated) {
        mentions.push(tech);
      }
    }
  }
  
  return mentions;
}

/**
 * Check if two technologies are in the same category (LEGACY - kept for compatibility)
 * @param {string} tech1
 * @param {string} tech2
 * @returns {boolean}
 */
function hasSameCategory(tech1, tech2) {
  const norm1 = normalizeAlias(tech1);
  const norm2 = normalizeAlias(tech2);
  
  const cat1 = getTechCategory(norm1);
  const cat2 = getTechCategory(norm2);
  
  return shouldFlagAsAlternative(cat1, cat2);
}

module.exports = {
  detectDrift,
  detectContradiction,
  extractKeywordsFromText,
  calculateKeywordOverlap,
  hasSameCategory,
  findTechMentions,
  normalizeAlias,
  getTechCategory,
  shouldFlagAsAlternative,
  hasRequiredContext,
};
