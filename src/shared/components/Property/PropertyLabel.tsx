import { Globe } from "lucide-react";
import Tooltip from "../Tooltip/Tooltip";

type PropertyLabelProps = {
  label: string;
  valid?: boolean;
  global?: boolean;
};

export default function PropertyLabel({ label, valid = true, global = false }: PropertyLabelProps) {
  return (
    <span className="properties__field-label properties__field-label--global">
      <span
        className={`properties__field-label-text ${valid ? "" : "properties__field-label-text--invalid"}`}
      >
        {label}
      </span>
      {global && (
        <Tooltip content={"Global field"}>
          <span className="properties__global-indicator" aria-label={"Global field"}>
            <Globe size={12} />
          </span>
        </Tooltip>
      )}
    </span>
  );
}
