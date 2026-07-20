import { CalendarClock, ClipboardList, UserCircle, Users } from "lucide-react";

const features = [
  {
    icon: CalendarClock,
    title: "Turnos y calendarios",
    description:
      "Planifica equipos y franjas con reglas claras. Menos reprocesos y mensajes sueltos.",
    accent: "text-sky-400",
    accentBg: "bg-sky-500/10",
  },
  {
    icon: ClipboardList,
    title: "Asistencia con trazabilidad",
    description:
      "Registros visibles para RRHH y líderes. Lo que pasa en tienda queda documentado.",
    accent: "text-indigo-400",
    accentBg: "bg-indigo-500/10",
  },
  {
    icon: Users,
    title: "Empleados en un solo lugar",
    description:
      "Datos laborales y permisos alineados a tu organización.",
    accent: "text-violet-400",
    accentBg: "bg-violet-500/10",
  },
  {
    icon: UserCircle,
    title: "Roles que respetan el negocio",
    description:
      "Quién ve qué, por tienda o área. Menos riesgo cuando el equipo crece.",
    accent: "text-emerald-400",
    accentBg: "bg-emerald-500/10",
  },
];

export function HrProductFeatures() {
  return (
    <section className="py-24 px-4 bg-[#0a0a0f] relative">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs text-sky-400 uppercase tracking-[0.2em] font-semibold mb-4 block">
            Hr
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
            RRHH operativo, no solo carpetas
          </h2>
          <p className="text-white/40 text-lg max-w-xl mx-auto">
            Turnos, asistencia y personas en un módulo pensado para operar cada día.
          </p>
        </div>
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
                <h3 className="text-base font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}