"use client";

import Link from "next/link";
import { useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

export default function ContactPage() {
  const [form, setForm] = useState({ nom: "", email: "", message: "" });
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? "Une erreur est survenue.");
        setStatus("error");
        return;
      }

      setStatus("success");
      setForm({ nom: "", email: "", message: "" });
    } catch {
      setErrorMsg("Impossible de joindre le serveur. Vérifiez votre connexion.");
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0d0d0d]">
      <header className="fixed top-0 left-0 right-0 z-50 w-full py-4 md:py-6 bg-[#0c0c0c]/80 backdrop-blur-md border-b border-[#292929]">
        <div className="w-full max-w-7xl mx-auto px-4 md:px-8 flex flex-row justify-between items-center">
          <Link href="/" className="font-bold text-[#C9973A] text-sm transition-colors duration-200 hover:text-white">
            ScanAvis
          </Link>
          <Link href="/" className="text-[#767676] text-xs transition-colors duration-200 hover:text-white">
            ← Retour
          </Link>
        </div>
      </header>

      <main className="w-full max-w-5xl mx-auto px-4 md:px-8 pt-32 pb-20 flex flex-col gap-12">
        <div className="flex flex-col gap-3 max-w-xl">
          <p className="text-xs uppercase tracking-widest text-[#C9973A] font-bold">Contactez-nous</p>
          <h1 className="text-3xl md:text-4xl font-bold text-white">On est là pour vous aider</h1>
          <p className="text-[#8c8c8c] text-base leading-relaxed">
            Une question, une suggestion, un bug à signaler ? Écrivez-nous, on vous répond personnellement
            sous 48h. Pas de bot, pas de formulaire perdu.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

          {/* Formulaire */}
          <div className="bg-[#171717] border border-[#292929] rounded-2xl p-6 md:p-8">
            {status === "success" ? (
              <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
                <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p className="text-green-400 font-semibold text-base">Merci, on vous répond sous 48h ✓</p>
                <p className="text-[#8c8c8c] text-sm leading-relaxed max-w-xs">
                  Message bien reçu ! En attendant, n&apos;hésitez pas à consulter notre{" "}
                  <Link href="/a-propos" className="text-[#C9973A] hover:underline">page À propos</Link>.
                </p>
                <button
                  onClick={() => setStatus("idle")}
                  className="mt-2 text-xs text-[#8c8c8c] hover:text-white transition-colors duration-200 underline underline-offset-2"
                >
                  Envoyer un autre message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <h2 className="text-white font-semibold text-lg mb-1">Envoyez-nous un message</h2>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="nom" className="text-xs text-[#8c8c8c] font-medium uppercase tracking-wider">
                    Votre nom
                  </label>
                  <input
                    id="nom"
                    type="text"
                    required
                    placeholder="Marie Dupont"
                    value={form.nom}
                    onChange={(e) => setForm({ ...form, nom: e.target.value })}
                    disabled={status === "loading"}
                    className="w-full bg-[#0d0d0d] border border-[#292929] rounded-xl px-4 py-3 text-white text-sm placeholder-[#555] focus:outline-none focus:border-[#C9973A] transition-colors duration-200 disabled:opacity-50"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="text-xs text-[#8c8c8c] font-medium uppercase tracking-wider">
                    Votre email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder="marie@moncommerce.fr"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    disabled={status === "loading"}
                    className="w-full bg-[#0d0d0d] border border-[#292929] rounded-xl px-4 py-3 text-white text-sm placeholder-[#555] focus:outline-none focus:border-[#C9973A] transition-colors duration-200 disabled:opacity-50"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="message" className="text-xs text-[#8c8c8c] font-medium uppercase tracking-wider">
                    Votre message
                  </label>
                  <textarea
                    id="message"
                    required
                    rows={5}
                    placeholder="Bonjour, j'aimerais..."
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    disabled={status === "loading"}
                    className="w-full bg-[#0d0d0d] border border-[#292929] rounded-xl px-4 py-3 text-white text-sm placeholder-[#555] focus:outline-none focus:border-[#C9973A] transition-colors duration-200 resize-none disabled:opacity-50"
                  />
                </div>

                {status === "error" && (
                  <div className="flex flex-row items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
                      <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
                    </svg>
                    <p className="text-red-400 text-xs leading-relaxed">{errorMsg}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="w-full min-h-[44px] bg-[#C9973A] text-black text-sm font-semibold rounded-xl px-6 py-3 transition-opacity hover:opacity-90 mt-1 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {status === "loading" ? (
                    <>
                      <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                      </svg>
                      Envoi...
                    </>
                  ) : (
                    "Envoyer →"
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Infos de contact */}
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 bg-[#171717] border border-[#292929] rounded-2xl p-6">
              <div className="flex flex-row items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#C9973A]/10 border border-[#C9973A]/20 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9973A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="text-white text-sm font-medium">Email direct</p>
                  <a href="mailto:lborrelli248@gmail.com" className="text-[#C9973A] text-sm hover:underline">
                    lborrelli248@gmail.com
                  </a>
                </div>
              </div>
              <p className="text-[#8c8c8c] text-xs leading-relaxed">
                Vous préférez écrire directement ? On vous répond dans les 48h ouvrées.
              </p>
            </div>

            <div className="flex flex-col gap-4 bg-[#171717] border border-[#292929] rounded-2xl p-6">
              <div className="flex flex-row items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#C9973A]/10 border border-[#C9973A]/20 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9973A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="text-white text-sm font-medium">Délai de réponse</p>
                  <p className="text-[#8c8c8c] text-sm">Sous 48h ouvrées</p>
                </div>
              </div>
              <p className="text-[#8c8c8c] text-xs leading-relaxed">
                Chaque message est lu et traité avec attention.
              </p>
            </div>

            <div className="flex flex-col gap-3 bg-[#171717] border border-[#292929] rounded-2xl p-6">
              <p className="text-white text-sm font-medium">Vous avez d&apos;autres questions ?</p>
              <p className="text-[#8c8c8c] text-xs leading-relaxed">
                Consultez notre page{" "}
                <Link href="/a-propos" className="text-[#C9973A] hover:underline">À propos</Link>{" "}
                ou regardez la{" "}
                <Link href="/demo" className="text-[#C9973A] hover:underline">démo en direct</Link>{" "}
                pour mieux comprendre comment ScanAvis fonctionne.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col justify-start items-start gap-4 border-t border-[#292929]">
        <div className="flex flex-wrap gap-4 text-xs text-[#8c8c8c]">
          <Link href="/mentions-legales" className="hover:text-white transition-colors duration-200">Mentions légales</Link>
          <Link href="/cgu" className="hover:text-white transition-colors duration-200">CGU</Link>
          <Link href="/confidentialite" className="hover:text-white transition-colors duration-200">Confidentialité</Link>
          <Link href="/a-propos" className="hover:text-white transition-colors duration-200">À propos</Link>
          <Link href="/contact" className="hover:text-white transition-colors duration-200">Contact</Link>
        </div>
        <p className="text-xs text-[#8c8c8c]">© 2026 ScanAvis · Fait en France</p>
      </footer>
    </div>
  );
}
