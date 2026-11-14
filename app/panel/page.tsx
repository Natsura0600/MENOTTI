import Panel from "./Panel";
import Login from "./Login";
import { getAuth, isAdmin } from "@/lib/auth";
import { getSite } from "@/lib/data";
import { todayStr } from "@/lib/time";

export const dynamic = "force-dynamic";
export const metadata = { title: "Panel · M10", robots: { index: false } };

export default async function PanelPage() {
  if (!(await isAdmin())) return <Login first={!(await getAuth())} />;
  const { config, courts } = await getSite();
  return <Panel initialConfig={config} initialCourts={courts} today={todayStr()} />;
}
