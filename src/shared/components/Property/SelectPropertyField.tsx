import type { SelectOption } from "@/shared/types/common/select";
import Select from "../Select/Select";
import PropertyLabel from "./PropertyLabel";

type SelectPropertyFieldProps = {
  label?: string;
  value: string;
  options: SelectOption[];
  valid?: boolean;
  onChange: (value: string) => void;
};

export default function SelectPropertyField({
  label,
  value,
  options,
  valid = true,
  onChange,
}: SelectPropertyFieldProps) {
  return (
    <>
      {label && <PropertyLabel label={label} valid={valid} />}
      <Select
        allowEmpty={false}
        value={value}
        invalid={!valid}
        options={options}
        onChange={onChange}
      />
    </>
  );
}
