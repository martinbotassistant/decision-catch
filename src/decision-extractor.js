/**
 * Decision Extractor
 * Uses deterministic heuristics to identify candidate decisions in text.
 * No external APIs or LLMs - pure pattern matching.
 */

// Decision indicator patterns (case-insensitive)
const DECISION_PATTERNS = [
  // Affirmative decisions
  /\b(we|team|i|let's)\s+(decided|agreed|will|are going|chose|selected)\s+to\b/i,
  /\b(decision|agreed|decided):\s*(.+)/i,
  /\bgoing\s+with\b/i,
  /\bwe'll\s+use\b/i,
  /\bwe're\s+using\b/i,
  
  // Negative decisions (scope/exclusions)
  /\b(we|team|i)\s+(won't|will not|decided not to|agreed not to)\b/i,
  /\bout\s+of\s+scope\b/i,
  /\bnot\s+doing\b/i,
  /\bexcluded\b/i,
  /\bdeferred\b/i,
  
  // Technology/approach decisions
  /\busing\s+\w+\s+(for|as|because)\b/i,
  /\bchosen\s+\w+/i,
  /\bselected\s+\w+/i,
];

// Keywords for topical categorization
const TOPIC_KEYWORDS = {
  architecture: ['architecture', 'design', 'pattern', 'structure', 'microservice', 'monolith'],
  database: ['database', 'db', 'postgres', 'mysql', 'mongodb', 'sql', 'nosql', 'redis'],
  framework: ['framework', 'library', 'react', 'vue', 'angular', 'express', 'django', 'spring'],
  security: ['security', 'auth', 'authentication', 'authorization', 'sso', 'oauth', 'jwt'],
  infrastructure: ['infrastructure', 'aws', 'azure', 'gcp', 'cloud', 'docker', 'kubernetes', 'k8s'],
  testing: ['testing', 'test', 'qa', 'e2e', 'unit', 'integration', 'jest', 'cypress'],
  scope: ['scope', 'mvp', 'v1', 'v2', 'feature', 'requirement', 'excluded', 'deferred'],
  performance: ['performance', 'optimization', 'cache', 'caching', 'latency', 'speed'],
  ui: ['ui', 'ux', 'interface', 'design', 'component', 'frontend', 'css', 'styling'],
};

/**
 * Extract candidate decisions from text
 * @param {string} text - The text to analyze
 * @param {Object} metadata - Additional context (author, timestamp, etc.)
 * @returns {Array} Array of candidate decisions
 */
/**
 * Convert Atlassian Document Format (ADF) to plain text.
 * Jira REST v3 returns descriptions and comment bodies as ADF objects.
 */
function adfToText(node) {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(adfToText).join('');
  if (node.type === 'text') return node.text || '';
  if (node.type === 'hardBreak') return '\n';
  const inner = adfToText(node.content || []);
  const blockTypes = ['paragraph', 'heading', 'listItem', 'blockquote', 'codeBlock', 'tableCell', 'panel'];
  return blockTypes.includes(node.type) ? inner + '\n' : inner;
}

function extractDecisions(text, metadata = {}) {
  if (text && typeof text === 'object') {
    text = adfToText(text).trim();
  }
  if (!text || typeof text !== 'string') {
    return [];
  }

  // Filter non-English content (basic check for Hebrew/non-Latin scripts)
  if (containsNonLatinScript(text)) {
    return [];
  }

  const candidates = [];
  
  // Split into sentences
  const sentences = text
    .split(/[.!?\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 10); // Ignore very short fragments

  sentences.forEach((sentence, index) => {
    // Filter out false positives
    if (shouldSkipSentence(sentence)) {
      return;
    }

    for (const pattern of DECISION_PATTERNS) {
      if (pattern.test(sentence)) {
        const decision = {
          text: sentence,
          confidence: calculateConfidence(sentence),
          topics: extractTopics(sentence),
          keywords: extractKeywords(sentence),
          metadata: {
            ...metadata,
            sentenceIndex: index,
            matchedPattern: pattern.source,
          },
        };
        candidates.push(decision);
        break; // One match per sentence
      }
    }
  });

  return candidates;
}

/**
 * Check if a sentence should be skipped (not a decision)
 * @param {string} sentence
 * @returns {boolean}
 */
function shouldSkipSentence(sentence) {
  // Skip questions
  if (sentence.endsWith('?')) {
    return true;
  }

  // Skip fragments ending with ':' (usually introduce a list)
  if (sentence.endsWith(':')) {
    return true;
  }

  // Skip bullet/list fragments starting with '-' or '*'
  if (/^[-*]\s/.test(sentence)) {
    return true;
  }

  // Skip task/meta sentences with 'Check', 'Wait', 'Also',
  // unless they carry an explicit decision marker ("Also decided: ...")
  const hasDecisionMarker = /\b(decided|decision|agreed|confirmed|going with)\b/i.test(sentence);
  if (/^(Check|Wait|Also)\s/i.test(sentence) && !hasDecisionMarker) {
    return true;
  }

  // Skip descriptive task sentences (Define, Evaluate, Determine, etc.)
  if (/^(Define|Evaluate|Determine|Need to|Must|Should)\s/i.test(sentence)) {
    return true;
  }

  return false;
}

/**
 * Check if text contains non-Latin scripts (Hebrew, Arabic, etc.)
 * @param {string} text
 * @returns {boolean}
 */
function containsNonLatinScript(text) {
  // Check for Hebrew, Arabic, Cyrillic, CJK characters
  const nonLatinRegex = /[\u0590-\u05FF\u0600-\u06FF\u0400-\u04FF\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]/;
  return nonLatinRegex.test(text);
}

/**
 * Calculate confidence score for a decision candidate
 * @param {string} text
 * @returns {number} Score from 0 to 1
 */
function calculateConfidence(text) {
  let score = 0.5; // Base score

  // Higher confidence for explicit decision language
  if (/\b(decided|agreed|decision):/i.test(text)) {
    score += 0.3;
  }

  // Higher confidence for specific technology/approach mentions
  if (/\b(using|chose|selected|going with)\s+\w+/i.test(text)) {
    score += 0.2;
  }

  // Lower confidence for vague language
  if (/\b(maybe|perhaps|might|could|possibly)\b/i.test(text)) {
    score -= 0.3;
  }

  // Higher confidence for "we" language (team decision)
  if (/\b(we|team)\b/i.test(text)) {
    score += 0.1;
  }

  return Math.max(0, Math.min(1, score));
}

/**
 * Extract topics from decision text
 * @param {string} text
 * @returns {Array} Array of topic strings
 */
function extractTopics(text) {
  const topics = [];
  const lowerText = text.toLowerCase();

  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      topics.push(topic);
    }
  }

  return topics;
}

/**
 * Extract significant keywords from decision text
 * @param {string} text
 * @returns {Array} Array of keywords
 */
function extractKeywords(text) {
  // Extract capitalized words and common tech terms
  const words = text.split(/\s+/);
  const keywords = new Set();

  words.forEach(word => {
    // Remove punctuation
    const clean = word.replace(/[.,!?;:()]/g, '');
    
    // Capitalized words (potential proper nouns/tech names)
    if (/^[A-Z][a-z]+/.test(clean) && clean.length > 2) {
      keywords.add(clean.toLowerCase());
    }
    
    // All-caps abbreviations
    if (/^[A-Z]{2,}$/.test(clean)) {
      keywords.add(clean.toLowerCase());
    }
  });

  // Also extract common tech terms
  const techTerms = [
    'postgres', 'mysql', 'mongodb', 'redis', 'react', 'vue', 'angular',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'api', 'rest', 'graphql',
    'oauth', 'jwt', 'sso', 'microservice', 'cache', 'cdn'
  ];

  const lowerText = text.toLowerCase();
  techTerms.forEach(term => {
    if (lowerText.includes(term)) {
      keywords.add(term);
    }
  });

  return Array.from(keywords);
}

module.exports = {
  adfToText,
  extractDecisions,
  shouldSkipSentence,
  containsNonLatinScript,
  calculateConfidence,
  extractTopics,
  extractKeywords,
};
