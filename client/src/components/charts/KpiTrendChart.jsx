// Chronological KPI trend chart with target reference line.
// Visualizes actual historical values over time and distinguishes baseline from updates.

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { TrendingUp, AlertCircle } from 'lucide-react';
import StatusBadge from '../common/StatusBadge.jsx';
import Loader from '../common/Loader.jsx';
import ErrorState from '../common/ErrorState.jsx';
import { formatNumber } from '../../utils/formatters.js';
import { transformTrendData } from '../../utils/trendUtils.js';

// Custom Dot to visually distinguish the initial baseline from subsequent updates
function CustomDot(props) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;

  if (payload?.isBaseline) {
    // Initial baseline: distinct ring with diamond/accent styling
    return (
      <g key={`baseline-dot-${payload.id}`}>
        <circle cx={cx} cy={cy} r={7} fill="#818cf8" fillOpacity={0.3} />
        <circle cx={cx} cy={cy} r={4.5} fill="#4f46e5" stroke="#ffffff" strokeWidth={2} />
      </g>
    );
  }

  // Standard update: solid circle dot
  return (
    <circle
      key={`dot-${payload?.id || cx}`}
      cx={cx}
      cy={cy}
      r={3.5}
      fill="#4f46e5"
      stroke="#ffffff"
      strokeWidth={1.5}
    />
  );
}

// Custom Tooltip rendering detailed metadata
function CustomTooltip({ active, payload, unit }) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs max-w-xs z-50">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-2">
        <span className="font-medium text-slate-700">{data.fullDate}</span>
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
            data.isBaseline
              ? 'bg-purple-100 text-purple-700'
              : 'bg-slate-100 text-slate-700'
          }`}
        >
          {data.changeTypeLabel}
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-slate-500">Recorded Value:</span>
          <span className="font-semibold text-slate-900">
            {formatNumber(data.value)} {unit}
          </span>
        </div>

        {data.target != null && (
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Target:</span>
            <span className="font-medium text-slate-700">
              {formatNumber(data.target)} {unit}
            </span>
          </div>
        )}

        <div className="flex justify-between items-center pt-0.5">
          <span className="text-slate-500">Status:</span>
          <StatusBadge status={data.status} />
        </div>

        <div className="flex justify-between items-center text-slate-400 text-[11px] pt-1 border-t border-slate-100">
          <span>By: {data.changedByName}</span>
        </div>

        {data.note && (
          <div className="mt-1.5 p-1.5 bg-slate-50 rounded border border-slate-100 italic text-slate-600 break-words">
            "{data.note}"
          </div>
        )}
      </div>
    </div>
  );
}

export default function KpiTrendChart({
  items = [],
  target = null,
  unit = '',
  loading = false,
  error = null,
  onRetry,
}) {
  const chartData = useMemo(
    () => transformTrendData(items, target),
    [items, target]
  );

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-brand-600" />
          <h3 className="font-semibold text-slate-900">Performance Trend & Target Tracking</h3>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-brand-600 rounded-full inline-block" />
            <span>Actual Value</span>
          </div>
          {target != null && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-b border-dashed border-amber-500 inline-block" />
              <span>Target ({formatNumber(target)} {unit})</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border border-brand-600 bg-purple-100 inline-block" />
            <span>Baseline</span>
          </div>
        </div>
      </div>

      {loading && <Loader label="Loading trend data…" />}

      {!loading && error && (
        <ErrorState
          message={error.message || 'Failed to load trend analytics'}
          onRetry={onRetry}
        />
      )}

      {!loading && !error && chartData.length === 0 && (
        <div className="py-12 text-center text-slate-500 text-sm">
          <AlertCircle size={24} className="mx-auto text-slate-400 mb-2" />
          <p className="font-medium text-slate-700">No historical data available to plot trend.</p>
          <p className="text-xs text-slate-400 mt-1">
            Historical value changes and baseline measurements will appear here chronologically.
          </p>
        </div>
      )}

      {!loading && !error && chartData.length > 0 && (
        <div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 15, right: 25, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="tickLabel"
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={{ stroke: '#cbd5e1' }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={{ stroke: '#cbd5e1' }}
                  tickFormatter={(val) => formatNumber(val)}
                  domain={['auto', 'auto']}
                />
                <Tooltip content={<CustomTooltip unit={unit} />} />

                {target != null && (
                  <ReferenceLine
                    y={Number(target)}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: `Target: ${formatNumber(target)} ${unit}`,
                      position: 'top',
                      fill: '#b45309',
                      fontSize: 11,
                    }}
                  />
                )}

                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#4f46e5"
                  strokeWidth={2.5}
                  dot={<CustomDot />}
                  activeDot={{ r: 6, fill: '#4f46e5', stroke: '#ffffff', strokeWidth: 2 }}
                  name="Value"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {chartData.length === 1 && (
            <div className="mt-3 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md p-2.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
              <span>
                Initial baseline recorded at {formatNumber(chartData[0].value)} {unit}.
                As additional value updates are logged, the historical trajectory line will extend.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
