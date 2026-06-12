import type { ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LandingPage } from "@/pages/landing-page";
import { AuthPage } from "@/components/auth-page";
import { ConsolePage } from "@/pages/console-page";
import { useAuth } from "@/lib/auth";

/** Gate a route behind sign-in; redirect to /auth when signed out. */
function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="grid min-h-svh place-items-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  return children;
}

// Vite injects BASE_URL ("/" in dev, "/relay/" for the Pages build); React
// Router needs it without a trailing slash so deep links resolve correctly.
const basename = import.meta.env.BASE_URL.replace(/\/+$/, "");

export default function App() {
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/app"
          element={
            <RequireAuth>
              <ConsolePage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
