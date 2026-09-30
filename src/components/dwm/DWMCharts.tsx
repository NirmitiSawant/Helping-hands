import React, { useState } from 'react';
import {
  PieChart as PieIcon,
  BarChart3,
  TrendingUp,
  MapPin,
  Tag,
  Layers,
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  HelpCircle,
  Info,
  Building2,
} from 'lucide-react';
import { Donation } from '../../types';
import {
  TimeTrendPoint,
  CategoryStatusBreakdown,
  OLAPPivotTable,
  OLAPDimension,
  OLAPMeasure,
  NGOActivityMetric,
} from '../../lib/dwmAnalytics';

// ============================================================================
// STATUS CONFIGURATION
// ============================================================================
export const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; hoverColor: string; bg: string; border: string; text: string }
> = {
  PENDING: {
    label: 'Pending',
    color: '#f59e0b',
    hoverColor: '#d97706',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
  },
  ACCEPTED: {
    label: 'Accepted',
    color: '#3b82f6',
    hoverColor: '#2563eb',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
  },
  SCHEDULED: {
    label: 'Scheduled',
    color: '#6366f1',
    hoverColor: '#4f46e5',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    text: 'text-indigo-800',
  },
  COMPLETED: {
    label: 'Completed',
    color: '#10b981',
    hoverColor: '#059669',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-800',
  },
  CANCELLED: {
    label: 'Cancelled',
    color: '#94a3b8',
    hoverColor: '#64748b',
    bg: 'bg-slate-100',
    border: 'border-slate-200',
    text: 'text-slate-700',
  },
};

// ============================================================================
// 1. DONATION STATUS PIE/DONUT CHART (Section 7.A)
// ============================================================================
interface DonationStatusDonutProps {
  statusCounts: Record<string, number>;
  totalDonations: number;
}

