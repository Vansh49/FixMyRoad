import { ArrowLeft, Mail, Phone } from "lucide-react";
import { Link } from "react-router-dom";

export default function ContactPage() {
  return (
    <main className="contact-page">
      <div className="contact-content">
        <Link className="contact-back-link" to="/">
          <ArrowLeft size={15} /> Back to home
        </Link>
        <div className="eyebrow">
          <span /> WE'RE HERE TO HELP
        </div>
        <h1>Contact us</h1>
        <p className="contact-intro">
          Have a question, feedback, or need help using FixMyRoad? Get in touch.
        </p>

        <a
          className="contact-method"
          href="mailto:vansh1758.becse24@chitkara.edu.in"
        >
          <span className="contact-method-icon">
            <Mail size={20} />
          </span>
          <span>
            <small>EMAIL US</small>
            <strong>vansh1758.becse24@chitkara.edu.in</strong>
          </span>
          <span className="contact-method-arrow">↗</span>
        </a>
      </div>

      <div className="contact-phone-footer">
        <div className="contact-phone-inner">
          <span className="contact-method-icon">
            <Phone size={19} />
          </span>
          <span>
            <small>CALL US</small>
            <a href="tel:9658456842">9658456842</a>
          </span>
          <span className="contact-availability">We’re happy to help</span>
        </div>
      </div>
    </main>
  );
}
