

type TextBlockProps = {
  children: string | string[];
};

/**
 * Renders text with support for:
 * - bold words using **text** syntax
 * - italic words using *text* syntax
 * - monospace text using `text` syntax
 * - links using [text](url) syntax
 */
export default function TextBlock({ children }: TextBlockProps) {
  const text = Array.isArray(children) ? children.join("") : children;
  const parts = text.split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|`[^`]+`|\*[^*\n]+\*)/);

  return (
    <p className="text-block">
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={index}>{part.slice(2, -2)}</strong>;
        }

        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code key={index} className="text-block__code">
              {part.slice(1, -1)}
            </code>
          );
        }

        if (part.startsWith("*") && part.endsWith("*")) {
          return <em key={index}>{part.slice(1, -1)}</em>;
        }

        const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
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
