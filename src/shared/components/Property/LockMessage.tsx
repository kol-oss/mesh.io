import { Lock } from "lucide-react";

export default function LockMessage() {
  return (
    <div className="properties__locked-notice">
      <Lock size={12} />
      {"This step is unmodifiable."}
    </div>
  );
}
