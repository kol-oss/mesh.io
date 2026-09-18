import type { ReactNode } from "react";

export type SelectOption<T> = {
  label: string;
  icon?: ReactNode;
  value: T;
};
