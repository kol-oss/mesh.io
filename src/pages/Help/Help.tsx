import { useState } from "react";
import { Link } from "react-router-dom";

import { ui } from "../../i18n/messages";

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

  const [activeSectionId, setActiveSectionId] = useState(sections[0].id);

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

      <main className="help-page__content">
        {sections.map((section) => (
          <section className="help-page__section" id={section.id} key={section.id}>
            <h2 className="help-page__section-title">{section.title}</h2>
            <p className="help-page__section-text">{section.text}</p>
          </section>
        ))}
      </main>
    </div>
  );
}
