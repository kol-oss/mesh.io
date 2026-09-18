import { ResizeSide } from "@/shared/types/view/view";

type ResizerProps = {
  side?: ResizeSide;
  onResizeStart: (event: React.PointerEvent<HTMLDivElement>) => void;
};

export default function Resizer({ side = ResizeSide.Left, onResizeStart }: ResizerProps) {
  return (
    <div
      className="navigation__resizer"
      style={side === ResizeSide.Left ? { right: "-2px" } : { left: "-2px" }}
      role="separator"
      aria-label={"Resize"}
      aria-orientation="vertical"
      onPointerDown={onResizeStart}
    />
  );
}
