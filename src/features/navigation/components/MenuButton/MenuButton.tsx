import { Link } from "react-router-dom";

type MenuButtonProps = {
  label: string;
  onClick?: () => void;
  to?: string;
  className?: string;
};

export default function MenuButton({ label, onClick, to, className }: MenuButtonProps) {
  const classes = className ?? "navigation__menu-button";

  if (to) {
    return (
      <Link className={classes} to={to} target="_blank" rel="noreferrer">
        {label}
      </Link>
    );
  }

  return (
    <button className={classes} type="button" onClick={onClick}>
      {label}
    </button>
  );
}
