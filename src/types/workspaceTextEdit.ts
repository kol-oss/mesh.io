import type { Dispatch, SetStateAction } from "react";

import type { WorkspaceTextItem } from "./workspace";

export type WorkspaceTextEditSetters = {
  setTexts: (value: WorkspaceTextItem[]) => void;
  setSelectedTextId: Dispatch<SetStateAction<string | null>>;
  setEditingTextId: Dispatch<SetStateAction<string | null>>;
  setEditingTextDraft: Dispatch<SetStateAction<string>>;
};

export type WorkspaceTextEditHandlers = {
  handleTextDoubleClick: (item: WorkspaceTextItem) => void;
  commitTextEdit: () => void;
  cancelTextEdit: () => void;
};
