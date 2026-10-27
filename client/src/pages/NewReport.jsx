import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ImagePlus, MapPin, TriangleAlert, X } from "lucide-react";
import { apiRequest } from "../api.js";
import { useAuth } from "../auth.jsx";
import { ErrorNotice } from "../components/ReportUi.jsx";
import LocationPicker from "../LocationPicker.jsx";

function FormSectionHeading({ step, title, description }) {
  return (
    <div className="form-section-heading location-heading">
      <span className="form-step">{step}</span>
      <div>
        <strong>{title}</strong>
        <small>{description}</small>
      </div>
    </div>
  );
}

function PhotoPicker({ photo, preview, onChoose, onRemove }) {
  return (
    <div className={`photo-picker ${preview ? "photo-picker-selected" : ""}`}>
      <label htmlFor="report-photo" className="photo-picker-label">
        {preview ? (
          <img
            className="photo-preview"
            src={preview}
            alt="Selected road issue preview"
          />
        ) : (
          <span className="photo-picker-icon">
            <ImagePlus size={21} />
          </span>
        )}
        <span className="photo-picker-copy">
          <strong>{photo ? photo.name : "Choose a photo"}</strong>
          <small>JPEG, PNG, or WebP · up to 5 MB</small>
        </span>
        <span className="photo-picker-action">
          {photo ? "Change" : "Browse"}
        </span>
      </label>
      <input
        id="report-photo"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onChoose}
      />
      {photo && (
        <button
          type="button"
          className="remove-photo"
          aria-label="Remove photo"
          onClick={onRemove}
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}

function ReportGuidance() {
  return (
    <aside className="form-aside">
      <div className="aside-illustration">
        <div className="road-line road-line-one" />
        <div className="road-line road-line-two" />
        <div className="map-pin-illustration">
          <MapPin size={23} fill="currentColor" />
        </div>
        <span className="map-dot map-dot-one" />
        <span className="map-dot map-dot-two" />
        <span className="map-dot map-dot-three" />
        <div className="map-tag">CENTRAL WARD</div>
      </div>
      <div className="aside-copy">
        <span className="section-kicker">WHAT HAPPENS NEXT</span>
        <h3>Your report is in good hands.</h3>
        <div className="next-step">
          <span>1</span>
          <p>
            <strong>City team reviews it</strong>
            <small>Usually within 1–2 business days.</small>
          </p>
        </div>
        <div className="next-step">
          <span>2</span>
          <p>
            <strong>Repairs get scheduled</strong>
            <small>You'll see each status update here.</small>
          </p>
        </div>
        <div className="next-step">
          <span>3</span>
          <p>
            <strong>Street gets safer</strong>
            <small>We'll mark it resolved when done.</small>
          </p>
        </div>
      </div>
    </aside>
  );
}

export default function NewReport({ onCreated }) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [position, setPosition] = useState(null);
  const [locationLabel, setLocationLabel] = useState("");
  const [addressLoading, setAddressLoading] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [locationError, setLocationError] = useState("");

  useEffect(() => {
    if (!position) {
      setLocationLabel("");
      setAddressLoading(false);
      return undefined;
    }

    let active = true;
    setLocationLabel("");
    setAddressLoading(true);
    setLocationError("");
    apiRequest(
      `/location/reverse?latitude=${encodeURIComponent(position[0])}&longitude=${encodeURIComponent(position[1])}`,
      { token: session.token },
    )
      .then((result) => {
        if (active) setLocationLabel(result.locationLabel);
      })
      .catch((requestError) => {
        if (active) setLocationError(requestError.message);
      })
      .finally(() => {
        if (active) setAddressLoading(false);
      });

    return () => {
      active = false;
    };
  }, [position, session.token]);

  useEffect(() => {
    if (!photo) {
      setPhotoPreview("");
      return undefined;
    }

    const previewUrl = URL.createObjectURL(photo);
    setPhotoPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [photo]);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));

    try {
      const formData = new FormData();
      for (const [key, value] of Object.entries(values)) {
        formData.set(key, value);
      }
      formData.set("latitude", String(position[0]));
      formData.set("longitude", String(position[1]));
      if (photo) formData.set("photo", photo);

      const result = await apiRequest("/reports", {
        method: "POST",
        token: session.token,
        body: formData,
      });
      onCreated();
      navigate(`/reports/${result.report.id}`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  function selectMapLocation(nextPosition) {
    setPosition(nextPosition);
    setLocationLabel("");
    setAddressLoading(true);
    setLocationError("");
  }

  function rejectMapLocation() {
    setLocationError(
      "That point is outside Chandigarh. Choose a location inside the outlined boundary.",
    );
  }

  function choosePhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Choose an image that is 5 MB or smaller.");
      event.target.value = "";
      return;
    }
    setError("");
    setPhoto(file);
  }

  return (
    <div className="page-content">
      <div className="welcome-row reports-welcome">
        <div>
          <div className="eyebrow">
            <span /> COMMUNITY REPORTING
          </div>
          <h1>Report a road issue</h1>
          <p>
            Share a few details and help your local team get the right fix
            started.
          </p>
        </div>
        <Link className="button button-outline" to="/">
          Cancel
        </Link>
      </div>

      <div className="form-layout">
        <form className="panel report-form" onSubmit={submit}>
          <div className="form-section-heading">
            <span className="form-step">01</span>
            <div>
              <strong>Tell us what you noticed</strong>
              <small>A clear description helps the repair team prepare.</small>
            </div>
          </div>
          {error && <ErrorNotice message={error} />}

          <label>
            Report title
            <input
              name="title"
              placeholder="e.g. Deep pothole near the school crossing"
              required
              minLength="4"
              maxLength="120"
            />
          </label>
          <label>
            Description
            <textarea
              name="description"
              rows="4"
              placeholder="Describe the road damage and anything that might help the repair team…"
              required
              minLength="10"
              maxLength="1000"
            />
          </label>

          <FormSectionHeading
            step="02"
            title="Add a photo"
            description="A clear photo helps the repair team understand the issue."
          />
          <PhotoPicker
            photo={photo}
            preview={photoPreview}
            onChoose={choosePhoto}
            onRemove={() => setPhoto(null)}
          />

          <FormSectionHeading
            step="03"
            title="Where is the issue?"
            description="Choose a point inside Chandigarh; its address will be looked up automatically."
          />
          <label>
            Selected address
            <input
              name="locationLabel"
              placeholder={
                addressLoading
                  ? "Finding the selected address…"
                  : "Select a location on the map"
              }
              value={locationLabel}
              readOnly
              required
            />
          </label>
          <div className="map-toolbar">
            <span>
              <MapPin size={14} />
              Click inside the boundary or drag the pin
            </span>
          </div>
          <LocationPicker
            position={position}
            onChange={selectMapLocation}
            onInvalid={rejectMapLocation}
          />
          <div className="map-coordinates">
            <span>
              LAT <strong>{position ? position[0].toFixed(5) : "—"}</strong>
            </span>
            <span>
              LNG <strong>{position ? position[1].toFixed(5) : "—"}</strong>
            </span>
          </div>
          {locationError && (
            <div className="coordinate-note location-error">
              <TriangleAlert size={14} />
              {locationError}
            </div>
          )}
          <div className="coordinate-note">
            <MapPin size={15} />
            Address and coordinates are verified on the server and saved
            together.
          </div>

          <FormSectionHeading
            step="04"
            title="How serious is it?"
            description="Help the city prioritize urgent safety issues."
          />
          <label>
            Severity
            <select name="severity" defaultValue="medium">
              <option value="low">Low — minor damage</option>
              <option value="medium">Medium — affecting traffic</option>
              <option value="high">High — immediate safety concern</option>
            </select>
          </label>
          <div className="form-actions">
            <Link className="text-link" to="/">
              Cancel
            </Link>
            <button
              className="button button-primary"
              disabled={busy || !position || !locationLabel || addressLoading}
            >
              {busy
                ? "Submitting…"
                : addressLoading
                  ? "Finding address…"
                  : "Submit report"}
              <ArrowRight size={16} />
            </button>
          </div>
        </form>

        <ReportGuidance />
      </div>
    </div>
  );
}
