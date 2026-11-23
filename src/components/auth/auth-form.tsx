"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  signInWithOAuth,
  signInWithPassword,
  signUpWithPassword,
  type AuthFormState,
} from "@/lib/auth/actions";

export function AuthForm({ next, initialError }: { next?: string; initialError?: string }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    mode === "signin" ? signInWithPassword : signUpWithPassword,
    null,
  );
  const error = state?.error ?? initialError;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{mode === "signin" ? "Sign in" : "Create an account"}</h1>
        <p className="text-muted-foreground text-sm">
          {mode === "signin" ? "Save builds, share them and pick up where you left off." : "It takes a few seconds."}
        </p>
      </div>

      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {state?.message && (
        <Alert role="status">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      <form action={signInWithOAuth} className="grid gap-2 sm:grid-cols-2">
        <input type="hidden" name="next" value={next ?? ""} />
        <Button type="submit" name="provider" value="google" variant="outline">
          <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
            <path fill="currentColor" d="M21.35 11.1H12v2.98h5.35c-.23 1.4-1.66 4.1-5.35 4.1a5.95 5.95 0 1 1 0-11.9c1.85 0 3.1.79 3.8 1.47l2.6-2.5C16.76 3.7 14.6 2.7 12 2.7a9.3 9.3 0 1 0 0 18.6c5.37 0 8.93-3.77 8.93-9.09 0-.61-.07-1.08-.16-1.55Z" />
          </svg>
          Google
        </Button>
        <Button type="submit" name="provider" value="github" variant="outline">
          <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
            <path fill="currentColor" d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.56 9.56 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
          </svg>
          GitHub
        </Button>
      </form>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-muted-foreground text-xs uppercase">or with email</span>
        <Separator className="flex-1" />
      </div>

      <form action={formAction} className="space-y-4" noValidate>
        <input type="hidden" name="next" value={next ?? ""} />
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={Boolean(state?.fieldErrors?.email)}
            aria-describedby={state?.fieldErrors?.email ? "email-error" : undefined}
          />
          {state?.fieldErrors?.email && (
            <p id="email-error" className="text-destructive text-sm">
              {state.fieldErrors.email}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            required
            minLength={8}
            aria-invalid={Boolean(state?.fieldErrors?.password)}
            aria-describedby={state?.fieldErrors?.password ? "password-error" : undefined}
          />
          {state?.fieldErrors?.password && (
            <p id="password-error" className="text-destructive text-sm">
              {state.fieldErrors.password}
            </p>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {mode === "signin" ? "Sign in" : "Create account"}
        </Button>
      </form>

      <p className="text-muted-foreground text-center text-sm">
        {mode === "signin" ? "New to PCForge? " : "Already have an account? "}
        <button
          type="button"
          className="text-primary font-medium underline-offset-4 hover:underline"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "Create an account" : "Sign in"}
        </button>
      </p>
      <p className="text-muted-foreground text-center text-xs">
        <Link href="/" className="underline-offset-4 hover:underline">
          Back to PCForge
        </Link>
      </p>
    </div>
  );
}
