import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CircleHelp,
  Compass,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { useAuth } from "../auth.jsx";

export default function AuthPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { signIn, register } = useAuth();
  const navigate = useNavigate();

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));

    try {
      if (isRegister)
        await register(values.name, values.email, values.password);
      else await signIn(values.email, values.password);
      navigate("/");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  function toggleMode() {
    setIsRegister((current) => !current);
    setError("");
  }

  return (
    <div className="auth-page">
      <section className="auth-story">
        <Link className="brand story-brand" to="/">
          <span className="brand-mark">
            <Compass size={20} />
          </span>
          <span>
            fixmyroad<span className="brand-period">.</span>
          </span>
        </Link>
        <div className="story-content">
          <div className="eyebrow">
            <span /> A BETTER STREET STARTS HERE
          </div>
          <h1>
            Small reports.
            <br />
            <em>Safer streets.</em>
          </h1>
          <p>
            One pothole report can make a whole neighborhood safer. Help your
            community spot issues and follow every fix.
          </p>
          <div className="story-stat">
            <div className="stat-avatars">
              <span>AS</span>
              <span>MK</span>
              <span>RV</span>
              <span>+2k</span>
            </div>
            <div>
              <strong>2,400+ neighbors</strong>
              <small>making a difference together</small>
            </div>
          </div>
        </div>
        <div className="story-footer">
          <span>© 2026 FixMyRoad</span>
          <span>Built for safer communities</span>
        </div>
        <div className="story-decoration decoration-one" />
        <div className="story-decoration decoration-two" />
      </section>

      <section className="auth-form-side">
        <div className="auth-form-wrap">
          <div className="form-intro">
            <div className="form-icon">
              <ShieldCheck size={22} />
            </div>
            <span className="form-kicker">YOUR COMMUNITY, CONNECTED</span>
            <h2>{isRegister ? "Create your account" : "Welcome back"}</h2>
            <p>
              {isRegister
                ? "Join your neighbors and help improve local streets."
                : "Sign in to follow your reports and make a difference."}
            </p>
          </div>

          {error && (
            <div className="inline-error">
              <TriangleAlert size={16} />
              {error}
            </div>
          )}

          <form className="auth-form" onSubmit={submit}>
            {isRegister && (
              <label>
                Your name
                <input
                  name="name"
                  autoComplete="name"
                  placeholder="e.g. Aanya Gupta"
                  required
                  minLength="2"
                  maxLength="80"
                />
              </label>
            )}
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete={isRegister ? "new-password" : "current-password"}
                placeholder={
                  isRegister ? "At least 8 characters" : "Enter your password"
                }
                required
                minLength={isRegister ? 8 : undefined}
              />
            </label>
            {!isRegister && (
              <div className="forgot-row">
                <span>Demo access is ready to use</span>
                <span className="lock-mark">
                  <ShieldCheck size={14} /> Secure sign in
                </span>
              </div>
            )}
            <button
              className="button button-primary auth-submit"
              disabled={busy}
            >
              {busy
                ? "Please wait…"
                : isRegister
                  ? "Create account"
                  : "Sign in"}
              <ArrowRight size={17} />
            </button>
          </form>

          <div className="switch-auth">
            {isRegister ? "Already have an account?" : "New to FixMyRoad?"}{" "}
            <button onClick={toggleMode}>
              {isRegister ? "Sign in" : "Create an account"}
            </button>
          </div>
          {!isRegister && (
            <div className="demo-box">
              <span className="demo-icon">
                <CircleHelp size={17} />
              </span>
              <div>
                <strong>Try the demo</strong>
                <span>Citizen: citizen@civic.local · Citizen123!</span>
                <span>Officer: officer@civic.local · Officer123!</span>
              </div>
            </div>
          )}
          <div className="auth-legal">
            By continuing, you agree to help keep our community respectful and
            safe.
          </div>
        </div>
      </section>
    </div>
  );
}
