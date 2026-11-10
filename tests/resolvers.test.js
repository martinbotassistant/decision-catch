/**
 * Unit tests for resolver functions
 */

// Mock Forge API modules
jest.mock('@forge/api', () => ({
  route: (strings, ...values) => {
    // Simple template literal tag implementation
    let result = strings[0];
    for (let i = 0; i < values.length; i++) {
      result += values[i] + strings[i + 1];
    }
    return result;
  },
  storage: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('@forge/resolver', () => ({
  __esModule: true,
  default: class MockResolver {
    constructor() {
      this.definitions = {};
    }
    
    define(name, handler) {
      this.definitions[name] = handler;
    }
    
    getDefinitions() {
      return this.definitions;
    }
  }
}));

// Mock storage module
const mockStorage = {
  saveDecision: jest.fn(),
  getAllDecisions: jest.fn(),
  getDecisionsForIssue: jest.fn(),
  isDriftResolved: jest.fn(),
  saveDriftResolution: jest.fn(),
  saveDismissal: jest.fn(),
  getDismissals: jest.fn(),
  isDismissed: jest.fn(),
  hashText: jest.fn((text) => text.toLowerCase().trim().replace(/\s+/g, ' ')),
};

jest.mock('../src/storage', () => mockStorage);

// Mock jira-api module
const mockJiraApi = {
  fetchIssueData: jest.fn(),
};

jest.mock('../src/jira-api', () => mockJiraApi);

const resolvers = require('../src/resolvers').handler;

describe('Resolver Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set default mock return values
    mockStorage.getDismissals.mockResolvedValue([]);
    mockStorage.getAllDecisions.mockResolvedValue([]);
    mockStorage.getDecisionsForIssue.mockResolvedValue([]);
    mockStorage.isDriftResolved.mockResolvedValue(null);
  });

  describe('approveDecision', () => {
    it('should save an approved decision', async () => {
      const mockCandidate = {
        text: 'We decided to use PostgreSQL',
        topics: ['database'],
        keywords: ['postgres'],
        metadata: {
          source: 'comment',
          author: 'John Doe',
          timestamp: Date.now(),
        },
      };

      const mockSavedDecision = {
        id: 'decision-123',
        ...mockCandidate,
        approved: true,
      };

      mockStorage.saveDecision.mockResolvedValue(mockSavedDecision);

      const result = await resolvers.approveDecision({
        payload: {
          candidate: mockCandidate,
          issueId: 'issue-123',
          issueKey: 'PAY-1',
          projectId: 'proj-123',
        },
        context: {
          accountId: 'user-123',
        },
      });

      expect(result.success).toBe(true);
      expect(result.decision).toEqual(mockSavedDecision);
      expect(mockStorage.saveDecision).toHaveBeenCalledWith(
        expect.objectContaining({
          text: mockCandidate.text,
          sourceIssueId: 'issue-123',
          sourceIssueKey: 'PAY-1',
          projectId: 'proj-123',
          approvedBy: 'user-123',
        })
      );
    });

    it('should use edited text when provided', async () => {
      const mockCandidate = {
        text: 'Original text',
        topics: [],
        keywords: [],
        metadata: {},
      };

      mockStorage.saveDecision.mockResolvedValue({ id: 'decision-123' });

      await resolvers.approveDecision({
        payload: {
          candidate: mockCandidate,
          issueId: 'issue-123',
          issueKey: 'PAY-1',
          projectId: 'proj-123',
          editedText: 'Edited text',
        },
        context: {
          accountId: 'user-123',
        },
      });

      expect(mockStorage.saveDecision).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Edited text',
        })
      );
    });

    it('should handle errors gracefully', async () => {
      mockStorage.saveDecision.mockRejectedValue(new Error('Storage error'));

      const result = await resolvers.approveDecision({
        payload: {
          candidate: { text: 'test', topics: [], keywords: [], metadata: {} },
          issueId: 'issue-123',
          issueKey: 'PAY-1',
          projectId: 'proj-123',
        },
        context: {
          accountId: 'user-123',
        },
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Storage error');
    });

    it('should prevent duplicate approvals', async () => {
      const existingDecision = {
        id: 'decision-existing',
        text: 'We decided to use PostgreSQL',
        projectId: 'proj-123',
      };

      mockStorage.getAllDecisions.mockResolvedValue([existingDecision]);

      const result = await resolvers.approveDecision({
        payload: {
          candidate: { 
            text: ' we decided to use  postgresql ', // Different formatting, same content
            topics: [], 
            keywords: [], 
            metadata: {} 
          },
          issueId: 'issue-123',
          issueKey: 'PAY-2',
          projectId: 'proj-123',
        },
        context: {
          accountId: 'user-456',
        },
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('This decision has already been approved');
      expect(mockStorage.saveDecision).not.toHaveBeenCalled();
    });
  });

  describe('dismissDecision', () => {
    it('should save dismissal to storage', async () => {
      const mockCandidate = {
        text: 'Some decision candidate',
      };
      
      mockStorage.saveDismissal.mockResolvedValue({ id: 'dismissal-123' });

      const result = await resolvers.dismissDecision({
        payload: {
          candidate: mockCandidate,
          issueId: 'issue-123',
        },
        context: {
          accountId: 'user-123',
        },
      });

      expect(result.success).toBe(true);
      expect(mockStorage.saveDismissal).toHaveBeenCalledWith({
        issueId: 'issue-123',
        text: mockCandidate.text,
        dismissedBy: 'user-123',
      });
    });

    it('should handle errors gracefully', async () => {
      mockStorage.saveDismissal.mockRejectedValue(new Error('Storage error'));

      const result = await resolvers.dismissDecision({
        payload: {
          candidate: { text: 'test' },
          issueId: 'issue-123',
        },
        context: { accountId: 'user-123' },
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Storage error');
    });
  });

  describe('resolveDrift', () => {
    it('should save drift resolution', async () => {
      const mockResolution = {
        id: 'resolution-123',
        issueId: 'issue-123',
        decisionId: 'decision-123',
        resolutionType: 'intentional_change',
      };

      mockStorage.saveDriftResolution.mockResolvedValue(mockResolution);

      const result = await resolvers.resolveDrift({
        payload: {
          issueId: 'issue-123',
          issueKey: 'PAY-5',
          decisionId: 'decision-123',
          resolutionType: 'intentional_change',
          notes: 'Architecture changed',
        },
        context: {
          accountId: 'user-123',
        },
      });

      expect(result.success).toBe(true);
      expect(result.resolution).toEqual(mockResolution);
      expect(mockStorage.saveDriftResolution).toHaveBeenCalledWith(
        expect.objectContaining({
          issueId: 'issue-123',
          issueKey: 'PAY-5',
          decisionId: 'decision-123',
          resolutionType: 'intentional_change',
          notes: 'Architecture changed',
          resolvedBy: 'user-123',
        })
      );
    });

    it('should handle not_a_conflict resolution type', async () => {
      mockStorage.saveDriftResolution.mockResolvedValue({ id: 'resolution-123' });

      const result = await resolvers.resolveDrift({
        payload: {
          issueId: 'issue-123',
          issueKey: 'PAY-6',
          decisionId: 'decision-123',
          resolutionType: 'not_a_conflict',
          notes: '',
        },
        context: {
          accountId: 'user-123',
        },
      });

      expect(result.success).toBe(true);
      expect(mockStorage.saveDriftResolution).toHaveBeenCalledWith(
        expect.objectContaining({
          resolutionType: 'not_a_conflict',
        })
      );
    });

    it('should handle errors gracefully', async () => {
      mockStorage.saveDriftResolution.mockRejectedValue(new Error('Storage error'));

      const result = await resolvers.resolveDrift({
        payload: {
          issueId: 'issue-123',
          issueKey: 'PAY-5',
          decisionId: 'decision-123',
          resolutionType: 'intentional_change',
          notes: '',
        },
        context: {
          accountId: 'user-123',
        },
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Storage error');
    });
  });

  describe('getPanelData', () => {
    it('should return error if no issue context', async () => {
      const result = await resolvers.getPanelData({
        context: {},
      });

      expect(result.error).toBe('No issue context available');
    });

    it('should fetch and process issue data', async () => {
      const mockIssueData = {
        id: 'issue-123',
        key: 'PAY-1',
        fields: {
          summary: 'Test issue',
          description: 'We decided to use PostgreSQL for the database',
          project: { id: 'proj-123' },
          creator: { displayName: 'John Doe' },
          created: new Date().toISOString(),
          comment: {
            comments: [
              {
                id: 'comment-1',
                body: 'Agreed, PostgreSQL is the best choice',
                author: { displayName: 'Jane Smith' },
                created: new Date().toISOString(),
              },
            ],
          },
        },
      };

      mockJiraApi.fetchIssueData.mockResolvedValue(mockIssueData);
      mockStorage.getDecisionsForIssue.mockResolvedValue([]);
      mockStorage.getAllDecisions.mockResolvedValue([]);
      mockStorage.isDriftResolved.mockResolvedValue(null);

      const result = await resolvers.getPanelData({
        context: {
          extension: {
            issue: {
              key: 'PAY-1',
              id: 'issue-123',
            },
          },
        },
      });

      expect(result.issueId).toBe('issue-123');
      expect(result.issueKey).toBe('PAY-1');
      expect(result.candidates.length).toBeGreaterThan(0);
      expect(mockJiraApi.fetchIssueData).toHaveBeenCalledWith('PAY-1');
    });

    it('should detect drift on panel load', async () => {
      const mockIssueData = {
        id: 'issue-123',
        key: 'PAY-5',
        fields: {
          summary: 'Add SSO integration',
          description: 'Implementing OAuth for SSO',
          project: { id: 'proj-123' },
          creator: { displayName: 'John Doe' },
          created: new Date().toISOString(),
          comment: { comments: [] },
        },
      };

      const mockProjectDecisions = [
        {
          id: 'decision-123',
          text: 'Agreed: no SSO in v1, out of scope',
          keywords: ['sso', 'oauth'],
          topics: ['security', 'scope'],
          sourceIssueKey: 'PAY-2',
        },
      ];

      mockJiraApi.fetchIssueData.mockResolvedValue(mockIssueData);
      mockStorage.getDecisionsForIssue.mockResolvedValue([]);
      mockStorage.getAllDecisions.mockResolvedValue(mockProjectDecisions);
      mockStorage.isDriftResolved.mockResolvedValue(null);

      const result = await resolvers.getPanelData({
        context: {
          extension: {
            issue: {
              key: 'PAY-5',
              id: 'issue-123',
            },
          },
        },
      });

      expect(result.drifts.length).toBeGreaterThan(0);
      expect(result.drifts[0].type).toBe('scope_violation');
    });

    it('should filter out resolved drifts', async () => {
      const mockIssueData = {
        id: 'issue-123',
        key: 'PAY-5',
        fields: {
          summary: 'Add SSO integration',
          description: 'Implementing OAuth for SSO',
          project: { id: 'proj-123' },
          creator: { displayName: 'John Doe' },
          created: new Date().toISOString(),
          comment: { comments: [] },
        },
      };

      const mockProjectDecisions = [
        {
          id: 'decision-123',
          text: 'Agreed: no SSO in v1, out of scope',
          keywords: ['sso', 'oauth'],
          topics: ['security', 'scope'],
          sourceIssueKey: 'PAY-2',
        },
      ];

      mockJiraApi.fetchIssueData.mockResolvedValue(mockIssueData);
      mockStorage.getDecisionsForIssue.mockResolvedValue([]);
      mockStorage.getAllDecisions.mockResolvedValue(mockProjectDecisions);
      mockStorage.isDriftResolved.mockResolvedValue({ id: 'resolution-123' }); // Already resolved

      const result = await resolvers.getPanelData({
        context: {
          extension: {
            issue: {
              key: 'PAY-5',
              id: 'issue-123',
            },
          },
        },
      });

      expect(result.drifts.length).toBe(0); // Drift was filtered out
    });
  });
});
