import React, { useEffect, useState } from 'react';
import ForgeReconciler, { Text, Strong, Em, Button, ButtonGroup, Box, Stack, Inline, Heading, Lozenge, SectionMessage, Spinner, useProductContext } from '@forge/react';
import { invoke } from '@forge/bridge';

const App = () => {
  const context = useProductContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [editingCandidate, setEditingCandidate] = useState(null);
  const [editedText, setEditedText] = useState('');

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

  const handleResolveDrift = async (drift, resolutionType, notes) => {
    try {
      const result = await invoke('resolveDrift', {
        issueId: data.issueId,
        issueKey: data.issueKey,
        decisionId: drift.decision.id,
        resolutionType,
        notes: notes || '',
      });
      
      if (result.success) {
        await loadData(); // Reload to hide resolved drift
      } else {
        setError(result.error || 'Failed to resolve drift');
      }
    } catch (err) {
      setError(err.message || 'Failed to resolve drift');
    }
  };

  if (loading) {
    return (
      <Box padding="space.200">
        <Stack space="space.200" alignInline="center">
          <Spinner size="medium" />
          <Text>Loading...</Text>
        </Stack>
      </Box>
    );
  }

  if (error) {
    return (
      <Box padding="space.200">
        <SectionMessage appearance="error">
          <Text><Strong>Error:</Strong> {error}</Text>
        </SectionMessage>
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

  return (
    <Box padding="space.200">
      <Stack space="space.300">

        {/* Drift Warnings */}
        {data.drifts && data.drifts.length > 0 && (
          <Box>
            <Heading size="small">⚠️ Drift Detected</Heading>
            <Stack space="space.200">
              {data.drifts.map((drift, index) => (
                <SectionMessage key={index} appearance="warning">
                  <Stack space="space.100">
                    <Text>
                      <Strong>{String(drift.type || "drift").replace(/_/g, ' ')}</Strong>
                    </Text>
                    <Text>
                      <Em>{drift.explanation}</Em>
                    </Text>
                    <Text>
                      Original decision in {drift.decision?.sourceIssueKey}: "{drift.decision?.text}"
                    </Text>
                    <ButtonGroup>
                      <Button onClick={() => handleResolveDrift(drift, 'intentional_change')}>Mark as intentional change</Button>
                      <Button onClick={() => handleResolveDrift(drift, 'not_a_conflict')}>Not a conflict</Button>
                    </ButtonGroup>
                  </Stack>
                </SectionMessage>
              ))}
            </Stack>
          </Box>
        )}

        {/* Candidate Decisions */}
        <Box>
          <Heading size="small">📝 Candidate Decisions ({data.candidates?.length || 0})</Heading>
          {data.candidates && data.candidates.length > 0 ? (
            <Stack space="space.200">
              {data.candidates.map((candidate, index) => (
                <Box key={index} padding="space.100" backgroundColor="color.background.neutral">
                  <Stack space="space.100">
                    <Text>"{candidate.text}"</Text>
                    <Inline space="space.100">
                      <Lozenge appearance="default">{`${candidate.metadata?.source} by ${candidate.metadata?.author || "unknown"}`}</Lozenge>
                      <Lozenge appearance={candidate.confidence > 0.7 ? 'success' : candidate.confidence > 0.4 ? 'default' : 'removed'}>
                        {candidate.confidence > 0.7 ? 'High confidence' : candidate.confidence > 0.4 ? 'Medium' : 'Low'}
                      </Lozenge>
                    </Inline>
                    {candidate.topics && candidate.topics.length > 0 && (
                      <Inline space="space.050">
                        {candidate.topics.map((topic, i) => (
                          <Lozenge key={i}  appearance="new">{topic}</Lozenge>
                        ))}
                      </Inline>
                    )}
                    <ButtonGroup>
                      <Button appearance="primary"
                        onClick={() => handleApprove(candidate)}>✓ Approve</Button>
                      <Button onClick={() => handleDismiss(candidate)}>Dismiss</Button>
                    </ButtonGroup>
                  </Stack>
                </Box>
              ))}
            </Stack>
          ) : (
            <Text>No candidate decisions found in this issue.</Text>
          )}
        </Box>

        {/* Approved Decisions */}
        {data.approvedDecisions && data.approvedDecisions.length > 0 && (
          <Box>
            <Heading size="small">✅ Approved Decisions ({data.approvedDecisions.length})</Heading>
            <Stack space="space.200">
              {data.approvedDecisions.map((decision, index) => (
                <Box key={index} padding="space.100" backgroundColor="color.background.success">
                  <Stack space="space.100">
                    <Text>"{decision.text}"</Text>
                    <Inline space="space.100">
                      <Text><Em>From {decision.sourceIssueKey}</Em></Text>
                      <Text><Em>Approved by {decision.approvedBy || 'unknown'} on {new Date(decision.approvedAt || Date.now()).toLocaleDateString()}</Em></Text>
                    </Inline>
                    {decision.topics && decision.topics.length > 0 && (
                      <Inline space="space.050">
                        {decision.topics.map((topic, i) => (
                          <Lozenge key={i}  appearance="new">{topic}</Lozenge>
                        ))}
                      </Inline>
                    )}
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Box>
        )}

        {/* Project Stats */}
        {data.projectDecisionCount > 0 && (
          <Text>
            <Em>{data.projectDecisionCount} decision(s) tracked in this project</Em>
          </Text>
        )}
      </Stack>
    </Box>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
