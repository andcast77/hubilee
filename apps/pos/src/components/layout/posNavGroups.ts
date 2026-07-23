import {
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  Wallet,
  Package,
  Users,
  Warehouse,
  Truck,
  UserCog,
  Settings,
  HardDrive,
  BarChart,
  Tags,
} from "lucide-react";
import type { ComponentProps } from "react";
import { Sidebar as SidebarComponent } from "@hubilee/ui";
import { Module } from "@/lib/permissions";

type SidebarProps = ComponentProps<typeof SidebarComponent>;

/** Shared Pos `/app/*` nav — used by desktop Sidebar and mobile overlay drawer. */
export const posNavGroups: SidebarProps["navGroups"] = [
  {
    title: "Principal",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Punto de Venta", href: "/pos", icon: ShoppingCart, module: Module.SALES },
      { title: "Pedidos (Vendedor)", href: "/pos-vendedor", icon: ClipboardList, module: Module.SALES },
      { title: "Caja", href: "/caja", icon: Wallet, module: Module.SALES },
    ],
  },
  {
    title: "Gestión",
    items: [
      { title: "Productos", href: "/products", icon: Package, module: Module.PRODUCTS },
      { title: "Categorías", href: "/categories", icon: Tags, module: Module.CATEGORIES },
      { title: "Inventario", href: "/inventory", icon: Warehouse, module: Module.INVENTORY },
      { title: "Reportes", href: "/reports", icon: BarChart, module: Module.REPORTS },
    ],
  },
  {
    title: "Administración",
    items: [
      { title: "Clientes", href: "/customers", icon: Users, module: Module.CUSTOMERS },
      { title: "Proveedores", href: "/suppliers", icon: Truck, module: Module.SUPPLIERS },
      { title: "Usuarios", href: "/admin/users", icon: UserCog, module: Module.USERS },
      { title: "Configuración", href: "/admin/settings", icon: Settings, module: Module.STORE_CONFIG },
    ],
  },
  {
    title: "Avanzado",
    items: [
      {
        title: "Copias de Seguridad",
        href: "/admin/backup",
        icon: HardDrive,
        module: Module.STORE_CONFIG,
      },
    ],
  },
];
