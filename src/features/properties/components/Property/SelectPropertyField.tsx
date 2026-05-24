import type { SelectOption } from "@/shared/types/common/select";
import Select from "../../../../shared/components/Select/Select";
import PropertyLabel from "./PropertyLabel";

type SelectPropertyFieldProps<T> = {
  label?: string;
  value: T;
  valid?: boolean;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
};

export default function SelectPropertyField<T>({
  label,
  value,
  valid = true,
  options,
  onChange,
}: SelectPropertyFieldProps<T>) {
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
