import { useCallback } from "react";

import type { UUID } from "@/shared/types/common/uuid";
import type { TextItem } from "@/shared/types/workspace/text";
import type {
  WorkspaceTextEditHandlers,
  WorkspaceTextEditSetters,
} from "@/shared/types/workspace/textEdit";

type UseTextEditParams = {
  texts: TextItem[];
  editingTextId: UUID | null;
  editingTextDraft: string;
  setters: WorkspaceTextEditSetters;
};

export function useTextEdit({
  texts,
  editingTextId,
  editingTextDraft,
  setters,
}: UseTextEditParams): WorkspaceTextEditHandlers {
  const handleTextDoubleClick = useCallback(
    (item: TextItem) => {
      setters.setSelectedTextId(item.id);
      setters.setEditingTextId(item.id);
      setters.setEditingTextDraft(item.text);
    },
    [setters],
  );

  const commitTextEdit = useCallback(() => {
    if (!editingTextId) {
      return;
    }

    const nextText = editingTextDraft.trim();
    if (!nextText) {
      setters.setTexts(texts.filter((item) => item.id !== editingTextId));
      setters.setSelectedTextId(null);
      setters.setEditingTextId(null);
      setters.setEditingTextDraft("");
      return;
    }

    const nextItems = texts.map((item) =>
      item.id === editingTextId
        ? {
            ...item,
            text: nextText,
          }
        : item,
    );
    setters.setTexts(nextItems);
    setters.setSelectedTextId(editingTextId);
    setters.setEditingTextId(null);
    setters.setEditingTextDraft("");
  }, [editingTextDraft, editingTextId, setters, texts]);

  const cancelTextEdit = useCallback(() => {
    setters.setEditingTextId(null);
    setters.setEditingTextDraft("");
  }, [setters]);

  return {
    handleTextDoubleClick,
    commitTextEdit,
    cancelTextEdit,
  };
}
