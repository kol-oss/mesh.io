import type { Dispatch, SetStateAction } from "react";

import type { UUID } from "@/shared/types/common/uuid";
import type { WorkspaceTextItem } from "./text";

export type WorkspaceEditingSetters = {
  setTexts: (value: WorkspaceTextItem[]) => void;
  setSelectedTextId: Dispatch<SetStateAction<UUID | null>>;
  setEditingTextId: Dispatch<SetStateAction<UUID | null>>;
  setEditingTextDraft: Dispatch<SetStateAction<string>>;
};

export type WorkspaceEditingHandlers = {
  handleTextDoubleClick: (item: WorkspaceTextItem) => void;
  commitTextEdit: () => void;
  cancelTextEdit: () => void;
};
