"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type TransitTone = "walk" | "ewl" | "dtl" | "ccl" | "tel" | "nel" | "nsl" | "sentosa" | "airport";

type TransitStep = {
  tone: TransitTone;
  badge: string;
  title: string;
  detail: string;
};

type TransitGuide = {
  steps: TransitStep[];
  caution?: string;
};

const transitStep = (tone: TransitTone, badge: string, title: string, detail: string): TransitStep => ({ tone, badge, title, detail });

type DayPlan = {
  id: string;
  date: string;
  label: string;
  accent: string;
  summary: string;
  rules: string[];
  items: Array<{
    time: string;
    title: string;
    duration?: string;
    transit?: TransitGuide;
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
    rules: ["错过22:00的Spectra就直接开始滨海湾与F1路线夜走，不再原地等待。"],
    items: [
      { time: "18:25", title: "SQ869 抵达新加坡", duration: "50–75分钟", note: "跟随 Arrival / Immigration，完成入境、取行李和海关。SG Arrival Card需在出发前完成。" },
      { time: "19:30", title: "星耀樟宜快速游览", duration: "约50分钟", transit: { steps: [
        transitStep("airport", "入境", "先完成入境和取行李", "跟随 Arrival / Immigration，不要跟着 Transfer 转机标识走。"),
        transitStep("walk", "JEWEL", "跟随 Jewel / Rain Vortex 标识", "T1可直接步行进入；T2/T3通过连接通道或免费Skytrain前往，约8–15分钟。"),
      ], caution: "星耀樟宜在公共区域，必须先入境；不要先过出境安检。" }, note: "先看雨漩涡和森林谷。若正好赶上20:00声光秀就看，赶不上不等待。" },
      { time: "20:20", title: "前往滨海宾乐雅", duration: "60–70分钟", transit: { steps: [
        transitStep("walk", "进站", "找到机场地铁站", "跟随 Train to City / MRT 标识进入 Changi Airport 樟宜机场站 CG2。"),
        transitStep("ewl", "绿线 CG", "机场支线 · 往 Tanah Merah", "Changi Airport CG2 → Expo 博览 CG1，坐1站后下车。"),
        transitStep("walk", "换乘", "在 Expo 必须换蓝线", "下车后只跟随蓝色 Downtown Line / DT 标识，前往 DT35 站台。"),
        transitStep("dtl", "蓝线 DT", "市区线 · 往 Bukit Panjang", "Expo DT35 → Promenade 宝门廊 DT15，共20站。"),
        transitStep("walk", "换乘", "在 Promenade 换黄色环线", "选择站台屏幕显示下一站 Esplanade CC3、终点 Dhoby Ghaut 的列车。"),
        transitStep("ccl", "黄线 CC", "Promenade CC4 → Esplanade CC3", "只坐1站；从 Esplanade Exit B 出站，步行约5分钟到酒店。"),
      ], caution: "Promenade 的黄色环线方向较多：只有屏幕显示“下一站 Esplanade”的车才正确；看到 Bayfront 或 Nicoll Highway 不要上。" }, note: "使用地铁，不打车。到店后确认大床、延迟退房、免费升房和退房后寄存行李。" },
      { time: "21:40", title: "前往滨海湾金沙", duration: "15–20分钟", transit: { steps: [
        transitStep("walk", "步行", "酒店 → Promenade DT15", "穿过 Marina Square / Millenia Walk 一带，按 Promenade MRT 标识步行约10分钟。"),
        transitStep("dtl", "蓝线 DT", "市区线 · 往 Expo", "Promenade DT15 → Bayfront 海湾舫 DT16，只坐1站。"),
        transitStep("walk", "出口 C/D", "前往 Event Plaza", "跟随 The Shoppes / Event Plaza 标识，出站后约4分钟到灯光秀观看区。"),
      ], caution: "Bayfront 的 Exit B 是去滨海湾花园；这次去金沙活动广场要选 Exit C 或 D。" }, note: "航班准点时争取赶上星期五22:00的Spectra水舞灯光秀。" },
      { time: "22:00", title: "Spectra 水舞灯光秀", duration: "15分钟", note: "免费观看。若错过22:00，直接开始夜间步行，不再等待。" },
      { time: "22:15", title: "滨海湾与F1路线夜走", duration: "约75分钟", transit: { steps: [
        transitStep("walk", "步行 10m", "Event Plaza → 双螺旋桥", "沿滨水步道朝 ArtScience Museum / Helix Bridge 前进。"),
        transitStep("walk", "步行 15m", "双螺旋桥 → 新加坡摩天轮", "过桥后沿 Youth Olympic Park / Singapore Flyer 标识继续。"),
        transitStep("walk", "步行 10m", "摩天轮 → F1 Pit外围", "朝 Republic Boulevard / F1 Pit Building 方向走，只看开放的外围道路。"),
        transitStep("walk", "步行 15m", "F1 Pit外围 → 酒店", "沿 Raffles Boulevard 返回 Marina Square 与酒店区域。"),
      ], caution: "比赛前可能有围挡；遇到封路不要绕进施工区，直接按现场 Pedestrian Detour 标识返回。" }, note: "比赛前一周可能已有围挡和临时改道，以现场开放道路为准，不强求完整走圈。" },
    ],
  },
  {
    id: "day-2",
    date: "10.03",
    label: "F1与演唱会",
    accent: "SAT",
    summary: "F1官方展览 → 午休 → 国家体育场 → The Weeknd",
    rules: ["演唱会散场后直接回酒店；克拉码头不放在散场后，给第二天保留体力。"],
    items: [
      { time: "08:30", title: "酒店附近早餐", duration: "约1小时", transit: { steps: [
        transitStep("walk", "步行", "优先去 Marina Square", "从酒店连通区域步行约3–8分钟；若店铺选择少，再沿室内通道前往 Suntec City。"),
      ], caution: "上午不跨区，不要为了网红早餐绕远。" }, note: "不跨区移动，为上午展览保存体力。" },
      { time: "10:15", title: "前往F1官方展览", duration: "30–40分钟", transit: { steps: [
        transitStep("walk", "步行", "酒店 → Promenade CC4", "穿过 Marina Square / Millenia Walk，跟随黄色 Circle Line / CC 标识。"),
        transitStep("ccl", "黄线 CC", "选择下一站 Bayfront CC34 的方向", "Promenade CC4 → Bayfront CC34 → Marina Bay CC33，共2站。"),
        transitStep("walk", "换乘", "在 Marina Bay 换棕色 TEL", "跟随棕色 Thomson-East Coast Line / TE 标识前往 TE20 站台。"),
        transitStep("tel", "棕线 TE", "选择下一站 Marina South TE21", "Marina Bay TE20 → Gardens by the Bay 滨海湾花园 TE22，共2站。"),
        transitStep("walk", "Exit 1", "出站就是 Gardens by the Bay MRT Plaza", "跟随 Formula 1 Exhibition 标识前往入口，提前10分钟到场。"),
      ], caution: "Promenade 上黄色环线时，认准“下一站 Bayfront CC34”；看到 Esplanade 或 Nicoll Highway 都是反方向。" }, note: "展览位于 Gardens by the Bay MRT Plaza，提前10分钟到场。" },
      { time: "11:00", title: "F1® Exhibition Singapore", duration: "约1.5小时", note: "经典赛车、车手装备、技术展项与模拟驾驶。模拟器若另外排队或收费，现场再决定。" },
      { time: "12:30", title: "返回酒店区域", duration: "30–40分钟", transit: { steps: [
        transitStep("tel", "棕线 TE", "往 Woodlands North 方向", "Gardens by the Bay TE22 → Marina South TE21 → Marina Bay TE20，共2站。"),
        transitStep("walk", "换乘", "在 Marina Bay 换黄色环线", "跟随 Circle Line / CC 标识前往 CC33 站台。"),
        transitStep("ccl", "黄线 CC", "选择下一站 Bayfront CC34", "Marina Bay CC33 → Bayfront CC34 → Promenade CC4，共2站。"),
        transitStep("walk", "步行", "Promenade → Marina Square / 酒店", "出站后按 Marina Square 标识步行约10分钟。"),
      ], caution: "到 Promenade 就下车；不要继续绕环线。" }, note: "Marina Square午餐后回房间休息、洗澡、充电。" },
      { time: "17:00", title: "前往国家体育场", duration: "20–30分钟", transit: { steps: [
        transitStep("walk", "步行", "酒店 → Promenade CC4", "跟随黄色 Circle Line / CC 标识进站。"),
        transitStep("ccl", "黄线 CC", "选择下一站 Nicoll Highway CC5", "Promenade CC4 → Nicoll Highway CC5 → Stadium 体育场 CC6，共2站。"),
        transitStep("walk", "出站", "跟随 National Stadium / Kallang Wave Mall", "先到商场吃饭，再按演唱会门票上的 Gate 号码找入口。"),
      ], caution: "不要乘下一站为 Bayfront 或 Esplanade 的列车；站台屏幕必须出现 Nicoll Highway / Stadium。" }, note: "到Kallang Wave Mall吃饭，再按门票Gate号码选择Stadium站出口。" },
      { time: "20:00", title: "The Weeknd 演唱会", duration: "预计至22:30–23:00", note: "电子票提前截图或加入手机钱包。实际结束时间以现场为准。" },
      { time: "散场后", title: "直接返回酒店", duration: "40–60分钟", transit: { steps: [
        transitStep("walk", "排队", "回到 Stadium CC6", "跟随 MRT / Stadium Station 标识；散场时按现场人流管制排队。"),
        transitStep("ccl", "黄线 CC", "选择下一站 Nicoll Highway CC5", "Stadium CC6 → Nicoll Highway CC5 → Promenade CC4，共2站。"),
        transitStep("walk", "步行", "Promenade → 酒店", "跟随 Marina Square 标识，穿商场或有盖通道步行约10分钟。"),
      ], caution: "散场不要跟着去 Kallang EW10；你的回程站是 Stadium CC6。" }, note: "散场客流大，当晚不再安排克拉码头。" },
    ],
  },
  {
    id: "day-3",
    date: "10.04",
    label: "圣淘沙与机场",
    accent: "SUN",
    summary: "海洋生态馆 → 乌节路 → 克拉码头可选 → 超级树 → 樟宜T3",
    rules: [
      "海洋生态馆或乌节路超时，第一项取消克拉码头，不压缩后面的取行李和机场时间。",
      "超级树因雷雨暂停就直接回酒店取行李，不等20:45的下一场。",
      "20:45是从酒店带行李出发去机场的硬截止时间。",
    ],
    items: [
      { time: "08:00", title: "早餐、退房、寄存行李", duration: "约1小时", note: "09:00主动退房并把箱子寄存在礼宾部，保留寄存凭证。" },
      { time: "09:00", title: "前往海洋生态馆", duration: "55–65分钟", transit: { steps: [
        transitStep("walk", "步行", "酒店 → Promenade DT15", "穿过 Marina Square / Millenia Walk，跟随蓝色 Downtown Line / DT 标识。"),
        transitStep("dtl", "蓝线 DT", "市区线 · 往 Expo", "Promenade DT15 → Chinatown 牛车水 DT19，共4站。"),
        transitStep("walk", "换乘", "在 Chinatown 换紫色东北线", "跟随紫色 North East Line / NE 标识，从 DT19 前往 NE4 站台。"),
        transitStep("nel", "紫线 NE", "东北线 · 往 HarbourFront", "Chinatown NE4 → HarbourFront 港湾 NE1，共2站。"),
        transitStep("walk", "VivoCity L3", "进入 VivoCity 后上3楼", "只跟随 Sentosa Express 标识，不要去 HarbourFront Centre。"),
        transitStep("sentosa", "橙色捷运", "Sentosa Express · 坐1站", "VivoCity Station → Resorts World Station；下车后跟随 Singapore Oceanarium 标识。"),
      ], caution: "Chinatown 一定要换紫线；在 HarbourFront 出站后目的地是 VivoCity 三楼，不是缆车站。" }, note: "圣淘沙捷运进岛S$4，现场刷Visa、Mastercard、AMEX或EZ-Link即可。" },
      { time: "10:00", title: "Singapore Oceanarium", duration: "约3小时", note: "按馆内单向线路游览；13:00左右乘Sentosa Express返回VivoCity。" },
      { time: "13:15", title: "怡丰城午餐", duration: "约45分钟", note: "吃完从HarbourFront MRT继续前往乌节路。" },
      { time: "14:00", title: "前往乌节路", duration: "30–35分钟", transit: { steps: [
        transitStep("nel", "紫线 NE", "东北线 · 往 Punggol Coast", "HarbourFront NE1 → Dhoby Ghaut 多美歌 NE6，共4站。"),
        transitStep("walk", "换乘", "在 Dhoby Ghaut 换红色南北线", "跟随红色 North South Line / NS 标识，从 NE6 前往 NS24。"),
        transitStep("nsl", "红线 NS", "南北线 · 往 Jurong East", "Dhoby Ghaut NS24 → Orchard 乌节 NS22，共2站。"),
        transitStep("walk", "出站", "跟随 ION Orchard 标识", "到 ION Orchard 后再沿 Orchard Road 步行前往 Ngee Ann City / Takashimaya。"),
      ], caution: "Dhoby Ghaut 换乘通道较长，始终跟红色 NS Line 标识；不要误进黄色环线。" }, note: "主要逛ION Orchard、Ngee Ann City与Takashimaya，16:00必须收尾。" },
      { time: "16:00", title: "克拉码头 · 有精力再去", duration: "通勤25分钟＋停留45分钟", transit: { steps: [
        transitStep("nsl", "红线 NS", "南北线 · 往 Marina South Pier", "Orchard NS22 → Dhoby Ghaut NS24，共2站。"),
        transitStep("walk", "换乘", "在 Dhoby Ghaut 换紫色东北线", "跟随紫色 North East Line / NE 标识前往 NE6 站台。"),
        transitStep("nel", "紫线 NE", "东北线 · 往 HarbourFront", "Dhoby Ghaut NE6 → Clarke Quay 克拉码头 NE5，只坐1站。"),
        transitStep("walk", "出站", "跟随 Clarke Quay / Singapore River", "到河边只散步拍照，不乘船、不等位吃饭。"),
      ], caution: "这是可选项；16:00仍在购物或已经疲劳就直接取消。" }, note: "仅在行程准点、天气正常且体力充足时执行。不乘船、不订餐厅，17:10离开。", optional: true },
      { time: "17:10", title: "返回酒店区域", duration: "25–30分钟", transit: { steps: [
        transitStep("nel", "紫线 NE", "东北线 · 往 Punggol Coast", "Clarke Quay NE5 → Dhoby Ghaut NE6，只坐1站。"),
        transitStep("walk", "换乘", "在 Dhoby Ghaut 换黄色环线", "跟随黄色 Circle Line / CC 标识前往 CC1 站台。"),
        transitStep("ccl", "黄线 CC", "选择下一站 Bras Basah CC2", "Dhoby Ghaut CC1 → Bras Basah CC2 → Esplanade CC3，共2站。"),
        transitStep("walk", "Exit B", "Esplanade → 酒店", "从 Exit B 出站，步行约5分钟到 PARKROYAL COLLECTION Marina Bay。"),
      ], caution: "若取消克拉码头：Orchard 坐红线2站到 Dhoby Ghaut，再按同样方式换黄线到 Esplanade。" }, note: "若跳过克拉码头，直接从乌节路返回酒店，可多休息约1小时。" },
      { time: "18:35", title: "前往超级树", duration: "25–35分钟", transit: { steps: [
        transitStep("walk", "步行", "酒店 → Promenade DT15", "穿过 Marina Square / Millenia Walk，跟随蓝色 Downtown Line / DT 标识。"),
        transitStep("dtl", "蓝线 DT", "市区线 · 往 Expo", "Promenade DT15 → Bayfront 海湾舫 DT16，只坐1站。"),
        transitStep("walk", "Exit B", "进入滨海湾花园", "沿地下通道出站，跨 Dragonfly Bridge 或 Meadow Bridge，步行15–20分钟到 Supertree Grove。"),
      ], caution: "去超级树必须走 Bayfront Exit B；Exit C/D 会把你带到金沙购物中心。" }, note: "19:30前找好观看位置。" },
      { time: "19:45", title: "Garden Rhapsody", duration: "15分钟", note: "免费观看。若雷雨暂停，不等20:45场，直接回酒店取行李。" },
      { time: "20:00", title: "返回酒店取行李", duration: "30–40分钟", transit: { steps: [
        transitStep("walk", "步行", "Supertree Grove → Bayfront DT16", "原路返回 Dragonfly Bridge / 地下通道，跟随 MRT / Bayfront 标识。"),
        transitStep("dtl", "蓝线 DT", "市区线 · 往 Bukit Panjang", "Bayfront DT16 → Promenade DT15，只坐1站。"),
        transitStep("walk", "步行", "Promenade → 酒店礼宾部", "穿过 Marina Square / Millenia Walk，取行李和寄存凭证。"),
      ], caution: "20:45是离开酒店的硬截止时间；灯光秀结束后不要在花园继续逛。" }, note: "最晚20:45从酒店出发。" },
      { time: "20:45", title: "前往樟宜机场", duration: "60–70分钟", transit: { steps: [
        transitStep("walk", "Exit B", "酒店 → Esplanade CC3", "带行李从酒店步行约5分钟到 Esplanade Exit B。"),
        transitStep("ccl", "黄线 CC", "选择下一站 Promenade CC4", "Esplanade CC3 → Promenade CC4，只坐1站。"),
        transitStep("walk", "换乘", "在 Promenade 换蓝色市区线", "跟随蓝色 Downtown Line / DT 标识前往 DT15 站台。"),
        transitStep("dtl", "蓝线 DT", "市区线 · 往 Expo", "Promenade DT15 → Expo DT35，共20站。"),
        transitStep("walk", "换乘", "在 Expo 换绿色机场支线", "跟随 Changi Airport / CG 标识，从 DT35 前往 CG1 站台。"),
        transitStep("ewl", "绿线 CG", "机场支线 · 往 Changi Airport", "Expo CG1 → Changi Airport CG2，只坐1站。"),
        transitStep("walk", "JEWEL", "到站后先去星耀樟宜", "跟随 Jewel 标识前往公共区域；此时不要过出境检查。"),
      ], caution: "Expo 必须下车换机场支线；蓝线不会直接开进樟宜机场。" }, note: "抵达后不要过出境检查，先前往雨漩涡中心区域。" },
      { time: "22:00", title: "雨漩涡声光秀", duration: "约10分钟", note: "看完立刻前往Jewel一层办理新加坡航空提前值机和行李托运。" },
      { time: "22:10", title: "提前值机、托运行李", duration: "约30分钟", transit: { steps: [
        transitStep("walk", "Jewel L1", "前往 Early Check-in Lounge", "在星耀樟宜1层寻找 Early Check-in / Airline Check-in 标识。"),
        transitStep("airport", "确认", "核对 SQ868 与 T3", "托运前再次确认航班日期、航站楼和最终行李额度。"),
        transitStep("walk", "T3", "前往3号航站楼出发层", "沿 Link Bridge / Terminal 3 标识步行，随后办理出境和安检流程。"),
      ], caution: "能否前一晚托运以新加坡航空当天开放情况为准；若柜台不接受，保留行李并到T3人工柜台确认。" }, note: "确认SQ868仍从T3起飞。完成后步行到T3出发层并通过出境检查。" },
      { time: "23:15", title: "进入T3付费休息室", duration: "约7小时", transit: { steps: [
        transitStep("airport", "过境区", "进入 T3 Transit Area", "完成出境后，不要走到到达层或离开过境区。"),
        transitStep("walk", "Level 3", "寻找 Ambassador Transit Lounge", "跟随 Lounge / Movie Theatre / Transfer B 标识，上到3层。"),
        transitStep("airport", "休息", "出示预订单与护照", "确认 Refresh & Replenish 套餐开始时间、淋浴和叫醒安排。"),
      ], caution: "休息室位于出境后的过境区；若还没完成出境，就不可能走到这里。" }, note: "使用Refresh & Replenish套餐：小憩房6小时、休息室1小时及淋浴。设置两个闹钟。" },
    ],
  },
  {
    id: "day-4",
    date: "10.05",
    label: "返回厦门",
    accent: "MON",
    summary: "T3休息室 → 登机口 → SQ868 → 厦门",
    rules: ["休息室最晚06:15离开，06:45前到达最终登机口区域；登机口以当天航班屏为准。"],
    items: [
      { time: "05:15", title: "起床、洗漱、早餐", duration: "约1小时", note: "检查护照、登机牌、手机和充电宝，确认最终登机口。" },
      { time: "06:15", title: "离开休息室前往登机口", duration: "10–25分钟", transit: { steps: [
        transitStep("airport", "航班屏", "先确认 SQ868 最终登机口", "不要只看旧截图；以T3实时航班屏和新加坡航空App为准。"),
        transitStep("walk", "步行", "按登机口字母和数字前进", "跟随 Gates A / B 标识；距离较远时使用机场内自动步道。"),
        transitStep("airport", "安检", "预留登机口安检时间", "部分登机口在候机区入口再次安检，最晚06:45到达登机口区域。"),
      ], caution: "航班屏显示的登机口才是最终依据；不要凭休息室位置猜方向。" }, note: "樟宜部分航班在登机口附近进行安检，最晚06:45到达登机口区域。" },
      { time: "07:50", title: "SQ868 起飞", duration: "4小时35分钟", transit: { steps: [
        transitStep("airport", "SQ868", "新加坡 SIN T3 → 厦门 XMN T3", "计划07:50起飞，预计12:25抵达；起飞和抵达均为当地时间。"),
      ] }, note: "预计12:25抵达厦门。" },
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
            <div className="hotel-meta"><span>15:00 入住</span><span>12:00 退房</span><span>默认进出站：Esplanade CC3 · Exit B</span></div>
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

      <section className="section plan-section" id="plan" data-reveal>
        <div className="section-number">04</div>
        <div className="section-heading"><p>THE JOURNEY</p><h2>逐步执行路线</h2></div>
        <div className="mrt-primer" aria-label="新加坡地铁线路颜色说明">
          <div><span className="tone-ewl">绿线</span><b>机场支线 / East–West</b></div>
          <div><span className="tone-dtl">蓝线</span><b>市区线 / Downtown</b></div>
          <div><span className="tone-ccl">黄线</span><b>环线 / Circle</b></div>
          <div><span className="tone-tel">棕线</span><b>汤申–东海岸线</b></div>
          <div><span className="tone-nel">紫线</span><b>东北线 / North East</b></div>
          <div><span className="tone-nsl">红线</span><b>南北线 / North South</b></div>
        </div>
        <p className="primer-note">站名旁的字母＋数字是站点编号。每段点击“新手导航”即可查看乘车方向、站数、换乘动作和防走错提示。</p>
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
                    {item.transit && (
                      <details className="transit-guide">
                        <summary>
                          <span className="guide-label">新手导航</span>
                          <span className="guide-preview" aria-hidden="true">
                            {item.transit.steps.map((step, stepIndex) => <i className={`tone-${step.tone}`} key={`${step.badge}-${stepIndex}`}>{step.badge}</i>)}
                          </span>
                          <small>{item.transit.steps.length}步</small>
                        </summary>
                        <div className="transit-steps">
                          {item.transit.steps.map((step, stepIndex) => (
                            <div className="transit-step" key={`${step.title}-${stepIndex}`}>
                              <div className={`step-badge tone-${step.tone}`}><span>{String(stepIndex + 1).padStart(2, "0")}</span>{step.badge}</div>
                              <div><strong>{step.title}</strong><p>{step.detail}</p></div>
                            </div>
                          ))}
                        </div>
                        {item.transit.caution && <div className="transit-warning"><b>防走错</b><span>{item.transit.caution}</span></div>}
                      </details>
                    )}
                    <p>{item.note}</p>
                  </div>
                </div>
              ))}
            </div>
            <aside className="day-rules" aria-label={`${day.date} 当天取舍原则`}>
              <div className="day-rules-heading"><span>DECISION RULES</span><h4>当天取舍原则</h4></div>
              <div className="day-rules-list">
                {day.rules.map((rule, ruleIndex) => <div key={rule}><b>{String(ruleIndex + 1).padStart(2, "0")}</b><p>{rule}</p></div>)}
              </div>
            </aside>
          </article>
        ))}
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
