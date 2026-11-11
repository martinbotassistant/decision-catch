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
      expect(hasSameCategory('mysql', 'postgres')).toBe(true);
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

  describe('live demo scenarios', () => {
    it('PAY-5: should detect scope violation for SSO (and OAuth vs JWT alternative)', () => {
      const issueText = 'Add SSO login for enterprise customers using OAuth2';
      const approvedDecisions = [
        {
          id: 'decision-1',
          sourceIssueKey: 'PAY-2',
          text: 'Decision: no SSO implementation in v1, deferred to v2',
          keywords: ['sso'],
          topics: ['security'],
        },
        {
          id: 'decision-2',
          sourceIssueKey: 'PAY-4',
          text: "We'll use JWT tokens for API authentication",
          keywords: ['jwt'],
          topics: ['security'],
        },
      ];

      const drifts = detectDrift(issueText, approvedDecisions, { currentIssueKey: 'PAY-5' });
      
      // Should flag SSO scope violation (highest priority) and OAuth vs JWT alternative
      expect(drifts.length).toBe(2);
      expect(drifts[0].type).toBe('scope_violation'); // First due to priority
      expect(drifts[0].explanation).toContain('sso');
      expect(drifts[0].decision.id).toBe('decision-1');
      
      expect(drifts[1].type).toBe('alternative'); // OAuth vs JWT
      expect(drifts[1].explanation).toMatch(/oauth.*jwt/i);
    });

    it('PAY-6: should detect MongoDB vs PostgreSQL (alternative database)', () => {
      const issueText = 'Implementing user storage with MongoDB database';
      const approvedDecisions = [
        {
          id: 'decision-1',
          sourceIssueKey: 'PAY-3',
          text: 'We decided to use PostgreSQL for the database',
          keywords: ['postgresql', 'database'],
          topics: ['database'],
        },
      ];

      const drifts = detectDrift(issueText, approvedDecisions, { currentIssueKey: 'PAY-6' });
      
      // Should flag MongoDB as alternative database
      expect(drifts.length).toBeGreaterThan(0);
      const dbDrift = drifts.find(d => d.explanation.includes('mongodb'));
      expect(dbDrift).toBeDefined();
      expect(dbDrift.type).toBe('alternative');
      expect(dbDrift.explanation).toMatch(/mongodb.*instead of.*postgresql/i);
    });

    it('PAY-7: should show single warning for Angular vs React (no duplicates)', () => {
      const issueText = 'Build user dashboard with Angular components';
      const approvedDecisions = [
        {
          id: 'decision-1',
          sourceIssueKey: 'PAY-1',
          text: 'Going with React for the frontend',
          keywords: ['react'],
          topics: ['framework'],
        },
      ];

      const drifts = detectDrift(issueText, approvedDecisions, { currentIssueKey: 'PAY-7' });
      
      // Should show exactly one drift (no duplicates)
      expect(drifts.length).toBe(1);
      expect(drifts[0].type).toBe('alternative');
      expect(drifts[0].explanation).toMatch(/angular.*instead of.*react/i);
    });

    it('should skip decisions from the same issue (no self-drift)', () => {
      const issueText = 'Implementing SSO with OAuth2';
      const approvedDecisions = [
        {
          id: 'decision-1',
          sourceIssueKey: 'PAY-5',
          text: 'Decision: we will implement SSO in this issue',
          keywords: ['sso', 'oauth'],
          topics: ['security'],
        },
        {
          id: 'decision-2',
          sourceIssueKey: 'PAY-2',
          text: 'Decision: no SSO implementation in v1',
          keywords: ['sso'],
          topics: ['security'],
        },
      ];

      const drifts = detectDrift(issueText, approvedDecisions, { currentIssueKey: 'PAY-5' });
      
      // Should only flag decision-2, not decision-1 (same issue)
      expect(drifts.length).toBe(1);
      expect(drifts[0].decision.id).toBe('decision-2');
      expect(drifts[0].decision.sourceIssueKey).toBe('PAY-2');
    });

    it('should NOT flag "decision" or "define" as scope violations (stopwords)', () => {
      const issueText = 'This issue will define the API contract and implement the decision endpoint';
      const approvedDecisions = [
        {
          id: 'decision-1',
          sourceIssueKey: 'PAY-1',
          text: 'Decision: defer the decision service to v2',
          keywords: ['decision', 'define'],
          topics: ['scope'],
        },
      ];

      const drifts = detectDrift(issueText, approvedDecisions, { currentIssueKey: 'PAY-8' });
      
      // Should not flag 'decision' or 'define' (stopwords)
      expect(drifts.length).toBe(0);
    });

    it('should deduplicate drifts with identical explanations', () => {
      const issueText = 'Using Angular and Vue components';
      const approvedDecisions = [
        {
          id: 'decision-1',
          sourceIssueKey: 'PAY-1',
          text: 'Going with React for all components',
          keywords: ['react'],
          topics: ['framework'],
        },
        {
          id: 'decision-2',
          sourceIssueKey: 'PAY-2',
          text: 'Decided to use React',
          keywords: ['react'],
          topics: ['framework'],
        },
      ];

      const drifts = detectDrift(issueText, approvedDecisions, { currentIssueKey: 'PAY-9' });
      
      // Should only show one drift even though multiple decisions exist
      expect(drifts.length).toBe(1);
    });

    it('switching from X to Y: should detect alternative when issue names decided tech', () => {
      const issueText = 'Switching from PostgreSQL to MongoDB for better flexibility';
      const approvedDecisions = [
        {
          id: 'decision-1',
          sourceIssueKey: 'PAY-3',
          text: 'We decided to use PostgreSQL',
          keywords: ['postgresql'],
          topics: ['database'],
        },
      ];

      const drifts = detectDrift(issueText, approvedDecisions, { currentIssueKey: 'PAY-10' });
      
      expect(drifts.length).toBe(1);
      expect(drifts[0].type).toBe('alternative');
      expect(drifts[0].explanation).toMatch(/mongodb.*instead of.*postgresql/i);
    });
  });

  describe('natural language alternative detection (table-driven)', () => {
    // Test cases that MUST detect drift
    const mustDriftCases = [
      {
        name: 'Build the reporting service on MongoDB',
        issueText: 'Build the reporting service on MongoDB for flexible documents.',
        decision: { text: 'We decided to use PostgreSQL for the main database', keywords: ['postgresql'], topics: ['database'] },
      },
      {
        name: 'Use MongoDB for the reporting service',
        issueText: 'Use MongoDB for the reporting service.',
        decision: { text: 'We decided to use PostgreSQL', keywords: ['postgresql'], topics: ['database'] },
      },
      {
        name: 'Store events in DynamoDB',
        issueText: 'Store events in DynamoDB for better scalability.',
        decision: { text: 'We decided to use PostgreSQL', keywords: ['postgresql'], topics: ['database'] },
      },
      {
        name: 'Migrate the dashboard to Vue',
        issueText: 'Migrate the dashboard to Vue for better reactivity.',
        decision: { text: 'Going with React for the frontend', keywords: ['react'], topics: ['frontend'] },
      },
      {
        name: "We'll write the admin in Angular",
        issueText: "We'll write the admin panel in Angular.",
        decision: { text: 'Going with React', keywords: ['react'], topics: ['frontend'] },
      },
      {
        name: 'Auth via JWT tokens (vs oauth)',
        issueText: 'Auth via JWT tokens for the API.',
        decision: { text: 'We decided to use OAuth for authentication', keywords: ['oauth'], topics: ['auth'] },
      },
      {
        name: 'Built with Vue',
        issueText: 'Dashboard will be built with Vue.',
        decision: { text: 'Going with React', keywords: ['react'], topics: ['frontend'] },
      },
      {
        name: 'Migrate to Cassandra',
        issueText: 'Migrate to Cassandra for the data layer.',
        decision: { text: 'We decided to use PostgreSQL', keywords: ['postgresql'], topics: ['database'] },
      },
      {
        name: 'Store user data in Firestore',
        issueText: 'Store user data in Firestore for the backend.',
        decision: { text: 'We decided to use PostgreSQL', keywords: ['postgresql'], topics: ['database'] },
      },
      {
        name: 'Implement with Django',
        issueText: 'Implement the service with Django framework.',
        decision: { text: 'We decided to use Express', keywords: ['express'], topics: ['backend'] },
      },
      {
        name: 'Deploy to Azure',
        issueText: 'Deploy the application to Azure.',
        decision: { text: 'We decided to use AWS', keywords: ['aws'], topics: ['cloud'] },
      },
      {
        name: 'Plain mention: Angular component',
        issueText: 'Create Angular component for the form.',
        decision: { text: 'Going with React', keywords: ['react'], topics: ['frontend'] },
      },
    ];

    // Test cases that MUST NOT detect drift
    const mustNotDriftCases = [
      {
        name: 'Do not use MongoDB',
        issueText: 'Do not use MongoDB in this implementation.',
        decision: { text: 'We decided to use PostgreSQL', keywords: ['postgresql'], topics: ['database'] },
      },
      {
        name: 'Redis cache in front of PostgreSQL',
        issueText: 'Add Redis cache in front of PostgreSQL database.',
        decision: { text: 'We decided to use PostgreSQL', keywords: ['postgresql'], topics: ['database'] },
      },
      {
        name: 'Instead of MongoDB we keep PostgreSQL',
        issueText: 'Instead of MongoDB we keep PostgreSQL as decided.',
        decision: { text: 'We decided to use PostgreSQL', keywords: ['postgresql'], topics: ['database'] },
      },
      {
        name: 'No MongoDB needed',
        issueText: 'No MongoDB needed for this task.',
        decision: { text: 'We decided to use PostgreSQL', keywords: ['postgresql'], topics: ['database'] },
      },
      {
        name: 'Avoid Vue in this module',
        issueText: 'Avoid Vue in this module, use the standard React.',
        decision: { text: 'Going with React', keywords: ['react'], topics: ['frontend'] },
      },
      {
        name: 'Rather than Angular, use React',
        issueText: 'Rather than Angular, we use React as decided.',
        decision: { text: 'Going with React', keywords: ['react'], topics: ['frontend'] },
      },
      {
        name: 'Unrelated text',
        issueText: 'Fix button alignment on the dashboard.',
        decision: { text: 'We decided to use PostgreSQL', keywords: ['postgresql'], topics: ['database'] },
      },
      {
        name: "Decision's own issue",
        issueText: 'We decided to use PostgreSQL for the database.',
        decision: { text: 'We decided to use PostgreSQL', keywords: ['postgresql'], topics: ['database'], sourceIssueKey: 'PAY-1' },
        currentIssueKey: 'PAY-1',
      },
    ];

    describe('MUST detect drift (natural phrasings)', () => {
      mustDriftCases.forEach(({ name, issueText, decision }) => {
        it(name, () => {
          const drifts = detectDrift(issueText, [decision]);
          expect(drifts.length).toBeGreaterThan(0);
          expect(drifts[0].type).toBe('alternative');
        });
      });
    });

    describe('MUST NOT detect drift', () => {
      mustNotDriftCases.forEach(({ name, issueText, decision, currentIssueKey }) => {
        it(name, () => {
          const drifts = detectDrift(issueText, [decision], currentIssueKey ? { currentIssueKey } : {});
          expect(drifts.length).toBe(0);
        });
      });
    });
  });

  describe('category separation tests', () => {
    it('PostgreSQL + Redis cache should NOT flag each other (different categories)', () => {
      const issueText = 'Add Redis cache for PostgreSQL queries.';
      const approvedDecisions = [
        {
          id: 'decision-1',
          sourceIssueKey: 'PAY-3',
          text: 'We decided to use PostgreSQL for the database',
          keywords: ['postgresql'],
          topics: ['database'],
        },
      ];

      const drifts = detectDrift(issueText, approvedDecisions, { currentIssueKey: 'PAY-11' });
      expect(drifts.length).toBe(0);
    });

    it('Kafka queue + PostgreSQL DB should NOT flag each other', () => {
      const issueText = 'Add Kafka queue for event processing with PostgreSQL storage.';
      const approvedDecisions = [
        {
          id: 'decision-1',
          text: 'We decided to use PostgreSQL',
          keywords: ['postgresql'],
          topics: ['database'],
        },
      ];

      const drifts = detectDrift(issueText, approvedDecisions);
      expect(drifts.length).toBe(0);
    });

    it('PostgreSQL vs MySQL should flag (both relational, same primary DB category)', () => {
      const issueText = 'Use MySQL for the database.';
      const approvedDecisions = [
        {
          id: 'decision-1',
          text: 'We decided to use PostgreSQL',
          keywords: ['postgresql'],
          topics: ['database'],
        },
      ];

      const drifts = detectDrift(issueText, approvedDecisions);
      expect(drifts.length).toBe(1);
      expect(drifts[0].type).toBe('alternative');
    });

    it('PostgreSQL vs MongoDB should flag (both primary DB category)', () => {
      const issueText = 'Store data in MongoDB.';
      const approvedDecisions = [
        {
          id: 'decision-1',
          text: 'We decided to use PostgreSQL',
          keywords: ['postgresql'],
          topics: ['database'],
        },
      ];

      const drifts = detectDrift(issueText, approvedDecisions);
      expect(drifts.length).toBe(1);
      expect(drifts[0].type).toBe('alternative');
    });
  });
});
