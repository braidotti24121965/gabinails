"use client";

import { useActionState } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { register } from "@/lib/actions/auth";
import Link from "next/link";

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(register, undefined);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4 sm:p-8">
      <div className="w-full max-w-md rounded-lg border border-[#DBE3EC] bg-white p-6 shadow-card sm:p-8">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-600">
            <Sparkles size={24} className="text-white" />
          </div>
          <h1 className="mt-5 text-xl font-bold text-ink">Crie sua Conta SaaS</h1>
          <p className="mt-1 text-sm text-muted">Acesso completo à plataforma de salão</p>
        </div>

        <form action={formAction} className="mt-8 space-y-4">
          <div>
            <label className="field-label" htmlFor="orgName">Nome do Salão</label>
            <input
              id="orgName"
              name="orgName"
              type="text"
              required
              placeholder="Ex: Amanda Beauty Studio"
              className="field-input"
            />
          </div>

          <div>
            <label className="field-label" htmlFor="fullName">Seu Nome Completo</label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              placeholder="Ex: Amanda Silva"
              className="field-input"
            />
          </div>

          <div>
            <label className="field-label" htmlFor="email">E-mail Comercial</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="contato@salao.com"
              className="field-input"
            />
          </div>

          <div>
            <label className="field-label" htmlFor="password">Senha</label>
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
            <div className="rounded-md bg-rose-50 p-3 text-sm text-danger border border-rose-200">
              {state.error}
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="btn-primary mt-6 w-full justify-center bg-emerald-600 hover:bg-emerald-700 border-emerald-600"
          >
            {pending ? "Criando ambiente..." : "Criar minha conta agora"} <ArrowRight size={16} />
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-muted">
          Já tem uma conta? <Link href="/login" className="text-primary hover:underline font-medium">Faça login aqui</Link>
        </div>
      </div>
    </div>
  );
}
