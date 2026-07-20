import Link from "next/link";
import { ShoppingCart, Users, Wrench, LayoutDashboard, ArrowRight } from "lucide-react";
import { getLandingUrls, getHubRegisterUrl } from "@/lib/landingUrls";
import { HubHero } from "@/components/landing/HubHero";
import { ModuleCard } from "@/components/landing/ModuleCard";
import { TechservicesProductFeatures } from "@/components/landing/TechservicesProductFeatures";
import { LandingFooter } from "@/components/landing/LandingFooter";

export function LandingHome() {
  const urls = getLandingUrls();
  const registerUrl = getHubRegisterUrl();

  const modules = [
    {
      title: "ShopFlow POS",
      description: "Ventas e inventario en tienda.",
      icon: <ShoppingCart className="w-6 h-6" />,
      features: ["POS", "Stock", "Reportes"],
      href: urls.shopflow,
      accentColor: "text-violet-400",
      accentBg: "bg-violet-500/10",
    },
    {
      title: "Workify",
      description: "RRHH, turnos y asistencia.",
      icon: <Users className="w-6 h-6" />,
      features: ["Turnos", "Asistencia", "Empleados"],
      href: urls.workify,
      accentColor: "text-sky-400",
      accentBg: "bg-sky-500/10",
    },
    {
      title: "Tech Services",
      description: "Órdenes, activos y visitas. Estás en servicio técnico.",
      icon: <Wrench className="w-6 h-6" />,
      features: ["Órdenes", "Activos", "Visitas"],
      href: urls.techservices,
      accentColor: "text-amber-400",
      accentBg: "bg-amber-500/10",
    },
    {
      title: "Hub Central",
      description: "Administración de empresa y módulos.",
      icon: <LayoutDashboard className="w-6 h-6" />,
      features: ["Empresa", "Miembros", "Configuración"],
      href: urls.hub + "/dashboard",
      accentColor: "text-slate-400",
      accentBg: "bg-slate-500/10",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0f]">
      <header className="sticky top-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-black text-white tracking-tight">
            Tech Services
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-white/40">
            <a href="#producto" className="hover:text-white transition-colors duration-150">
              Producto
            </a>
            <a href="#caracteristicas" className="hover:text-white transition-colors duration-150">
              Características
            </a>
            <a href="#ecosistema" className="hover:text-white transition-colors duration-150">
              Ecosistema
            </a>
          </nav>
          <Link
            href="/login"
            className="inline-flex items-center text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30"
          >
            Iniciar sesión
          </Link>
        </div>
      </header>

      <main className="flex-grow">
        <div id="producto">
          <HubHero
            badge="Tech Services"
            titleBefore="De la orden"
            titleGradient="a la visita cerrada"
            description="Gestiona órdenes de trabajo, activos y desplazamientos con el contexto que tu técnico necesita en campo — sin perder el hilo en el taller."
            registerTo={registerUrl}
            loginTo="/login"
          />
        </div>

        <section id="caracteristicas">
          <TechservicesProductFeatures />
        </section>

        <section id="ecosistema" className="py-24 px-4 bg-[#0a0a0f] relative">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-xs text-indigo-400 uppercase tracking-[0.2em] font-semibold mb-4 block">
                Ecosistema Hubilee
              </span>
              <h2 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
                Campo y taller, conectados al resto
              </h2>
              <p className="text-white/40 text-lg max-w-xl mx-auto">
                Mismo acceso empresarial que el Hub; suma POS o RRHH cuando tu operación lo requiera.
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

        <section className="py-24 px-4 bg-[#0a0a0f] relative">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[600px] h-[300px] bg-indigo-600/10 rounded-full blur-[100px]" />
          </div>

          <div className="relative max-w-3xl mx-auto text-center">
            <h2 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight leading-tight">
              Registro de empresa en el{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, #818cf8 0%, #a78bfa 50%, #6366f1 100%)",
                }}
              >
                Hub Hubilee
              </span>
            </h2>
            <p className="text-white/40 text-lg mb-10 max-w-xl mx-auto">
              Las cuentas nuevas se crean en el Hub; luego activas Tech Services y el resto de módulos según tu plan.
            </p>
            <Link
              href={registerUrl}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-10 py-4 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 text-base"
            >
              Registrar empresa
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>

      <LandingFooter
        urls={urls}
        registerHref={registerUrl}
        moduleName="Tech Services"
        moduleDescription="Órdenes de trabajo, activos y visitas técnicas para equipos de campo y taller."
      />
    </div>
  );
}