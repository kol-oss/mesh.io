import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Link } from "react-router-dom";

import { ui } from "../../i18n/messages";
import { NAVIGATION_MENU_ITEMS } from "../../utils/navigation/constants";

type NavigationMenuProps = {
  onNew: () => void;
  onExport: () => void;
  onImport: (file: File) => void | Promise<void>;
  isCompact?: boolean;
};

export default function NavigationMenu({
  onNew,
  onExport,
  onImport,
  isCompact = false,
}: NavigationMenuProps) {
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsFileMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleImportClick = () => {
    importInputRef.current?.click();
    setIsFileMenuOpen(false);
  };

  const handleImportFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    onImport(file);
    event.target.value = "";
  };

  return (
    <div className={`navigation__menu${isCompact ? " navigation__menu--compact" : ""}`}>
      {NAVIGATION_MENU_ITEMS.map((menuItem) => {
        if (menuItem.title === ui.navigation.menuHelp) {
          return (
            <Link
              className="navigation__menu-button"
              key={menuItem.title}
              to="/docs"
              target="_blank"
              rel="noreferrer"
            >
              {menuItem.title}
            </Link>
          );
        }

        if (menuItem.title !== ui.navigation.menuFile) {
          return (
            <button className="navigation__menu-button" key={menuItem.title} type="button">
              {menuItem.title}
            </button>
          );
        }

        return (
          <div className="navigation__menu-group" key={menuItem.title} ref={menuRef}>
            <button
              className="navigation__menu-button"
              type="button"
              onClick={() => setIsFileMenuOpen((prev) => !prev)}
              aria-haspopup="menu"
              aria-expanded={isFileMenuOpen}
              aria-label={ui.navigation.fileMenuAria}
            >
              {menuItem.title}
            </button>

            {isFileMenuOpen && (
              <div className="navigation__file-menu" role="menu">
                <button
                  className="navigation__file-menu-option"
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onNew();
                    setIsFileMenuOpen(false);
                  }}
                >
                  {ui.navigation.fileActionNew}
                </button>
                <button
                  className="navigation__file-menu-option"
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onExport();
                    setIsFileMenuOpen(false);
                  }}
                >
                  {ui.navigation.fileActionExport}
                </button>
                <button
                  className="navigation__file-menu-option"
                  type="button"
                  role="menuitem"
                  onClick={handleImportClick}
                >
                  {ui.navigation.fileActionImport}
                </button>
              </div>
            )}

            <input
              ref={importInputRef}
              className="navigation__import-input"
              type="file"
              accept="application/json,.json"
              onChange={handleImportFileChange}
            />
          </div>
        );
      })}
    </div>
  );
}
