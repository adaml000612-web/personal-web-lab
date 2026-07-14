"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type DayPlan = {
  id: string;
  date: string;
  label: string;
  accent: string;
  summary: string;
  items: Array<{
    time: string;
    title: string;
    duration?: string;
    route?: string;
    note: string;
    optional?: boolean;
  }>;
};

const purchases = [
  {
    id: "f1",
    tag: "限时展览",
    title: "F1® Exhibition Singapore",
    detail: "10月3日 · 11:00 入场",
    channel: "滨海湾花园官方活动页 → Ticketek Singapore",
    priority: "尽快购买",
  },
  {
    id: "oceanarium",
    tag: "分时门票",
    title: "Singapore Oceanarium 成人票",
    detail: "10月4日 · 10:00 入场",
    channel: "Singapore Oceanarium 官网 → Ticketing",
    priority: "场次开放后购买",
  },
  {
    id: "lounge",
    tag: "机场休息",
    title: "T3 Ambassador Transit Lounge",
    detail: "Refresh & Replenish：小憩房6小时＋休息室1小时＋淋浴",
    channel: "Harilela Hospitality 官网 → Transit Lounge Terminal 3",
    priority: "选择23:15或23:30",
  },
  {
    id: "insurance",
    tag: "出行保障",
    title: "境外旅行保险",
    detail: "覆盖境外医疗、航班延误和行李延误",
    channel: "国内正规保险平台",
    priority: "出发前完成",
  },
  {
    id: "esim",
    tag: "网络",
    title: "新加坡 eSIM / 流量包",
    detail: "覆盖10月2日至5日，落地自动联网",
    channel: "手机运营商或正规 eSIM 平台",
    priority: "出发前一周",
  },
];

