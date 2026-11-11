import React, { useState } from 'react';
import ForgeReconciler, { 
  Text, 
  Strong, 
  Button, 
  Box, 
  Stack, 
  Heading, 
  SectionMessage,
  Modal,
  ModalTransition,
  Inline,
  xcss,
} from '@forge/react';
import { invoke } from '@forge/bridge';

const AdminApp = () => {
  // Card styles using design tokens
  const cardStyle = xcss({
    borderWidth: 'border.width',
    borderStyle: 'solid',
    borderColor: 'color.border',
    borderRadius: 'border.radius.200',
    padding: 'space.300',
    backgroundColor: 'elevation.surface'
  });

  const dangerCardStyle = xcss({
    borderWidth: 'border.width',
    borderStyle: 'solid',
    borderColor: 'color.border.danger',
    borderRadius: 'border.radius.200',
    padding: 'space.300',
    backgroundColor: 'elevation.surface'
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleResetClick = () => {
    setIsModalOpen(true);
    setError(null);
    setResult(null);
  };

  const handleConfirmReset = async () => {
    setIsResetting(true);
    setError(null);
    
    try {
      const response = await invoke('resetAllData');
      
      if (response.success) {
        setResult(response.counts);
        setIsModalOpen(false);
      } else {
        setError(response.error || 'Reset failed');
      }
    } catch (err) {
      setError(err.message || 'Failed to reset data');
    } finally {
      setIsResetting(false);
    }
  };

  const handleCancelReset = () => {
    setIsModalOpen(false);
  };

  return (
    <Box padding="space.400">
      <Stack space="space.400">
        <Stack space="space.200">
          <Heading size="large">Decision Catch Settings</Heading>
          <Text>Manage your Decision Catch app data across all projects.</Text>
        </Stack>

        {error && (
          <SectionMessage appearance="error">
            <Text><Strong>Error:</Strong> {error}</Text>
          </SectionMessage>
        )}

        {result && (
          <SectionMessage appearance="success">
            <Stack space="space.100">
              <Text><Strong>Storage reset complete!</Strong></Text>
              <Text>Removed:</Text>
              <Text>• {result.decisions} approved decisions</Text>
              <Text>• {result.driftResolutions} drift resolutions</Text>
              <Text>• {result.dismissals} dismissed candidates</Text>
              <Text><Strong>Total: {result.total} items</Strong></Text>
            </Stack>
          </SectionMessage>
        )}

        <Box xcss={cardStyle}>
          <Stack space="space.200">
            <Heading size="small">About Data Storage</Heading>
            <Text>
              Decision Catch stores all data securely in Forge storage. Data includes:
            </Text>
            <Text>• <Strong>Approved decisions:</Strong> Team decisions you've reviewed and approved from issue comments</Text>
            <Text>• <Strong>Drift resolutions:</Strong> Records of drift warnings you've resolved, with notes and timestamps</Text>
            <Text>• <Strong>Dismissed candidates:</Strong> Decision candidates you've chosen to dismiss</Text>
            <Text>All data is scoped to your Jira instance and never leaves Atlassian's infrastructure.</Text>
          </Stack>
        </Box>

        <Box xcss={dangerCardStyle}>
          <Stack space="space.200">
            <Heading size="small">Danger Zone</Heading>
            <Text>
              <Strong>Reset all Decision Catch data</Strong> will permanently delete all approved decisions, drift resolutions, 
              and dismissed candidates across all projects. This action cannot be undone and will require you to re-approve 
              decisions from scratch.
            </Text>
            <Text>Only use this if you need to completely start over.</Text>
            <Box>
              <Button 
                appearance="danger" 
                onClick={handleResetClick}
                isDisabled={isResetting}
              >
                {isResetting ? 'Resetting...' : 'Reset all Decision Catch data'}
              </Button>
            </Box>
          </Stack>
        </Box>

        <ModalTransition>
          {isModalOpen && (
            <Modal>
              <Stack space="space.300">
                <Heading size="medium">Confirm Reset</Heading>
                <Text>
                  Are you sure you want to reset all Decision Catch data? This will delete:
                </Text>
                <Text>• All approved decisions across all projects</Text>
                <Text>• All drift resolutions</Text>
                <Text>• All dismissed candidates</Text>
                <Text><Strong>This action cannot be undone.</Strong></Text>
                <Inline space="space.200">
                  <Button 
                    appearance="danger" 
                    onClick={handleConfirmReset}
                    isDisabled={isResetting}
                  >
                    {isResetting ? 'Resetting...' : 'Yes, reset all data'}
                  </Button>
                  <Button 
                    onClick={handleCancelReset}
                    isDisabled={isResetting}
                  >
                    Cancel
                  </Button>
                </Inline>
              </Stack>
            </Modal>
          )}
        </ModalTransition>
      </Stack>
    </Box>
  );
};

ForgeReconciler.render(<AdminApp />);
