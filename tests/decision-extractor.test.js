/**
 * Unit tests for decision extractor
 */

const {
  adfToText,
  extractDecisions,
  containsNonLatinScript,
  calculateConfidence,
  extractTopics,
  extractKeywords,
} = require('../src/decision-extractor');

describe('Decision Extractor', () => {
  describe('extractDecisions', () => {
    it('should extract affirmative decisions', () => {
      const text = "We decided to use PostgreSQL for the main database. It has better JSON support.";
      const decisions = extractDecisions(text);
      
      expect(decisions.length).toBeGreaterThan(0);
      expect(decisions[0].text).toContain('PostgreSQL');
      expect(decisions[0].confidence).toBeGreaterThan(0);
    });

    it('should extract negative decisions (out of scope)', () => {
      const text = "We agreed not to implement SSO in v1. It's out of scope for the MVP.";
      const decisions = extractDecisions(text);
      
      expect(decisions.length).toBeGreaterThan(0);
      const hasNegativeDecision = decisions.some(d => 
        d.text.toLowerCase().includes('not') || d.text.toLowerCase().includes('out of scope')
      );
      expect(hasNegativeDecision).toBe(true);
    });

    it('should extract "going with" decisions', () => {
      const text = "After discussion, we're going with React for the frontend.";
      const decisions = extractDecisions(text);
      
      expect(decisions.length).toBeGreaterThan(0);
      expect(decisions[0].text).toContain('React');
    });

    it('should handle empty or invalid input', () => {
      expect(extractDecisions('')).toEqual([]);
      expect(extractDecisions(null)).toEqual([]);
      expect(extractDecisions(undefined)).toEqual([]);
    });

    it('should filter out Hebrew text', () => {
      const text = "החלטנו להשתמש ב-PostgreSQL למסד הנתונים";
      const decisions = extractDecisions(text);
      
      expect(decisions).toEqual([]);
    });

    it('should ignore very short fragments', () => {
      const text = "We decided. Yes.";
      const decisions = extractDecisions(text);
      
      expect(decisions.length).toBe(0);
    });

    it('should extract multiple decisions from text', () => {
      const text = `
        We decided to use PostgreSQL for the database.
        We also agreed not to implement SSO in v1.
        We're going with Docker for containerization.
      `;
      const decisions = extractDecisions(text);
      
      expect(decisions.length).toBeGreaterThanOrEqual(2);
    });

    it('should extract decisions from ADF objects', () => {
      const adfObject = {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'We decided to use PostgreSQL for the database.'
              }
            ]
          }
        ]
      };
      
      const decisions = extractDecisions(adfObject);
      
      expect(decisions.length).toBeGreaterThan(0);
      expect(decisions[0].text).toContain('PostgreSQL');
    });

    it('should handle ADF with multiple paragraphs', () => {
      const adfObject = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'We agreed not to implement SSO in v1.' }]
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Going with React for the frontend.' }]
          }
        ]
      };
      
      const decisions = extractDecisions(adfObject);
      
      expect(decisions.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('adfToText', () => {
    it('should convert simple ADF text node to string', () => {
      const adf = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Hello world' }
            ]
          }
        ]
      };
      
      const result = adfToText(adf);
      expect(result).toContain('Hello world');
    });

    it('should handle multiple paragraphs', () => {
      const adf = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'First paragraph' }]
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Second paragraph' }]
          }
        ]
      };
      
      const result = adfToText(adf);
      expect(result).toContain('First paragraph');
      expect(result).toContain('Second paragraph');
    });

    it('should handle hard breaks', () => {
      const adf = {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Line 1' },
          { type: 'hardBreak' },
          { type: 'text', text: 'Line 2' }
        ]
      };
      
      const result = adfToText(adf);
      expect(result).toContain('Line 1');
      expect(result).toContain('Line 2');
    });

    it('should return empty string for null or undefined', () => {
      expect(adfToText(null)).toBe('');
      expect(adfToText(undefined)).toBe('');
    });

    it('should pass through plain strings unchanged', () => {
      expect(adfToText('plain text')).toBe('plain text');
    });

    it('should handle arrays', () => {
      const adf = [
        { type: 'text', text: 'Part 1' },
        { type: 'text', text: 'Part 2' }
      ];
      
      const result = adfToText(adf);
      expect(result).toContain('Part 1');
      expect(result).toContain('Part 2');
    });

    it('should handle nested structures', () => {
      const adf = {
        type: 'doc',
        content: [
          {
            type: 'blockquote',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Quoted text' }]
              }
            ]
          }
        ]
      };
      
      const result = adfToText(adf);
      expect(result).toContain('Quoted text');
    });

    it('should handle empty content', () => {
      const adf = {
        type: 'paragraph',
        content: []
      };
      
      const result = adfToText(adf);
      expect(result).toBe('\n');
    });
  });

  describe('containsNonLatinScript', () => {
    it('should detect Hebrew', () => {
      expect(containsNonLatinScript('שלום')).toBe(true);
      expect(containsNonLatinScript('Hello שלום')).toBe(true);
    });

    it('should detect Arabic', () => {
      expect(containsNonLatinScript('مرحبا')).toBe(true);
    });

    it('should detect Cyrillic', () => {
      expect(containsNonLatinScript('Привет')).toBe(true);
    });

    it('should allow Latin text', () => {
      expect(containsNonLatinScript('Hello World')).toBe(false);
      expect(containsNonLatinScript('PostgreSQL')).toBe(false);
    });
  });

  describe('calculateConfidence', () => {
    it('should give high confidence to explicit decisions', () => {
      const confidence = calculateConfidence('Decision: we will use PostgreSQL');
      expect(confidence).toBeGreaterThan(0.7);
    });

    it('should give lower confidence to vague language', () => {
      const confidence = calculateConfidence('We might use PostgreSQL maybe');
      expect(confidence).toBeLessThan(0.5);
    });

    it('should boost confidence for team language', () => {
      const withTeam = calculateConfidence('We decided to use PostgreSQL');
      const withoutTeam = calculateConfidence('Decided to use PostgreSQL');
      expect(withTeam).toBeGreaterThanOrEqual(withoutTeam);
    });

    it('should bound confidence between 0 and 1', () => {
      const veryVague = calculateConfidence('maybe possibly might could perhaps');
      expect(veryVague).toBeGreaterThanOrEqual(0);
      expect(veryVague).toBeLessThanOrEqual(1);
    });
  });

  describe('extractTopics', () => {
    it('should extract database topic', () => {
      const topics = extractTopics('We decided to use PostgreSQL database');
      expect(topics).toContain('database');
    });

    it('should extract multiple topics', () => {
      const topics = extractTopics('We will use React framework with PostgreSQL database');
      expect(topics).toContain('database');
      expect(topics).toContain('framework');
    });

    it('should handle text with no topics', () => {
      const topics = extractTopics('We decided something generic');
      expect(topics).toEqual([]);
    });

    it('should extract security topic', () => {
      const topics = extractTopics('No SSO authentication in v1');
      expect(topics).toContain('security');
    });
  });

  describe('extractKeywords', () => {
    it('should extract capitalized technology names', () => {
      const keywords = extractKeywords('We will use PostgreSQL and Redis');
      expect(keywords).toContain('postgresql');
      expect(keywords).toContain('redis');
    });

    it('should extract common tech terms', () => {
      const keywords = extractKeywords('implementing rest api with oauth');
      expect(keywords).toContain('api');
      expect(keywords).toContain('oauth');
    });

    it('should extract abbreviations', () => {
      const keywords = extractKeywords('Using AWS and GCP for infrastructure');
      expect(keywords).toContain('aws');
      expect(keywords).toContain('gcp');
    });

    it('should handle text with no keywords', () => {
      const keywords = extractKeywords('just some random text');
      expect(Array.isArray(keywords)).toBe(true);
    });

    it('should not duplicate keywords', () => {
      const keywords = extractKeywords('PostgreSQL and PostgreSQL again');
      const postgresCount = keywords.filter(k => k === 'postgresql').length;
      expect(postgresCount).toBe(1);
    });
  });
});
