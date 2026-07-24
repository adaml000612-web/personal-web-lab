export type KlinePeriod = "day" | "week" | "month";

export type KlinePoint = {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  ma5: number | null;
  ma10: number | null;
  ma20: number | null;
};

type RawPoint = Omit<KlinePoint, "ma5" | "ma10" | "ma20">;

function average(points: RawPoint[], index: number, size: number) {
  if (index + 1 < size) return null;
  const values = points.slice(index + 1 - size, index + 1);
  return values.reduce((sum, point) => sum + point.close, 0) / size;
}

export function addMovingAverages(points: RawPoint[]): KlinePoint[] {
  return points.map((point, index) => ({
    ...point,
    ma5: average(points, index, 5),
    ma10: average(points, index, 10),
    ma20: average(points, index, 20),
  }));
}

export function parseNasdaqDate(value: string) {
  const [month, day, year] = value.split("/");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

export function aggregatePoints(points: RawPoint[], period: Exclude<KlinePeriod, "day">) {
  const groups = new Map<string, RawPoint[]>();
  points.forEach((point) => {
    const date = new Date(`${point.date}T00:00:00Z`);
    if (period === "week") date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
    const key = period === "week" ? date.toISOString().slice(0, 10) : point.date.slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), point]);
  });
  return [...groups.values()].map((group) => ({
    date: group.at(-1)!.date,
    open: group[0].open,
    close: group.at(-1)!.close,
    high: Math.max(...group.map(({ high }) => high)),
    low: Math.min(...group.map(({ low }) => low)),
    volume: group.reduce((sum, { volume }) => sum + volume, 0),
  }));
}
