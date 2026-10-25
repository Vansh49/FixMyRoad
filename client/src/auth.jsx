import { createContext, useContext, useMemo, useState } from "react";
import { apiRequest } from "./api.js";

const AuthContext = createContext(null);

function readSession() {
  try {
    return JSON.parse(localStorage.getItem("roadwatch-session") ?? "null");
  } catch {
    localStorage.removeItem("roadwatch-session");
    return null;
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession);

  async function signIn(email, password) {
    const result = await apiRequest("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    localStorage.setItem("roadwatch-session", JSON.stringify(result));
    setSession(result);
  }

  async function register(name, email, password) {
    const result = await apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
    localStorage.setItem("roadwatch-session", JSON.stringify(result));
    setSession(result);
  }

  function signOut() {
    localStorage.removeItem("roadwatch-session");
    setSession(null);
  }

  const value = useMemo(() => ({ session, signIn, register, signOut }), [session]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
