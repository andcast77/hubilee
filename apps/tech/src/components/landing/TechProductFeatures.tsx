import { ClipboardList, MapPin, Package, Wrench } from "lucide-react";

const features = [
  {
    icon: ClipboardList,
    title: "Órdenes con seguimiento",
    description:
      "Desde la solicitud hasta el cierre: estados, notas y responsables visibles para el equipo técnico.",
    accent: "text-amber-400",
    accentBg: "bg-amber-500/10",
  },
  {
    icon: Package,
    title: "Activos bajo control",
    description:
      "Inventario técnico y equipos con historial: qué hay en campo y qué les pasó.",
    accent: "text-orange-400",
    accentBg: "bg-orange-500/10",
  },
  {
    icon: MapPin,
    title: "Visitas coordinadas",
    description:
      "Agenda y desplazamiento con contexto: menos idas en vano y más claridad para el cliente.",
    accent: "text-sky-400",
    accentBg: "bg-sky-500/10",
  },
  {
    icon: Wrench,
    title: "Servicio con estándar",
    description:
      "Criterios repetibles para que cada visita entregue el mismo nivel de calidad.",
    accent: "text-indigo-400",
    accentBg: "bg-indigo-500/10",
  },
];

export function TechProductFeatures() {
  return (
    <section className="py-24 px-4 bg-[#0a0a0f] relative">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs text-amber-400 uppercase tracking-[0.2em] font-semibold mb-4 block">
            Tech Services
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
            Servicio técnico con trazabilidad de punta a punta
          </h2>
          <p className="text-white/40 text-lg max-w-xl mx-auto">
            Órdenes, activos y visitas pensados para equipos de campo, no como anexo de una planilla.
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