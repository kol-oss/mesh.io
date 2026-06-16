type LetterProps = {
  value: string;
};

export default function Letter({ value: letter }: LetterProps) {
  return <span className="properties__input-icon">{letter}</span>;
}
