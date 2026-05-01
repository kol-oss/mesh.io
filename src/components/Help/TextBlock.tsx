import "./TextBlock.scss";

type TextBlockProps = {
  children: string | string[];
};

/**
 * Renders text with support for:
 * - bold words using **text** syntax
 * - links using [text](url) syntax
 */
export default function TextBlock({ children }: TextBlockProps) {
  const text = Array.isArray(children) ? children.join("") : children;
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^\)]+\))/);

  return (
    <p className="text-block">
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={index}>{part.slice(2, -2)}</strong>;
        }

        const linkMatch = part.match(/^\[([^\]]+)\]\(([^\)]+)\)$/);
        if (linkMatch) {
          const [, label, href] = linkMatch;
          const isExternal = /^https?:\/\//i.test(href);

          return (
            <a
              key={index}
              className="text-block__link"
              href={href}
              target={isExternal ? "_blank" : undefined}
              rel={isExternal ? "noreferrer" : undefined}
            >
              {label}
            </a>
          );
        }

        return <span key={index}>{part}</span>;
      })}
    </p>
  );
}
