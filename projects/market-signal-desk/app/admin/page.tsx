import type { Metadata } from "next";
import { requireAdminPage } from "../admin-auth";
import { chatGPTSignOutPath } from "../chatgpt-auth";
import { AdminConsole } from "./admin-console";
import { getAdminOverview, publicDefaultAiConfig } from "../../server/admin-store";
import "./admin.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "前哨管理台",
  description: "前哨网站的私有运行与模型管理后台。",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const user = await requireAdminPage();
  const [overview, model] = await Promise.all([
    getAdminOverview(),
    publicDefaultAiConfig(),
  ]);
  return (
    <AdminConsole
      administrator={user.displayName}
      signOutPath={user.email.endsWith("@frontier.invalid") ? null : chatGPTSignOutPath("/")}
      initialData={{ overview, model }}
    />
  );
}
