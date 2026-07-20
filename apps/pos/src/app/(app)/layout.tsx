import ProtectedAppLayout from "./ProtectedAppLayout";

export const dynamic = "force-dynamic";

export default function AppRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedAppLayout>{children}</ProtectedAppLayout>;
}
