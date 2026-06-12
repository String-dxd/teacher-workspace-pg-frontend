import { useCallback, useState } from 'react';

import { deleteCustomGroup } from '../api/client';

interface UseMultiSelectDeleteReturn {
  selectedIds: Set<number>;
  toggle: (id: number) => void;
  toggleAll: (ids: number[]) => void;
  clearSelection: () => void;
  deleteSelected: () => Promise<{ succeeded: number[]; failed: number[] }>;
  isDeleting: boolean;
}

export function useMultiSelectDelete(): UseMultiSelectDeleteReturn {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const toggle = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback((ids: number[]) => {
    setSelectedIds((prev) => {
      const allSelected = ids.every((id) => prev.has(id));
      const next = new Set(prev);
      for (const id of ids) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const deleteSelected = useCallback(async () => {
    const ids = Array.from(selectedIds);
    setIsDeleting(true);
    const succeeded: number[] = [];
    const failed: number[] = [];

    const results = await Promise.allSettled(ids.map((id) => deleteCustomGroup(id)));
    results.forEach((result, i) => {
      if (result.status === 'fulfilled') succeeded.push(ids[i]);
      else failed.push(ids[i]);
    });

    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of succeeded) next.delete(id);
      return next;
    });
    setIsDeleting(false);

    return { succeeded, failed };
  }, [selectedIds]);

  return { selectedIds, toggle, toggleAll, clearSelection, deleteSelected, isDeleting };
}
