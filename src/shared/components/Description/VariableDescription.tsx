import Tooltip from "@/shared/components/Tooltip/Tooltip";

type VariableDescriptionProps = {
  value: string | number | boolean;
  children?: React.ReactNode;
};

export default function VariableDescription({ value, children }: VariableDescriptionProps) {
  return (
    <Tooltip
      content={"Value: " + value}
      anchorClassName="simulation-panel__variable-description-anchor"
    >
      <span className="simulation-panel__variable-description">{children}</span>
    </Tooltip>
  );
}
