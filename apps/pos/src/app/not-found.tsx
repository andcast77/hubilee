import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-6">
      <p className="text-slate-600">Página no encontrada.</p>
      <Link href="/" className="text-indigo-600 hover:underline">
        Volver al inicio
      </Link>
    </div>
  );
}
