import { requireAdminApi } from "../../../admin-guard";
import { getAdminOverview, publicDefaultAiConfig } from "../../../../server/admin-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guarded = requireAdminApi(request);
  if ("response" in guarded) return guarded.response;
  try {
    const [overview, model] = await Promise.all([
      getAdminOverview(),
      publicDefaultAiConfig(),
    ]);
    return Response.json(
      { overview, model },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json({ error: "后台数据暂时不可用" }, { status: 503 });
  }
}
