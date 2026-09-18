import type { Dispatch, SetStateAction } from "react";

import type { UUID } from "@/shared/types/common/uuid";
import type { TextItem } from "./text";

export type WorkspaceEditingSetters = {
  setTexts: (value: TextItem[]) => void;
  setSelectedTextId: Dispatch<SetStateAction<UUID | null>>;
  setEditingTextId: Dispatch<SetStateAction<UUID | null>>;
  setEditingTextDraft: Dispatch<SetStateAction<string>>;
};

export type WorkspaceEditingHandlers = {
  handleTextDoubleClick: (item: TextItem) => void;
  commitTextEdit: () => void;
  cancelTextEdit: () => void;
};
