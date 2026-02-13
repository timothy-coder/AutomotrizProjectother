"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const BRAND = "#5e17eb"
const GRAY = "#83919c"

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Error al iniciar sesión");
        return;
      }

      // Cookie para protección (si tu backend no la setea)
      // Si “Recordarme” = true, la cookie dura más
      const maxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 8;
      document.cookie = `token=${data.token}; path=/; max-age=${maxAge}; samesite=lax`;

      localStorage.setItem("user", JSON.stringify(data.user));

      router.push("/home");
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-svh w-full flex items-center justify-center px-4 bg-slate-950">
      <Card className="w-full max-w-3xl overflow-hidden shadow-sm border-white/10 bg-slate-900">
        <div className="flex flex-col md:flex-row">
          <aside className="w-full md:w-5/12 p-6 md:p-8 flex items-center justify-center border-b md:border-b-0 md:border-r border-white/10">
            <div className="text-center">
              <img src="/Logopreview.png" alt="Logo" className="max-h-40 mx-auto" />
              <p className="text-lg font-semibold mt-2 text-white">Bienvenido</p>
              <p className="text-sm text-slate-400">
                Ingresa con tu usuario y contraseña
              </p>
            </div>
          </aside>

          <div className="w-full md:w-7/12">
            <CardHeader>
              <CardTitle className="text-2xl font-bold" style={{ color: BRAND }}>
                Iniciar sesión
              </CardTitle>
            </CardHeader>

            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4">
                {/* Usuario */}
                <div className="space-y-1">
                  <Label htmlFor="username" className="text-slate-200">
                    Usuario
                  </Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="username"
                    autoComplete="username"
                    className="bg-slate-950/40 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500"
                  />
                </div>

                {/* Contraseña */}
                <div className="space-y-1">
                  <Label htmlFor="password" className="text-slate-200">
                    Contraseña
                  </Label>

                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="********"
                      autoComplete="current-password"
                      className="pr-10 bg-slate-950/40 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-white"
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Recordarme */}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember"
                    checked={remember}
                    onCheckedChange={(v) => setRemember(Boolean(v))}
                  />
                  <Label htmlFor="remember" className="text-slate-200">
                    Recordarme
                  </Label>
                </div>

                {/* Error */}
                {error && (
                  <div className="bg-red-500/20 border border-red-500 text-red-200 p-2 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                {/* Botón */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full text-white"
                  style={{ backgroundColor: BRAND }}
                >
                  {loading ? "Ingresando..." : "Ingresar"}
                </Button>
              </CardContent>
            </form>
          </div>
        </div>
      </Card>
    </div>
  );
}
