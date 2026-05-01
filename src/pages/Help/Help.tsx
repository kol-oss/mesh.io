import { useState } from "react";
import { Link } from "react-router-dom";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { ui } from "../../i18n/messages";
import Tooltip from "../../components/Tooltip/Tooltip";
import { TooltipPlacement } from "../../types/enums";
import { useSidebarResize } from "../../hooks/navigation/useSidebarResize";

type HelpSection = {
  id: string;
  label: string;
  title: string;
  text: string;
};

export default function Help() {
  const sections: HelpSection[] = [
    {
      id: "about-us",
      label: ui.help.headerLinkAbout,
      title: ui.help.sectionAboutTitle,
      text: ui.help.sectionAboutText,
    },
    {
      id: "batman",
      label: ui.help.headerLinkBatman,
      title: ui.help.sectionBatmanTitle,
      text: ui.help.sectionBatmanText,
    },
    {
      id: "olsr",
      label: ui.help.headerLinkOlsr,
      title: ui.help.sectionOlsrTitle,
      text: ui.help.sectionOlsrText,
    },
    {
      id: "aodv",
      label: ui.help.headerLinkAodv,
      title: ui.help.sectionAodvTitle,
      text: ui.help.sectionAodvText,
    },
    {
      id: "dsr",
      label: ui.help.headerLinkDsr,
      title: ui.help.sectionDsrTitle,
      text: ui.help.sectionDsrText,
    },
  ];
  const documentationSections = sections.filter((section) => section.id !== "about-us");

  const [activeSectionId, setActiveSectionId] = useState(sections[0].id);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { widthPercent, onResizeStart } = useSidebarResize();

  const handleSidebarToggle = () => {
    setIsSidebarCollapsed((prev) => !prev);
  };

  return (
    <div className="help-page">
      <header className="help-page__header">
        <div className="help-page__header-inner">
          <div className="help-page__brand">
            <img
              className="help-page__brand-logo"
              src="/favicon.svg"
              alt={ui.navigation.appLogoAlt}
            />
            <div>
              <p className="help-page__brand-title">{ui.navigation.appName}</p>
              <p className="help-page__brand-subtitle">{ui.navigation.appMotto}</p>
            </div>
          </div>

          <nav className="help-page__links" aria-label={ui.navigation.menuHelp}>
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className={`help-page__link${activeSectionId === section.id ? " help-page__link--active" : ""}`}
                onClick={() => setActiveSectionId(section.id)}
              >
                {section.label}
              </a>
            ))}
          </nav>

          <Link className="help-page__simulation-button" to="/" target="_blank" rel="noreferrer">
            {ui.help.simulationButton}
          </Link>
        </div>
      </header>

      <div className="help-page__body">
        {isSidebarCollapsed ? (
          <div className="help-page__sidebar-collapsed">
            <Tooltip
              content={ui.navigation.expandSidebarTooltip}
              placement={TooltipPlacement.Bottom}
            >
              <button
                className="help-page__sidebar-toggle"
                type="button"
                aria-label={ui.navigation.expandNavigationAria}
                onClick={handleSidebarToggle}
              >
                <PanelLeftOpen size={15} />
              </button>
            </Tooltip>
          </div>
        ) : (
          <aside className="navigation help-page__sidebar" style={{ width: `${widthPercent}%` }}>
            <Tooltip
              content={ui.navigation.collapseSidebarTooltip}
              placement={TooltipPlacement.Bottom}
            >
              <button
                className="navigation__compact-button"
                type="button"
                aria-label={ui.navigation.collapseNavigationAria}
                onClick={handleSidebarToggle}
              >
                <PanelLeftClose size={15} />
              </button>
            </Tooltip>

            <nav className="help-page__sidebar-content" aria-label={ui.navigation.menuHelp}>
              <section className="help-page__sidebar-group" aria-labelledby="help-about-us-heading">
                <p className="help-page__sidebar-heading" id="help-about-us-heading">
                  {ui.help.sidebarAboutUsHeading}
                </p>
                <ul className="help-page__sidebar-list">
                  <li>
                    <a
                      className={`help-page__sidebar-link${activeSectionId === "about-us" ? " help-page__sidebar-link--active" : ""}`}
                      href="#about-us"
                      onClick={() => setActiveSectionId("about-us")}
                    >
                      <span className="help-page__sidebar-link-title">
                        {ui.help.headerLinkAbout}
                      </span>
                    </a>
                  </li>
                  <li>
                    <Link
                      className="help-page__sidebar-link"
                      to="/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span className="help-page__sidebar-link-title">
                        {ui.help.sidebarModeling}
                      </span>
                    </Link>
                  </li>
                </ul>
              </section>

              <section
                className="help-page__sidebar-group"
                aria-labelledby="help-documentation-heading"
              >
                <p className="help-page__sidebar-heading" id="help-documentation-heading">
                  {ui.help.sidebarDocumentationHeading}
                </p>
                <ul className="help-page__doc-list">
                  {documentationSections.map((section, index) => (
                    <li key={section.id}>
                      <a
                        className={`help-page__doc-link${activeSectionId === section.id ? " help-page__doc-link--active" : ""}`}
                        href={`#${section.id}`}
                        onClick={() => setActiveSectionId(section.id)}
                      >
                        <span className="help-page__doc-dot" aria-hidden="true" />
                        <span className="help-page__doc-number">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="help-page__doc-title">{section.label}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            </nav>
            <div
              className="navigation__resizer"
              role="separator"
              aria-label={ui.navigation.resizeSidebarAria}
              aria-orientation="vertical"
              onPointerDown={onResizeStart}
            />
          </aside>
        )}

        <main
          className={`help-page__content${isSidebarCollapsed ? " help-page__content--sidebar-collapsed" : ""}`}
        >
          {sections.map((section) => (
            <section className="help-page__section" id={section.id} key={section.id}>
              <h2 className="help-page__section-title">{section.title}</h2>
              <p className="help-page__section-text">{section.text}</p>
            </section>
          ))}
        </main>
      </div>
    </div>
  );
}
