import { useEffect } from "react";

import { ui } from "../../i18n/messages";
import type { WorkspaceTextItem } from "../../types/workspace";
import type { UUID } from "../../types/uuid";

type Params = {
  isSimulationActive: boolean;
  selectedTextId: UUID | null;
  editingTextId: UUID | null;
  texts: WorkspaceTextItem[];
  setTexts: (value: WorkspaceTextItem[]) => void;
  setSelectedTextId: (value: UUID | null) => void;
  showToast: (message: string) => void;
};

export function useWorkspaceTextDelete({
  isSimulationActive,
  selectedTextId,
  editingTextId,
  texts,
  setTexts,
  setSelectedTextId,
  showToast,
}: Params) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isSimulationActive || event.key !== "Delete" || !selectedTextId || editingTextId) {
        return;
      }

      setTexts(texts.filter((item) => item.id !== selectedTextId));
      setSelectedTextId(null);
      showToast(ui.workspace.textDeleted);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    editingTextId,
    isSimulationActive,
    selectedTextId,
    setSelectedTextId,
    setTexts,
    showToast,
    texts,
  ]);
}
