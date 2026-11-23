import Panel from "./Panel";
import Login from "./Login";
import { getAuth, getRole } from "@/lib/auth";
import { getProducts, getSite } from "@/lib/data";
import { VAPID_PUBLIC } from "@/lib/push";
import { addDays, isValidDate, todayStr } from "@/lib/time";

export const dynamic = "force-dynamic";
export const metadata = { title: "Panel", robots: { index: false, follow: false }, manifest: "/panel/manifest.webmanifest" };

export default async function PanelPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const [role, auth] = await Promise.all([getRole(), getAuth()]);
  if (!role) return <Login first={!auth} />;
  const [{ config, courts }, products, sp] = await Promise.all([getSite(), getProducts(), searchParams]);
  const today = todayStr();
  // ?d=AAAA-MM-DD abre la agenda en ese día (lo usan las notificaciones)
  const initialDate = isValidDate(sp.d) && sp.d >= addDays(today, -60) && sp.d <= addDays(today, 90) ? sp.d : today;
  const admin = role === "admin";
  return (
    <>
      {/* Guarda el ofrecimiento de "instalar app" del navegador por si llega antes de que cargue el panel */}
      <script dangerouslySetInnerHTML={{ __html: "window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__m10Install=e});" }} />
      <Panel
      initialConfig={config}
      initialCourts={courts}
      initialProducts={products}
      today={today}
      initialDate={initialDate}
      role={role}
      hasStaff={admin && !!auth?.staff}
      vapidKey={VAPID_PUBLIC}
      />
    </>
  );
}
