import { useEffect, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import AppLayout from "./components/AppLayout.jsx";
import PublicLayout from "./components/PublicLayout.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import ContactPage from "./pages/ContactPage.jsx";
import { CitizenDashboard, OfficerDashboard } from "./pages/Dashboards.jsx";
import HomePage from "./pages/HomePage.jsx";
import NewReport from "./pages/NewReport.jsx";
import ReportDetailPage from "./pages/ReportDetailPage.jsx";
import ReportsPage from "./pages/ReportsPage.jsx";
import { useAuth } from "./auth.jsx";

function App() {
  const { session, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  if (!session) {
    return (
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="login" element={<AuthPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    );
  }

  function handleSignOut() {
    signOut();
    navigate("/login");
  }

  function notify(message) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  }

  return (
    <>
      <AppLayout
        session={session}
        menuOpen={menuOpen}
        onCloseMenu={() => setMenuOpen(false)}
        onOpenMenu={() => setMenuOpen(true)}
        onSignOut={handleSignOut}
      >
        <Routes>
          <Route
            path="/"
            element={
              session.user.role === "officer" ? (
                <OfficerDashboard />
              ) : (
                <CitizenDashboard />
              )
            }
          />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route
            path="/report/new"
            element={
              session.user.role === "citizen" ? (
                <NewReport
                  onCreated={() =>
                    notify("Your report has been submitted successfully.")
                  }
                />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route path="/reports/:id" element={<ReportDetailPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
      {toast && (
        <div className="toast">
          <span>✓</span>
          {toast}
        </div>
      )}
    </>
  );
}

export default App;
