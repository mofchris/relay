"use client";

import type React from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeftIcon, Loader2, AlertCircle } from "lucide-react";
import { AppleIcon } from "@/components/apple-icon";
import { GithubIcon } from "@/components/github-icon";
import { GoogleIcon } from "@/components/google-icon";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthDivider } from "@/components/auth-divider";
import { FloatingPaths } from "@/components/floating-paths";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Mode = "signin" | "signup";

export function AuthPage() {
  const navigate = useNavigate();
  const { login, signup, demoLogin } = useAuth();

  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "form" | "demo">(null);

  async function run(fn: () => Promise<void>, kind: "form" | "demo") {
    if (busy) return;
    setError(null);
    setBusy(kind);
    try {
      await fn();
      navigate("/app");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    run(() => (mode === "signup" ? signup(email.trim(), password, name.trim() || undefined) : login(email.trim(), password)), "form");
  }

  return (
    <main className="relative md:h-screen md:overflow-hidden lg:grid lg:grid-cols-2">
      <div className="relative hidden h-full flex-col border-r bg-secondary p-10 lg:flex dark:bg-secondary/20">
        <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-background" />
        <Logo className="mr-auto h-4.5" />

        <div className="z-10 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-xl">
              &ldquo;Relay cut our ad-serving p99 from 80ms to under 10ms — and we finally see campaign performance the
              moment it happens.&rdquo;
            </p>
            <footer className="font-mono font-semibold text-sm">~ Maya Okonkwo, Staff Engineer</footer>
          </blockquote>
        </div>
        <div className="absolute inset-0">
          <FloatingPaths position={1} />
          <FloatingPaths position={-1} />
        </div>
      </div>

      <div className="relative flex min-h-screen flex-col justify-center px-8">
        <div aria-hidden className="absolute inset-0 isolate -z-10 opacity-60 contain-strict">
          <div className="absolute top-0 right-0 h-320 w-140 -translate-y-87.5 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,--theme(--color-foreground/.06)_0,hsla(0,0%,55%,.02)_50%,--theme(--color-foreground/.01)_80%)]" />
          <div className="absolute top-0 right-0 h-320 w-60 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,--theme(--color-foreground/.04)_0,--theme(--color-foreground/.01)_80%,transparent_100%)] [translate:5%_-50%]" />
        </div>

        <Button asChild className="absolute top-7 left-5" variant="ghost">
          <Link to="/">
            <ChevronLeftIcon data-icon="inline-start" />
            Home
          </Link>
        </Button>

        <div className="mx-auto w-full space-y-4 sm:w-sm">
          <Logo className="h-4.5 lg:hidden" />
          <div className="flex flex-col space-y-1">
            <h1 className="font-bold text-2xl tracking-wide">{mode === "signup" ? "Create your account" : "Sign in to Relay"}</h1>
            <p className="text-base text-muted-foreground">Access your delivery console and live analytics.</p>
          </div>

          <div className="space-y-2">
            <Button className="w-full" disabled={busy !== null} onClick={() => run(demoLogin, "demo")}>
              {busy === "demo" ? <Loader2 className="size-4 animate-spin" data-icon="inline-start" /> : <GoogleIcon data-icon="inline-start" />}
              Continue with Google
            </Button>
            <Button className="w-full" disabled={busy !== null} onClick={() => run(demoLogin, "demo")}>
              <AppleIcon data-icon="inline-start" />
              Continue with Apple
            </Button>
            <Button className="w-full" disabled={busy !== null} onClick={() => run(demoLogin, "demo")}>
              <GithubIcon data-icon="inline-start" />
              Continue with GitHub
            </Button>
            <p className="text-center text-muted-foreground text-xs">Social buttons sign you in to the shared demo account.</p>
          </div>

          <AuthDivider>OR</AuthDivider>

          <form className="space-y-3" onSubmit={handleSubmit} noValidate>
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" autoComplete="name" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </div>

            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button className="w-full" type="submit" disabled={busy !== null}>
              {busy === "form" && <Loader2 className="size-4 animate-spin" data-icon="inline-start" />}
              {mode === "signup" ? "Create account" : "Sign in"}
            </Button>
          </form>

          <p className="text-center text-muted-foreground text-sm">
            {mode === "signup" ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              type="button"
              className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
              onClick={() => {
                setMode(mode === "signup" ? "signin" : "signup");
                setError(null);
              }}
            >
              {mode === "signup" ? "Sign in" : "Create one"}
            </button>
          </p>

          <p className="rounded-md bg-muted/50 px-3 py-2 text-center text-muted-foreground text-xs">
            Demo account — email <span className="font-mono text-foreground">demo@relay.dev</span>, password{" "}
            <span className="font-mono text-foreground">demo1234</span>
          </p>
        </div>
      </div>
    </main>
  );
}
