import React, { useEffect, useState } from 'react';
import ForgeReconciler, { Text, Strong, Em, Button, ButtonSet, Box, Stack, Inline, Heading, Badge, SectionMessage, useProductContext, invoke } from '@forge/react';

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
      const result = await invoke('approveDecision', {
        candidate,
        issueId: data.issueId,
        issueKey: data.issueKey,
        projectId: data.projectId,
        editedText: editingCandidate === candidate ? editedText : null,
      });
      
      if (result.success) {
        setEditingCandidate(null);
        setEditedText('');
        await loadData(); // Reload to show updated state
      } else {
        setError(result.error || 'Failed to approve decision');
      }
    } catch (err) {
      setError(err.message || 'Failed to approve decision');
    }
  };

  const handleDismiss = async (candidate) => {
    try {
      await invoke('dismissDecision', { candidate });
      await loadData(); // Reload
    } catch (err) {
      setError(err.message || 'Failed to dismiss decision');
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
        <Text>Loading Decision Catch...</Text>
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
        {/* Header */}
        <Box>
          <Heading size="medium">🎯 Decision Catch</Heading>
          <Text>Track decisions and detect drift</Text>
        </Box>

        {/* Drift Warnings */}
        {data.drifts && data.drifts.length > 0 && (
          <Box>
            <Heading size="small">⚠️ Drift Detected</Heading>
            <Stack space="space.200">
              {data.drifts.map((drift, index) => (
                <SectionMessage key={index} appearance="warning">
                  <Stack space="space.100">
                    <Text>
                      <Strong>{drift.type.replace(/_/g, ' ')}</Strong>
                    </Text>
                    <Text>
                      <Em>{drift.explanation}</Em>
                    </Text>
                    <Text>
                      Original decision in {drift.decision.sourceIssueKey}: "{drift.decision.text}"
                    </Text>
                    <ButtonSet>
                      <Button
                        text="Mark as intentional change"
                        onClick={() => handleResolveDrift(drift, 'intentional_change')}
                      />
                      <Button
                        text="Not a conflict"
                        onClick={() => handleResolveDrift(drift, 'not_a_conflict')}
                      />
                    </ButtonSet>
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
                      <Badge 
                        text={`${candidate.metadata.source} by ${candidate.metadata.author}`}
                        appearance="default"
                      />
                      <Badge
                        text={candidate.confidence > 0.7 ? 'High confidence' : candidate.confidence > 0.4 ? 'Medium' : 'Low'}
                        appearance={candidate.confidence > 0.7 ? 'added' : candidate.confidence > 0.4 ? 'default' : 'removed'}
                      />
                    </Inline>
                    {candidate.topics && candidate.topics.length > 0 && (
                      <Inline space="space.050">
                        {candidate.topics.map((topic, i) => (
                          <Badge key={i} text={topic} appearance="primary" />
                        ))}
                      </Inline>
                    )}
                    <ButtonSet>
                      <Button
                        text="✓ Approve"
                        appearance="primary"
                        onClick={() => handleApprove(candidate)}
                      />
                      <Button
                        text="Dismiss"
                        onClick={() => handleDismiss(candidate)}
                      />
                    </ButtonSet>
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
                    <Text>
                      From {decision.sourceIssueKey} • {new Date(decision.approvedAt).toLocaleDateString()}
                    </Text>
                    {decision.topics && decision.topics.length > 0 && (
                      <Inline space="space.050">
                        {decision.topics.map((topic, i) => (
                          <Badge key={i} text={topic} appearance="primary" />
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

export const run = ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
