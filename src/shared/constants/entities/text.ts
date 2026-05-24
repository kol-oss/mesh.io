import { generateUUID } from "@/shared/types/common/uuid";
import type { TextItem } from "@/shared/types/workspace/text";

export const getDefaultText = (x: number, y: number): TextItem => ({
  id: generateUUID(),
  text: "Text",
  x,
  y,
});
