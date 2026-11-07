import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { SiteHeader, SkipLink } from "@/components/chrome";
import { messageOf } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { useTitle } from "@/lib/useTitle";

type Mode = "signin" | "signup";

const DEMO = { email: "demo@relay.dev", password: "demo1234" };

export function SignIn() {
  useTitle("Sign in");
  const navigate = useNavigate();
  const { status, startGuest, login, signup } = useSession();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<null | "guest" | "form">(null);
  const [error, setError] = useState<string | null>(null);

  if (status === "signed-in" && !busy) return <Navigate to="/console" replace />;

  async function run(kind: "guest" | "form", action: () => Promise<void>) {
    setBusy(kind);
    setError(null);
    try {
      await action();
      navigate("/console");
    } catch (e) {
      setError(messageOf(e));
      setBusy(null);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return setError("Enter your email and password.");
    if (mode === "signup" && password.length < 8) return setError("Use a password of at least 8 characters.");
    run("form", () => (mode === "signup" ? signup(email.trim(), password, name.trim()) : login(email.trim(), password)));
  }

  return (
    <>
      <SkipLink />
      <SiteHeader />
      <main id="main" className="mx-auto grid max-w-7xl gap-14 px-4 pt-8 pb-24 sm:px-8 lg:grid-cols-12 lg:pt-16">
        <section className="lg:col-span-6" aria-labelledby="guest-title">
          <h1 className="display text-[clamp(2.75rem,7vw,5.5rem)]">Open the console</h1>
          <h2 id="guest-title" className="heading mt-10 text-2xl">
            Fastest: a guest sandbox
          </h2>
          <p className="mt-3 max-w-md text-muted">
            One click, no email. Your auctions are visible only to you, and the sandbox is deleted after three days.
          </p>
          <button
            type="button"
            className="btn btn-solid mt-6"
            disabled={busy !== null}
            onClick={() => run("guest", startGuest)}
          >
            {busy === "guest" ? "Opening your sandbox…" : "Start as a guest"}
            <ArrowRight className="nudge size-4" aria-hidden="true" />
          </button>

          <h2 className="heading mt-14 text-xl">What you will do there</h2>
          <ol className="mt-4 max-w-md divide-y divide-line border-y border-line">
            {[
              "Describe an ad slot: the audience, country, device and placement.",
              "Run the auction on the server and read the bid ladder.",
              "See why the winner won and how its price was set.",
              "Reopen any earlier run from your history.",
            ].map((step, i) => (
              <li key={step} className="flex gap-4 py-3">
                <span className="num font-mono text-xs leading-6 text-muted">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="lg:col-span-5 lg:col-start-8" aria-labelledby="account-title">
          <div className=" border border-line bg-ground p-6 sm:p-8">
            <h2 id="account-title" className="heading text-2xl">
              {mode === "signin" ? "Sign in to an account" : "Create an account"}
            </h2>
            <p className="mt-2 text-sm text-muted">
              {mode === "signin"
                ? "Accounts keep their history until you stop using them."
                : "An email and a password are all it takes. Nothing is sent to the address."}
            </p>

            <form className="mt-6 space-y-4" onSubmit={submit} noValidate>
              {mode === "signup" && (
                <div>
                  <label htmlFor="name" className="label">
                    Name <span className="font-normal">(optional)</span>
                  </label>
                  <input id="name" className="field mt-1.5" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={60} />
                </div>
              )}
              <div>
                <label htmlFor="email" className="label">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className="field mt-1.5"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              <div>
                <label htmlFor="password" className="label">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  className="field mt-1.5"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  aria-describedby={mode === "signup" ? "password-hint" : undefined}
                  required
                />
                {mode === "signup" && (
                  <p id="password-hint" className="mt-1.5 text-xs text-muted">
                    At least 8 characters.
                  </p>
                )}
              </div>

              {error && (
                <p role="alert" className=" border border-spec px-3 py-2 text-sm text-spec">
                  {error}
                </p>
              )}

              <button type="submit" className="btn btn-solid w-full" disabled={busy !== null}>
                {busy === "form" ? "One moment…" : mode === "signin" ? "Sign in" : "Create account"}
              </button>
            </form>

            <p className="mt-5 text-sm text-muted">
              {mode === "signin" ? "No account yet? " : "Already have one? "}
              <button
                type="button"
                className="inline-block py-1 font-semibold text-ink underline decoration-1 underline-offset-4 transition-colors hover:text-spec hover:decoration-2"
                onClick={() => {
                  setMode(mode === "signin" ? "signup" : "signin");
                  setError(null);
                }}
              >
                {mode === "signin" ? "Create one" : "Sign in instead"}
              </button>
            </p>

            {mode === "signin" && (
              <div className="mt-6 border-t border-line pt-5 text-sm">
                <p className="text-muted">
                  Shared demo account: <span className="font-mono text-xs text-ink">{DEMO.email}</span> /{" "}
                  <span className="font-mono text-xs text-ink">{DEMO.password}</span>. Anyone can use it, so you may see
                  other visitors' auctions.
                </p>
                <button
                  type="button"
                  className="mt-1 inline-block py-1 font-semibold text-ink underline decoration-1 underline-offset-4 transition-colors hover:text-spec hover:decoration-2"
                  onClick={() => {
                    setEmail(DEMO.email);
                    setPassword(DEMO.password);
                  }}
                >
                  Fill it in
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
