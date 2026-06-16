type SectionBlockProps = {
  id: string;
  title: string;
  children?: React.ReactNode;
};

export default function ChapterBlock({ id, title, children }: SectionBlockProps) {
  return (
    <>
      <div className="help-page__chapter" id={id}>
        <h2 className="help-page__chapter-title">{title}</h2>
        {children}
      </div>
    </>
  );
}
