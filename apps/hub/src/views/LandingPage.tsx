"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Hero } from "@/components/Hero";
import { ModuleCard } from "@/components/ModuleCard";
import { FeaturesSection } from "@/components/FeaturesSection";
import { Footer } from "@/components/Footer";
import { AuthActions } from "@/components/AuthActions";
import { getLandingUrls } from "@/lib/landingUrls";
import { ShoppingCart, Users, Wrench, LayoutDashboard, ArrowRight } from "lucide-react";

export function LandingPage() {
  const modules = useMemo(() => {
    const urls = getLandingUrls();
    return [
      {
        title: "POS POS",
        description:
          "Punto de venta completo con gestión de inventario, caja y reportes de ventas en tiempo real.",
        icon: <ShoppingCart className="w-6 h-6" />,
        features: ["Gestión de productos", "Punto de venta rápido", "Reportes de ventas"],
        href: urls.pos,
        accentColor: "text-violet-400",
        accentBg: "bg-violet-500/10",
      },
      {
        title: "Hr",
        description: "Gestión completa de recursos humanos, turnos, asistencia y nómina.",
        icon: <Users className="w-6 h-6" />,
        features: ["Gestión de turnos", "Control de asistencia", "Nómina integrada"],
        href: urls.hr,
        accentColor: "text-sky-400",
        accentBg: "bg-sky-500/10",
      },
      {
        title: "Tech Services",
        description: "Órdenes de servicio técnico, gestión de activos y visitas de campo.",
        icon: <Wrench className="w-6 h-6" />,
        features: ["Órdenes de trabajo", "Gestión de activos", "Visitas técnicas"],
        href: urls.tech,
        accentColor: "text-amber-400",
        accentBg: "bg-amber-500/10",
      },
      {
        title: "Hub Central",
        description: "Panel de administración, gestión de empresas y configuración del sistema.",
        icon: <LayoutDashboard className="w-6 h-6" />,
        features: ["Gestión de empresas", "Panel de control", "Configuración global"],
        href: "/dashboard",
        accentColor: "text-slate-400",
        accentBg: "bg-slate-500/10",
      },
    ];
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0f]">
      {/* Sticky header */}
      <header className="sticky top-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-black text-white tracking-tight">
            Hubilee
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-white/40">
            <a href="#modulos" className="hover:text-white transition-colors duration-150">
              Módulos
            </a>
            <a href="#caracteristicas" className="hover:text-white transition-colors duration-150">
              Características
            </a>
          </nav>
          <AuthActions hasToken={false} />
        </div>
      </header>

      <main className="flex-grow">
        {/* Hero */}
        <Hero hasToken={false} />

        {/* Modules section */}
        <section id="modulos" className="py-24 px-4 bg-[#0a0a0f] relative">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-xs text-indigo-400 uppercase tracking-[0.2em] font-semibold mb-4 block">
                Plataforma modular
              </span>
              <h2 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
                Módulos integrados
              </h2>
              <p className="text-white/40 text-lg max-w-xl mx-auto">
                Una plataforma, múltiples soluciones para tu negocio
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {modules.map((mod) => (
                <ModuleCard
                  key={mod.title}
                  title={mod.title}
                  description={mod.description}
                  icon={mod.icon}
                  features={mod.features}
                  href={mod.href}
                  accentColor={mod.accentColor}
                  accentBg={mod.accentBg}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="caracteristicas">
          <FeaturesSection />
        </section>

        {/* Bottom CTA band */}
        <section className="py-24 px-4 bg-[#0a0a0f] relative">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          {/* Glow */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[600px] h-[300px] bg-indigo-600/10 rounded-full blur-[100px]" />
          </div>

          <div className="relative max-w-3xl mx-auto text-center">
            <h2 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight leading-tight">
              Lleva tu negocio al{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, #818cf8 0%, #a78bfa 50%, #6366f1 100%)",
                }}
              >
                siguiente nivel
              </span>
            </h2>
            <p className="text-white/40 text-lg mb-10 max-w-xl mx-auto">
              Únete a más de 500 empresas que ya gestionan sus operaciones con
              Hubilee.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-10 py-4 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 text-base"
            >
              Registrar empresa gratis
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
