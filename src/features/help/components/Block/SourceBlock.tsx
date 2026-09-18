import { BookOpen } from "lucide-react";

type SourceBlockProps = {
  children: React.ReactNode;
};

export default function SourceBlock({ children }: SourceBlockProps) {
  return (
    <div className="source-block">
      <div className="source-block__header">
        <BookOpen size={20} className="source-block__icon" />
        <h4 className="source-block__title">SOURCE</h4>
      </div>
      <div className="source-block__content">{children}</div>
    </div>
  );
}
