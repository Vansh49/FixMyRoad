import { useEffect, useState } from "react";
import { apiRequest } from "../api.js";
import { useAuth } from "../auth.jsx";

export default function useReports() {
  const { session } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiRequest("/reports", { token: session.token })
      .then((result) => {
        if (active) {
          setReports(result.reports);
          setError("");
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session.token, refreshKey]);

  return {
    reports,
    loading,
    error,
    refresh: () => setRefreshKey((key) => key + 1),
  };
}
