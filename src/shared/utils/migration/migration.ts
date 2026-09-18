import type { ImportPayload } from "@/shared/types/common/migration";
import {
  getExportFileName,
  validateAndParseImportPayload,
} from "@/shared/utils/migration/validation";

export async function importState(file: File): Promise<ImportPayload> {
  const raw = await file.text();
  return validateAndParseImportPayload(raw);
}

export function exportState(payload: ImportPayload): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = getExportFileName();
  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export type { ImportPayload as WorkspaceImportPayload };
export { getExportFileName, validateAndParseImportPayload };
