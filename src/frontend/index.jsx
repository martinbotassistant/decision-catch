import React, { useEffect, useState } from 'react';
import ForgeReconciler, { 
  Text, 
  Strong, 
  Em, 
  Button, 
  ButtonGroup, 
  Box, 
  Stack, 
  Inline, 
  Heading, 
  Lozenge, 
  SectionMessage, 
  Spinner, 
  useProductContext,
  Modal,
  ModalTransition,
  TextArea,
  User,
  xcss,
} from '@forge/react';
import { invoke } from '@forge/bridge';

const App = () => {
  const context = useProductContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [editingCandidate, setEditingCandidate] = useState(null);
  const [editedText, setEditedText] = useState('');
  const [resolvingDrift, setResolvingDrift] = useState(null);
  const [resolutionType, setResolutionType] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [showResolvedSection, setShowResolvedSection] = useState(true);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke('getPanelData', {});
      if (result.error) {
        setError(result.error);
      } else {
        setData(result);
      }
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (candidate) => {
    try {
      // Optimistic update - remove from candidates immediately
      setData(prev => ({
        ...prev,
        candidates: prev.candidates.filter(c => c.text !== candidate.text)
      }));
      setEditingCandidate(null);
      setEditedText('');
      
      const result = await invoke('approveDecision', {
        candidate,
        issueId: data.issueId,
        issueKey: data.issueKey,
        projectId: data.projectId,
        editedText: editingCandidate === candidate ? editedText : null,
      });
      
      if (result.success) {
        // Reload to get updated approved decisions list
        await loadData();
      } else {
        setError(result.error || 'Failed to approve decision');
        // Revert optimistic update on error
        await loadData();
      }
    } catch (err) {
      setError(err.message || 'Failed to approve decision');
      await loadData(); // Revert
    }
  };

  const handleDismiss = async (candidate) => {
    try {
      // Optimistic update - remove from candidates immediately
      setData(prev => ({
        ...prev,
        candidates: prev.candidates.filter(c => c.text !== candidate.text)
      }));
      
      const result = await invoke('dismissDecision', { 
        candidate,
        issueId: data.issueId 
      });
      
      if (!result.success) {
        setError(result.error || 'Failed to dismiss decision');
        await loadData(); // Revert on error
      }
    } catch (err) {
      setError(err.message || 'Failed to dismiss decision');
      await loadData(); // Revert
    }
  };

  const handleResolveDrift = (drift, type) => {
    setResolvingDrift(drift);
    setResolutionType(type);
    setResolutionNotes('');
  };

  const handleConfirmResolution = async () => {
    if (!resolvingDrift || !resolutionType) return;

    try {
      const result = await invoke('resolveDrift', {
        issueId: data.issueId,
        issueKey: data.issueKey,
        decisionId: resolvingDrift.decision.id,
        drift: resolvingDrift,
        resolutionType,
        notes: resolutionNotes || '',
      });
      
      if (result.success) {
        if (result.warnings && result.warnings.length > 0) {
          setError(`Resolved with warnings: ${result.warnings.join(', ')}`);
        }
        setResolvingDrift(null);
        setResolutionType(null);
        setResolutionNotes('');
        await loadData(); // Reload to show in resolved section
      } else {
        setError(result.error || 'Failed to resolve drift');
      }
    } catch (err) {
      setError(err.message || 'Failed to resolve drift');
    }
  };

  const handleCancelResolution = () => {
    setResolvingDrift(null);
    setResolutionType(null);
    setResolutionNotes('');
  };

  if (loading) {
    return (
      <Box padding="space.200">
        <Stack space="space.200" alignInline="center">
          <Spinner size="medium" />
          <Text>Loading Decision Catch data...</Text>
        </Stack>
      </Box>
    );
  }

  if (error) {
    return (
      <Box padding="space.200">
        <Stack space="space.200">
          <SectionMessage appearance="error">
            <Text><Strong>Error:</Strong> {error}</Text>
          </SectionMessage>
          <Button onClick={loadData}>Retry</Button>
        </Stack>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box padding="space.200">
        <Text>No data available</Text>
      </Box>
    );
  }

  // Card styles using design tokens
  const cardStyle = xcss({
    borderWidth: 'border.width',
    borderStyle: 'solid',
    borderColor: 'color.border',
    borderRadius: 'border.radius.200',
    padding: 'space.200',
    backgroundColor: 'elevation.surface'
  });

  const warningCardStyle = xcss({
    borderWidth: 'border.width',
    borderStyle: 'solid',
    borderColor: 'color.border.warning',
    borderRadius: 'border.radius.200',
    padding: 'space.200',
    backgroundColor: 'elevation.surface'
  });

  const resolvedCardStyle = xcss({
    borderWidth: 'border.width',
    borderStyle: 'solid',
    borderColor: 'color.border',
    borderRadius: 'border.radius.200',
    padding: 'space.200',
    backgroundColor: 'elevation.surface',
    opacity: '0.8'
  });

  const emptyStateStyle = xcss({
    borderWidth: 'border.width',
    borderStyle: 'solid',
    borderColor: 'color.border',
    borderRadius: 'border.radius.200',
    padding: 'space.200',
    backgroundColor: 'color.background.neutral.subtle'
  });

  return (
    <Box padding="space.200">
      <Stack space="space.300">

        {/* Drift Warnings */}
        {data.drifts && data.drifts.length > 0 && (
          <Stack space="space.300">
            <Inline space="space.100" alignBlock="center">
              <Heading size="small">Drift Detected</Heading>
              <Lozenge appearance="removed">{data.drifts.length}</Lozenge>
            </Inline>
            <Stack space="space.200">
              {data.drifts.map((drift, index) => (
                <Box key={index} xcss={warningCardStyle}>
                  <Stack space="space.150">
                    <Inline spread="space-between" alignBlock="center">
                      <Text>
                        <Strong>{String(drift.type || "drift").replace(/_/g, ' ')}</Strong>
                      </Text>
                      <Lozenge appearance="removed">DRIFT</Lozenge>
                    </Inline>
                    <Text>
                      <Em>{drift.explanation}</Em>
                    </Text>
                    <Text size="small">
                      Original decision in {drift.decision?.sourceIssueKey}: "{drift.decision?.text}"
                    </Text>
                    <ButtonGroup>
                      <Button onClick={() => handleResolveDrift(drift, 'intentional_change')}>Mark as intentional change</Button>
                      <Button onClick={() => handleResolveDrift(drift, 'not_a_conflict')}>Not a conflict</Button>
                    </ButtonGroup>
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Stack>
        )}

        {/* Resolved Drifts */}
        {data.resolvedDrifts && data.resolvedDrifts.length > 0 && (
          <Stack space="space.200">
            <Button 
              appearance="subtle" 
              onClick={() => setShowResolvedSection(!showResolvedSection)}
            >
              {showResolvedSection ? '▼' : '▶'} Resolved ({data.resolvedDrifts.length})
            </Button>
            {showResolvedSection && (
              <Stack space="space.200">
                {data.resolvedDrifts.map((drift, index) => (
                  <Box key={index} xcss={resolvedCardStyle}>
                    <Stack space="space.150">
                      <Inline spread="space-between" alignBlock="center">
                        <Text>
                          <Strong>{String(drift.type || "drift").replace(/_/g, ' ')}</Strong>
                        </Text>
                        <Lozenge appearance="success">RESOLVED</Lozenge>
                      </Inline>
                      <Text>
                        <Em>{drift.explanation}</Em>
                      </Text>
                      <Text size="small">
                        Original decision in {drift.decision?.sourceIssueKey}: "{drift.decision?.text}"
                      </Text>
                      <Inline space="space.050" alignBlock="center" shouldWrap>
                        <Text size="small">
                          <Em>Resolved as {String(drift.resolution.resolutionType || '').replace(/_/g, ' ')} by</Em>
                        </Text>
                        {drift.resolution.resolvedBy ? (
                          <User accountId={drift.resolution.resolvedBy} />
                        ) : (
                          <Text size="small"><Em>unknown</Em></Text>
                        )}
                        <Text size="small">
                          <Em>on {new Date(drift.resolution.resolvedAt).toLocaleString()}</Em>
                        </Text>
                      </Inline>
                      {drift.resolution.notes && (
                        <Text size="small">
                          <Strong>Note:</Strong> {drift.resolution.notes}
                        </Text>
                      )}
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </Stack>
        )}

        {/* Candidate Decisions */}
        <Stack space="space.300">
          <Inline space="space.100" alignBlock="center">
            <Heading size="small">Candidate Decisions</Heading>
            <Lozenge appearance="default">{data.candidates?.length || 0}</Lozenge>
          </Inline>
          {data.candidates && data.candidates.length > 0 ? (
            <Stack space="space.200">
              {data.candidates.map((candidate, index) => (
                <Box key={index} xcss={cardStyle}>
                  <Stack space="space.150">
                    <Inline spread="space-between" alignBlock="start">
                      <Text>
                        <Strong>"{candidate.text}"</Strong>
                      </Text>
                      <Lozenge appearance={candidate.confidence > 0.7 ? 'success' : candidate.confidence > 0.4 ? 'default' : 'removed'}>
                        {candidate.confidence > 0.7 ? 'High' : candidate.confidence > 0.4 ? 'Med' : 'Low'}
                      </Lozenge>
                    </Inline>
                    <Inline space="space.100" shouldWrap>
                      <Text size="small">{candidate.metadata?.source} by {candidate.metadata?.author || "unknown"}</Text>
                    </Inline>
                    {candidate.topics && candidate.topics.length > 0 && (
                      <Inline space="space.050" shouldWrap>
                        {candidate.topics.map((topic, i) => (
                          <Lozenge key={i} appearance="new">{topic}</Lozenge>
                        ))}
                      </Inline>
                    )}
                    <ButtonGroup>
                      <Button appearance="primary"
                        onClick={() => handleApprove(candidate)}>Approve</Button>
                      <Button onClick={() => handleDismiss(candidate)}>Dismiss</Button>
                    </ButtonGroup>
                  </Stack>
                </Box>
              ))}
            </Stack>
          ) : (
            <Box xcss={emptyStateStyle}>
              <Text size="small">
                <Em>No candidate decisions found in this issue.</Em>
              </Text>
            </Box>
          )}
        </Stack>

        {/* Approved Decisions */}
        {data.approvedDecisions && data.approvedDecisions.length > 0 && (
          <Stack space="space.300">
            <Inline space="space.100" alignBlock="center">
              <Heading size="small">Approved Decisions</Heading>
              <Lozenge appearance="success">{data.approvedDecisions.length}</Lozenge>
            </Inline>
            <Stack space="space.200">
              {data.approvedDecisions.map((decision, index) => (
                <Box key={index} xcss={cardStyle}>
                  <Stack space="space.150">
                    <Inline spread="space-between" alignBlock="start">
                      <Text>
                        <Strong>"{decision.text}"</Strong>
                      </Text>
                      <Lozenge appearance="success">APPROVED</Lozenge>
                    </Inline>
                    <Inline space="space.100" shouldWrap>
                      <Text size="small">
                        <Em>From {decision.sourceIssueKey}</Em>
                      </Text>
                      <Text size="small">
                        <Em>• Approved by {decision.approvedBy || 'unknown'} on {new Date(decision.approvedAt || Date.now()).toLocaleDateString()}</Em>
                      </Text>
                    </Inline>
                    {decision.topics && decision.topics.length > 0 && (
                      <Inline space="space.050" shouldWrap>
                        {decision.topics.map((topic, i) => (
                          <Lozenge key={i} appearance="new">{topic}</Lozenge>
                        ))}
                      </Inline>
                    )}
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Stack>
        )}

        {/* Project Stats Footer */}
        {data.projectDecisionCount > 0 && (
          <Box paddingBlock="space.150">
            <Text size="small">
              <Em>{data.projectDecisionCount} decision(s) tracked in this project</Em>
            </Text>
          </Box>
        )}
      </Stack>

      {/* Resolution Modal */}
      <ModalTransition>
        {resolvingDrift && (
          <Modal onClose={handleCancelResolution}>
            <Stack space="space.300">
              <Heading size="medium">Resolve Drift</Heading>
              <Text>
                <Strong>Drift:</Strong> {resolvingDrift.explanation}
              </Text>
              <Text>
                <Strong>Resolution:</Strong> {resolutionType === 'intentional_change' ? 'Intentional change' : 'Not a conflict'}
              </Text>
              <TextArea
                label="Notes (optional)"
                placeholder="Add any notes about this resolution..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
              />
              <Inline space="space.200">
                <Button 
                  appearance="primary" 
                  onClick={handleConfirmResolution}
                >
                  Confirm
                </Button>
                <Button onClick={handleCancelResolution}>
                  Cancel
                </Button>
              </Inline>
            </Stack>
          </Modal>
        )}
      </ModalTransition>
    </Box>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
