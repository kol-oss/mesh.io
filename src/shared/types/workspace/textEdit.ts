import type { Dispatch, SetStateAction } from "react";

import type { WorkspaceTextItem } from "./text";
import type { UUID } from "../common/uuid";

export type WorkspaceTextEditSetters = {
  setTexts: (value: WorkspaceTextItem[]) => void;
  setSelectedTextId: Dispatch<SetStateAction<UUID | null>>;
  setEditingTextId: Dispatch<SetStateAction<UUID | null>>;
  setEditingTextDraft: Dispatch<SetStateAction<string>>;
};

export type WorkspaceTextEditHandlers = {
  handleTextDoubleClick: (item: WorkspaceTextItem) => void;
  commitTextEdit: () => void;
  cancelTextEdit: () => void;
};
