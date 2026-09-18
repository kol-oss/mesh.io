import Tooltip from "@/shared/components/Tooltip/Tooltip";

type VariableDescriptionProps = {
  value: string | number | boolean | undefined | null;
  children?: React.ReactNode;
};

export default function VariableDescription({ value, children }: VariableDescriptionProps) {
  return (
    <Tooltip
      content={String(value)}
      anchorClassName="simulation-panel__variable-description-anchor"
    >
      <span>
        <u>{children}</u>
      </span>
    </Tooltip>
  );
}
