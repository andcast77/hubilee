import { BarChart3, Package, ScanLine, Store } from "lucide-react";

const features = [
  {
    icon: ScanLine,
    title: "Cobro en segundos",
    description:
      "Pantalla de venta pensada para filas reales: búsqueda rápida, descuentos y medios de pago sin fricción.",
    accent: "text-violet-400",
    accentBg: "bg-violet-500/10",
  },
  {
    icon: Package,
    title: "Stock que cuadra",
    description:
      "Productos, variantes y alertas de inventario para que lo que vendes coincida con lo que tienes.",
    accent: "text-indigo-400",
    accentBg: "bg-indigo-500/10",
  },
  {
    icon: BarChart3,
    title: "Ventas con contexto",
    description:
      "Reportes de ventas y márgenes para ver qué mueve tu negocio hoy, no el mes pasado.",
    accent: "text-sky-400",
    accentBg: "bg-sky-500/10",
  },
  {
    icon: Store,
    title: "Tu operación, centralizada",
    description:
      "Clientes, categorías y caja en un solo flujo. Menos hojas, menos errores en el mostrador.",
    accent: "text-amber-400",
    accentBg: "bg-amber-500/10",
  },
];

export function PosProductFeatures() {
  return (
    <section className="py-24 px-4 bg-[#0a0a0f] relative">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs text-violet-400 uppercase tracking-[0.2em] font-semibold mb-4 block">
            POS POS
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
            Hecho para vender y controlar inventario
          </h2>
          <p className="text-white/40 text-lg max-w-xl mx-auto">
            Estas capacidades son el núcleo del módulo; el resto de la suite se conecta cuando tu empresa crece.
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