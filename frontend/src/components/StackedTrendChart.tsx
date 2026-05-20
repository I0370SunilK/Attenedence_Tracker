import { useMemo, useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceArea,
} from "recharts";

import {
  AttendanceRecord,
  AttendanceStatus,
  STATUS_COLOR,
  Employee,
} from "@/lib/types";

import { DateRange, dayDistribution } from "@/lib/dateRange";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { format, isWeekend } from "date-fns";
import { dateKey } from "@/lib/attendance";

const KEYS: (AttendanceStatus | "NONE")[] = [
  "WFO",
  "WFH",
  "CLT",
  "PTO",
  "HOL",
  "NONE",
];

const COLOR: Record<string, string> = {
  ...STATUS_COLOR,
  NONE: "hsl(var(--muted-foreground) / 0.35)",
};

const LABEL: Record<string, string> = {
  WFO: "WFO",
  WFH: "WFH",
  CLT: "CLT",
  PTO: "PTO",
  HOL: "HOL",
  NONE: "Not Marked",
};

const CHART_MARGIN = {
  top: 16,
  right: 18,
  left: 0,
  bottom: 44,
};

interface Props {
  range: DateRange;
  attendance: Record<string, AttendanceRecord[]>;
  employeeIds: string[];
  employees: Employee[];
}

function TrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const rawDay = payload[0] as {
    payload?: { date?: Date };
  };

  const activeDate = rawDay.payload?.date;

  if (!activeDate) return null;

  const dayName = format(activeDate, "EEEE");

  const weekendText = isWeekend(activeDate)
    ? `${dayName} (Weekend)`
    : dayName;

  return (
    <div
      className="rounded-[14px] border border-border px-3 py-2 text-xs shadow-xl"
      style={{
        backdropFilter: "blur(10px)",
        background: "hsl(var(--background) / 0.96)",
      }}
    >
      <div className="mb-2">
        <div className="font-semibold text-foreground">
          {label}
        </div>

        <div className="text-muted-foreground">
          {weekendText}
        </div>
      </div>

      <div className="space-y-1.5">
        {payload.map((entry) => (
          <div
            key={entry.name}
            className="flex items-center justify-between gap-4"
          >
            <span className="text-muted-foreground">
              {LABEL[entry.name as string] ??
                entry.name}
            </span>

            <span className="font-semibold tabular-nums text-foreground">
              {entry.value ?? 0}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StackedTrendChart({
  range,
  attendance,
  employeeIds,
  employees,
}: Props) {
  const data = useMemo(
    () =>
      dayDistribution(
        attendance,
        employeeIds,
        range
      ),
    [attendance, employeeIds, range]
  );

  const [drill, setDrill] = useState<
    typeof data[number] | null
  >(null);

  const totalEmployees = employeeIds.length;

  const chartData = useMemo(
    () =>
      data.map((day, idx) => ({
        ...day,
        index: idx,
        isWeekend: isWeekend(day.date),
      })),
    [data]
  );

  const chartWidth = useMemo(
    () => Math.max(chartData.length * 50, 800),
    [chartData.length]
  );

  const chartKey = useMemo(
    () =>
      `${range.from.getTime()}-${range.to.getTime()}`,
    [range]
  );

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft =
        scrollRef.current.scrollWidth;
    }
  }, [chartData]);

  const employeeMap = useMemo(
    () =>
      new Map(
        employees.map((e) => [e.id, e])
      ),
    [employees]
  );

  const getEmployeesForStatus = (
    date: Date,
    status: AttendanceStatus | "NONE"
  ) => {
    const key = dateKey(date);

    const names: string[] = [];

    employeeIds.forEach((empId) => {
      const emp = employeeMap.get(empId);

      const rec = (
        attendance[empId] || []
      ).find((x) => x.date === key);

      if (status === "NONE") {
        if (!rec && !isWeekend(date)) {
          names.push(
            emp?.fullName || empId
          );
        }
      } else if (
        rec?.status === status
      ) {
        names.push(
          emp?.fullName || empId
        );
      }
    });

    return names.sort();
  };

  const LegendItems = KEYS.map((k) => (
    <div
      key={k}
      className="flex items-center gap-1.5"
    >
      <span
        className="h-2.5 w-2.5 rounded-full shrink-0"
        style={{
          background: COLOR[k],
        }}
      />

      <span className="text-xs text-muted-foreground">
        {LABEL[k]}
      </span>
    </div>
  ));

  return (
    <Card className="card-soft p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold">
            Daily Attendance Trend
          </h3>

          <p className="text-xs text-muted-foreground">
            Stacked counts by status · click a
            bar for details
          </p>
        </div>
      </div>

      <div className="flex h-[23rem] flex-col">
        {chartData.length === 0 ? (
          <div className="flex-1 grid place-items-center text-sm text-muted-foreground">
            No data
          </div>
        ) : (
          <>
            {/* CHART CONTAINER */}
            <div className="relative flex-1 overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-b from-background via-background to-muted/20">
              {/* Left fade */}
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-background via-background/90 to-transparent" />

              {/* Right fade */}
              <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-background via-background/90 to-transparent" />

              {/* SCROLL AREA */}
              <div
                ref={scrollRef}
                className="flex-1 h-full overflow-x-auto overflow-y-hidden scroll-smooth px-2"
              >
                <div
                  className="relative h-full min-w-full"
                  style={{
                    width: `${chartWidth}px`,
                  }}
                >
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                    key={chartKey}
                  >
                    <BarChart
                      data={chartData}
                      margin={CHART_MARGIN}
                      barCategoryGap="18%"
                      maxBarSize={22}
                      onClick={(e) => {
                        const idx =
                          e?.activeTooltipIndex;

                        if (
                          typeof idx ===
                            "number" &&
                          chartData[idx]
                        ) {
                          setDrill(
                            chartData[idx]
                          );
                        }
                      }}
                    >
                      {/* WEEKEND BACKGROUND */}
                      {chartData.map(
                        (day, idx) => {
                          if (
                            !day.isWeekend
                          )
                            return null;

                          return (
                            <ReferenceArea
                              key={`weekend-${day.key}`}
                              x1={idx - 0.20}
                              x2={idx + 0.20}
                              y1={0}
                              y2={8}
                              ifOverflow="extendDomain"
                              fill="rgba(247,191,120,0.38)"
                              strokeOpacity={0}
                            />
                          );
                        }
                      )}

                      <CartesianGrid
                        stroke="hsl(var(--border) / 0.9)"
                        strokeDasharray="3 4"
                        vertical={false}
                      />

                      <XAxis
                        type="number"
                        dataKey="index"
                        domain={[
                          -0.5,
                          chartData.length - 0.5,
                        ]}
                        ticks={chartData.map(
                          (d) => d.index
                        )}
                        tickFormatter={(value) =>
                          chartData[value]
                            ?.label ?? ""
                        }
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        interval={0}
                        angle={-32}
                        textAnchor="end"
                        height={54}
                        tickMargin={10}
                      />

                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />

                      <Tooltip
                        cursor={{
                          fill:
                            "hsl(var(--muted) / 0.35)",
                        }}
                        content={
                          <TrendTooltip />
                        }
                        labelFormatter={(
                          value
                        ) => {
                          return chartData[
                            Number(value)
                          ]?.date
                            ? format(
                                chartData[
                                  Number(value)
                                ].date,
                                "dd MMM yyyy"
                              )
                            : "";
                        }}
                      />

                      {/* STACKED BARS */}
                      {KEYS.map(
                        (k, i) => (
                          <Bar
                            key={k}
                            dataKey={k}
                            name={k}
                            stackId="a"
                            fill={COLOR[k]}
                            radius={
                              i ===
                              KEYS.length -
                                1
                                ? [
                                    6,
                                    6,
                                    0,
                                    0,
                                  ]
                                : [
                                    0,
                                    0,
                                    0,
                                    0,
                                  ]
                            }
                            cursor="pointer"
                          >
                            {chartData.map(
                              (
                                _,
                                idx
                              ) => (
                                <Cell
                                  key={`cell-${idx}`}
                                  fill={
                                    COLOR[k]
                                  }
                                />
                              )
                            )}
                          </Bar>
                        )
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* FIXED LEGEND */}
            <div className="mt-3 flex items-center justify-center gap-4 flex-wrap">
              {LegendItems}
            </div>
          </>
        )}
      </div>

      {/* DIALOG */}
      <Dialog
        open={!!drill}
        onOpenChange={(o) =>
          !o && setDrill(null)
        }
      >
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          {drill && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {format(
                    drill.date,
                    "EEEE · d MMM yyyy"
                  )}

                  {isWeekend(
                    drill.date
                  ) && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      (Weekend)
                    </span>
                  )}
                </DialogTitle>

                <DialogDescription>
                  Attendance breakdown across{" "}
                  {totalEmployees} employees
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {KEYS.map((k) => {
                  const v = drill[k];

                  const pct =
                    totalEmployees
                      ? Math.round(
                          (v /
                            totalEmployees) *
                            100
                        )
                      : 0;

                  const empNames =
                    getEmployeesForStatus(
                      drill.date,
                      k
                    );

                  return (
                    <div
                      key={k}
                      className="space-y-2 rounded-lg border border-border p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{
                              background:
                                COLOR[k],
                            }}
                          />

                          <span className="text-sm font-medium">
                            {LABEL[k]}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {pct}%
                          </span>

                          <span className="w-8 text-right text-sm font-bold tabular-nums">
                            {v}
                          </span>
                        </div>
                      </div>

                      {v > 0 &&
                        empNames.length >
                          0 && (
                          <div className="space-y-1 pl-5 text-xs text-muted-foreground">
                            {empNames.map(
                              (
                                name,
                                idx
                              ) => (
                                <div
                                  key={
                                    idx
                                  }
                                >
                                  - {name}
                                </div>
                              )
                            )}
                          </div>
                        )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}