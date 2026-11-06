import { useEffect } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import Admin from "./pages/Admin.jsx";
import Capital from "./pages/Capital.jsx";
import Countries from "./pages/Countries.jsx";
import Country from "./pages/Country.jsx";
import Home from "./pages/Home.jsx";
import Manage from "./pages/Manage.jsx";
import PasswordRecovery from "./pages/PasswordRecovery.jsx";
import SimplePartyManage from "./pages/SimplePartyManage.jsx";
import Tonight from "./pages/Tonight.jsx";
import { countryDocument } from "./lib/countries.js";
import { headAction, SITE_ORIGIN } from "./lib/routeHead.js";
import { tonightPathForRoute } from "./lib/barAnchor.js";
import { releaseFeatureEnabled } from "./lib/releaseFeatures.js";
import { BAR_COPY, useBarLanguage } from "./lib/barLanguage.js";

const PAGE_META = {
  "/": {
    title: "Latin bars in capital cities | Go Latin",
    description: "Bachata, Kizomba, and Salsa bars in capital cities.",
    canonical: `${SITE_ORIGIN}/`,
  },
  "/tonight": {
    title: "Explore Latin Bars | GO LATIN",
    description: "Explore Latin bars by city. Official website and Instagram links are included when they are stored.",
    canonical: `${SITE_ORIGIN}/tonight`,
  },
};

function RouteHead() {
  const { pathname } = useLocation();

  useEffect(() => {
    const canonical = document.querySelector('link[rel="canonical"]')?.href ?? "";
    if (headAction(pathname, canonical) === "keep") return;
    document.querySelector('meta[name="description"]')?.remove();
    document.querySelectorAll('link[rel="canonical"]').forEach((node) => node.remove());
    document.querySelectorAll('meta[property^="og:"]').forEach((node) => node.remove());
    document.querySelectorAll('meta[name^="twitter:"]').forEach((node) => node.remove());
    document.querySelectorAll('script[type="application/ld+json"]').forEach((node) => node.remove());
    const country = countryDocument(pathname);
    if (country) {
      if (country.title) document.title = country.title;
      setRobots(country.robots);
      return;
    }
    document.title = "Go Latin";
    const page = PAGE_META[pathname];
    if (!page) return;
    document.querySelector('meta[name="robots"]')?.remove();
    document.title = page.title;
    const description = document.createElement("meta");
    description.setAttribute("name", "description");
    description.setAttribute("content", page.description);
    document.head.appendChild(description);
    const link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    link.setAttribute("href", page.canonical);
    document.head.appendChild(link);
  }, [pathname]);

  return null;
}

function setRobots(content) {
  document.querySelector('meta[name="robots"]')?.remove();
  if (!content) return;
  const robots = document.createElement("meta");
  robots.setAttribute("name", "robots");
  robots.setAttribute("content", content);
  document.head.appendChild(robots);
}

function NotFound() {
  return (
    <main className="wrap detail">
      <h1>Not found</h1>
      <p className="lede">This page is not listed.</p>
    </main>
  );
}

function ComingSoon() {
  return (
    <main className="wrap detail">
      <h1>Coming soon</h1>
      <p className="lede">This feature is not available during the BAR MVP.</p>
      <Link to="/">Explore bars</Link>
    </main>
  );
}

function HomeSkin() {
  const { pathname } = useLocation();
  useEffect(() => {
    const onHome = pathname === "/";
    document.body.classList.toggle("theme-b", onHome);
    return () => document.body.classList.remove("theme-b");
  }, [pathname]);
  return null;
}

export default function App() {
  const { pathname, search, hash } = useLocation();
  const [barLanguage] = useBarLanguage();
  const isBarProfile = /^\/c\/[^/]+$/.test(pathname) && hash.startsWith("#bar-");
  const menu = BAR_COPY[isBarProfile ? barLanguage : "en"];
  return (
    <>
      <RouteHead />
      <HomeSkin />
      <header className="top" lang={isBarProfile ? barLanguage : "en"}>
        <Link to="/" className="brand-link">
          <span className="brand-name">GO LATIN</span>
          <span className="brand-tag">Global Latin Dance Night</span>
          {pathname === "/" ? <span className="brand-tag brand-tag-mobile">GLOBAL LATIN BAR DIRECTORY</span> : null}
        </Link>
        <span>
          <span className="top-note">{menu.menuBars}</span>
          <Link className="top-tonight" to={tonightPathForRoute(pathname, search)}>{menu.tonight}</Link>
        </span>
      </header>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tonight" element={<Tonight />} />
        <Route path="/country" element={<Countries />} />
        <Route path="/country/:slug" element={<Country />} />
        <Route path="/c//party" element={<ComingSoon />} />
        <Route path="/c/:id/party" element={releaseFeatureEnabled("quickParties")
          ? <Navigate to="/admin/party" replace /> : <ComingSoon />} />
        <Route path="/c/:id" element={<Capital />} />
        <Route path="/parties" element={<NotFound />} />
        <Route path="/parties/:id" element={<NotFound />} />
        <Route path="/p/:id" element={<NotFound />} />
        <Route path="/admin" element={<Manage />} />
        <Route path="/admin/reset-password" element={releaseFeatureEnabled("passwordRecovery")
          ? <PasswordRecovery /> : <ComingSoon />} />
        <Route path="/admin/party" element={releaseFeatureEnabled("quickParties")
          ? <SimplePartyManage /> : <ComingSoon />} />
        <Route path="/admin/ads" element={<NotFound />} />
        <Route path="/admin/:id" element={<Admin />} />
      </Routes>
    </>
  );
}
