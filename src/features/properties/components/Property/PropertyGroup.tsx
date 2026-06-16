import React from "react";
import PropertyLabel from "./PropertyLabel";

type PropertyGroupProps = {
  label?: string;
  global?: boolean;
  children: React.ReactNode;
};

export default function PropertyGroup({ label, global = false, children }: PropertyGroupProps) {
  // Multiple fields with a common label
  if (label) {
    return (
      <label className="properties__field">
        <PropertyLabel label={label} global={global} />
        <div className="properties__inline-group">{children}</div>
      </label>
    );
  }

  // Single field with a label
  if (React.Children.count(children) === 1) {
    return <label className="properties__field">{children}</label>;
  }

  // Multiple fields with many labels
  return (
    <div className="properties__field-grid properties__field-grid--two">
      {React.Children.map(children, (child) => (
        <label className="properties__field">{child}</label>
      ))}
    </div>
  );
}
