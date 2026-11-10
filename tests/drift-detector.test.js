/**
 * Unit tests for drift detector
 */

const {
  detectDrift,
  detectContradiction,
  extractKeywordsFromText,
  calculateKeywordOverlap,
  hasSameCategory,
} = require('../src/drift-detector');

describe('Drift Detector', () => {
  describe('detectDrift', () => {
    it('should detect direct negation of a technology choice', () => {
      const issueText = 'Implementing authentication without using OAuth';
      const decisions = [
        {
          text: 'We decided to use OAuth for authentication',
          keywords: ['oauth', 'authentication'],
          topics: ['security'],
        }
      ];

      const drifts = detectDrift(issueText, decisions);
      expect(drifts.length).toBeGreaterThan(0);
      expect(drifts[0].type).toBe('negation');
    });

    it('should detect alternative technology usage', () => {
      const issueText = 'Building the API with MongoDB for storage';
      const decisions = [
        {
          text: 'We decided to use PostgreSQL for the database',
          keywords: ['postgres', 'postgresql', 'database'],
          topics: ['database'],
        }
      ];

      const drifts = detectDrift(issueText, decisions);
      expect(drifts.length).toBeGreaterThan(0);
      expect(drifts[0].type).toBe('alternative');
    });

    it('should detect scope violations', () => {
      const issueText = 'Implementing SSO integration with OAuth';
      const decisions = [
        {
          text: 'Agreed: no SSO in v1, out of scope',
          keywords: ['sso', 'oauth'],
          topics: ['security', 'scope'],
        }
      ];

      const drifts = detectDrift(issueText, decisions);
      expect(drifts.length).toBeGreaterThan(0);
      expect(drifts[0].type).toBe('scope_violation');
    });

    it('should not detect drift for unrelated issues', () => {
      const issueText = 'Fix button alignment on the dashboard';
      const decisions = [
        {
          text: 'We decided to use PostgreSQL for the database',
          keywords: ['postgres', 'postgresql', 'database'],
          topics: ['database'],
        }
      ];

      const drifts = detectDrift(issueText, decisions);
      expect(drifts.length).toBe(0);
    });

    it('should handle empty or invalid input', () => {
      expect(detectDrift('', [])).toEqual([]);
      expect(detectDrift(null, [])).toEqual([]);
      expect(detectDrift('some text', null)).toEqual([]);
    });

    it('should not detect drift when issue aligns with decision', () => {
      const issueText = 'Add new query to PostgreSQL database';
      const decisions = [
        {
          text: 'We decided to use PostgreSQL for the database',
          keywords: ['postgres', 'postgresql', 'database'],
          topics: ['database'],
        }
      ];

      const drifts = detectDrift(issueText, decisions);
      expect(drifts.length).toBe(0);
    });
  });

  describe('detectContradiction', () => {
    it('should detect negation pattern', () => {
      const issueText = 'not using oauth for auth';
      const decisionText = 'we decided to use oauth';
      const keywords = ['oauth'];

      const contradiction = detectContradiction(issueText, decisionText, keywords);
      expect(contradiction).not.toBeNull();
      expect(contradiction.type).toBe('negation');
    });

    it('should detect scope violation with excluded technology', () => {
      const issueText = 'implementing sso with oauth';
      const decisionText = 'agreed not to sso, out of scope';
      const keywords = ['sso', 'oauth'];

      const contradiction = detectContradiction(issueText, decisionText, keywords);
      expect(contradiction).not.toBeNull();
      expect(contradiction.type).toBe('scope_violation');
    });

    it('should return null for no contradiction', () => {
      const issueText = 'fix postgres connection bug';
      const decisionText = 'we decided to use postgres';
      const keywords = ['postgres'];

      const contradiction = detectContradiction(issueText, decisionText, keywords);
      expect(contradiction).toBeNull();
    });

    it('should provide confidence scores', () => {
      const issueText = 'not using oauth';
      const decisionText = 'decided to use oauth';
      const keywords = ['oauth'];

      const contradiction = detectContradiction(issueText, decisionText, keywords);
      expect(contradiction).not.toBeNull();
      expect(contradiction.confidence).toBeGreaterThan(0);
      expect(contradiction.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('extractKeywordsFromText', () => {
    it('should extract database technologies', () => {
      const keywords = extractKeywordsFromText('using PostgreSQL and MongoDB');
      expect(keywords.has('postgres')).toBe(true);
      expect(keywords.has('mongodb')).toBe(true);
    });

    it('should extract frontend frameworks', () => {
      const keywords = extractKeywordsFromText('building with React and Vue');
      expect(keywords.has('react')).toBe(true);
      expect(keywords.has('vue')).toBe(true);
    });

    it('should extract cloud providers', () => {
      const keywords = extractKeywordsFromText('deploying to AWS and GCP');
      expect(keywords.has('aws')).toBe(true);
      expect(keywords.has('gcp')).toBe(true);
    });

    it('should return empty set for generic text', () => {
      const keywords = extractKeywordsFromText('just a regular sentence');
      expect(keywords.size).toBe(0);
    });
  });

  describe('calculateKeywordOverlap', () => {
    it('should calculate overlap correctly', () => {
      const set1 = new Set(['postgres', 'database', 'sql']);
      const arr2 = ['postgres', 'database'];

      const overlap = calculateKeywordOverlap(set1, arr2);
      expect(overlap).toBeGreaterThan(0);
      expect(overlap).toBeLessThanOrEqual(1);
    });

    it('should return 0 for no overlap', () => {
      const set1 = new Set(['postgres', 'database']);
      const arr2 = ['react', 'frontend'];

      const overlap = calculateKeywordOverlap(set1, arr2);
      expect(overlap).toBe(0);
    });

    it('should return 0 for empty inputs', () => {
      expect(calculateKeywordOverlap(new Set(), [])).toBe(0);
      expect(calculateKeywordOverlap(new Set(['test']), [])).toBe(0);
      expect(calculateKeywordOverlap(new Set(), ['test'])).toBe(0);
    });
  });

  describe('hasSameCategory', () => {
    it('should match database technologies', () => {
      expect(hasSameCategory('postgres', 'mongodb')).toBe(true);
      expect(hasSameCategory('mysql', 'redis')).toBe(true);
    });

    it('should match frontend frameworks', () => {
      expect(hasSameCategory('react', 'vue')).toBe(true);
      expect(hasSameCategory('angular', 'svelte')).toBe(true);
    });

    it('should match cloud providers', () => {
      expect(hasSameCategory('aws', 'azure')).toBe(true);
      expect(hasSameCategory('gcp', 'aws')).toBe(true);
    });

    it('should not match different categories', () => {
      expect(hasSameCategory('postgres', 'react')).toBe(false);
      expect(hasSameCategory('aws', 'mongodb')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(hasSameCategory('PostgreSQL', 'MongoDB')).toBe(true);
      expect(hasSameCategory('React', 'Vue')).toBe(true);
    });
  });

  describe('drift deduplication and ordering', () => {
    it('should show only strongest drift per decision', () => {
      const issueText = 'Implementing OAuth SSO with MongoDB database';
      const approvedDecisions = [
        {
          id: 'decision-1',
          text: 'Decision: no SSO implementation in v1, deferred to v2',
          keywords: ['sso'],
          topics: ['security'],
        },
      ];

      const drifts = detectDrift(issueText, approvedDecisions);
      
      // Should only get one drift for decision-1 (scope violation, not multiple)
      const decision1Drifts = drifts.filter(d => d.decision.id === 'decision-1');
      expect(decision1Drifts.length).toBe(1);
      expect(decision1Drifts[0].type).toBe('scope_violation');
    });

    it('should order drifts by severity (scope violations first)', () => {
      const issueText = 'Using MongoDB and implementing SSO';
      const approvedDecisions = [
        {
          id: 'decision-1',
          text: 'We decided to use PostgreSQL',
          keywords: ['postgresql'],
          topics: ['database'],
        },
        {
          id: 'decision-2',
          text: 'Decision: no SSO, deferred to v2',
          keywords: ['sso'],
          topics: ['security'],
        },
      ];

      const drifts = detectDrift(issueText, approvedDecisions);
      
      // Scope violation should come first (SSO)
      expect(drifts.length).toBeGreaterThan(0);
      const firstDrift = drifts[0];
      expect(firstDrift.type).toBe('scope_violation');
      expect(firstDrift.decision.keywords).toContain('sso');
    });

    it('should detect SSO scope violation', () => {
      const issueText = 'Add SSO login with OAuth2';
      const approvedDecisions = [
        {
          id: 'decision-1',
          text: 'Decision: no SSO implementation in v1, deferred to v2',
          keywords: ['sso'],
          topics: ['security'],
        },
      ];

      const drifts = detectDrift(issueText, approvedDecisions);
      
      expect(drifts.length).toBeGreaterThan(0);
      expect(drifts[0].type).toBe('scope_violation');
      expect(drifts[0].explanation).toMatch(/sso/i);
      expect(drifts[0].explanation).toMatch(/exclude.*from scope/i);
    });

    it('should say "uses X instead of Y" for alternatives', () => {
      const issueText = 'Using MongoDB for database storage';
      const approvedDecisions = [
        {
          id: 'decision-1',
          text: 'We decided to use PostgreSQL for the database',
          keywords: ['postgresql'],
          topics: ['database'],
        },
      ];

      const drifts = detectDrift(issueText, approvedDecisions);
      
      expect(drifts.length).toBeGreaterThan(0);
      const alternativeDrift = drifts.find(d => d.type === 'alternative');
      expect(alternativeDrift).toBeDefined();
      expect(alternativeDrift.explanation).toMatch(/uses.*instead of/i);
      expect(alternativeDrift.explanation).toContain('mongodb');
      expect(alternativeDrift.explanation).toContain('postgresql');
    });
  });
});
