"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup" | "forgot";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);
    const supabase = createClient();

    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if (error) {
        setError(error.message);
      } else {
        setNotice("Si ese correo tiene una cuenta, te enviamos un enlace para restablecer tu contraseña.");
      }
      setLoading(false);
      return;
    }

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      if (data.session) {
        router.push("/onboarding");
        router.refresh();
      } else {
        setNotice("Revisa tu correo para confirmar tu cuenta.");
      }
    }
    setLoading(false);
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-canvas)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-accent)] text-lg font-semibold text-white">
            FP
          </div>
          <h1 className="text-xl font-semibold text-[var(--color-ink)]">
            Family Property Manager
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Administración financiera de tus propiedades familiares
          </p>
        </div>

        <div className="card p-6">
          {mode !== "forgot" && (
            <div className="mb-5 flex rounded-lg bg-[var(--color-subtle)] p-1 text-sm">
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className={`flex-1 rounded-md py-1.5 font-medium transition ${
                  mode === "signin"
                    ? "bg-[var(--color-surface)] shadow-sm"
                    : "text-[var(--color-muted)]"
                }`}
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className={`flex-1 rounded-md py-1.5 font-medium transition ${
                  mode === "signup"
                    ? "bg-[var(--color-surface)] shadow-sm"
                    : "text-[var(--color-muted)]"
                }`}
              >
                Crear cuenta
              </button>
            </div>
          )}

          {mode === "forgot" && (
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-[var(--color-ink)]">
                Recuperar contraseña
              </h2>
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                Ingresa tu correo y te enviaremos un enlace para elegir una nueva contraseña.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" && (
              <input
                className="input"
                placeholder="Nombre completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            )}
            <input
              className="input"
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {mode !== "forgot" && (
              <input
                className="input"
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            )}
            {mode === "signin" && (
              <button
                type="button"
                onClick={() => switchMode("forgot")}
                className="text-xs text-[var(--color-accent)]"
              >
                ¿Olvidaste tu contraseña?
              </button>
            )}
            {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
            {notice && <p className="text-sm text-[var(--color-success)]">{notice}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading
                ? "Un momento…"
                : mode === "signin"
                ? "Iniciar sesión"
                : mode === "signup"
                ? "Crear cuenta"
                : "Enviar enlace"}
            </button>
            {mode === "forgot" && (
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className="w-full text-center text-xs text-[var(--color-muted)]"
              >
                Volver a iniciar sesión
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
