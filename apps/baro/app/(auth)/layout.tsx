import './auth-globals.css'

export default function AuthRouteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="shopflow-auth-shell min-h-screen">{children}</div>
}
