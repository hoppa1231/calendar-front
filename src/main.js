import { fetchCalendar, fetchWorkload, createEvent } from "./api.js";
import { renderCalendarViews } from "./calendar-view.js";
import { renderWorkloadViews } from "./workload-view.js";
import { addDays, toISO } from "./utils.js";
import { buildMockCalendar, buildMockWorkload } from "./mock-data.js";

const state = { calendar: [], workload: null };
const THEME_KEY = "calendar_theme";

const els = {
  start: document.getElementById("start-date"),
  end: document.getElementById("end-date"),
  refresh: document.getElementById("refresh-button"),
  types: [...document.querySelectorAll('input[type="checkbox"]')],
  quickRange: [...document.querySelectorAll(".quick-ranges .chip[data-range]")],
  heroEmployees: document.getElementById("hero-employees"),
  rangeSummary: document.getElementById("range-summary"),
  eventCount: document.getElementById("event-count"),
  avgLoad: document.getElementById("avg-load"),
  peakLoad: document.getElementById("peak-load"),
  workloadTable: document.getElementById("workload-table"),
  message: document.getElementById("global-message"),
  createForm: document.getElementById("create-event-form"),
  employeeId: document.getElementById("employee-id"),
  eventType: document.getElementById("event-type"),
  eventStart: document.getElementById("event-start"),
  eventEnd: document.getElementById("event-end"),
  apiBaseLabel: document.getElementById("api-base-label"),
  btnToCalendar: document.getElementById("to-calendar"),
  btnToWorkload: document.getElementById("to-workload"),
  themeToggle: document.getElementById("theme-toggle"),
  slideSection: document.getElementById("slide-section"),
};

document.addEventListener("DOMContentLoaded", () => {
  setDefaultRange();
  applyTheme(loadTheme());
  if (els.apiBaseLabel) {
    els.apiBaseLabel.textContent = window.__API_BASE__ || "/api/v1";
  }
  bindEvents();
  loadData();
});

function bindEvents() {
  els.refresh?.addEventListener("click", (e) => {
    e.preventDefault();
    loadData();
  });

  els.types.forEach((checkbox) =>
    checkbox.addEventListener("change", () => {
      renderCalendar();
    })
  );

  els.quickRange.forEach((button) => {
    button.addEventListener("click", () => {
      const days = Number(button.dataset.range || 30);
      const end = new Date();
      const start = addDays(end, -days);
      els.start.value = toISO(start);
      els.end.value = toISO(end);
      loadData();
    });
  });

  els.createForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await submitEvent();
  });

  els.btnToCalendar?.addEventListener("click", () => {
    els.btnToCalendar.classList.add("ghost");
    els.btnToCalendar.classList.remove("primary");

    els.btnToWorkload.classList.add("primary");
    els.btnToWorkload.classList.remove("ghost");

    els.slideSection.style.transform = "translateX(0%)";
  });

  els.btnToWorkload?.addEventListener("click", () => {
    els.btnToWorkload.classList.add("ghost");
    els.btnToWorkload.classList.remove("primary");

    els.btnToCalendar.classList.add("primary");
    els.btnToCalendar.classList.remove("ghost");

    els.slideSection.style.transform = "translateX(-52%)";
  });

  els.themeToggle?.addEventListener("click", () => {
    const nextTheme = loadTheme() === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    saveTheme(nextTheme);
  });
}

function setDefaultRange() {
  const today = new Date();
  const start = new Date(today.getFullYear(), 0, 1);
  const end = new Date(today.getFullYear(), 11, 31);
  if (els.start) els.start.value = toISO(start);
  if (els.end) els.end.value = toISO(end);
  if (els.eventStart) els.eventStart.value = toISO(today);
  if (els.eventEnd) els.eventEnd.value = toISO(addDays(today, 5));
}

async function loadData() {
  const start = els.start?.value;
  const end = els.end?.value;

  const validationError = validateRange(start, end);
  if (validationError) {
    showMessage(validationError, "warning");
    return;
  }

  showMessage("Обновляем данные…", "info");
  let usedMock = false;
  try {
    const [calendar, workload] = await Promise.all([
      fetchCalendar(start, end),
      fetchWorkload(start, end),
    ]);
    state.calendar = calendar || [];
    state.workload = workload || null;
  } catch (err) {
    console.error(err);
    usedMock = true;
    state.calendar = buildMockCalendar(start, end);
    state.workload = buildMockWorkload(start, end);
  }

  renderCalendar();
  renderWorkloadViews(state.workload, {
    avgLoad: els.avgLoad,
    peakLoad: els.peakLoad,
    workloadTable: els.workloadTable,
  });
  showMessage(
    usedMock ? "Сервер недоступен, показаны мок-данные" : "Готово",
    usedMock ? "warning" : "success"
  );
}

function renderCalendar() {
  renderCalendarViews(
    state.calendar,
    {
      selectedTypes: getSelectedTypes(),
      start: els.start?.value,
      end: els.end?.value,
    },
    {
      heroEmployees: els.heroEmployees,
      eventCount: els.eventCount,
      rangeSummary: els.rangeSummary,
    }
  );
}

function getSelectedTypes() {
  return els.types.filter((c) => c.checked).map((c) => c.value);
}

async function submitEvent() {
  const payload = {
    employee_id: Number(els.employeeId?.value),
    type: els.eventType?.value,
    start: els.eventStart?.value,
    end: els.eventEnd?.value,
  };

  if (!payload.employee_id || !payload.start || !payload.end || !payload.type) {
    showMessage("Заполните все поля для создания события", "warning");
    return;
  }

  if (new Date(payload.start) > new Date(payload.end)) {
    showMessage("Дата начала больше даты окончания", "error");
    return;
  }

  showMessage("Отправляем событие…", "info");
  try {
    const result = await createEvent(payload);
    showMessage(`Событие создано (id: ${result?.id || "—"})`, "success");
    loadData();
  } catch (err) {
    showMessage(err.message || "Ошибка при создании события", "error");
  }
}

function validateRange(start, end) {
  if (!start || !end) return "Выберите даты, чтобы загрузить данные";
  if (new Date(start) > new Date(end)) return "Дата начала позже даты окончания";
  return "";
}

function showMessage(text, tone = "info") {
  if (!els.message) return;
  els.message.textContent = text;
  els.message.className = `status ${tone}`;
}

function applyTheme(theme) {
  const body = document.body;
  if (theme === "dark") {
    body.classList.add("theme-dark");
    body.classList.remove("theme-light");
    if (els.themeToggle) els.themeToggle.textContent = "Светлая тема";
  } else {
    body.classList.add("theme-light");
    body.classList.remove("theme-dark");
    if (els.themeToggle) els.themeToggle.textContent = "Тёмная тема";
  }
}

function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (e) {
    console.warn("Cannot persist theme", e);
  }
}

function loadTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || "light";
  } catch (e) {
    return "light";
  }
}
