import { Link, Outlet } from "react-router-dom";
import { ArrowRight, Compass } from "lucide-react";

export default function PublicLayout() {
  return (
    <div className="public-shell">
      <header className="public-header">
        <Link className="brand public-brand" to="/">
          <span className="brand-mark">
            <Compass size={20} />
          </span>
          <span>
            fixmyroad<span className="brand-period">.</span>
          </span>
        </Link>
        <nav className="public-nav" aria-label="Main navigation">
          <Link to="/">Home</Link>
          <Link to="/contact">Contact us</Link>
          <Link className="button button-primary public-login" to="/login">
            Log in <ArrowRight size={16} />
          </Link>
        </nav>
      </header>
      <Outlet />
      <footer className="public-footer">
        <Link className="brand public-footer-brand" to="/">
          <span className="brand-mark">
            <Compass size={18} />
          </span>
          <span>
            fixmyroad<span className="brand-period">.</span>
          </span>
        </Link>
        <span>Safer streets start with all of us.</span>
        <Link to="/contact">Contact us</Link>
      </footer>
    </div>
  );
}
