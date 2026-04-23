import { NAVIGATION_MENU_ITEMS } from "../../utils/navigation/constants";

export default function NavigationMenu() {
  return (
    <div className="navigation__menu">
      {NAVIGATION_MENU_ITEMS.map((menuItem) => (
        <button className="navigation__menu-button" key={menuItem.title} type="button">
          {menuItem.title}
        </button>
      ))}
    </div>
  );
}
