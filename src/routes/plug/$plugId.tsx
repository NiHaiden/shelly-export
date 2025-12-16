import { Link, createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ArrowLeft } from "lucide-react";
import { getHistoricalMetrics, getPlugById } from "@/server/plugs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { ThemeToggle } from "@/components/theme-toggle";

const TIME_RANGES = [
  { label: "1m", minutes: 1 },
  { label: "5m", minutes: 5 },
  { label: "30m", minutes: 30 },
] as const;

export const Route = createFileRoute("/plug/$plugId")({
  component: PlugDetail,
  loader: async ({ params }) => {
    const plug = await getPlugById({ data: { id: parseInt(params.plugId, 10) } });
    return { plug };
  },
});

interface DataPoint {
  time: string;
  power: number;
}

function PlugDetail() {
  const { plug } = Route.useLoaderData();
  const [history, setHistory] = useState<Array<DataPoint>>([]);
  const [currentPower, setCurrentPower] = useState<number | null>(null);
  const [timeRange, setTimeRange] = useState(5); // minutes

  const loadHistoricalData = useCallback(async () => {
    if (!plug) return;
    const metrics = await getHistoricalMetrics({ data: { id: plug.id, minutes: timeRange } });
    const historicalData = metrics.map((m) => ({
      time: new Date(m.time).toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      power: m.power ?? 0,
    }));
    setHistory(historicalData);
    if (historicalData.length > 0) {
      setCurrentPower(historicalData[historicalData.length - 1].power);
    }
  }, [plug, timeRange]);

  // Load historical data and refresh every second to get new data from background polling
  useEffect(() => {
    if (!plug) return;

    // Load immediately
    loadHistoricalData();

    // Refresh every second to show new data from background polling service
    const interval = setInterval(loadHistoricalData, 1000);

    return () => clearInterval(interval);
  }, [plug, loadHistoricalData]);

  if (!plug) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-4xl">
          <p className="text-muted-foreground">Plug not found</p>
          <Link to="/">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="mr-2 size-4" />
              Back
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const chartConfig = {
    power: {
      label: "Power (W)",
      color: "var(--primary)",
    },
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="outline" size="icon">
                <ArrowLeft className="size-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{plug.name}</h1>
              <p className="text-muted-foreground text-sm">
                {plug.hostname} (Switch {plug.switchId})
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Current Power
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {currentPower !== null ? `${currentPower.toFixed(1)} W` : "—"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Data Points
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{history.length}</p>
              <p className="text-xs text-muted-foreground">
                Background polling active
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Power Usage</CardTitle>
            <div className="flex gap-1">
              {TIME_RANGES.map((range) => (
                <Button
                  key={range.minutes}
                  variant={timeRange === range.minutes ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeRange(range.minutes)}
                >
                  {range.label}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {history.length < 2 ? (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                Collecting data...
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <AreaChart
                  data={history}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="powerGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-power)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-power)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="time"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fontSize: 12 }}
                    interval="preserveStartEnd"
                    minTickGap={50}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${value}W`}
                    domain={["dataMin - 1", "dataMax + 1"]}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent indicator="line" />}
                    cursor={{
                      stroke: "var(--color-power)",
                      strokeWidth: 1,
                      strokeDasharray: "4 4",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="power"
                    stroke="var(--color-power)"
                    strokeWidth={2}
                    fill="url(#powerGradient)"
                    animationDuration={200}
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
