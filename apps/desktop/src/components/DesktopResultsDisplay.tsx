import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { BoundaryApproach, CalculationResult, Facility } from "@ghg/core";
import { IconBuilding, IconFactory, IconFileCheck, IconFire, IconLeaf, IconZap } from "./IconComponents";

interface DesktopResultsDisplayProps {
  totalEmissionsMarket: number;
  totalEmissionsLocation: number;
  scope1Total: number;
  scope2LocationTotal: number;
  scope2MarketTotal: number;
  facilityBreakdown: Record<string, CalculationResult>;
  facilities: Facility[];
  boundaryApproach: BoundaryApproach;
  companyName: string;
  reportingYear: string;
  onGenerateReport: () => void;
  canGenerateReport: boolean;
}

const colors = {
  scope1: "#10b981",
  scope2Location: "#06b6d4",
  scope2Market: "#f59e0b"
};

function formatTco2e(value: number): string {
  return (value / 1000).toLocaleString("ko-KR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function boundaryLabel(value: BoundaryApproach): string {
  if (value === "financial") return "재무 통제";
  if (value === "equity") return "지분율";
  return "운영 통제";
}

function percent(value: number, total: number): string {
  if (total <= 0) return "0.0";
  return ((value / total) * 100).toFixed(1);
}

export function DesktopResultsDisplay({
  totalEmissionsMarket,
  totalEmissionsLocation,
  scope1Total,
  scope2LocationTotal,
  scope2MarketTotal,
  facilityBreakdown,
  facilities,
  boundaryApproach,
  companyName,
  reportingYear,
  onGenerateReport,
  canGenerateReport
}: DesktopResultsDisplayProps) {
  const chartData = useMemo(
    () => [
      {
        name: "Location-based",
        "Scope 1": Number((scope1Total / 1000).toFixed(2)),
        "Scope 2 Location": Number((scope2LocationTotal / 1000).toFixed(2))
      },
      {
        name: "Market-based",
        "Scope 1": Number((scope1Total / 1000).toFixed(2)),
        "Scope 2 Market": Number((scope2MarketTotal / 1000).toFixed(2))
      }
    ],
    [scope1Total, scope2LocationTotal, scope2MarketTotal]
  );

  const pieData = useMemo(
    () =>
      [
        { name: "Scope 1", value: scope1Total, color: colors.scope1 },
        { name: "Scope 2 Location", value: scope2LocationTotal, color: colors.scope2Location },
        { name: "Scope 2 Market", value: scope2MarketTotal, color: colors.scope2Market }
      ].filter((item) => item.value > 0),
    [scope1Total, scope2LocationTotal, scope2MarketTotal]
  );

  const facilityRows = useMemo(
    () =>
      facilities.map((facility) => {
        const result = facilityBreakdown[facility.id] || {
          scope1: 0,
          scope2Location: 0,
          scope2Market: 0,
          scope3: 0
        };
        return {
          facility,
          result
        };
      }),
    [facilities, facilityBreakdown]
  );

  const totalForPercent = totalEmissionsLocation > 0 ? totalEmissionsLocation : 1;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-600">Calculation result</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">배출량 계산 결과</h2>
          <p className="mt-1 text-sm text-slate-500">
            {companyName} · {reportingYear} · {boundaryLabel(boundaryApproach)}
          </p>
        </div>
        <button
          type="button"
          disabled={!canGenerateReport}
          onClick={onGenerateReport}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:from-emerald-600 hover:to-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <IconFileCheck className="h-4 w-4" />
          보고서 생성
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <HeroCard
          className="xl:col-span-6"
          icon={<IconLeaf className="h-6 w-6" />}
          title="Location-based 총 배출량"
          value={formatTco2e(totalEmissionsLocation)}
          description="전력망 평균 배출계수를 적용한 총량입니다."
          variant="location"
        />
        <HeroCard
          className="xl:col-span-6"
          icon={<IconZap className="h-6 w-6" />}
          title="Market-based 총 배출량"
          value={formatTco2e(totalEmissionsMarket)}
          description="PPA, REC, 녹색프리미엄 등 계약수단을 반영한 총량입니다."
          variant="market"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <ScopeCard
          icon={<IconFire className="h-5 w-5" />}
          title="Scope 1"
          value={formatTco2e(scope1Total)}
          color="emerald"
          percentage={percent(scope1Total, totalForPercent)}
        />
        <ScopeCard
          icon={<IconBuilding className="h-5 w-5" />}
          title="Scope 2 Location"
          value={formatTco2e(scope2LocationTotal)}
          color="cyan"
          percentage={percent(scope2LocationTotal, totalForPercent)}
        />
        <ScopeCard
          icon={<IconZap className="h-5 w-5" />}
          title="Scope 2 Market"
          value={formatTco2e(scope2MarketTotal)}
          color="amber"
          percentage={percent(scope2MarketTotal, totalForPercent)}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-8">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-950">Location/Market 비교</h3>
              <p className="text-sm text-slate-500">웹앱과 같은 방식으로 Scope별 결과를 비교합니다.</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis tick={{ fill: "#64748b", fontSize: 12 }} unit="t" />
                <Tooltip formatter={(value) => [`${value} tCO2e`, ""]} />
                <Bar dataKey="Scope 1" stackId="a" fill={colors.scope1} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Scope 2 Location" stackId="a" fill={colors.scope2Location} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Scope 2 Market" stackId="a" fill={colors.scope2Market} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-4">
          <h3 className="text-base font-bold text-slate-950">Scope 구성</h3>
          <p className="text-sm text-slate-500">Scope 3는 기본 제품에서 개별 문의 대상입니다.</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={3}>
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                  <Label
                    value="tCO2e"
                    position="center"
                    className="fill-slate-600 text-sm font-bold"
                  />
                </Pie>
                <Tooltip formatter={(value) => [`${formatTco2e(Number(value) * 1000)} tCO2e`, ""]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <span className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
            <IconFactory className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-base font-bold text-slate-950">시설별 배출량</h3>
            <p className="text-sm text-slate-500">조직 경계 설정에 따라 지분율 또는 통제 기준이 반영됩니다.</p>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">시설</th>
                <th className="px-4 py-3">Scope 1</th>
                <th className="px-4 py-3">Scope 2 Location</th>
                <th className="px-4 py-3">Scope 2 Market</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {facilityRows.map(({ facility, result }) => (
                <tr key={facility.id}>
                  <td className="px-4 py-3 font-semibold text-slate-900">{facility.name}</td>
                  <td className="px-4 py-3 text-slate-600">{formatTco2e(result.scope1)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatTco2e(result.scope2Location)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatTco2e(result.scope2Market)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function HeroCard({
  className,
  title,
  value,
  description,
  icon,
  variant
}: {
  className?: string;
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  variant: "location" | "market";
}) {
  const isMarket = variant === "market";
  return (
    <article
      className={`${className || ""} min-h-40 rounded-2xl border p-6 shadow-sm ${
        isMarket
          ? "border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-950"
          : "border-slate-200 bg-gradient-to-br from-white to-slate-50 text-slate-950"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-sm font-semibold ${isMarket ? "text-emerald-700" : "text-slate-500"}`}>{title}</p>
          <div className="mt-2 flex items-end gap-2">
            <strong className="text-4xl font-bold tracking-tight">{value}</strong>
            <span className={`pb-1 text-sm font-semibold ${isMarket ? "text-emerald-700" : "text-slate-500"}`}>
              tCO2e
            </span>
          </div>
          <p className={`mt-3 max-w-md text-sm ${isMarket ? "text-emerald-700" : "text-slate-500"}`}>{description}</p>
        </div>
        <span className={`rounded-xl p-3 ${isMarket ? "bg-white/80 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
          {icon}
        </span>
      </div>
    </article>
  );
}

function ScopeCard({
  title,
  value,
  percentage,
  icon,
  color
}: {
  title: string;
  value: string;
  percentage: string;
  icon: React.ReactNode;
  color: "emerald" | "cyan" | "amber";
}) {
  const styles = {
    emerald: "bg-emerald-50 text-emerald-600",
    cyan: "bg-cyan-50 text-cyan-600",
    amber: "bg-amber-50 text-amber-600"
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`rounded-xl p-2.5 ${styles[color]}`}>{icon}</span>
          <span className="text-sm font-semibold text-slate-500">{title}</span>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500">{percentage}%</span>
      </div>
      <strong className="text-2xl font-bold tracking-tight text-slate-950">{value}</strong>
      <p className="mt-1 text-xs text-slate-400">tCO2e</p>
    </article>
  );
}
