import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

type PropertyHeaderProps = {
  title: string;
  link: string;
  children?: React.ReactNode;
};

export default function PropertyHeader({ title, link, children }: PropertyHeaderProps) {
  return (
    <header className="properties__header">
      <p className="properties__title">{title}</p>
      <p className="properties__subtitle">{children}</p>
      <Link className="properties__read-more" to={link} target="_blank" rel="noreferrer">
        <ExternalLink size={12} />
        {"Read more"}
      </Link>
    </header>
  );
}
