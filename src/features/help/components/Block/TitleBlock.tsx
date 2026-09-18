type TitleBlockProps = {
  title: string;
  subtitle?: string;
};

export default function TitleBlock({ title, subtitle }: TitleBlockProps) {
  return (
    <>
      <div className="help-page__big-header">
        <h1 className="help-page__big-title">{title}</h1>
        {subtitle && <p className="help-page__big-subtitle">{subtitle}</p>}
      </div>
    </>
  );
}
