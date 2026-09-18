import type { UUID } from "@/shared/types/common/uuid";
import type { TextItem } from "@/shared/types/workspace/text";
import { useEffect } from "react";

type Params = {
  isSimulationActive: boolean;
  selectedTextId: UUID | null;
  editingTextId: UUID | null;
  texts: TextItem[];
  setTexts: (value: TextItem[]) => void;
  setSelectedTextId: (value: UUID | null) => void;
  showToast: (message: string) => void;
};

export function useTextDelete({
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
      showToast("Text deleted");
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
