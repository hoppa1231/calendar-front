import { toISO, formatDate, icons } from "./utils.js";

const monthNames = [
  "Янв",
  "Фев",
  "Мар",
  "Апр",
  "Май",
  "Июн",
  "Июл",
  "Авг",
  "Сен",
  "Окт",
  "Ноя",
  "Дек",
];

const weekdayNames = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export function renderCalendarViews(data, filters, els) {
  const selectedTypes = filters.selectedTypes || [];
  const employeesFilter = filters.employeeIds || [];
  const filtered = (data || [])
    .map((item) => ({
      ...item,
      events: item.events.filter((e) => selectedTypes.includes(e.type) && employeesFilter.length === 0 ? true : employeesFilter.includes(item.employee.id)),
    }))
    .filter((item) => item.events.length > 0);
  const dayStats = buildDayStats(filtered);
  const employees = new Set(filtered.map((item) => item.employee.id));

  if (els.heroEmployees) els.heroEmployees.textContent = String(employees.size);
  if (els.eventCount) els.eventCount.textContent = `${dayStats.size} отмеченных дней`;
  if (els.rangeSummary) {
    els.rangeSummary.textContent = buildRangeSummary(filters.start, filters.end);
    if (els.rangeSummary.classList.contains("chip-filter")) {
      els.rangeSummary.innerHTML += icons.filter;
    }
  }

  renderYearGrid(dayStats, filters.start);
}

function buildRangeSummary(start, end) {
  if (!start || !end) return "—";
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diff = Math.round((endDate - startDate) / 86400000) + 1;
  return `${formatDate(startDate)} — ${formatDate(endDate)} · ${diff} дн. `;
}


function buildDayStats(data) {
  const stats = new Map();

  data.forEach((item) => {
    item.events.forEach((event) => {
      const full_name = item.employee.full_name;
      const start = new Date(event.start);
      const end = new Date(event.end);

      const tooltipData = {
        full_name,
        type: event.type,
        start: event.start,
        end: event.end
       };
      const cursor = new Date(start);
      while (cursor <= end) {
        const key = toISO(cursor);
        if (!stats.has(key)) {
          stats.set(key, {
            vacation: new Set(),
            business_trip: new Set(),
            tooltipData: []
          });
        }
        stats.get(key)[event.type].add(item.employee.id);
        stats.get(key).tooltipData.push(tooltipData);
        cursor.setDate(cursor.getDate() + 1);
      }
    });
  });

  return stats;
}

function renderYearGrid(dayStats, startDate) {
  const container = document.getElementById("year-calendar");
  if (!container) return;
  container.innerHTML = "";

  const baseYear = new Date().getFullYear();

  for (let month = 0; month < 12; month++) {
    const monthEl = document.createElement("div");
    monthEl.className = "month-block";

    const title = document.createElement("div");
    title.className = "month-title";
    title.innerHTML = `<span>${monthNames[month]}</span><span class="muted small">${baseYear}</span>`;
    monthEl.appendChild(title);

    const weekdayRow = document.createElement("div");
    weekdayRow.className = "weekday-row";
    weekdayNames.forEach((w) => {
      const span = document.createElement("span");
      span.textContent = w;
      weekdayRow.appendChild(span);
    });
    monthEl.appendChild(weekdayRow);

    const daysGrid = document.createElement("div");
    daysGrid.className = "days-grid";

    const firstDayOffset = weekdayIndex(new Date(baseYear, month, 1).getDay());
    for (let i = 0; i < firstDayOffset; i++) {
      const placeholder = document.createElement("div");
      placeholder.className = "day placeholder";
      daysGrid.appendChild(placeholder);
    }

    const daysInMonth = new Date(baseYear, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = toISO(new Date(baseYear, month, day));
      const stat = dayStats.get(dateStr);
      const dayEl = document.createElement("div");
      dayEl.className = "day";

      const numberEl = document.createElement("div");
      numberEl.className = "day-number";
      numberEl.textContent = day;
      dayEl.appendChild(numberEl);

      if (stat) {
        const vac = stat.vacation.size;
        const trip = stat.business_trip.size;
        const total = vac + trip;
        const badgeWrap = document.createElement("div");
        badgeWrap.className = "day-badges";

        if (vac > 0) {
          const b = document.createElement("span");
          b.className = "badge mini vacation";
          b.textContent = `${vac} О`;
          badgeWrap.appendChild(b);
        }
        if (trip > 0) {
          const b = document.createElement("span");
          b.className = "badge mini business_trip";
          b.textContent = `${trip} К`;
          badgeWrap.appendChild(b);
        }

        dayEl.appendChild(badgeWrap);
        dayEl.classList.add("active");
        dayEl.dataset.tooltip = JSON.stringify(stat.tooltipData);

        const intensity = Math.min(0.7, 0.2 + total * 0.1);
        const vacColor = `rgba(55, 208, 178, ${intensity})`;
        const tripColor = `rgba(244, 178, 61, ${intensity})`;

        if (vac > 0 && trip > 0) {
          dayEl.style.background = `linear-gradient(135deg, ${vacColor}, ${tripColor})`;
        } else if (vac > 0) {
          dayEl.style.background = vacColor;
        } else if (trip > 0) {
          dayEl.style.background = tripColor;
        }
      }

      daysGrid.appendChild(dayEl);
    }

    monthEl.appendChild(daysGrid);
    container.appendChild(monthEl);
  }
}

function weekdayIndex(day) {
  // Convert Sunday=0 to Monday=0
  return day === 0 ? 6 : day - 1;
}

function buildTooltipContent(full_name, events) {
  let content = `<strong>${full_name}</strong><br/>`;
  events.forEach((event) => {
    content += `${event.type === "vacation" ? "Отпуск" : "Командировка"}: ${formatDate(new Date(event.start))} — ${formatDate(new Date(event.end))}<br/>`;
  });

  return content;
}