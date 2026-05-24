type TextDescriptionProps = {
  children?: React.ReactNode;
};

export default function TextDescription({ children }: TextDescriptionProps) {
  return <p className="simulation-panel__description">{children}</p>;
}
