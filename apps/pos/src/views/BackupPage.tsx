"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@hubilee/ui";
import { CreateBackupButton } from "@/components/features/backup/CreateBackupButton";
import { RestoreBackupDialog } from "@/components/features/backup/RestoreBackupDialog";
import { BackupList } from "@/components/features/backup/BackupList";
import { PageFrame } from "@/views/PageFrame";

export function BackupPage() {
  return (
    <PageFrame
      title="Copias de Seguridad"
      breadcrumbs={[
        { label: "Panel", href: "/dashboard" },
        { label: "Copias de seguridad" },
      ]}
    >
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Gestion de backups</CardTitle>
            <CardDescription>
              Si el backend no expone `/api/pos/backup/*`, esta pagina mostrara errores de API.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <CreateBackupButton />
            <RestoreBackupDialog />
          </CardContent>
        </Card>
        <BackupList />
      </div>
    </PageFrame>
  );
}
