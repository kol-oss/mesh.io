import { Link, NavLink, Navigate, Route, Routes } from "react-router-dom";

import AboutUsHelpPage from "@/features/help/components/Help/pages/AboutUsHelpPage";
import AodvHelpPage from "@/features/help/components/Help/pages/AodvHelpPage";
import BatmanHelpPage from "@/features/help/components/Help/pages/BatmanHelpPage";
import DsdvHelpPage from "@/features/help/components/Help/pages/DsdvHelpPage";
import DsrHelpPage from "@/features/help/components/Help/pages/DsrHelpPage";
import OlsrHelpPage from "@/features/help/components/Help/pages/OlsrHelpPage";const helpLinks = [
  { to: "/docs/about-us", label: "Workspace" },
  { to: "/docs/dsdv", label: "DSDV" },
  { to: "/docs/olsr", label: "OLSR" },
  { to: "/docs/batman", label: "B.A.T.M.A.N." },
  { to: "/docs/dsr", label: "DSR" },
  { to: "/docs/aodv", label: "AODV" },
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
              alt={"Mesh IO logo"}
            />
            <div>
              <p className="help-page__brand-title">{"Mesh IO"}</p>
              <p className="help-page__brand-subtitle">{"Design and Learn"}</p>
            </div>
          </div>

          <nav className="help-page__links" aria-label={"Help"}>
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
            {"Model"}
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
