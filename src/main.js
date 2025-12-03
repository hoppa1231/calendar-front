import { fetchCalendar, fetchWorkload, fetchDepartments, fetchEmployees, createEvent } from "./api.js";
import { renderCalendarViews } from "./calendar-view.js";
import { renderWorkloadViews } from "./workload-view.js";
import { addDays, toISO } from "./utils.js";
import { buildMockCalendar, buildMockWorkload, buildMockDepartments, buildMockEmployees } from "./mock-data.js";

const state = { calendar: [], workload: null };
const THEME_KEY = "calendar_theme";

const els = {
  start: document.getElementById("start-date"),
  end: document.getElementById("end-date"),
  refresh: document.getElementById("refresh-button"),
  types: [...document.querySelectorAll('input[type="checkbox"]')],
  quickRange: [...document.querySelectorAll(".quick-ranges .chip[data-range]")],
  selectZeros: [...document.querySelectorAll(".select-zero")],
  cardBodyLoad: document.getElementById("card-body-load"),
  cardBodyFilter: document.getElementById("card-body-filter"),
  heroEmployees: document.getElementById("hero-employees"),
  rangeSummary: document.getElementById("range-summary"),
  rangeChange: document.getElementById("range-change"),
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
  departmentSelect: document.getElementById("department-filter"),
  employeeSelect: document.getElementById("employee-filter"),
  applyFilter: document.getElementById("apply-filter"),
  resetFilter: document.getElementById("reset-filter"),
};

document.addEventListener("DOMContentLoaded", () => {
  setDefault();
  applyTheme(loadTheme());
  if (els.apiBaseLabel) {
    els.apiBaseLabel.textContent = window.__API_BASE__ || "/api/v1";
  }
  bindEvents();
  loadData();
});

function bindEvents() {
  els.refresh?.addEventListener("click", async (e) => {
    e.preventDefault();
    els.refresh.children[0]?.classList.add("spin");
    await loadData();
    await new Promise(resolve => setTimeout(resolve, 100)); // Wait for 500ms
    els.refresh.children[0].classList.remove("spin");
  });

  els.types.forEach((checkbox) =>
    checkbox.addEventListener("change", () => renderCalendar())
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

  els.rangeSummary?.addEventListener("click", () => {
    if (els.rangeChange) {
      const visible = els.rangeChange.style.display === "block";
      els.rangeChange.style.display = visible ? "none" : "block";
    }
  });

  els.departmentSelect?.addEventListener("change", () => {
    state.selectedDepartment = parseSelectNumber(els.departmentSelect.value);
    syncEmployeeSelection();
    populateEmployeeSelect();
    renderCalendar();
    renderWorkload();
  });

  els.employeeSelect?.addEventListener("change", () => {
    state.selectedEmployee = parseSelectNumber(els.employeeSelect.value);
    renderCalendar();
    renderWorkload();
  });

  els.applyFilter?.addEventListener("click", () => {
    state.selectedDepartment = parseSelectNumber(els.departmentSelect.value);
    state.selectedEmployee = parseSelectNumber(els.employeeSelect.value);
    console.log("Applying filter:", state.selectedDepartment, state.selectedEmployee);
    syncEmployeeSelection();
    renderCalendar();
    renderWorkload();
    showMessage("Фильтры применены", "success");
  });

  els.resetFilter?.addEventListener("click", () => {
    state.selectedDepartment = null;
    state.selectedEmployee = null;
    populateDepartmentSelect();
    populateEmployeeSelect();
    renderCalendar();
    renderWorkload();
    showMessage("Фильтры сброшены", "info");
  });
}

function parseSelectNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
}

function setDefault() {
  els.selectZeros.forEach((select) => {
    const options = setDefaultCard(select);
    select.addEventListener("click", () => {
      const currentText = select.querySelector("h4").textContent;
      const nextText = options.find((opt) => opt !== currentText) || options[0];
      select.querySelector("h4").textContent = nextText;

      if (nextText === options[1]) {
        if (els.cardBodyLoad) els.cardBodyLoad.style.display = "none";
        if (els.cardBodyFilter) els.cardBodyFilter.style.display = "block";
      } else {
        if (els.cardBodyLoad) els.cardBodyLoad.style.display = "block";
        if (els.cardBodyFilter) els.cardBodyFilter.style.display = "none";
      }
    });
  });
  setDefaultRange();
}

function setDefaultRange() {
  const today = new Date();
  const start = new Date(today.getFullYear(), 0, 1);
  const end = new Date(today.getFullYear(), 11, 31);
  if (els.start) els.start.value = toISO(start);
  if (els.end) els.end.value = toISO(end);
}

