import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { requireChatGPTUser } from "./chatgpt-auth";
import { isLocalAdminHost } from "./admin-guard";

function configuredAdminEmail() {
  return process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? "";
}

export async function requireAdminPage() {
  const requestHeaders = await headers();
  if (isLocalAdminHost(requestHeaders.get("host"))) {
    return { email: "local-preview@frontier.invalid", displayName: "本地管理员", fullName: "本地管理员" };
  }

  const user = await requireChatGPTUser("/admin");
  const allowed = configuredAdminEmail();
  if (!allowed || user.email.trim().toLowerCase() !== allowed) notFound();
  return user;
}