const days: DayPlan[] = [
  {
    id: "day-1",
    date: "10.02",
    label: "抵达与滨海湾",
    accent: "FRI",
    summary: "樟宜机场 → 星耀樟宜 → 酒店 → Spectra → F1赛道夜走",
    items: [
      { time: "18:25", title: "SQ869 抵达新加坡", duration: "50–75分钟", note: "跟随 Arrival / Immigration，完成入境、取行李和海关。SG Arrival Card需在出发前完成。" },
      { time: "19:30", title: "星耀樟宜快速游览", duration: "约50分钟", route: "航站楼 → Jewel：T1约5–10分钟；T2/T3约8–15分钟", note: "先看雨漩涡和森林谷。若正好赶上20:00声光秀就看，赶不上不等待。" },
      { time: "20:20", title: "前往滨海宾乐雅", duration: "50–60分钟", route: "Changi Airport CG2 → Expo CG1/DT35 → Promenade DT15 → 步行8–12分钟", note: "使用地铁，不打车。到店后确认大床、延迟退房、免费升房和退房后寄存行李。" },
      { time: "21:40", title: "前往滨海湾金沙", duration: "15–20分钟", route: "Promenade DT15 → Bayfront DT16 → 跟随 Event Plaza 标识", note: "航班准点时争取赶上星期五22:00的Spectra水舞灯光秀。" },
      { time: "22:00", title: "Spectra 水舞灯光秀", duration: "15分钟", note: "免费观看。若错过22:00，直接开始夜间步行，不再等待。" },
      { time: "22:15", title: "滨海湾与F1路线夜走", duration: "约75分钟", route: "Event Plaza → 双螺旋桥 10分钟 → 摩天观景轮 15分钟 → F1 Pit外围 10分钟 → 酒店 15分钟", note: "比赛前一周可能已有围挡和临时改道，以现场开放道路为准，不强求完整走圈。" },
    ],
  },
  {
    id: "day-2",
    date: "10.03",
    label: "F1与演唱会",
    accent: "SAT",
    summary: "F1官方展览 → 午休 → 国家体育场 → The Weeknd",
    items: [
      { time: "08:30", title: "酒店附近早餐", duration: "约1小时", route: "步行前往 Marina Square 或 Suntec City", note: "不跨区移动，为上午展览保存体力。" },
      { time: "10:15", title: "前往F1官方展览", duration: "25–35分钟", route: "Promenade CC4 → Marina Bay TE20 → Gardens by the Bay TE22", note: "出站后跟随 MRT Plaza / Formula 1 Exhibition 标识，提前10分钟到场。" },
      { time: "11:00", title: "F1® Exhibition Singapore", duration: "约1.5小时", note: "经典赛车、车手装备、技术展项与模拟驾驶。模拟器若另外排队或收费，现场再决定。" },
      { time: "12:30", title: "返回酒店区域", duration: "25–35分钟", route: "Gardens by the Bay TE22 → Marina Bay → Promenade CC4", note: "Marina Square午餐后回房间休息、洗澡、充电。" },
      { time: "17:00", title: "前往国家体育场", duration: "20–30分钟", route: "Promenade CC4 → Nicoll Highway CC5 → Stadium CC6", note: "到Kallang Wave Mall吃饭，再按门票Gate号码选择Stadium站出口。" },
      { time: "20:00", title: "The Weeknd 演唱会", duration: "预计至22:30–23:00", note: "电子票提前截图或加入手机钱包。实际结束时间以现场为准。" },
      { time: "散场后", title: "直接返回酒店", duration: "40–60分钟", route: "Stadium CC6 → Promenade CC4 → 步行回酒店", note: "散场客流大，当晚不再安排克拉码头。" },
    ],
  },
  {
    id: "day-3",
    date: "10.04",
    label: "圣淘沙与机场",
    accent: "SUN",
    summary: "海洋生态馆 → 乌节路 → 克拉码头可选 → 超级树 → 樟宜T3",
    items: [
      { time: "08:00", title: "早餐、退房、寄存行李", duration: "约1小时", note: "09:00主动退房并把箱子寄存在礼宾部，保留寄存凭证。" },
      { time: "09:00", title: "前往海洋生态馆", duration: "50–60分钟", route: "Promenade DT15 → Chinatown DT19/NE4 → HarbourFront NE1 → VivoCity L3 → Sentosa Express → Resorts World", note: "圣淘沙捷运进岛S$4，现场刷Visa、Mastercard或EZ-Link即可。" },
      { time: "10:00", title: "Singapore Oceanarium", duration: "约3小时", note: "按馆内单向线路游览；13:00左右乘Sentosa Express返回VivoCity。" },
      { time: "13:15", title: "怡丰城午餐", duration: "约45分钟", note: "吃完从HarbourFront MRT继续前往乌节路。" },
      { time: "14:00", title: "前往乌节路", duration: "25–30分钟", route: "HarbourFront NE1 → Dhoby Ghaut NE6/NS24 → Orchard NS22", note: "主要逛ION Orchard、Ngee Ann City与Takashimaya，16:00必须收尾。" },
      { time: "16:00", title: "克拉码头 · 有精力再去", duration: "通勤25分钟＋停留45分钟", route: "Orchard NS22 → Dhoby Ghaut NS24/NE6 → Clarke Quay NE5", note: "仅在行程准点、天气正常且体力充足时执行。不乘船、不订餐厅，17:10离开。", optional: true },
      { time: "17:10", title: "返回酒店区域", duration: "25–30分钟", route: "Clarke Quay NE5 → Dhoby Ghaut NE6/CC1 → Esplanade CC3 → 步行回酒店", note: "若跳过克拉码头，直接从乌节路返回酒店，可多休息约1小时。" },
      { time: "18:35", title: "前往超级树", duration: "25–35分钟", route: "Promenade DT15 → Bayfront DT16 → 步行15–20分钟至 Supertree Grove", note: "19:30前找好观看位置。" },
      { time: "19:45", title: "Garden Rhapsody", duration: "15分钟", note: "免费观看。若雷雨暂停，不等20:45场，直接回酒店取行李。" },
      { time: "20:00", title: "返回酒店取行李", duration: "30–40分钟", route: "Supertree Grove → Bayfront DT16 → Promenade DT15 → 酒店", note: "最晚20:45从酒店出发。" },
      { time: "20:45", title: "前往樟宜机场", duration: "55–65分钟", route: "Promenade DT15 → Expo DT35/CG1 → Changi Airport CG2 → Jewel", note: "抵达后不要过出境检查，先前往雨漩涡中心区域。" },
      { time: "22:00", title: "雨漩涡声光秀", duration: "约10分钟", note: "看完立刻前往Jewel一层办理新加坡航空提前值机和行李托运。" },
      { time: "22:10", title: "提前值机、托运行李", duration: "约30分钟", route: "Jewel Level 1 Early Check-in Lounge", note: "确认SQ868仍从T3起飞。完成后步行到T3出发层并通过出境检查。" },
      { time: "23:15", title: "进入T3付费休息室", duration: "约7小时", route: "T3过境区 Level 3 · Transfer B 对面 · 电影院旁", note: "使用Refresh & Replenish套餐：小憩房6小时、休息室1小时及淋浴。设置两个闹钟。" },
    ],
  },
  {
    id: "day-4",
    date: "10.05",
    label: "返回厦门",
    accent: "MON",
    summary: "T3休息室 → 登机口 → SQ868 → 厦门",
    items: [
      { time: "05:15", title: "起床、洗漱、早餐", duration: "约1小时", note: "检查护照、登机牌、手机和充电宝，确认最终登机口。" },
      { time: "06:15", title: "离开休息室前往登机口", duration: "10–25分钟", route: "Ambassador Transit Lounge → T3航班屏幕 → SQ868登机口", note: "樟宜部分航班在登机口附近进行安检，最晚06:45到达登机口区域。" },
      { time: "07:50", title: "SQ868 起飞", duration: "4小时35分钟", route: "新加坡 T3 → 厦门 T3", note: "预计12:25抵达厦门。" },
    ],
  },
];

