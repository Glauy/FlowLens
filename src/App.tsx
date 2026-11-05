/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { LibraryView } from './components/WorkflowLibrary/LibraryView';
import { ReaderView } from './components/WorkflowReader/ReaderView';

export default function App() {
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#/workflow/')) {
      return hash.replace('#/workflow/', '');
    }
    return null;
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/workflow/')) {
        setActiveWorkflowId(hash.replace('#/workflow/', ''));
      } else {
        setActiveWorkflowId(null);
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
    window.location.hash = '#/';
    setActiveWorkflowId(null);
  };

  if (activeWorkflowId) {
    return <ReaderView workflowId={activeWorkflowId} onBack={handleBackToLibrary} />;
  }

  return <LibraryView onOpenWorkflow={handleOpenWorkflow} />;
}
