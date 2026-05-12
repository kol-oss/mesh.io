import { Link, NavLink, Navigate, Route, Routes } from "react-router-dom";

import AboutUsHelpPage from "../../components/Help/pages/AboutUsHelpPage";
import AodvHelpPage from "../../components/Help/pages/AodvHelpPage";
import BatmanHelpPage from "../../components/Help/pages/BatmanHelpPage";
import DsdvHelpPage from "../../components/Help/pages/DsdvHelpPage";
import DsrHelpPage from "../../components/Help/pages/DsrHelpPage";
import OlsrHelpPage from "../../components/Help/pages/OlsrHelpPage";
import { ui } from "../../../../shared/i18n/messages";

const helpLinks = [
  { to: "/docs/about-us", label: ui.help.headerLinkAbout },
  { to: "/docs/dsdv", label: "DSDV" },
  { to: "/docs/olsr", label: ui.help.headerLinkOlsr },
  { to: "/docs/batman", label: ui.help.headerLinkBatman },
  { to: "/docs/dsr", label: ui.help.headerLinkDsr },
  { to: "/docs/aodv", label: ui.help.headerLinkAodv },
];

export default function Help() {
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
            {helpLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `help-page__link${isActive ? " help-page__link--active" : ""}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <Link className="help-page__simulation-button" to="/" target="_blank" rel="noreferrer">
            {ui.help.simulationButton}
          </Link>
        </div>
      </header>

      <div className="help-page__body">
        <main className="help-page__content">
          <Routes>
            <Route path="about-us" element={<AboutUsHelpPage />} />
            <Route path="dsdv" element={<DsdvHelpPage />} />
            <Route path="olsr" element={<OlsrHelpPage />} />
            <Route path="batman" element={<BatmanHelpPage />} />
            <Route path="dsr" element={<DsrHelpPage />} />
            <Route path="aodv" element={<AodvHelpPage />} />
            <Route path="*" element={<Navigate to="/docs/batman" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