const places = {
  Airport: [103.9894, 1.3602],
  Hotel: [103.8576, 1.2918],
  MBS: [103.8593, 1.2849],
  "F1 Pit": [103.8649, 1.2918],
  "F1 Expo": [103.8688, 1.2804],
  Stadium: [103.8748, 1.3040],
  Oceanarium: [103.8205, 1.2580],
  Orchard: [103.8318, 1.3042],
  "Clarke Quay": [103.8465, 1.2906],
  Supertree: [103.8636, 1.2816],
} as const;

const mapRoutes: Array<Array<keyof typeof places>> = [
  ["Airport", "Hotel", "MBS", "F1 Pit", "Hotel"],
  ["Hotel", "F1 Expo", "Hotel", "Stadium", "Hotel"],
  ["Hotel", "Oceanarium", "Orchard", "Clarke Quay", "Hotel", "Supertree", "Hotel", "Airport"],
  ["Airport"],
];

function RouteCanvas({ active }: { active: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let frame = 0;
    let raf = 0;

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== rect.width * ratio || canvas.height !== rect.height * ratio) {
        canvas.width = rect.width * ratio;
        canvas.height = rect.height * ratio;
      }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);

      const glow = ctx.createRadialGradient(w * 0.72, h * 0.42, 10, w * 0.72, h * 0.42, w * 0.58);
      glow.addColorStop(0, "rgba(212,175,55,.10)");
      glow.addColorStop(1, "rgba(212,175,55,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(255,255,255,.045)";
      for (let x = 0; x < w; x += 34) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += 34) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

      const project = ([lon, lat]: readonly [number, number]) => ({
        x: 22 + ((lon - 103.80) / 0.205) * (w - 44),
        y: 20 + (1 - (lat - 1.245) / 0.14) * (h - 40),
      });
      const route = mapRoutes[active];
      const points = route.map((name) => ({ name, ...project(places[name]) }));
      const progress = Math.min(frame / 75, 1);

      ctx.beginPath();
      points.forEach((p, index) => index === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.strokeStyle = "rgba(212,175,55,.15)";
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();

      ctx.save();
      ctx.beginPath();
      points.forEach((p, index) => index === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.strokeStyle = "#d9b75d";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 7]);
      ctx.lineDashOffset = -frame * 0.35;
      ctx.globalAlpha = progress;
      ctx.stroke();
      ctx.restore();

      const unique = Array.from(new Map(points.map((point) => [point.name, point])).values());
      const labelOffset: Record<string, { dx: number; dy: number; align?: CanvasTextAlign }> = {
        Airport: { dx: -10, dy: -10, align: "right" },
        Hotel: { dx: -9, dy: -12, align: "right" },
        MBS: { dx: -8, dy: 17, align: "right" },
        "F1 Pit": { dx: 9, dy: -10 },
        "F1 Expo": { dx: 9, dy: 18 },
        Stadium: { dx: 9, dy: -10 },
        Oceanarium: { dx: 9, dy: -9 },
        Orchard: { dx: 9, dy: -12 },
        "Clarke Quay": { dx: -9, dy: 17, align: "right" },
        Supertree: { dx: 9, dy: 19 },
      };
      unique.forEach((p, index) => {
        const pulse = 3 + Math.sin(frame / 14 + index) * 1.2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, pulse + 6, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(217,183,93,.10)";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.4, 0, Math.PI * 2);
        ctx.fillStyle = "#f0d887";
        ctx.fill();
        const offset = labelOffset[p.name] || { dx: 8, dy: -7 };
        ctx.font = "600 9px system-ui";
        ctx.fillStyle = "rgba(255,255,255,.78)";
        ctx.textAlign = offset.align || "left";
        ctx.fillText(p.name, p.x + offset.dx, p.y + offset.dy);
        ctx.textAlign = "left";
      });

      frame += 1;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [active]);

  return <canvas className="route-canvas" ref={canvasRef} aria-label={`第${active + 1}天离线路线示意图`} />;
}