function setDefaultCard(select) {
  const options = JSON.parse(select.dataset.options || '["Option 1", "Option 2"]');
  select.innerHTML = "<h4>" + options[0] + "</h4>";
  return options;
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
    const [departments, employees, calendar, workload] = await Promise.all([
      fetchDepartments(),
      fetchEmployees(),
      fetchCalendar(start, end),
      fetchWorkload(start, end),
    ]);
    state.departments = departments || [];
    state.employees = employees || [];
    state.calendar = calendar || [];
    state.workload = workload || null;
  } catch (err) {
    console.error(err);
    usedMock = true;
    state.departments = buildMockDepartments();
    state.employees = buildMockEmployees();
    state.calendar = buildMockCalendar(start, end, state.employees);
    state.workload = buildMockWorkload(start, end, state.employees);
  }

  syncSelections();
  populateDepartmentSelect();
  populateEmployeeSelect();

  renderCalendar();
  renderWorkload();

  showMessage(
    usedMock ? "Сервер недоступен, показаны мок-данные" : "Готово",
    usedMock ? "warning" : "success"
  );
}

function populateDepartmentSelect() {
  if (!els.departmentSelect) return;
  const current = state.selectedDepartment;
  els.departmentSelect.innerHTML = `<option value="">Все отделы</option>`;
  state.departments.forEach((dep) => {
    const opt = document.createElement("option");
    opt.value = String(dep.id);
    opt.textContent = dep.name;
    if (dep.id === current) opt.selected = true;
    els.departmentSelect.appendChild(opt);
  });
}

function populateEmployeeSelect() {
  if (!els.employeeSelect) return;
  const allowed = getEmployeesByDepartment();
  const current = state.selectedEmployee;
  els.employeeSelect.innerHTML = `<option value="">Все сотрудники</option>`;
  allowed.forEach((emp) => {
    const opt = document.createElement("option");
    opt.value = String(emp.id);
    opt.textContent = emp.full_name;
    if (emp.id === current) opt.selected = true;
    els.employeeSelect.appendChild(opt);
  });
  // Если выбранный сотрудник не подходит под текущий отдел — сбросить
  const stillValid = allowed.some((emp) => emp.id === current);
  if (!stillValid) {
    state.selectedEmployee = null;
    els.employeeSelect.value = "";
  }
}

function getEmployeesByDepartment() {
  if (!state.selectedDepartment) return state.employees;
  return state.employees.filter((emp) => emp.department_id === state.selectedDepartment);
}

function getSelectedEmployeeIds() {
  if (state.selectedEmployee) return [state.selectedEmployee];
  return getEmployeesByDepartment().map((emp) => emp.id);
}

function syncSelections() {
  // Отфильтровать отдел
  const depExists = state.selectedDepartment
    ? state.departments.some((d) => d.id === state.selectedDepartment)
    : true;
  if (!depExists) state.selectedDepartment = null;
  // Отфильтровать сотрудника
  const allowed = getEmployeesByDepartment();
  if (state.selectedEmployee && !allowed.some((e) => e.id === state.selectedEmployee)) {
    state.selectedEmployee = null;
  }
}

function syncEmployeeSelection() {
  const allowed = getEmployeesByDepartment();
  if (state.selectedEmployee && !allowed.some((e) => e.id === state.selectedEmployee)) {
    state.selectedEmployee = null;
  }
}

function renderCalendar() {
  renderCalendarViews(
    state.calendar,
    {
      selectedTypes: getSelectedTypes(),
      start: els.start?.value,
      end: els.end?.value,
      employeeIds: getSelectedEmployeeIds(),
    },
    {
      heroEmployees: els.heroEmployees,
      eventCount: els.eventCount,
      rangeSummary: els.rangeSummary,
    }
  );
}

function renderWorkload() {
  renderWorkloadViews(filterWorkload(state.workload, getSelectedEmployeeIds()), {
    avgLoad: els.avgLoad,
    peakLoad: els.peakLoad,
    workloadTable: els.workloadTable,
  });
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
    if (els.themeToggle) els.themeToggle.textContent = "Темная тема";
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

function filterWorkload(workload, employeeIds) {
  if (!workload || !workload.employees) return workload;
  const allowed = new Set(employeeIds || []);
  if (!allowed.size || allowed.size === workload.employees.length) return workload;

  const filteredEmployees = workload.employees.filter((emp) =>
    allowed.has(emp.employee.id)
  );

  if (!filteredEmployees.length) {
    return { employees: [], total: [] };
  }

  const total = workload.total.map((item, index) => {
    const sum = filteredEmployees.reduce(
      (acc, emp) => acc + (emp.workload?.[index]?.percent || 0),
      0
    );
    const avg = sum / filteredEmployees.length;
    return { date: item.date, percent: Number(avg.toFixed(1)) };
  });

  return { employees: filteredEmployees, total };
}
