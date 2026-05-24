import PropertyLabel from "./PropertyLabel";

type BooleanPropertyFieldProps = {
  label?: string;
  icon?: React.ReactNode;
  valid?: boolean;
  value: boolean;
  content: {
    true: string;
    false: string;
  };
  global?: boolean;
  disabled?: boolean;
  onChange?: () => void;
};

export default function BooleanPropertyField({
  label,
  icon,
  valid = true,
  value,
  content,
  global = false,
  disabled = false,
  onChange,
}: BooleanPropertyFieldProps) {
  return (
    <>
      {label && <PropertyLabel label={label} valid={valid} global={global} />}
      <button className="properties__status" type="button" onClick={onChange} disabled={disabled}>
        {icon}
        {value ? content.true : content.false}
      </button>
    </>
  );
}
