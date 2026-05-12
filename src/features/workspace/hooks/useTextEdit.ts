import { useCallback } from "react";

import type {
  WorkspaceTextEditHandlers,
  WorkspaceTextEditSetters,
} from "../../../shared/types/workspace/textEdit";
import type { WorkspaceTextItem } from "../../../shared/types/workspace";
import type { UUID } from "../../../shared/types/uuid";

type UseWorkspaceTextEditParams = {
  texts: WorkspaceTextItem[];
  editingTextId: UUID | null;
  editingTextDraft: string;
  setters: WorkspaceTextEditSetters;
};

export function useWorkspaceTextEdit({
  texts,
  editingTextId,
  editingTextDraft,
  setters,
}: UseWorkspaceTextEditParams): WorkspaceTextEditHandlers {
  const handleTextDoubleClick = useCallback(
    (item: WorkspaceTextItem) => {
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
