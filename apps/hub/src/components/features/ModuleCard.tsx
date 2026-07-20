"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge } from "@hubilee/ui";
import { LucideIcon, ArrowRight } from "lucide-react";

type ModuleCardProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  enabled: boolean;
  color: string;
};

export function ModuleCard({ title, description, icon: Icon, href, enabled, color }: ModuleCardProps) {
  if (!enabled) {
    return (
      <Card className="opacity-50 cursor-not-allowed">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className={`p-2 rounded-lg bg-${color}-100`}>
              <Icon className={`h-6 w-6 text-${color}-600`} />
            </div>
            <Badge variant="secondary">Desactivado</Badge>
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Link href={href} className="block transition-transform hover:scale-105">
      <Card className="h-full hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className={`p-2 rounded-lg bg-${color}-100`}>
              <Icon className={`h-6 w-6 text-${color}-600`} />
            </div>
            <Badge variant="default" className="bg-green-600">Activo</Badge>
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center text-sm font-medium text-indigo-600">
            Abrir módulo
            <ArrowRight className="ml-1 h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
