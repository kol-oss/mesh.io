import PropertyLabel from "./PropertyLabel";

type TextPropertyFieldProps = {
  label?: string;
  icon?: React.ReactNode;
  valid?: boolean;
  value: string;
  global?: boolean;
  disabled?: boolean;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

export default function TextPropertyField({
  label,
  icon,
  valid = true,
  value,
  global = false,
  disabled = false,
  onChange,
}: TextPropertyFieldProps) {
  return (
    <>
      {label && <PropertyLabel label={label} valid={valid} global={global} />}
      <div className="properties__input-with-icon">
        {icon}
        <input
          className={`properties__input ${valid ? "" : "properties__required-outline"}`}
          type="text"
          value={value}
          disabled={disabled}
          onChange={onChange}
        />
      </div>
    </>
  );
}
