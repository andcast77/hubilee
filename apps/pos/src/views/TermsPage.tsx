"use client";

import { Link } from "@/lib/next-nav";
import { Button, Card, CardContent } from "@hubilee/ui";

export function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <Card className="mx-auto max-w-3xl">
        <CardContent className="space-y-4 p-6">
          <h1 className="text-2xl font-bold">Terminos y condiciones</h1>
          <p className="text-sm text-slate-600">Uso del servicio, seguridad de cuenta y tratamiento de datos de Pos.</p>
          <p className="text-sm text-slate-600">Esta pagina se restauro en la migracion para mantener el flujo de registro.</p>
          <div className="flex gap-2">
            <Link to="/register"><Button>Volver al registro</Button></Link>
            <Link to="/"><Button variant="outline">Inicio</Button></Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
