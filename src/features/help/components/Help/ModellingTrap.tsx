import { AlertTriangle } from "lucide-react";


type ModellingTrapProps = {
  children: React.ReactNode;
};

export default function ModellingTrap({ children }: ModellingTrapProps) {
  return (
    <div className="modelling-trap">
      <div className="modelling-trap__header">
        <AlertTriangle size={20} className="modelling-trap__icon" />
        <h4 className="modelling-trap__title">MODELLING TRAP</h4>
      </div>
      <div className="modelling-trap__content">{children}</div>
    </div>
  );
}
