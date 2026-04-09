import { useCallback } from 'react';

/**
 * Check if a sidebar module should be visible based on localStorage flags.
 * Mirrors the original NewAPI isModuleVisible logic.
 */
export default function useModuleVisible() {
  const isVisible = useCallback((key) => {
    const val = localStorage.getItem(key);
    // Default to true if not set; false if explicitly set to 'false'
    if (val === null || val === undefined) return true;
    return val === 'true' || val === '1';
  }, []);

  return {
    showDrawing: isVisible('enable_drawing'),
    showTask: isVisible('enable_task'),
    showDataExport: isVisible('enable_data_export'),
  };
}