export default function Home() {
  const [activeMap, setActiveMap] = useState(0);
  const [done, setDone] = useState<string[]>([]);
  const [online, setOnline] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const completion = Math.round((done.length / purchases.length) * 100);

  useEffect(() => {
    const stored = localStorage.getItem("sg26-purchases");
    if (stored) setDone(JSON.parse(stored));
    setOnline(navigator.onLine);
    const onlineHandler = () => setOnline(navigator.onLine);
    const promptHandler = (event: Event) => { event.preventDefault(); setInstallPrompt(event); };
    const scrollHandler = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(max > 0 ? window.scrollY / max : 0);
    };
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("is-visible");
    }), { threshold: 0.08 });
    document.querySelectorAll("[data-reveal]").forEach((el) => observer.observe(el));
    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", onlineHandler);
    window.addEventListener("beforeinstallprompt", promptHandler);
    window.addEventListener("scroll", scrollHandler, { passive: true });
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js");
    return () => {
      observer.disconnect();
      window.removeEventListener("online", onlineHandler);
      window.removeEventListener("offline", onlineHandler);
      window.removeEventListener("beforeinstallprompt", promptHandler);
      window.removeEventListener("scroll", scrollHandler);
    };
  }, []);

  const togglePurchase = (id: string) => {
    const next = done.includes(id) ? done.filter((item) => item !== id) : [...done, id];
    setDone(next);
    localStorage.setItem("sg26-purchases", JSON.stringify(next));
  };

  const installApp = async () => {
    if (installPrompt && "prompt" in installPrompt) {
      await (installPrompt as Event & { prompt: () => Promise<void> }).prompt();
      return;
    }
    document.getElementById("offline-guide")?.scrollIntoView({ behavior: "smooth" });
  };

  const activeRouteNames = useMemo(() => Array.from(new Set(mapRoutes[activeMap])), [activeMap]);

  return (
    <main>
      <div className="scroll-progress" style={{ transform: `scaleX(${scrollProgress})` }} />
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="topbar">
        <a className="brand" href="#top" aria-label="返回顶部"><span>SG</span><b>26</b></a>
        <nav aria-label="页面导航">
          <a href="#buy">购买</a>
          <a href="#map">地图</a>
          <a href="#plan">行程</a>
        </nav>
        <button className="install-mini" onClick={installApp}>安装到手机</button>
      </header>

      <section className="hero" id="top">
        <div className="eyebrow"><span className={online ? "status-dot" : "status-dot offline"} />{online ? "在线 · 内容已支持离线缓存" : "离线模式 · 行程仍可查看"}</div>
        <div className="hero-grid">
          <div>
            <p className="kicker">SINGAPORE · 2026</p>
            <h1>狮城<br /><em>黄金周末</em></h1>
            <p className="hero-copy">一份为手机设计的黑金旅行手册。航班、酒店、购票、地铁线路和机场过夜，全部按时间顺序放进同一条轨道。</p>
            <div className="hero-actions">
              <a className="gold-button" href="#plan">查看完整路线</a>
              <button className="ghost-button" onClick={installApp}>离线保存</button>
            </div>
          </div>
          <div className="orbit-card" aria-hidden="true">
            <div className="orbit orbit-a" /><div className="orbit orbit-b" /><div className="orbit orbit-c" />
            <div className="orbit-core"><strong>72</strong><span>HOURS</span></div>
            <span className="orbit-label label-a">XMN</span><span className="orbit-label label-b">SIN</span><span className="orbit-label label-c">T3</span>
          </div>
        </div>
        <div className="trip-strip">
          <div><span>去程</span><strong>SQ869</strong><small>10.02 · 13:40—18:25</small></div>
          <div><span>主酒店</span><strong>PARKROYAL COLLECTION</strong><small>Marina Bay · 2 nights</small></div>
          <div><span>回程</span><strong>SQ868</strong><small>10.05 · 07:50—12:25</small></div>
        </div>
      </section>

      <section className="section hotel-section" data-reveal>
        <div className="section-number">01</div>
        <div className="section-heading"><p>STAY</p><h2>酒店信息</h2></div>
        <article className="hotel-card">
          <div className="hotel-monogram">PR</div>
          <div className="hotel-main">
            <p className="gold-label">PRIMARY HOTEL</p>
            <h3>PARKROYAL COLLECTION Marina Bay</h3>
            <p>10月2日入住 · 10月4日退房 · 2晚 · 保证大床房</p>
            <div className="hotel-meta"><span>15:00 入住</span><span>12:00 退房</span><span>Promenade / Esplanade</span></div>
            <aside>预订时询问客服延迟退房和免费升房，并备注10月2日预计21:00以后到店。</aside>
          </div>
          <div className="hotel-badge">CONFIRMED</div>
        </article>
      </section>

      <section className="section" id="buy" data-reveal>
        <div className="section-number">02</div>
        <div className="section-heading">
          <p>RESERVATIONS</p><h2>待购买清单</h2>
          <div className="completion"><span style={{ width: `${completion}%` }} /><b>{completion}%</b></div>
        </div>
        <div className="purchase-grid">
          {purchases.map((item) => {
            const checked = done.includes(item.id);
            return (
              <button key={item.id} className={`purchase-card ${checked ? "checked" : ""}`} onClick={() => togglePurchase(item.id)} aria-pressed={checked}>
                <span className="checkmark">{checked ? "✓" : ""}</span>
                <span className="purchase-tag">{item.tag}</span>
                <strong>{item.title}</strong>
                <small>{item.detail}</small>
                <div className="channel"><span>购票位置</span><b>{item.channel}</b></div>
                <em>{item.priority}</em>
              </button>
            );
          })}
        </div>
        <p className="micro-note">点击卡片即可标记完成，状态会保存在这台手机上。页面只标注官方购票位置，不会自动跳转离开。</p>
      </section>

      <section className="section map-section" id="map" data-reveal>
        <div className="section-number">03</div>
        <div className="section-heading"><p>OFFLINE ROUTE ATLAS</p><h2>离线路线地图</h2></div>
        <div className="map-shell">
          <div className="map-toolbar">
            {days.map((day, index) => <button key={day.id} className={activeMap === index ? "active" : ""} onClick={() => setActiveMap(index)}><span>{day.date}</span>{day.label}</button>)}
          </div>
          <div className="map-canvas-wrap">
            <RouteCanvas active={activeMap} />
            <div className="map-stamp"><span>ROUTE</span><strong>0{activeMap + 1}</strong></div>
          </div>
          <div className="route-legend">
            {activeRouteNames.map((name, index) => <div key={name}><span>{String(index + 1).padStart(2, "0")}</span><b>{name}</b></div>)}
          </div>
          <p className="map-caption">地图按真实地理相对位置绘制，可离线查看；精确站口和临时封路仍以当天Google Maps、MyTransport.SG及现场标识为准。</p>
        </div>
      </section>

      <section className="section plan-section" id="plan">
        <div className="section-number">04</div>
        <div className="section-heading"><p>THE JOURNEY</p><h2>逐步执行路线</h2></div>
        {days.map((day, dayIndex) => (
          <article className="day-block" id={day.id} key={day.id} data-reveal>
            <header className="day-header">
              <div className="date-lockup"><span>{day.accent}</span><strong>{day.date}</strong></div>
              <div><h3>{day.label}</h3><p>{day.summary}</p></div>
              <button onClick={() => { setActiveMap(dayIndex); document.getElementById("map")?.scrollIntoView({ behavior: "smooth" }); }}>地图定位</button>
            </header>
            <div className="timeline">
              {day.items.map((item, index) => (
                <div className={`timeline-item ${item.optional ? "optional" : ""}`} key={`${item.time}-${item.title}`}>
                  <div className="time"><span>{item.time}</span><i>{index + 1}</i></div>
                  <div className="event-card">
                    <div className="event-title"><h4>{item.title}</h4>{item.duration && <em>{item.duration}</em>}{item.optional && <b>有精力再去</b>}</div>
                    {item.route && <div className="route-line"><span>线路</span>{item.route}</div>}
                    <p>{item.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="section rules" data-reveal>
        <div className="section-number">05</div>
        <div className="section-heading"><p>DECISION RULES</p><h2>当天取舍原则</h2></div>
        <div className="rules-grid">
          <div><span>01</span><p>第一晚错过22:00 Spectra，直接夜走，不再等待。</p></div>
          <div><span>02</span><p>演唱会结束后直接回酒店，克拉码头不放在散场后。</p></div>
          <div><span>03</span><p>海洋馆或乌节路超时，第一项取消克拉码头。</p></div>
          <div><span>04</span><p>10月4日最晚20:45从酒店出发去机场。</p></div>
          <div><span>05</span><p>超级树因雷雨暂停，不等下一场，直接取行李。</p></div>
          <div><span>06</span><p>T3休息结束时间不晚于06:20，最晚06:45到登机口。</p></div>
        </div>
      </section>

      <section className="section offline-guide" id="offline-guide" data-reveal>
        <div>
          <p className="gold-label">KEEP IT WITH YOU</p>
          <h2>安装到手机，离线也能看</h2>
          <p>Android / Chrome：浏览器菜单选择“添加到主屏幕”或“安装应用”。iPhone / Safari：点击分享按钮，选择“添加到主屏幕”。首次安装前请完整打开一次地图和全部行程。</p>
        </div>
        <button className="gold-button" onClick={installApp}>安装旅行助手</button>
      </section>

      <footer>
        <div className="brand"><span>SG</span><b>26</b></div>
        <p>厦门 ⇄ 新加坡 · 2026.10.02—10.05</p>
        <small>路线时间为正常交通估算；天气、临时封路、场馆公告与航班信息以当天为准。</small>
      </footer>

      <nav className="mobile-nav" aria-label="手机快捷导航">
        <a href="#top"><span>⌂</span>首页</a><a href="#buy"><span>✓</span>购买</a><a href="#map"><span>◇</span>地图</a><a href="#plan"><span>≡</span>行程</a>
      </nav>
    </main>
  );
}
