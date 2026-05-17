import PropertyLabel from "./PropertyLabel";

type NumberPropertyFieldProps = {
  label?: string;
  icon?: React.ReactNode;
  valid?: boolean;
  value: number;
  min?: number;
  max?: number;
  global?: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

export default function NumberPropertyField({
  label,
  icon,
  valid = true,
  value,
  min,
  max,
  global = false,
  onChange,
}: NumberPropertyFieldProps) {
  return (
    <>
      {label && <PropertyLabel label={label} valid={valid} global={global} />}
      <div className="properties__input-with-icon">
        {icon}
        <input
          className={`properties__input ${valid ? "" : "properties__required-outline"}`}
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={onChange}
        />
      </div>
    </>
  );
}
