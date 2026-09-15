"use client";

import { useActionState } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { login } from "@/lib/actions/auth";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4 sm:p-8">
      <div className="w-full max-w-sm rounded-lg border border-[#DBE3EC] bg-white p-6 shadow-card sm:p-8">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
            <Sparkles size={24} className="text-white" />
          </div>
          <h1 className="mt-5 text-xl font-bold text-ink">Gabi Ludwig</h1>
          <p className="mt-1 text-sm text-muted">Acesso ao painel administrativo</p>
        </div>

        <form action={formAction} className="mt-8 space-y-4">
          <div>
            <label className="field-label" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="seu@email.com"
              className="field-input"
            />
          </div>

          <div>
            <label className="field-label" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className="field-input"
            />
          </div>

          {state?.error && (
            <div className="rounded-md bg-rose-50 p-3 text-sm text-danger">
              {state.error}
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="btn-primary mt-6 w-full justify-center"
          >
            {pending ? "Entrando..." : "Acessar painel"} <ArrowRight size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
