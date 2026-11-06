/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { LibraryView } from './components/WorkflowLibrary/LibraryView';
import { ReaderView } from './components/WorkflowReader/ReaderView';
import { AssetHubView } from './components/AssetLibrary/AssetHubView';

export default function App() {
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#/workflow/')) {
      return hash.replace('#/workflow/', '');
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState<'workflows' | 'assets'>(() => {
    const hash = window.location.hash;
    if (hash === '#/assets') return 'assets';
    return 'workflows';
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/workflow/')) {
        setActiveWorkflowId(hash.replace('#/workflow/', ''));
      } else {
        setActiveWorkflowId(null);
        if (hash === '#/assets') {
          setActiveTab('assets');
        } else {
          setActiveTab('workflows');
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleOpenWorkflow = (id: string) => {
    window.location.hash = `#/workflow/${id}`;
    setActiveWorkflowId(id);
  };

  const handleBackToLibrary = () => {
    window.location.hash = '#/workflows';
    setActiveWorkflowId(null);
    setActiveTab('workflows');
  };

  const handleNavigateToAssets = () => {
    window.location.hash = '#/assets';
    setActiveWorkflowId(null);
    setActiveTab('assets');
  };

  const handleNavigateToWorkflows = () => {
    window.location.hash = '#/workflows';
    setActiveWorkflowId(null);
    setActiveTab('workflows');
  };

  if (activeWorkflowId) {
    return <ReaderView workflowId={activeWorkflowId} onBack={handleBackToLibrary} />;
  }

  if (activeTab === 'assets') {
    return (
      <AssetHubView
        onOpenWorkflow={handleOpenWorkflow}
        onNavigateToWorkflows={handleNavigateToWorkflows}
      />
    );
  }

  return (
    <LibraryView
      onOpenWorkflow={handleOpenWorkflow}
      onOpenAssetHub={handleNavigateToAssets}
    />
  );
}
