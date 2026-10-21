import { Link, Route, Routes } from "react-router-dom";
import Admin from "./pages/Admin.jsx";
import Capital from "./pages/Capital.jsx";
import Home from "./pages/Home.jsx";
import Manage from "./pages/Manage.jsx";
import Tonight from "./pages/Tonight.jsx";
import QuickParties from "./pages/QuickParties.jsx";
import QuickPartyReview from "./pages/QuickPartyReview.jsx";

export default function App() {
  return (
    <>
      <header className="top">
        <Link to="/">Go Latin</Link>
        <span>
          <span className="top-note">Capital bars</span>
          <Link className="top-tonight" to="/tonight">Tonight</Link>
        </span>
      </header>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tonight" element={<Tonight />} />
        <Route path="/parties" element={<QuickParties />} />
        <Route path="/admin/party-review" element={<QuickPartyReview />} />
        <Route path="/c/:id" element={<Capital />} />
        <Route path="/admin" element={<Manage />} />
        <Route path="/admin/:id" element={<Admin />} />
      </Routes>
    </>
  );
}
