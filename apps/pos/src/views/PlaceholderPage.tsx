"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@hubilee/ui";
import { PageFrame } from "@/views/PageFrame";

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <PageFrame title={title}>
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-slate-600">
          Esta vista esta en proceso de migracion a Next/API unificada.
        </CardContent>
      </Card>
    </PageFrame>
  );
}
