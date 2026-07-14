import type { ReactNode } from "react";

export type ChartDatum = {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly detail: string;
};

export type BarChartProps = {
  readonly title: string;
  readonly description: string;
  readonly values: ReadonlyArray<ChartDatum>;
  readonly valueLabel: string;
};

export type LineChartProps = {
  readonly title: string;
  readonly description: string;
  readonly values: ReadonlyArray<ChartDatum>;
  readonly valueLabel: string;
};

function readableNumber(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2);
}

function tableId(title: string): string {
  return `table-${title.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`;
}

function lineChartTickIndices(valueCount: number): ReadonlySet<number> {
  const maximumTickCount = 6;

  if (valueCount <= maximumTickCount) {
    return new Set(Array.from({ length: valueCount }, (_, index) => index));
  }

  const lastIndex = valueCount - 1;
  const intervalCount = maximumTickCount - 1;
  const indices = new Set<number>();

  for (let interval = 0; interval <= intervalCount; interval += 1) {
    indices.add(Math.round((interval / intervalCount) * lastIndex));
  }

  return indices;
}

export type TabularAlternativeProps = {
  readonly title: string;
  readonly values: ReadonlyArray<ChartDatum>;
  readonly valueLabel: string;
};

export function TabularAlternative({ title, values, valueLabel }: TabularAlternativeProps): ReactNode {
  const id = tableId(title);

  return (
    <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <summary className="cursor-pointer text-sm font-semibold text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950">
        View the accessible data table
      </summary>
      <div className="mt-3 overflow-x-auto">
        <table aria-labelledby={id} className="min-w-full border-collapse text-left text-sm">
          <caption className="mb-2 text-left font-medium text-slate-700" id={id}>
            {title}
          </caption>
          <thead className="border-b border-slate-300 text-slate-700">
            <tr>
              <th className="px-2 py-2 font-semibold" scope="col">
                Label
              </th>
              <th className="px-2 py-2 font-semibold" scope="col">
                {valueLabel}
              </th>
              <th className="px-2 py-2 font-semibold" scope="col">
                Detail
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {values.map((value) => (
              <tr className="odd:bg-white" key={value.id}>
                <th className="px-2 py-2 font-medium text-slate-900" scope="row">
                  {value.label}
                </th>
                <td className="px-2 py-2 text-slate-700">{readableNumber(value.value)}</td>
                <td className="px-2 py-2 text-slate-700">{value.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function noData(title: string): ReactNode {
  return <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">No data is available for {title.toLowerCase()} under the active filters.</p>;
}

export function BarChart({ title, description, values, valueLabel }: BarChartProps): ReactNode {
  if (values.length === 0) {
    return noData(title);
  }

  const maximum = Math.max(...values.map((value) => value.value), 0);
  const minimum = Math.min(...values.map((value) => value.value), 0);
  const range = maximum - minimum || 1;
  const height = Math.max(140, values.length * 34 + 44);
  const chartTitleId = `${tableId(title)}-chart-title`;
  const chartDescriptionId = `${tableId(title)}-chart-description`;

  return (
    <figure className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <figcaption className="mb-3">
        <h3 className="text-base font-semibold text-slate-950">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      </figcaption>
      <div className="overflow-x-auto">
        <svg aria-describedby={chartDescriptionId} aria-labelledby={chartTitleId} className="min-w-160 w-full" role="img" viewBox={`0 0 640 ${height}`}>
          <title id={chartTitleId}>{title}</title>
          <desc id={chartDescriptionId}>{description}</desc>
          {values.map((value, index) => {
            const y = 22 + index * 34;
            const zero = 250 + ((0 - minimum) / range) * 360;
            const valuePosition = 250 + ((value.value - minimum) / range) * 360;
            const x = Math.min(zero, valuePosition);
            const width = Math.abs(valuePosition - zero);
            const fill = value.value < 0 ? "#b91c1c" : "#0f766e";

            return (
              <g key={value.id}>
                <text fill="#334155" fontSize="13" x="8" y={y + 16}>
                  {value.label}
                </text>
                <line stroke="#94a3b8" strokeWidth="1" x1={zero} x2={zero} y1={y - 3} y2={y + 21} />
                <rect fill={fill} height="18" rx="4" width={width} x={x} y={y} />
                <text fill="#0f172a" fontSize="13" fontWeight="600" x={620} y={y + 15} textAnchor="end">
                  {readableNumber(value.value)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <TabularAlternative title={title} valueLabel={valueLabel} values={values} />
    </figure>
  );
}

export function LineChart({ title, description, values, valueLabel }: LineChartProps): ReactNode {
  if (values.length === 0) {
    return noData(title);
  }

  const maximum = Math.max(...values.map((value) => value.value), 1);
  const minimum = Math.min(...values.map((value) => value.value), 0);
  const range = maximum - minimum || 1;
  const width = 640;
  const height = 260;
  const left = 50;
  const right = 18;
  const top = 24;
  const bottom = 52;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const divisor = values.length > 1 ? values.length - 1 : 1;
  const points = values
    .map((value, index) => {
      const x = left + (index / divisor) * plotWidth;
      const y = top + (1 - (value.value - minimum) / range) * plotHeight;
      return `${x},${y}`;
    })
    .join(" ");
  const tickIndices = lineChartTickIndices(values.length);
  const chartTitleId = `${tableId(title)}-chart-title`;
  const chartDescriptionId = `${tableId(title)}-chart-description`;

  return (
    <figure className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <figcaption className="mb-3">
        <h3 className="text-base font-semibold text-slate-950">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      </figcaption>
      <div className="overflow-x-auto">
        <svg aria-describedby={chartDescriptionId} aria-labelledby={chartTitleId} className="min-w-160 w-full" role="img" viewBox={`0 0 ${width} ${height}`}>
          <title id={chartTitleId}>{title}</title>
          <desc id={chartDescriptionId}>{description}</desc>
          <line stroke="#cbd5e1" strokeWidth="1" x1={left} x2={width - right} y1={top + plotHeight} y2={top + plotHeight} />
          <line stroke="#cbd5e1" strokeWidth="1" x1={left} x2={left} y1={top} y2={top + plotHeight} />
          <polyline fill="none" points={points} stroke="#0369a1" strokeWidth="3" />
          {values.map((value, index) => {
            const x = left + (index / divisor) * plotWidth;
            const y = top + (1 - (value.value - minimum) / range) * plotHeight;
            const axisLabel = tickIndices.has(index) ? (
              <text fill="#334155" fontSize="10" textAnchor="middle" x={x} y={height - 24}>
                {value.label}
              </text>
            ) : null;

            return (
              <g key={value.id}>
                <circle cx={x} cy={y} fill="#0369a1" r="4" />
                {axisLabel}
              </g>
            );
          })}
          <text fill="#334155" fontSize="12" textAnchor="end" x={left - 8} y={top + 4}>
            {readableNumber(maximum)}
          </text>
          <text fill="#334155" fontSize="12" textAnchor="end" x={left - 8} y={top + plotHeight}>
            {readableNumber(minimum)}
          </text>
        </svg>
      </div>
      <TabularAlternative title={title} valueLabel={valueLabel} values={values} />
    </figure>
  );
}
