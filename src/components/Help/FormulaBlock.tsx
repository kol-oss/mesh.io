import { Sigma } from "lucide-react";
import "./FormulaBlock.scss";

type FormulaBlockProps = {
  formula: string;
  ariaLabel?: string;
};

export default function FormulaBlock({ formula, ariaLabel = "formula" }: FormulaBlockProps) {
  return (
    <div className="formula-block" aria-label={ariaLabel}>
      <div className="formula-block__header">
        <Sigma size={20} className="formula-block__icon" />
        <h4 className="formula-block__title">FORMULA</h4>
      </div>
      <div className="formula-block__content">
        <code className="formula-block__line">{formula}</code>
      </div>
    </div>
  );
}
