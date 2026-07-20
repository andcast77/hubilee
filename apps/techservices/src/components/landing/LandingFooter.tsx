import Link from "next/link";
import type { LandingUrls } from "@/lib/landingUrls";

type Props = {
  urls: LandingUrls;
  registerHref?: string;
  moduleName: string;
  moduleDescription: string;
};

export function LandingFooter({ urls, registerHref = "/register", moduleName, moduleDescription }: Props) {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="bg-[#0a0a0f] border-t border-white/[0.06]">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row justify-between gap-10">
          <div className="max-w-xs">
            <span className="text-lg font-black text-white tracking-tight block mb-3">{moduleName}</span>
            <p className="text-sm text-white/30 leading-relaxed">{moduleDescription}</p>
            <p className="text-xs text-white/20 mt-3">Mismo login empresarial que el Hub; otros módulos según tu contratación.</p>
          </div>
          <div className="flex gap-16">
            <div>
              <h4 className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-4">Módulos</h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <a href={urls.hub} className="text-white/40 hover:text-white transition-colors duration-150" target="_blank" rel="noopener noreferrer">Hub</a>
                </li>
                <li>
                  <a href={urls.pos} className="text-white/40 hover:text-white transition-colors duration-150" target="_blank" rel="noopener noreferrer">POS</a>
                </li>
                <li>
                  <a href={urls.workify} className="text-white/40 hover:text-white transition-colors duration-150" target="_blank" rel="noopener noreferrer">Workify</a>
                </li>
                <li>
                  <a href={urls.techservices} className="text-white/40 hover:text-white transition-colors duration-150" target="_blank" rel="noopener noreferrer">Servicios Técnicos</a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-4">Cuenta</h4>
              <ul className="space-y-2.5 text-sm">
                <li><Link href="/login" className="text-white/40 hover:text-white transition-colors duration-150">Iniciar sesión</Link></li>
                <li><Link href={registerHref} className="text-white/40 hover:text-white transition-colors duration-150">Crear cuenta</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-white/[0.05] flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-xs text-white/20">© {currentYear} {moduleName} · Hubilee</p>
          <div className="flex gap-5 text-xs text-white/20">
            <Link href="/terms" className="hover:text-white/50 transition-colors">Términos</Link>
            <a href="#" className="hover:text-white/50 transition-colors">Privacidad</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
