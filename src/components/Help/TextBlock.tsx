import "./TextBlock.scss";

type TextBlockProps = {
  children: string | string[];
};

/**
 * Renders text with support for bold words using **text** syntax
 */
export default function TextBlock({ children }: TextBlockProps) {
  const text = Array.isArray(children) ? children.join("") : children;
  const parts = text.split(/(\*\*[^*]+\*\*)/);

  return (
    <p className="text-block">
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={index}>{part.slice(2, -2)}</strong>;
        }
        return <span key={index}>{part}</span>;
      })}
    </p>
  );
}
