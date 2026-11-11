/**
 * Unit tests for Rovo Agent Actions
 */

const { listDecisions, checkDrift, explainChanges } = require('../src/rovo');
const { getAllDecisions, getDecisionsForIssue } = require('../src/storage');
const { fetchIssueData, fetchProjectData } = require('../src/jira-api');
const { detectDrift } = require('../src/drift-detector');

jest.mock('../src/storage');
jest.mock('../src/jira-api');
jest.mock('../src/drift-detector');

describe('Rovo Agent Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getInputs helper via listDecisions', () => {
    it('should read issueKey from top-level payload', async () => {
      const payload = { issueKey: 'PAY-6' };
      
      fetchIssueData.mockResolvedValue({
        id: '123',
        key: 'PAY-6',
        fields: { project: { id: '1' } }
      });
      getDecisionsForIssue.mockResolvedValue([]);

      const result = await listDecisions(payload);
      
      expect(result.success).toBe(true);
      expect(fetchIssueData).toHaveBeenCalledWith('PAY-6');
    });

    it('should read issueKey from nested inputs', async () => {
      const payload = { inputs: { issueKey: 'PAY-7' } };
      
      fetchIssueData.mockResolvedValue({
        id: '124',
        key: 'PAY-7',
        fields: { project: { id: '1' } }
      });
      getDecisionsForIssue.mockResolvedValue([]);

      const result = await listDecisions(payload);
      
      expect(result.success).toBe(true);
      expect(fetchIssueData).toHaveBeenCalledWith('PAY-7');
    });

    it('should fallback to context.jira.issueKey', async () => {
      const payload = { context: { jira: { issueKey: 'PAY-8' } } };
      
      fetchIssueData.mockResolvedValue({
        id: '125',
        key: 'PAY-8',
        fields: { project: { id: '1' } }
      });
      getDecisionsForIssue.mockResolvedValue([]);

      const result = await listDecisions(payload);
      
      expect(result.success).toBe(true);
      expect(fetchIssueData).toHaveBeenCalledWith('PAY-8');
    });

    it('should read projectId from top-level', async () => {
      const payload = { projectId: '10001' };
      
      getAllDecisions.mockResolvedValue([]);

      const result = await listDecisions(payload);
      
      expect(result.success).toBe(true);
      expect(getAllDecisions).toHaveBeenCalledWith('10001');
    });

    it('should resolve project key to ID', async () => {
      const payload = { projectKey: 'PAY' };
      
      fetchProjectData.mockResolvedValue({ id: '10001', key: 'PAY' });
      getAllDecisions.mockResolvedValue([]);

      const result = await listDecisions(payload);
      
      expect(result.success).toBe(true);
      expect(fetchProjectData).toHaveBeenCalledWith('PAY');
      expect(getAllDecisions).toHaveBeenCalledWith('10001');
    });
  });

  describe('listDecisions', () => {
    it('should return decisions for an issue', async () => {
      const payload = { issueKey: 'PAY-6' };
      
      fetchIssueData.mockResolvedValue({
        id: '123',
        key: 'PAY-6',
        fields: { project: { id: '1' } }
      });
      
      getDecisionsForIssue.mockResolvedValue([
        {
          text: 'Using PostgreSQL',
          topics: ['database'],
          approvedBy: 'user1',
          approvedAt: Date.now(),
          sourceIssueKey: 'PAY-1'
        }
      ]);

      const result = await listDecisions(payload);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Found 1 decision');
      expect(result.decisions).toHaveLength(1);
      expect(result.decisions[0].text).toBe('Using PostgreSQL');
    });

    it('should return decisions for a project by key', async () => {
      const payload = { projectKey: 'PAY' };
      
      fetchProjectData.mockResolvedValue({ id: '10001', key: 'PAY' });
      getAllDecisions.mockResolvedValue([
        {
          text: 'Using React',
          topics: ['frontend'],
          approvedBy: 'user2',
          approvedAt: Date.now(),
          sourceIssueKey: 'PAY-2'
        },
        {
          text: 'Using PostgreSQL',
          topics: ['database'],
          approvedBy: 'user1',
          approvedAt: Date.now(),
          sourceIssueKey: 'PAY-1'
        }
      ]);

      const result = await listDecisions(payload);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Found 2 decision');
      expect(result.decisions).toHaveLength(2);
    });

    it('should return helpful message when no decisions found', async () => {
      const payload = { projectKey: 'PAY' };
      
      fetchProjectData.mockResolvedValue({ id: '10001', key: 'PAY' });
      getAllDecisions.mockResolvedValue([]);

      const result = await listDecisions(payload);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('No decisions tracked yet');
      expect(result.decisions).toHaveLength(0);
    });

    it('should return error when no input provided', async () => {
      const payload = {};

      const result = await listDecisions(payload);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Please provide either an issue key');
    });

    it('should handle errors gracefully', async () => {
      const payload = { issueKey: 'INVALID' };
      
      fetchIssueData.mockRejectedValue(new Error('Issue not found'));

      const result = await listDecisions(payload);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to list decisions');
    });
  });

  describe('checkDrift', () => {
    it('should detect drift in an issue', async () => {
      const payload = { issueKey: 'PAY-6' };
      
      fetchIssueData.mockResolvedValue({
        id: '123',
        key: 'PAY-6',
        fields: {
          project: { id: '1', key: 'PAY' },
          summary: 'Use MongoDB',
          description: { type: 'doc', content: [] }
        }
      });
      
      getAllDecisions.mockResolvedValue([
        {
          text: 'Using PostgreSQL',
          sourceIssueKey: 'PAY-1',
          topics: ['database'],
          keywords: ['postgresql']
        }
      ]);

      detectDrift.mockReturnValue([
        {
          type: 'alternative',
          explanation: 'uses mongodb instead of postgresql',
          confidence: 0.9,
          decision: {
            text: 'Using PostgreSQL',
            sourceIssueKey: 'PAY-1'
          }
        }
      ]);

      const result = await checkDrift(payload);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Found 1 potential drift');
      expect(result.drifts).toHaveLength(1);
      expect(result.drifts[0].type).toBe('alternative');
    });

    it('should report no drift when issue aligns', async () => {
      const payload = { issueKey: 'PAY-5' };
      
      fetchIssueData.mockResolvedValue({
        id: '124',
        key: 'PAY-5',
        fields: {
          project: { id: '1', key: 'PAY' },
          summary: 'Setup PostgreSQL',
          description: { type: 'doc', content: [] }
        }
      });
      
      getAllDecisions.mockResolvedValue([
        {
          text: 'Using PostgreSQL',
          sourceIssueKey: 'PAY-1'
        }
      ]);

      detectDrift.mockReturnValue([]);

      const result = await checkDrift(payload);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('No drift detected');
      expect(result.drifts).toHaveLength(0);
    });

    it('should handle project with no decisions', async () => {
      const payload = { issueKey: 'PAY-1' };
      
      fetchIssueData.mockResolvedValue({
        id: '100',
        key: 'PAY-1',
        fields: {
          project: { id: '1', key: 'PAY' },
          summary: 'Test',
          description: null
        }
      });
      
      getAllDecisions.mockResolvedValue([]);

      const result = await checkDrift(payload);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('No decisions tracked yet');
      expect(result.drifts).toHaveLength(0);
    });

    it('should return error when issueKey missing', async () => {
      const payload = {};

      const result = await checkDrift(payload);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Please provide an issue key');
    });

    it('should handle errors gracefully', async () => {
      const payload = { issueKey: 'INVALID' };
      
      fetchIssueData.mockRejectedValue(new Error('Issue not found'));

      const result = await checkDrift(payload);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to check drift');
    });
  });

  describe('explainChanges', () => {
    it('should explain drift from a specific decision', async () => {
      const payload = { issueKey: 'PAY-6', decisionText: 'PostgreSQL' };
      
      fetchIssueData.mockResolvedValue({
        id: '123',
        key: 'PAY-6',
        fields: {
          project: { id: '1', key: 'PAY' },
          summary: 'Use MongoDB',
          description: { type: 'doc', content: [] }
        }
      });
      
      getAllDecisions.mockResolvedValue([
        {
          text: 'Using PostgreSQL for database',
          sourceIssueKey: 'PAY-1',
          timestamp: Date.now(),
          keywords: ['postgresql']
        }
      ]);

      detectDrift.mockReturnValue([
        {
          type: 'alternative',
          explanation: 'uses mongodb instead of postgresql'
        }
      ]);

      const result = await explainChanges(payload);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('deviates from decision');
      expect(result.changes).toHaveLength(1);
      expect(result.decision.text).toBe('Using PostgreSQL for database');
    });

    it('should report alignment when no changes detected', async () => {
      const payload = { issueKey: 'PAY-5' };
      
      fetchIssueData.mockResolvedValue({
        id: '124',
        key: 'PAY-5',
        fields: {
          project: { id: '1', key: 'PAY' },
          summary: 'Setup PostgreSQL',
          description: { type: 'doc', content: [] }
        }
      });
      
      getAllDecisions.mockResolvedValue([
        {
          text: 'Using PostgreSQL',
          sourceIssueKey: 'PAY-1',
          timestamp: Date.now()
        }
      ]);

      detectDrift.mockReturnValue([]);

      const result = await explainChanges(payload);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('aligns with decision');
      expect(result.changes).toHaveLength(0);
    });

    it('should return error when decision not found', async () => {
      const payload = { issueKey: 'PAY-5', decisionText: 'MongoDB' };
      
      fetchIssueData.mockResolvedValue({
        id: '124',
        key: 'PAY-5',
        fields: {
          project: { id: '1', key: 'PAY' },
          summary: 'Test',
          description: null
        }
      });
      
      getAllDecisions.mockResolvedValue([
        {
          text: 'Using PostgreSQL',
          sourceIssueKey: 'PAY-1'
        }
      ]);

      const result = await explainChanges(payload);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('No decision matching "MongoDB"');
    });

    it('should handle project with no decisions', async () => {
      const payload = { issueKey: 'PAY-1' };
      
      fetchIssueData.mockResolvedValue({
        id: '100',
        key: 'PAY-1',
        fields: {
          project: { id: '1', key: 'PAY' },
          summary: 'Test',
          description: null
        }
      });
      
      getAllDecisions.mockResolvedValue([]);

      const result = await explainChanges(payload);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('No decisions tracked yet');
    });

    it('should handle errors gracefully', async () => {
      const payload = { issueKey: 'INVALID' };
      
      fetchIssueData.mockRejectedValue(new Error('Issue not found'));

      const result = await explainChanges(payload);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to explain changes');
    });
  });
});
