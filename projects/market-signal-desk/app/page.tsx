import type { Metadata } from "next";
import { MarketDashboard } from "./market-dashboard";

export const metadata: Metadata = {
  title: "前哨 · 投资情报雷达",
  description: "聚合 A 股、港股、美股关注标的与关键指数，按与你的关系远近整理市场信息。",
};

export default function Home() {
  return <MarketDashboard />;
}
