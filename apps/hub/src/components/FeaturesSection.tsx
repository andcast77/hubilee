import { BarChart3, Lock, Zap, Users } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Velocidad operativa",
    description:
      "Automatiza procesos repetitivos y reduce tiempos de operación. Interfaz diseñada para cero fricción.",
    accent: "text-amber-400",
    accentBg: "bg-amber-500/10",
  },
  {
    icon: Users,
    title: "Colaboración total",
    description:
      "Equipos sincronizados en tiempo real. Roles granulares y permisos precisos por módulo.",
    accent: "text-sky-400",
    accentBg: "bg-sky-500/10",
  },
  {
    icon: BarChart3,
    title: "Datos en tiempo real",
    description:
      "Dashboards con métricas que se actualizan al instante. Toma decisiones con información concreta.",
    accent: "text-indigo-400",
    accentBg: "bg-indigo-500/10",
  },
  {
    icon: Lock,
    title: "Seguridad empresarial",
    description:
      "Encriptación de nivel bancario y cumplimiento con estándares internacionales de seguridad.",
    accent: "text-violet-400",
    accentBg: "bg-violet-500/10",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-24 px-4 bg-[#0a0a0f] relative">
      {/* Subtle top border */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="max-w-6xl mx-auto">
        {/* Section label */}
        <div className="text-center mb-16">
          <span className="text-xs text-indigo-400 uppercase tracking-[0.2em] font-semibold mb-4 block">
            Por qué Hubilee
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
            Todo lo que necesitas
          </h2>
          <p className="text-white/40 text-lg max-w-xl mx-auto">
            Características diseñadas para impulsar el crecimiento de tu negocio
          </p>
        </div>

        {/* Feature cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group p-6 rounded-2xl bg-white/[0.03] border border-white/[0.07] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-300 hover:-translate-y-1"
              >
                <div
                  className={`inline-flex p-3 rounded-xl mb-4 ${feature.accentBg} transition-transform duration-300 group-hover:scale-110`}
                >
                  <Icon className={`w-5 h-5 ${feature.accent}`} />
                </div>
                <h3 className="text-base font-bold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-white/40 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
