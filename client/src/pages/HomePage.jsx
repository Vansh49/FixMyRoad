import {
  ArrowRight,
  Check,
  ClipboardList,
  MapPin,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { Link } from "react-router-dom";

const steps = [
  {
    icon: <MapPin size={19} />,
    title: "Spot an issue",
    description:
      "See a pothole or damaged road? Pin the location and tell us what you found.",
  },
  {
    icon: <ClipboardList size={19} />,
    title: "Track the report",
    description:
      "Follow your report as the city team reviews it and schedules repairs.",
  },
  {
    icon: <Wrench size={19} />,
    title: "Make streets safer",
    description:
      "Get clear status updates from submission through completed repair.",
  },
];

export default function HomePage() {
  return (
    <main className="public-home">
      <section className="home-hero">
        <div className="home-hero-copy">
          <div className="eyebrow">
            <span /> A BETTER STREET STARTS HERE
          </div>
          <h1>
            Your streets.
            <br />
            <em>Your voice.</em>
          </h1>
          <p>
            Help your community spot road problems, report them in minutes, and
            follow every repair along the way.
          </p>
          <div className="home-hero-actions">
            <Link className="button button-primary" to="/login">
              Get started <ArrowRight size={17} />
            </Link>
            <Link className="home-secondary-link" to="/contact">
              Contact our team
            </Link>
          </div>
          <div className="home-trust-note">
            <ShieldCheck size={16} />
            Built for citizens and local road teams
          </div>
        </div>

        <div className="home-visual" aria-label="Road repair reporting preview">
          <div className="home-visual-top">
            <span className="home-visual-icon">
              <MapPin size={17} />
            </span>
            <span>
              <strong>Community road report</strong>
              <small>Central Ward · Just now</small>
            </span>
            <span className="status-badge status-progress">
              <i /> In progress
            </span>
          </div>
          <div className="home-map-preview">
            <div className="home-map-road home-map-road-one" />
            <div className="home-map-road home-map-road-two" />
            <div className="home-map-road home-map-road-three" />
            <span className="home-map-area">CENTRAL WARD</span>
            <span className="home-map-pin">
              <MapPin size={25} fill="currentColor" />
            </span>
            <span className="home-map-point home-map-point-one" />
            <span className="home-map-point home-map-point-two" />
          </div>
          <div className="home-report-summary">
            <div>
              <span className="section-kicker">REPAIR PROGRESS</span>
              <strong>Team assigned</strong>
            </div>
            <div className="home-progress-track">
              <span />
            </div>
            <span className="home-progress-check">
              <Check size={15} />
            </span>
          </div>
          <div className="home-visual-caption">
            <span className="home-caption-dot" />
            One report can help an entire neighborhood
          </div>
        </div>
      </section>

      <section className="home-steps-section" id="how-it-works">
        <div className="home-section-heading">
          <div className="eyebrow">
            <span /> HOW FIXMYROAD WORKS
          </div>
          <h2>From “I noticed” to “It's fixed.”</h2>
          <p>
            A simple way to bring road issues to the people who can fix them.
          </p>
        </div>
        <div className="home-steps">
          {steps.map((step, index) => (
            <article className="home-step-card" key={step.title}>
              <div className="home-step-top">
                <span className="home-step-icon">{step.icon}</span>
                <span className="home-step-number">0{index + 1}</span>
              </div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-cta">
        <div>
          <span className="section-kicker">
            LET'S MAKE THE NEXT REPAIR HAPPEN
          </span>
          <h2>Better roads begin with a report.</h2>
        </div>
        <Link className="button button-dark" to="/login">
          Log in to get started <ArrowRight size={16} />
        </Link>
      </section>
    </main>
  );
}
