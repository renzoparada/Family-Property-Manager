"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// TEMPORARY diagnostic: inspect the inlined env vars for any character
// outside the Latin-1 range, which breaks the Fetch API's Headers
// constructor. Remove once the "non ISO-8859-1 code point" bug is found.
function EnvDebugBanner() {
  const vars: [string, string | undefined][] = [
    ["NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL],
    ["NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY],
  ];

  return (
    <div className="mb-4 space-y-2 rounded-lg border border-yellow-600 bg-yellow-950/40 p-3 text-xs text-yellow-200">
      <p className="font-semibold">Diagnóstico temporal</p>
      {vars.map(([name, value]) => {
        if (value === undefined) {
          return (
            <p key={name}>
              {name}: <span className="text-red-400">NO DEFINIDA</span>
            </p>
          );
        }
        let badIndex = -1;
        let badCode = -1;
        for (let i = 0; i < value.length; i++) {
          const code = value.charCodeAt(i);
          if (code > 255) {
            badIndex = i;
            badCode = code;
            break;
          }
        }
        return (
          <div key={name}>
            <p>
              {name}: longitud {value.length}, primeros 12: <code>{value.slice(0, 12)}</code>,
              últimos 12: <code>{value.slice(-12)}</code>
            </p>
            <p>
              {badIndex === -1 ? (
                <span className="text-green-400">Sin caracteres fuera de rango.</span>
              ) : (
                <span className="text-red-400">
                  Carácter fuera de rango en posición {badIndex}: código {badCode} (
                  {JSON.stringify(value.slice(Math.max(0, badIndex - 5), badIndex + 5))})
                </span>
              )}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
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
          <EnvDebugBanner />
          <div className="mb-5 flex rounded-lg bg-[var(--color-subtle)] p-1 text-sm">
            <button
              type="button"
              onClick={() => setMode("signin")}
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
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-md py-1.5 font-medium transition ${
                mode === "signup"
                  ? "bg-[var(--color-surface)] shadow-sm"
                  : "text-[var(--color-muted)]"
              }`}
            >
              Crear cuenta
            </button>
          </div>

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
            <input
              className="input"
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
            {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
            {notice && <p className="text-sm text-[var(--color-success)]">{notice}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading
                ? "Un momento…"
                : mode === "signin"
                ? "Iniciar sesión"
                : "Crear cuenta"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