export const DonationStatusDonutChart: React.FC<DonationStatusDonutProps> = ({
  statusCounts,
  totalDonations,
}) => {
  const [hoveredStatus, setHoveredStatus] = useState<string | null>(null);

  const statuses = ['PENDING', 'ACCEPTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED'];
  const radius = 70;
  const strokeWidth = 26;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;
  const segments = statuses.map((st) => {
    const count = statusCounts[st] || 0;
    const percent = totalDonations > 0 ? count / totalDonations : 0;
    const strokeDasharray = `${percent * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedPercent * circumference;
    accumulatedPercent += percent;

    return {
      status: st,
      count,
      percent: Math.round(percent * 100),
      strokeDasharray,
      strokeDashoffset,
      config: STATUS_CONFIG[st],
    };
  });

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <PieIcon className="w-4 h-4 text-emerald-600" />
            <span>Donation Status Distribution</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time breakdown across the platform donation lifecycle
          </p>
        </div>
        <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
          {totalDonations} Records
        </span>
      </div>

      {totalDonations === 0 ? (
        <div className="py-12 text-center text-xs text-slate-400">
          No donation status records available for chart generation.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Donut Graphic */}
          <div className="md:col-span-6 flex justify-center relative">
            <svg
              viewBox="0 0 200 200"
              className="w-48 h-48 sm:w-52 sm:h-52 transform -rotate-90 drop-shadow-xs"
            >
              {/* Background ring */}
              <circle
                cx="100"
                cy="100"
                r={radius}
                fill="none"
                stroke="#f1f5f9"
                strokeWidth={strokeWidth}
              />
              {/* Segments */}
              {segments.map((seg) => {
                if (seg.count === 0) return null;
                const isHovered = hoveredStatus === seg.status;
                return (
                  <circle
                    key={seg.status}
                    cx="100"
                    cy="100"
                    r={radius}
                    fill="none"
                    stroke={isHovered ? seg.config.hoverColor : seg.config.color}
                    strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={seg.strokeDasharray}
                    strokeDashoffset={seg.strokeDashoffset}
                    className="transition-all duration-300 cursor-pointer"
                    onMouseEnter={() => setHoveredStatus(seg.status)}
                    onMouseLeave={() => setHoveredStatus(null)}
                  />
                );
              })}
            </svg>

            {/* Donut Center Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              {hoveredStatus ? (
                <>
                  <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                    {STATUS_CONFIG[hoveredStatus]?.label}
                  </span>
                  <span className="text-2xl font-black text-slate-900">
                    {statusCounts[hoveredStatus] || 0}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-700">
                    {Math.round(((statusCounts[hoveredStatus] || 0) / totalDonations) * 100)}%
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                    Total
                  </span>
                  <span className="text-2xl font-black text-slate-900">{totalDonations}</span>
                  <span className="text-[10px] text-slate-400">Listings</span>
                </>
              )}
            </div>
          </div>

          {/* Legend Grid */}
          <div className="md:col-span-6 space-y-2">
            {segments.map((seg) => (
              <div
                key={seg.status}
                onMouseEnter={() => setHoveredStatus(seg.status)}
                onMouseLeave={() => setHoveredStatus(null)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                  hoveredStatus === seg.status
                    ? `${seg.config.bg} ${seg.config.border} shadow-xs`
                    : 'bg-white border-slate-100 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: seg.config.color }}
                  />
                  <span className="font-bold text-slate-800">{seg.config.label}</span>
                </div>
                <div className="flex items-center space-x-3 font-mono">
                  <span className="font-black text-slate-900">{seg.count}</span>
                  <span className="text-[11px] font-semibold text-slate-400 w-10 text-right">
                    {seg.percent}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 2. DONATIONS BY CATEGORY BAR CHART (Section 7.B)
// ============================================================================
interface CategoryBarChartProps {
  distribution: Record<string, number>;
  totalDonations: number;
}

export const CategoryBarChart: React.FC<CategoryBarChartProps> = ({
  distribution,
  totalDonations,
}) => {
  const entries = Object.entries(distribution).sort((a, b) => b[1] - a[1]);
  const maxCount = entries.length > 0 ? Math.max(...entries.map(([, c]) => c)) : 1;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Tag className="w-4 h-4 text-emerald-600" />
            <span>Donations by Category</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Distribution across registered donation categories
          </p>
        </div>
        <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-slate-100 text-slate-700">
          {entries.length} Categories
        </span>
      </div>

      {entries.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-400">
          No categories recorded in database.
        </div>
      ) : (
        <div className="space-y-3 pt-2">
          {entries.map(([cat, count]) => {
            const pct = Math.round((count / (totalDonations || 1)) * 100);
            const barWidth = Math.round((count / maxCount) * 100);
            return (
              <div key={cat} className="space-y-1.5 group">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-800">{cat}</span>
                  <div className="flex items-center space-x-2 font-mono">
                    <span className="font-bold text-slate-900">{count}</span>
                    <span className="text-[11px] text-slate-400">({pct}%)</span>
                  </div>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-emerald-600 to-teal-500 rounded-full transition-all duration-500 group-hover:brightness-110"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 3. DONATIONS BY CITY BAR CHART (Section 7.C)
// ============================================================================
interface CityBarChartProps {
  distribution: Record<string, number>;
  totalDonations: number;
}

export const CityBarChart: React.FC<CityBarChartProps> = ({ distribution, totalDonations }) => {
  const entries = Object.entries(distribution).sort((a, b) => b[1] - a[1]);
  const maxCount = entries.length > 0 ? Math.max(...entries.map(([, c]) => c)) : 1;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            <span>Donations by City</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Geographical dispersion of donor activity
          </p>
        </div>
        <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-slate-100 text-slate-700">
          {entries.length} Cities
        </span>
      </div>

      {entries.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-400">
          No city records found in database.
        </div>
      ) : (
        <div className="space-y-3 pt-2">
          {entries.map(([city, count]) => {
            const pct = Math.round((count / (totalDonations || 1)) * 100);
            const barWidth = Math.round((count / maxCount) * 100);
            return (
              <div key={city} className="space-y-1.5 group">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-800">{city}</span>
                  <div className="flex items-center space-x-2 font-mono">
                    <span className="font-bold text-slate-900">{count}</span>
                    <span className="text-[11px] text-slate-400">({pct}%)</span>
                  </div>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-blue-600 to-indigo-500 rounded-full transition-all duration-500 group-hover:brightness-110"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 4. DONATION TREND OVER TIME LINE CHART (Section 7.D)
// ============================================================================
interface DonationTrendProps {
  trend: TimeTrendPoint[];
}

export const DonationTrendLineChart: React.FC<DonationTrendProps> = ({ trend }) => {
  const [hoveredPoint, setHoveredPoint] = useState<TimeTrendPoint | null>(null);

  if (trend.length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2 mb-4">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <span>Donation Trend Over Time</span>
        </h3>
        <div className="py-12 text-center text-xs text-slate-400">
          Insufficient temporal data to establish a chronological line trend.
        </div>
      </div>
    );
  }

  const svgWidth = 800;
  const svgHeight = 240;
  const paddingLeft = 50;
  const paddingRight = 35;
  const paddingTop = 25;
  const paddingBottom = 40;

  const innerWidth = svgWidth - paddingLeft - paddingRight;
  const innerHeight = svgHeight - paddingTop - paddingBottom;

  const maxVal = Math.max(...trend.map((t) => t.count), 5);

  const getX = (idx: number) => {
    if (trend.length === 1) return paddingLeft + innerWidth / 2;
    return paddingLeft + (idx / (trend.length - 1)) * innerWidth;
  };

  const getY = (val: number) => {
    return paddingTop + innerHeight - (val / maxVal) * innerHeight;
  };

  // Build path strings
  const pointsString = trend.map((t, idx) => `${getX(idx)},${getY(t.count)}`).join(' ');
  const areaPath = `M ${getX(0)},${paddingTop + innerHeight} L ${pointsString} L ${getX(
    trend.length - 1
  )},${paddingTop + innerHeight} Z`;
  const linePath = `M ${pointsString.replace(/ /g, ' L ')}`;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>Donation Trend Over Time</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Chronological aggregation by month derived from actual creation timestamps
          </p>
        </div>

        {hoveredPoint && (
          <div className="text-xs font-mono px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800">
            <span className="font-bold">{hoveredPoint.period}: </span>
            <span>{hoveredPoint.count} donations</span> ({hoveredPoint.quantity} items)
          </div>
        )}
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-56 sm:h-64 select-none font-sans"
        >
          <defs>
            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = paddingTop + innerHeight * (1 - ratio);
            const val = Math.round(maxVal * ratio);
            return (
              <g key={ratio}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[10px] fill-slate-400 font-mono"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          <path d={areaPath} fill="url(#trendGradient)" />

          {/* Main Line */}
          <path
            d={linePath}
            fill="none"
            stroke="#059669"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {trend.map((t, idx) => {
            const x = getX(idx);
            const y = getY(t.count);
            const isHovered = hoveredPoint?.period === t.period;
            return (
              <g
                key={t.period}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPoint(t)}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 6 : 4}
                  fill="#ffffff"
                  stroke="#059669"
                  strokeWidth={isHovered ? 3 : 2}
                  className="transition-all duration-200"
                />
                {/* X-axis label */}
                <text
                  x={x}
                  y={paddingTop + innerHeight + 18}
                  textAnchor="middle"
                  className="text-[10px] fill-slate-500 font-medium"
                >
                  {t.period}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

// ============================================================================
// 5. CATEGORY VS STATUS MULTIDIMENSIONAL STACKED BAR CHART (Section 7.E)
// ============================================================================
interface CategoryVsStatusProps {
  data: CategoryStatusBreakdown[];
}

export const CategoryVsStatusStackedBarChart: React.FC<CategoryVsStatusProps> = ({ data }) => {
  const [activeSegment, setActiveSegment] = useState<{ category: string; status: string; count: number } | null>(null);

  if (data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2 mb-4">
          <Layers className="w-4 h-4 text-indigo-600" />
          <span>Donation Status by Category</span>
        </h3>
        <div className="py-12 text-center text-xs text-slate-400">
          No records found for category-status cross analysis.
        </div>
      </div>
    );
  }

  const statuses = ['PENDING', 'ACCEPTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED'];

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Donation Status by Category</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Multidimensional cross-tabulation of donation categories versus status pipeline
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          {statuses.map((st) => (
            <div key={st} className="flex items-center space-x-1.5 font-medium text-slate-600">
              <span
                className="w-2.5 h-2.5 rounded-xs"
                style={{ backgroundColor: STATUS_CONFIG[st]?.color }}
              />
              <span>{STATUS_CONFIG[st]?.label}</span>
            </div>
          ))}
        </div>
      </div>

      {activeSegment && (
        <div className="text-xs font-mono px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 inline-block">
          <span className="font-bold">{activeSegment.category}: </span>
          <span>
            {STATUS_CONFIG[activeSegment.status]?.label} = {activeSegment.count} donation(s)
          </span>
        </div>
      )}

      <div className="space-y-3.5 pt-1">
        {data.map((row) => (
          <div key={row.category} className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-slate-800">{row.category}</span>
              <span className="font-mono text-slate-500">{row.total} total</span>
            </div>

            {/* Stacked Bar Track */}
            <div className="h-5 w-full bg-slate-100 rounded-lg overflow-hidden flex shadow-2xs">
              {statuses.map((st) => {
                const count = (row as any)[st.toLowerCase()] || 0;
                if (count === 0) return null;
                const widthPct = (count / row.total) * 100;
                return (
                  <div
                    key={st}
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor: STATUS_CONFIG[st]?.color,
                    }}
                    onMouseEnter={() =>
                      setActiveSegment({ category: row.category, status: st, count })
                    }
                    onMouseLeave={() => setActiveSegment(null)}
                    title={`${row.category} - ${STATUS_CONFIG[st]?.label}: ${count}`}
                    className="h-full transition-all duration-300 hover:brightness-110 cursor-pointer flex items-center justify-center text-[10px] text-white font-bold font-mono overflow-hidden px-1"
                  >
                    {widthPct > 8 && count}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// 6. OLAP CUBE CONCEPTUAL VISUAL (Section 18)
// ============================================================================
export const OLAPCubeConceptualVisual: React.FC = () => {
  return (
    <div className="p-5 rounded-2xl bg-linear-to-br from-slate-900 to-slate-950 border border-slate-800 text-white shadow-lg space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Conceptual Multidimensional OLAP Model
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          In-Memory Star Schema
        </span>
      </div>

      {/* Clean Conceptual Diagram */}
      <div className="py-2 flex flex-col items-center justify-center font-mono text-xs">
        {/* Top: Date Dimension */}
        <div className="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-semibold shadow-xs">
          DATE (Day ↓ Month ↓ Year)
        </div>
        <div className="w-0.5 h-6 bg-emerald-500/50" />

        {/* Middle Cross: City - Fact - Category */}
        <div className="flex items-center space-x-3 w-full max-w-md justify-center">
          <div className="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-blue-300 font-semibold shadow-xs">
            CITY (Geographic)
          </div>
          <div className="h-0.5 w-6 bg-emerald-500/50" />
          <div className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold border border-emerald-400/40 shadow-md text-center">
            <span className="block text-xs uppercase tracking-wider">DONATIONS</span>
            <span className="text-[9px] font-normal text-emerald-200 block mt-0.5">Central Fact</span>
          </div>
          <div className="h-0.5 w-6 bg-emerald-500/50" />
          <div className="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-teal-300 font-semibold shadow-xs">
            CATEGORY (Type)
          </div>
        </div>

        {/* Bottom: Status & NGO */}
        <div className="w-0.5 h-6 bg-emerald-500/50" />
        <div className="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-amber-300 font-semibold shadow-xs">
          STATUS (Lifecycle Pipeline)
        </div>
        <div className="w-0.5 h-4 bg-emerald-500/50" />
        <div className="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-indigo-300 font-semibold shadow-xs">
          NGO (Fulfillment Partner)
        </div>
      </div>

      {/* Measures Panel */}
      <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-bold uppercase text-slate-300">Supported Measures:</span>
          <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-400 font-mono text-[11px]">
            1. Donation Count [∑(1)]
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-800 text-indigo-400 font-mono text-[11px]">
            2. Total Quantity [∑(qty)]
          </span>
        </div>
        <span className="text-[10px] text-slate-500 italic">
          Computed on-the-fly without persistent physical data warehouse tables.
        </span>
      </div>
    </div>
  );
};

// ============================================================================
// 7. OLAP DYNAMIC VISUALIZATION (Section 17)
// ============================================================================
interface OLAPDynamicChartProps {
  pivotTable: OLAPPivotTable;
}

export const OLAPDynamicChart: React.FC<OLAPDynamicChartProps> = ({ pivotTable }) => {
  const { rowLabels, colLabels, matrix, measure, rowDimension, colDimension } = pivotTable;

  if (rowLabels.length === 0 || colLabels.length === 0) {
    return (
      <div className="p-6 bg-white rounded-xl border border-slate-200 text-center text-xs text-slate-400">
        No aggregated cell values to visualize for current dimensions.
      </div>
    );
  }

  // Calculate max row value for scale
  const rowTotals = rowLabels.map((r) => {
    return colLabels.reduce((sum, c) => {
      const cell = matrix[r]?.[c] || { count: 0, quantity: 0 };
      return sum + (measure === 'count' ? cell.count : cell.quantity);
    }, 0);
  });
  const maxRowTotal = Math.max(...rowTotals, 1);

  // Palette for column segments
  const palette = [
    '#059669',
    '#2563eb',
    '#d97706',
    '#7c3aed',
    '#0891b2',
    '#db2777',
    '#4b5563',
    '#ea580c',
  ];

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center space-x-2">
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            <span>
              OLAP Dynamic Visualization ({rowDimension} × {colDimension})
            </span>
          </h4>
          <p className="text-[11px] text-slate-500">
            Interactive visual representation of the active OLAP result table for measure:{' '}
            <span className="font-bold text-slate-800 uppercase">{measure}</span>
          </p>
        </div>

        {/* Column Segment Legend */}
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          {colLabels.map((col, idx) => (
            <div key={col} className="flex items-center space-x-1 font-medium text-slate-600">
              <span
                className="w-2.5 h-2.5 rounded-xs"
                style={{ backgroundColor: palette[idx % palette.length] }}
              />
              <span>{col}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 pt-2">
        {rowLabels.map((row, rIdx) => {
          const totalVal = rowTotals[rIdx];
          return (
            <div key={row} className="space-y-1">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-slate-800">{row}</span>
                <span className="font-mono text-slate-500">
                  {totalVal} {measure === 'count' ? 'listings' : 'units'}
                </span>
              </div>
              <div className="h-4 w-full bg-slate-100 rounded-md overflow-hidden flex shadow-2xs">
                {colLabels.map((col, cIdx) => {
                  const cell = matrix[row]?.[col] || { count: 0, quantity: 0 };
                  const val = measure === 'count' ? cell.count : cell.quantity;
                  if (val === 0) return null;
                  const widthPct = (val / maxRowTotal) * 100;
                  return (
                    <div
                      key={col}
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: palette[cIdx % palette.length],
                      }}
                      title={`${row} / ${col}: ${val}`}
                      className="h-full transition-all duration-300 hover:brightness-110 cursor-pointer flex items-center justify-center text-[9px] text-white font-mono font-bold px-0.5 overflow-hidden"
                    >
                      {widthPct > 5 && val}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// 8. CATEGORY DONUT CHART (For Key Insights)
// ============================================================================
interface CategoryDonutProps {
  distribution: Record<string, number>;
  totalDonations: number;
}

const CATEGORY_COLORS = [
  { color: '#10b981', hover: '#059669', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800' },
  { color: '#3b82f6', hover: '#2563eb', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800' },
  { color: '#f59e0b', hover: '#d97706', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800' },
  { color: '#8b5cf6', hover: '#7c3aed', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800' },
  { color: '#ec4899', hover: '#db2777', bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-800' },
  { color: '#06b6d4', hover: '#0891b2', bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-800' },
  { color: '#84cc16', hover: '#65a30d', bg: 'bg-lime-50', border: 'border-lime-200', text: 'text-lime-800' },
  { color: '#64748b', hover: '#475569', bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-800' },
];

export const CategoryDonutChart: React.FC<CategoryDonutProps> = ({
  distribution,
  totalDonations,
}) => {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  const entries = Object.entries(distribution).sort((a, b) => b[1] - a[1]);
  const hasData = entries.length > 0 && totalDonations > 0;

  const radius = 70;
  const strokeWidth = 26;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;
  const segments = entries.map(([cat, count], idx) => {
    const percent = totalDonations > 0 ? count / totalDonations : 0;
    const strokeDasharray = `${percent * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedPercent * circumference;
    accumulatedPercent += percent;
    const colorConfig = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];

    return {
      category: cat,
      count,
      percent: Math.round(percent * 100),
      strokeDasharray,
      strokeDashoffset,
      config: colorConfig,
    };
  });

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Tag className="w-4 h-4 text-emerald-600" />
            <span>Donation Category Distribution</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Proportion and volume of donations across recorded categories
          </p>
        </div>
        <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
          {totalDonations} Records
        </span>
      </div>

      {!hasData ? (
        <div className="py-12 text-center text-xs text-slate-400">
          No category data available.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Donut Graphic */}
          <div className="md:col-span-6 flex justify-center relative">
            <svg
              viewBox="0 0 200 200"
              className="w-48 h-48 sm:w-52 sm:h-52 transform -rotate-90 drop-shadow-xs"
            >
              {/* Background ring */}
              <circle
                cx="100"
                cy="100"
                r={radius}
                fill="none"
                stroke="#f1f5f9"
                strokeWidth={strokeWidth}
              />
              {/* Segments */}
              {segments.map((seg) => {
                if (seg.count === 0) return null;
                const isHovered = hoveredCategory === seg.category;
                return (
                  <circle
                    key={seg.category}
                    cx="100"
                    cy="100"
                    r={radius}
                    fill="none"
                    stroke={isHovered ? seg.config.hover : seg.config.color}
                    strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={seg.strokeDasharray}
                    strokeDashoffset={seg.strokeDashoffset}
                    className="transition-all duration-300 cursor-pointer"
                    onMouseEnter={() => setHoveredCategory(seg.category)}
                    onMouseLeave={() => setHoveredCategory(null)}
                  />
                );
              })}
            </svg>

            {/* Donut Center Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4 text-center">
              {hoveredCategory ? (
                <>
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider truncate max-w-[110px]">
                    {hoveredCategory}
                  </span>
                  <span className="text-2xl font-black text-slate-900">
                    {distribution[hoveredCategory] || 0}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-700">
                    {Math.round(((distribution[hoveredCategory] || 0) / totalDonations) * 100)}%
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    Categories
                  </span>
                  <span className="text-2xl font-black text-slate-900">{entries.length}</span>
                  <span className="text-[10px] text-slate-400">Total Types</span>
                </>
              )}
            </div>
          </div>

          {/* Interactive Legend with Tooltips */}
          <div className="md:col-span-6 space-y-2 max-h-56 overflow-y-auto pr-1">
            {segments.map((seg) => {
              const isHovered = hoveredCategory === seg.category;
              return (
                <div
                  key={seg.category}
                  onMouseEnter={() => setHoveredCategory(seg.category)}
                  onMouseLeave={() => setHoveredCategory(null)}
                  title={`${seg.category}: ${seg.count} donations (${seg.percent}%)`}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                    isHovered
                      ? `${seg.config.bg} ${seg.config.border} shadow-xs`
                      : 'bg-white border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate pr-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: seg.config.color }}
                    />
                    <span className="font-bold text-slate-800 truncate">{seg.category}</span>
                  </div>
                  <div className="flex items-center space-x-2.5 font-mono shrink-0">
                    <span className="font-black text-slate-900">{seg.count}</span>
                    <span className="text-[11px] font-semibold text-slate-400 w-10 text-right">
                      {seg.percent}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 9. CITY ACTIVITY HORIZONTAL BAR CHART (Section 5)
// ============================================================================
interface CityActivityHorizontalBarProps {
  distribution: Record<string, number>;
  totalDonations: number;
}

export const CityActivityHorizontalBarChart: React.FC<CityActivityHorizontalBarProps> = ({
  distribution,
  totalDonations,
}) => {
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);

  const entries = Object.entries(distribution).sort((a, b) => b[1] - a[1]);
  const maxCount = entries.length > 0 ? Math.max(...entries.map(([, c]) => c)) : 1;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            <span>Donation Activity by City</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Geographical distribution ranked by donation frequency
          </p>
        </div>
        <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-slate-100 text-slate-700">
          {entries.length} Cities
        </span>
      </div>

      {hoveredCity && (
        <div className="text-xs font-mono px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 inline-block">
          <span className="font-bold">{hoveredCity}: </span>
          <span>{distribution[hoveredCity] || 0} donations</span> (
          {Math.round(((distribution[hoveredCity] || 0) / (totalDonations || 1)) * 100)}% of total)
        </div>
      )}

      {entries.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-400">
          No city records found in database.
        </div>
      ) : (
        <div className="space-y-3 pt-2 max-h-80 overflow-y-auto pr-1">
          {entries.map(([city, count]) => {
            const pct = Math.round((count / (totalDonations || 1)) * 100);
            const barWidth = Math.round((count / maxCount) * 100);
            const isHovered = hoveredCity === city;

            return (
              <div
                key={city}
                onMouseEnter={() => setHoveredCity(city)}
                onMouseLeave={() => setHoveredCity(null)}
                className={`space-y-1.5 p-2 rounded-xl transition-all cursor-pointer ${
                  isHovered ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-800">{city}</span>
                  <div className="flex items-center space-x-2 font-mono">
                    <span className="font-bold text-slate-900">{count} donations</span>
                    <span className="text-[11px] text-slate-400 font-medium">({pct}%)</span>
                  </div>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-blue-600 to-indigo-500 rounded-full transition-all duration-300"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 10. NGO ACTIVITY BAR CHART (Section 6)
// ============================================================================
interface NGOActivityBarChartProps {
  metrics: NGOActivityMetric[];
  totalDonations: number;
}

export const NGOActivityBarChart: React.FC<NGOActivityBarChartProps> = ({
  metrics,
  totalDonations,
}) => {
  const [hoveredNgo, setHoveredNgo] = useState<NGOActivityMetric | null>(null);

  const activeMetrics = metrics.filter((m) => m.totalHandled > 0);
  const hasData = activeMetrics.length > 0;
  const maxHandled = hasData ? Math.max(...activeMetrics.map((m) => m.totalHandled)) : 1;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <span>NGO Donation Activity</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational volume handled and completed by partner charities
          </p>
        </div>
        <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-slate-100 text-slate-700">
          {activeMetrics.length} Active NGOs
        </span>
      </div>

      {hoveredNgo && (
        <div className="text-xs font-mono px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 inline-block">
          <span className="font-bold">{hoveredNgo.orgName}: </span>
          <span>{hoveredNgo.totalHandled} handled</span>, <span>{hoveredNgo.completedCount} completed</span> ({hoveredNgo.completionRate}% completion, {hoveredNgo.totalQuantity} items)
        </div>
      )}

      {!hasData ? (
        <div className="py-12 text-center space-y-2">
          <AlertCircle className="w-6 h-6 text-amber-500 mx-auto" />
          <p className="text-xs font-bold text-slate-700">Insufficient data for meaningful visualization.</p>
          <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
            No donations have been assigned to registered partner NGOs yet in the database.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5 pt-2 max-h-80 overflow-y-auto pr-1">
          {activeMetrics.map((ngo) => {
            const isHovered = hoveredNgo?.ngoId === ngo.ngoId;

            return (
              <div
                key={ngo.ngoId}
                onMouseEnter={() => setHoveredNgo(ngo)}
                onMouseLeave={() => setHoveredNgo(null)}
                className={`space-y-1.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isHovered ? 'bg-emerald-50/70 border-emerald-200 shadow-2xs' : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50'
                }`}
              >
                <div className="flex justify-between items-center text-xs">
                  <div className="truncate pr-2">
                    <span className="font-bold text-slate-900">{ngo.orgName}</span>
                    <span className="text-[10px] text-slate-400 ml-1.5 font-medium">({ngo.city})</span>
                  </div>
                  <div className="flex items-center space-x-2 font-mono shrink-0">
                    <span className="font-bold text-emerald-800">{ngo.totalHandled} handled</span>
                    <span className="text-[10px] text-blue-700">({ngo.completedCount} completed)</span>
                  </div>
                </div>

                {/* Comparative Progress Bar */}
                <div className="h-3 w-full bg-slate-200/80 rounded-full overflow-hidden flex">
                  {/* Completed portion */}
                  <div
                    className="h-full bg-emerald-600 transition-all duration-300"
                    style={{
                      width: `${(ngo.completedCount / maxHandled) * 100}%`,
                    }}
                    title={`Completed: ${ngo.completedCount}`}
                  />
                  {/* Pending/In-progress portion */}
                  <div
                    className="h-full bg-emerald-300 transition-all duration-300"
                    style={{
                      width: `${((ngo.totalHandled - ngo.completedCount) / maxHandled) * 100}%`,
                    }}
                    title={`Pending: ${ngo.totalHandled - ngo.completedCount}`}
                  />
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                  <span>Qty: {ngo.totalQuantity} items</span>
                  <span>Completion Rate: {ngo.completionRate}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
