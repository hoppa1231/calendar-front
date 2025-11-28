import { bucket, palette } from "./utils.js";

const charts = { daily: null, weekly: null, monthly: null };

export function renderWorkloadViews(workload, els) {
  if (!workload || !workload.total) {
    if (els.avgLoad) els.avgLoad.textContent = "—";
    if (els.peakLoad) els.peakLoad.textContent = "—";
    if (els.workloadTable) {
      els.workloadTable.innerHTML = '<p class="muted">Нет данных о загрузке.</p>';
    }
    destroyCharts();
    return;
  }

  const totals = workload.total.map((item) => item.percent);
  const avg =
    totals.length > 0
      ? (totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(1)
      : "0.0";
  const peak = totals.length > 0 ? Math.max(...totals).toFixed(1) : "0.0";

  if (els.avgLoad) els.avgLoad.textContent = `Средняя: ${avg}%`;
  if (els.peakLoad) els.peakLoad.textContent = `Пик: ${peak}%`;

  renderWorkloadTable(workload.employees, els.workloadTable);
  renderCharts(workload);
}

function renderWorkloadTable(employees, container) {
  if (!container) return;
  if (!employees || !employees.length) {
    container.innerHTML = '<p class="muted">Нет данных.</p>';
    return;
  }

  const rows = employees
    .map((item) => {
      const values = item.workload.map((w) => w.percent);
      const avg =
        values.length > 0
          ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)
          : "0.0";
      const peak = values.length > 0 ? Math.max(...values).toFixed(1) : "0.0";
      return `<tr><td>${item.employee.full_name}</td><td>${avg}%</td><td>${peak}%</td></tr>`;
    })
    .join("");

  container.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Сотрудник</th>
            <th>Средняя загрузка</th>
            <th>Пиковая нагрузка</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
}

function renderCharts(workload) {
  destroyCharts();
  const dailyCtx = document.getElementById("daily-chart");
  const weeklyCtx = document.getElementById("weekly-chart");
  const monthlyCtx = document.getElementById("monthly-chart");

  if (!dailyCtx || !weeklyCtx || !monthlyCtx) return;

  const dailyLabels = workload.total.map((item) => item.date);
  const dailyValues = workload.total.map((item) => item.percent);

  charts.daily = new Chart(dailyCtx, {
    type: "line",
    data: {
      labels: dailyLabels,
      datasets: [
        {
          label: "Команда",
          data: dailyValues,
          borderColor: "rgba(55, 208, 178, 0.9)",
          backgroundColor: "rgba(55, 208, 178, 0.25)",
          fill: true,
          tension: 0.25,
        },
      ],
    },
    options: baseChartOptions("дни"),
  });

  const weekly = buildStackedSeries(workload.employees, "week");
  charts.weekly = new Chart(weeklyCtx, {
    type: "bar",
    data: weekly,
    options: stackedChartOptions("недели"),
  });

  const monthly = buildStackedSeries(workload.employees, "month");
  charts.monthly = new Chart(monthlyCtx, {
    type: "bar",
    data: monthly,
    options: stackedChartOptions("месяцы"),
  });
}

function destroyCharts() {
  Object.keys(charts).forEach((key) => {
    if (charts[key]) {
      charts[key].destroy();
      charts[key] = null;
    }
  });
}

function baseChartOptions(scope) {
  return {
    responsive: true,
    plugins: {
      legend: {
        labels: { color: "#e8f0ff" },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.parsed.y}%`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: "#9fb2ca" },
        grid: { color: "rgba(255,255,255,0.05)" },
      },
      y: {
        ticks: { color: "#9fb2ca" },
        grid: { color: "rgba(255,255,255,0.05)" },
        suggestedMax: 120,
        title: { display: true, text: `Загрузка (${scope})`, color: "#9fb2ca" },
      },
    },
  };
}

function stackedChartOptions(scope) {
  const opts = baseChartOptions(scope);
  opts.scales.x.stacked = true;
  opts.scales.y.stacked = true;
  opts.plugins.legend.position = "bottom";
  return opts;
}

function buildStackedSeries(employees, mode) {
  const labelsSet = new Set();
  const seriesMap = new Map();

  employees.forEach((item) => {
    const buckets = new Map();
    item.workload.forEach((entry) => {
      const key = bucket(entry.date, mode);
      const agg = buckets.get(key) || { sum: 0, count: 0 };
      agg.sum += entry.percent;
      agg.count += 1;
      buckets.set(key, agg);
      labelsSet.add(key);
    });
    seriesMap.set(item.employee.full_name, buckets);
  });

  const labels = Array.from(labelsSet).sort();

  let idx = 0;
  const datasets = Array.from(seriesMap.entries()).map(([name, buckets]) => {
    const color = palette(idx++);
    return {
      label: name,
      data: labels.map((label) => {
        const agg = buckets.get(label);
        if (!agg) return 0;
        return +(agg.sum / agg.count).toFixed(1);
      }),
      backgroundColor: color.bg,
      borderColor: color.border,
      borderWidth: 1,
      stack: "stack",
    };
  });

  return { labels, datasets };
}
