import { ui } from "../../i18n/messages";
import type { WorkspaceTextItem } from "../../types/workspace";

type Props = {
  item: WorkspaceTextItem;
  isEditing: boolean;
  editingTextDraft: string;
  selectedTextId: string | null;
  activeDragEntityId: string | null;
  setEditingTextDraft: (value: string) => void;
  commitTextEdit: () => void;
  cancelTextEdit: () => void;
  onPointerDown: (item: WorkspaceTextItem, event: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerEnd: (event: React.PointerEvent<HTMLElement>) => void;
  onDoubleClick: (item: WorkspaceTextItem) => void;
};

export default function WorkspaceTextEntity({
  item,
  isEditing,
  editingTextDraft,
  selectedTextId,
  activeDragEntityId,
  setEditingTextDraft,
  commitTextEdit,
  cancelTextEdit,
  onPointerDown,
  onPointerMove,
  onPointerEnd,
  onDoubleClick,
}: Props) {
  if (isEditing) {
    return (
      <input
        className="workspace__text workspace__text--editing"
        style={{
          left: `calc(50% + ${item.x}px)`,
          top: `calc(50% + ${item.y}px)`,
        }}
        value={editingTextDraft}
        onPointerDown={(event) => event.stopPropagation()}
        onChange={(event) => setEditingTextDraft(event.target.value)}
        onBlur={commitTextEdit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commitTextEdit();
          }

          if (event.key === "Escape") {
            event.preventDefault();
            cancelTextEdit();
          }
        }}
        autoFocus
      />
    );
  }

  return (
    <button
      className={`workspace__text${selectedTextId === item.id ? " workspace__text--selected" : ""}${activeDragEntityId === item.id ? " workspace__text--dragging" : ""}`}
      style={{
        left: `calc(50% + ${item.x}px)`,
        top: `calc(50% + ${item.y}px)`,
      }}
      type="button"
      onPointerDown={(event) => onPointerDown(item, event)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onDoubleClick={() => onDoubleClick(item)}
      aria-label={ui.workspace.textLabel(item.text)}
    >
      {item.text}
    </button>
  );
}
