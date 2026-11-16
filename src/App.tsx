import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Landing } from "@/pages/Landing";

const SignIn = lazy(() => import("@/pages/SignIn").then((m) => ({ default: m.SignIn })));
const Console = lazy(() => import("@/pages/Console").then((m) => ({ default: m.Console })));
const NotFound = lazy(() => import("@/pages/NotFound").then((m) => ({ default: m.NotFound })));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="min-h-svh" />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/console" element={<Console />} />
          {/* Old paths from earlier versions of the app. */}
          <Route path="/auth" element={<Navigate to="/signin" replace />} />
          <Route path="/app" element={<Navigate to="/console" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
