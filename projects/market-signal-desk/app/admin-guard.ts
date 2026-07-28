const LOCAL_ADMIN = "local-preview@frontier.invalid";

function configuredAdminEmail() {
  return process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? "";
}

export function isLocalAdminHost(host: string | null) {
  return process.env.NODE_ENV !== "production"
    && Boolean(host?.startsWith("localhost:") || host?.startsWith("127.0.0.1:") || host?.startsWith("[::1]:"));
}

export function requireAdminApi(request: Request, mutation = false) {
  const url = new URL(request.url);
  const host = request.headers.get("host");
  const local = isLocalAdminHost(host);
  const email = local
    ? LOCAL_ADMIN
    : request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase() ?? "";
  const allowed = local ? LOCAL_ADMIN : configuredAdminEmail();

  if (!allowed || email !== allowed) {
    return { response: Response.json({ error: "Not found" }, { status: 404 }) };
  }
  if (mutation) {
    const origin = request.headers.get("origin");
    if (origin !== url.origin || request.headers.get("x-admin-action") !== "frontier-admin") {
      return { response: Response.json({ error: "请求来源无效" }, { status: 403 }) };
    }
  }
  return { email };
}
