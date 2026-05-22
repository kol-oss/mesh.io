import { Link, NavLink, Navigate, Route, Routes } from "react-router-dom";

import AodvHelpPage from "@/features/help/pages/Help/AodvHelp";
import BatmanHelp from "@/features/help/pages/Help/BatmanHelp";
import CoreHelp from "@/features/help/pages/Help/CoreHelp";
import DsdvHelp from "@/features/help/pages/Help/DsdvHelp";
import DsrHelpPage from "@/features/help/pages/Help/DsrHelp";
import OlsrHelp from "@/features/help/pages/Help/OlsrHelp";

const HEADER_LINKS = [
  { to: "/docs/dsdv", label: "DSDV" },
  { to: "/docs/olsr", label: "OLSR" },
  { to: "/docs/batman", label: "B.A.T.M.A.N." },
  { to: "/docs/dsr", label: "DSR" },
  { to: "/docs/aodv", label: "AODV" },
  { to: "/docs/core", label: "Core" },
];

export default function Help() {
  return (
    <div className="help-page">
      <header className="help-page__header">
        <div className="help-page__header-inner">
          <div className="help-page__brand">
            <img className="help-page__brand-logo" src="/favicon.svg" alt={"Mesh IO logo"} />
            <div>
              <p className="help-page__brand-title">{"Mesh IO"}</p>
              <p className="help-page__brand-subtitle">{"Design and Learn"}</p>
            </div>
          </div>

          <nav className="help-page__links" aria-label={"Help"}>
            {HEADER_LINKS.map((link) => (
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
            {"Model"}
          </Link>
        </div>
      </header>

      <div className="help-page__body">
        <main className="help-page__content">
          <Routes>
            <Route path="core" element={<CoreHelp />} />
            <Route path="dsdv" element={<DsdvHelp />} />
            <Route path="olsr" element={<OlsrHelp />} />
            <Route path="batman" element={<BatmanHelp />} />
            <Route path="dsr" element={<DsrHelpPage />} />
            <Route path="aodv" element={<AodvHelpPage />} />

            <Route path="*" element={<Navigate to="/docs/batman" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
