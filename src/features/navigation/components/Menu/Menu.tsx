import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { NAVIGATION_MENU_ITEMS } from "@/shared/utils/navigation/constants";
import { useNavigationRedux } from "@/features/navigation/hooks/useNavigationRedux";
import MenuButton from "../MenuButton/MenuButton";

type MenuProps = {
  isCompact?: boolean;
};

export default function Menu({ isCompact = false }: MenuProps) {
  const { onFileExport, onFileImport, onFileNew } = useNavigationRedux();
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

    onFileImport(file);
    event.target.value = "";
  };

  return (
    <div className={`navigation__menu${isCompact ? " navigation__menu--compact" : ""}`}>
      {NAVIGATION_MENU_ITEMS.map((menuItem) => {
        if (menuItem.title === "Help") {
          return <MenuButton key={menuItem.title} label={menuItem.title} to="/docs" />;
        }

        if (menuItem.title !== "File") {
          return <MenuButton key={menuItem.title} label={menuItem.title} />;
        }

        return (
          <div className="navigation__menu-group" key={menuItem.title} ref={menuRef}>
            <MenuButton label={menuItem.title} onClick={() => setIsFileMenuOpen((prev) => !prev)} />

            {isFileMenuOpen && (
              <div className="navigation__file-menu" role="menu">
                <MenuButton
                  className="navigation__file-menu-option"
                  label="New"
                  onClick={() => {
                    onFileNew();
                    setIsFileMenuOpen(false);
                  }}
                />
                <MenuButton
                  className="navigation__file-menu-option"
                  label="Export"
                  onClick={() => {
                    onFileExport();
                    setIsFileMenuOpen(false);
                  }}
                />
                <MenuButton
                  className="navigation__file-menu-option"
                  label="Import"
                  onClick={handleImportClick}
                />
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
