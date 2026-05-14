import { useEffect, useState } from "react";

import type { WorkspaceSize } from "@/shared/types/workspace/shared";

export function useSize(workspaceRef: React.MutableRefObject<HTMLElement | null>) {
  const [workspaceSize, setWorkspaceSize] = useState<WorkspaceSize>({ width: 0, height: 0 });

  useEffect(() => {
    const element = workspaceRef.current;
    if (!element) {
      return;
    }

    const updateSize = () => {
      setWorkspaceSize({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    };

    updateSize();

    const observer = new ResizeObserver(() => {
      updateSize();
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [workspaceRef]);

  return workspaceSize;
}
