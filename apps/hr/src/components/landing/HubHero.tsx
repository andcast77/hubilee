import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";

export type HubHeroProps = {
  badge: string;
  titleBefore: string;
  titleGradient: string;
  description: string;
  registerTo: string;
  loginTo: string;
};

export function HubHero({
  badge,
  titleBefore,
  titleGradient,
  description,
  registerTo,
  loginTo,
}: HubHeroProps) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0a0a0f] px-4">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(rgba(99,102,241,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.15) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-violet-600/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-blue-600/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="relative z-10 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 backdrop-blur px-4 py-2 rounded-full mb-8 text-sm text-indigo-300 font-medium">
          <Zap className="w-3.5 h-3.5" />
          {badge}
        </div>
        <h1 className="text-6xl md:text-8xl font-black mb-6 leading-[1.05] tracking-tight text-white">
          {titleBefore}{" "}
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(135deg, #818cf8 0%, #a78bfa 50%, #6366f1 100%)",
            }}
          >
            {titleGradient}
          </span>
        </h1>
        <p className="text-lg md:text-xl text-white/50 mb-10 max-w-2xl mx-auto leading-relaxed">{description}</p>
        <div className="flex items-center justify-center gap-4 flex-wrap mb-20">
          <Link
            href={registerTo}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5"
          >
            Crear cuenta
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href={loginTo}
            className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/80 hover:text-white font-semibold px-8 py-3.5 rounded-xl transition-all duration-200"
          >
            Iniciar sesión
          </Link>
        </div>
        <div className="flex items-center justify-center gap-12 flex-wrap pt-8 border-t border-white/5">
          <div className="text-center">
            <div className="text-3xl font-black text-white mb-1">500+</div>
            <div className="text-xs text-white/40 uppercase tracking-widest font-medium">Empresas activas</div>
          </div>
          <div className="w-px h-10 bg-white/10 hidden md:block" />
          <div className="text-center">
            <div className="text-3xl font-black text-white mb-1">50k+</div>
            <div className="text-xs text-white/40 uppercase tracking-widest font-medium">Usuarios</div>
          </div>
          <div className="w-px h-10 bg-white/10 hidden md:block" />
          <div className="text-center">
            <div className="text-3xl font-black text-white mb-1">99.9%</div>
            <div className="text-xs text-white/40 uppercase tracking-widest font-medium">Uptime garantizado</div>
          </div>
        </div>
      </div>
    </section>
  );
}
