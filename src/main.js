import { fetchCalendar, fetchWorkload, fetchDepartments, fetchEmployees, createEvent, patchData, updateEventLevel, deleteEvent } from "./api.js";
import { renderCalendarViews } from "./calendar-view.js";
import { renderWorkloadViews } from "./workload-view.js";
import { addDays, toISO, parseJSON } from "./utils.js";
import AutocompleteInput from "./obj/autocomplete.js"
import { buildMockCalendar, buildMockWorkload, buildMockDepartments, buildMockEmployees } from "./mock-data.js";

const state = {
  calendar: [],
  workload: null,
  departments: [],
  employees: [],
  selectedRange: null,
  selectedDepartment: null,
  selectedEmployee: null,
};
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
  eventType: document.getElementById("event-type"),
  eventStart: document.getElementById("event-start"),
  eventEnd: document.getElementById("event-end"),
  apiBaseLabel: document.getElementById("api-base-label"),
  btnToCalendar: document.getElementById("to-calendar"),
  btnToWorkload: document.getElementById("to-workload"),
  themeToggle: document.getElementById("theme-toggle"),
  slideSection: document.getElementById("slide-section"),
  autocompleteContainers: [...document.querySelectorAll(".autocomplete-container")],
  applyFilter: document.getElementById("apply-filter"),
  resetFilter: document.getElementById("reset-filter"),
  tooltip: document.getElementById("tooltip"),
  createModal: document.getElementById("create-modal"),
  createModalClose: document.getElementById("create-modal-close"),
  createModalOverlay: document.getElementById("create-modal-overlay"),
  createRangeLabel: document.getElementById("create-range-label"),
};

const dragSelection = {
  anchor: null,
  start: null,
  end: null,
  dragging: false,
  moved: false,
};

const callback = {
  resetFilterEmployee: () => {},
  resetFilterDepartment: () => {},
};

document.addEventListener("DOMContentLoaded", () => {
  setDefault();
  applyTheme(loadTheme());
  if (els.apiBaseLabel) {
    els.apiBaseLabel.textContent = window.__API_BASE__ || "/api/v1";
  }
  bindEvents();
  loadData();
  console.log("Application initialized", state);
});

function bindEvents() {
  bindTooltipEvents();
  bindModalEvents();
  bindDaySelection();
  bindSlideSectionEvents();
  bindApprovalClicks();

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

  els.autocompleteContainers.forEach((container) => {
    let apiUrl = "/";
    let primaryParam = "name";
    let minLength = 1;

    switch (container.dataset.id) {
      case "":
        console.warn("Autocomplete container missing data-id");
        return;
      case "employee-input":
        apiUrl = "local_employees";
        primaryParam = "full_name";
        break;
      case "employee-filter":
        apiUrl = "local_employees_filter";
        primaryParam = "full_name";
        break;
      case "department-filter":
        apiUrl = "local_departments_filter";
        minLength = 0;
        break;
      default:
        console.warn(`Unknown autocomplete container ID: ${container.dataset.id}`);
        return;
    }
    const input = new AutocompleteInput({
      container: container,
      apiUrl: apiUrl,
      placeholder: container.dataset.placeholder,
      minLength: minLength,
      extraParams: state,
      primaryParam: primaryParam,
    });

    switch (container.dataset.id) {
      case "employee-input":
        callback.resetFilterEmployee = () => input.clearInput();
        break;
      case "department-filter":
        callback.resetFilterDepartment = () => input.clearInput();
        break;
    }
  });

  els.createForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await submitEvent(e);
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
  els.applyFilter?.addEventListener("click", () => {
    syncEmployeeSelection();
    renderCalendar();
    renderWorkload();
    showMessage("Фильтры применены", "success");
  });

  els.resetFilter.style.cursor = "pointer";
  els.resetFilter?.addEventListener("click", () => {
    state.selectedDepartment = null;
    state.selectedEmployee = null;
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
    patchData();
    const [departments, employees, calendar, workload] = await Promise.all([
      fetchDepartments(),
      fetchEmployees(),
      fetchCalendar(start, end),
      fetchWorkload(start, end),
    ]);
    state.departments = departments || [];
    state.employees = normalizeEmployees(employees || []);
    state.calendar = mergeLocalEventsIntoCalendar(calendar || [], loadLocalEvents());
    state.workload = workload || null;
  } catch (err) {
    console.error(err);
    usedMock = true;
    state.departments = buildMockDepartments();
    state.employees = normalizeEmployees(buildMockEmployees());
    state.calendar = mergeLocalEventsIntoCalendar(
      buildMockCalendar(start, end, state.employees),
      loadLocalEvents()
    );
    state.workload = buildMockWorkload(start, end, state.employees);
  }

  syncSelections();

  renderCalendar();
  renderWorkload();

  showMessage(
    usedMock ? "Сервер недоступен, показаны мок-данные" : "Готово",
    usedMock ? "warning" : "success"
  );
}

function bindSlideSectionEvents() {
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
}

function getEmployeesByDepartment() {
  if (!state.selectedDepartment) return state.employees;
  return state.employees.filter((emp) =>
    employeeInDepartment(emp, state.selectedDepartment)
  );
}

function getSelectedEmployeeIds() {
  if (state.selectedEmployee) return [state.selectedEmployee];
  return getEmployeesByDepartment().map((emp) => emp.id);
}

function syncSelections() {
  state.selectedDepartment = normalizeId(state.selectedDepartment);
  state.selectedEmployee = normalizeId(state.selectedEmployee);
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
  state.selectedDepartment = normalizeId(state.selectedDepartment);
  state.selectedEmployee = normalizeId(state.selectedEmployee);
  const allowed = getEmployeesByDepartment();
  console.log("Allowed employees after sync:", allowed);
  if (state.selectedEmployee && !allowed.some((e) => e.id === state.selectedEmployee)) {
    state.selectedEmployee = null;
    console.log("Selected employee reset due to department filter");
  }
}

function employeeInDepartment(emp, departmentId) {
  if (!departmentId) return true;
  const deps = Array.isArray(emp.department_ids)
    ? emp.department_ids
    : emp.department_id
    ? [emp.department_id]
    : [];
  return deps.includes(departmentId);
}

function renderCalendar() {
  renderCalendarViews(
    state.calendar,
    {
      selectedTypes: getSelectedTypes(),
      start: els.start?.value,
      end: els.end?.value,
      employeesIds: getSelectedEmployeeIds(),
    },
    {
      heroEmployees: els.heroEmployees,
      eventCount: els.eventCount,
      rangeSummary: els.rangeSummary,
    }
  );
  applySelectionHighlight();
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

async function submitEvent(e) {
  const payload = {
    employee_id: Number(e.target.querySelector('input[name="employee-input"]')?.dataset.selectedId),
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
    showMessage(`Событие создано (id: ${result?.id || "-"})`, "success");
    closeCreateModal();
    loadData();
  } catch (err) {
    const localEvent = { ...payload, id: `local-${Date.now()}` };
    addLocalEvent(localEvent);
    appendLocalEventToState(localEvent);
    renderCalendar();
    closeCreateModal();
    showMessage("Сервер не отвечает. Событие сохранено локально", "warning");
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
  if (!allowed.size) return { employees: [], total: [] };
  if (allowed.size === workload.employees.length) return workload;

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

function bindApprovalClicks() {
  document.addEventListener("click", async (e) => {
    const overline = e.target.closest(".day-overline");
    if (!overline) return;

    const dayEl = overline.closest(".day");
    const raw = dayEl?.dataset.tooltip;
    const tooltipData = parseJSON(raw) || [];
    const pending = tooltipData.filter((item) => item.level === "saved");
    if (!pending.length) return;

    const selection = await showApprovalModal(pending);
    if (!selection || selection.length === 0) return;

    showMessage("Отправляем согласование...", "info");
    try {
      for (const id of selection) {
        await updateEventLevel(id, "approved");
      }
      showMessage("События согласованы", "success");
      await loadData();
    } catch (err) {
      showMessage(err.message || "Не удалось согласовать событие", "error");
    }
  });
}

function removeEventFromState(id) {
  state.calendar = (state.calendar || []).map(item => ({
    ...item,
    events: (item.events || []).filter(e => e.id !== id),
  })).filter(item => item.events.length > 0);
}


function showApprovalModal(pending) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "approval-overlay";

    const modal = document.createElement("div");
    modal.className = "approval-modal";

    const header = document.createElement("div");
    header.className = "approval-header";
    header.innerHTML = `<h3>Согласование событий</h3>`;

    const closeBtn = document.createElement("button");
    closeBtn.className = "chip";
    closeBtn.textContent = "×";
    closeBtn.addEventListener("click", () => {
      cleanup();
      resolve(null);
    });
    header.appendChild(closeBtn);

    const list = document.createElement("div");
    list.className = "approval-list";

    pending.forEach((item) => {
      const row = document.createElement("label");
      row.className = "approval-item";
      const checkbox = document.createElement("input");
      checkbox.className = "checkbox";
      checkbox.type = "checkbox";
      checkbox.checked = true;
      checkbox.value = item.id;
      const info = document.createElement("div");
      info.innerHTML = `<strong>${item.full_name}</strong><br>${humanType(item.type)} ${item.start} — ${item.end}`;
      row.appendChild(checkbox);
      row.appendChild(info);
      list.appendChild(row);
    });

    const actions = document.createElement("div");
    actions.className = "approval-actions";
    const approveBtn = document.createElement("button");
    approveBtn.className = "btn primary";
    approveBtn.textContent = "Согласовать выбранные";
    approveBtn.addEventListener("click", () => {
      const ids = Array.from(list.querySelectorAll("input[type='checkbox']:checked")).map((c) =>
        Number(c.value)
      );
      cleanup();
      resolve(ids);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn ghost";
    deleteBtn.style.cursor = "pointer";
    deleteBtn.textContent = "Удалить";
    deleteBtn.addEventListener("click", () => {
      const ids = Array.from(list.querySelectorAll("input[type='checkbox']:checked")).map((c) =>
        Number(c.value)
      );
      ids.forEach(async (id) => {
        try {
          await deleteEvent(id);
          removeEventFromState(id);
          renderCalendar();
          renderWorkload();
        } catch (err) {
          console.error("Failed to delete event id:", id, err);
        }
      });
      cleanup();
      resolve(null);
    });

    actions.appendChild(deleteBtn);
    actions.appendChild(approveBtn);

    modal.appendChild(header);
    modal.appendChild(list);
    modal.appendChild(actions);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    function cleanup() {
      overlay.remove();
    }
  });
}

function normalizeEmployees(list) {
  return (list || []).map((emp) => {
    const depsRaw = emp.department_ids || emp.department_id || [];
    const department_ids = Array.isArray(depsRaw)
      ? depsRaw.map((d) => Number(d)).filter(Number.isFinite)
      : Number.isFinite(Number(depsRaw))
      ? [Number(depsRaw)]
    : [];
    return { ...emp, department_ids };
  });
}

function normalizeId(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function bindDaySelection() {
  const calendar = document.getElementById("year-calendar");
  if (!calendar || calendar.dataset.selectionBound) return;
  calendar.dataset.selectionBound = "1";

  calendar.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    const info = getDayInfo(e.target);
    if (!info) return;
    e.preventDefault();
    dragSelection.anchor = info.date;
    dragSelection.start = info.date;
    dragSelection.end = info.date;
    dragSelection.dragging = true;
    dragSelection.moved = false;
  });

  calendar.addEventListener("mouseover", (e) => {
    if (!dragSelection.dragging) return;
    const info = getDayInfo(e.target);
    if (!info) return;
    if (dragSelection.end !== info.date) {
      dragSelection.start = dragSelection.anchor;
      dragSelection.end = info.date;
      dragSelection.moved = true;
      applySelectionHighlight();
    }
  });

  calendar.addEventListener("contextmenu", (e) => {
    const info = getDayInfo(e.target);
    if (!info) return;
    const range = getPersistedRange();
    if (!range) return;
    if (isDateWithinRange(info.date, range)) {
      e.preventDefault();
      openCreateModal(range);
    }
  });

  document.addEventListener("mouseup", () => {
    if (!dragSelection.dragging) return;
    const hadMovement = dragSelection.moved;
    dragSelection.dragging = false;
    dragSelection.moved = false;
    if (!dragSelection.start || !dragSelection.end) return;

    const existing = getPersistedRange();
    if (!hadMovement && existing && isDateWithinRange(dragSelection.start, existing)) {
      applySelectionHighlight();
      fillFormWithRange(existing.start, existing.end);
      return;
    }

    const range = normalizeRange(dragSelection.start, dragSelection.end);
    state.selectedRange = { start: toISO(range.start), end: toISO(range.end) };
    applySelectionHighlight();
    fillFormWithRange(range.start, range.end);
  });
}

function getDayInfo(target) {
  const el = target.closest(".day");
  if (!el || el.classList.contains("placeholder")) return null;
  const { date } = el.dataset;
  if (!date) return null;
  return { el, date };
}

function toDateOnly(value) {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  return new Date(`${value}T00:00:00`);
}

function normalizeRange(startValue, endValue) {
  const startDate = toDateOnly(startValue);
  const endDate = toDateOnly(endValue);
  if (startDate <= endDate) return { start: startDate, end: endDate };
  return { start: endDate, end: startDate };
}

function isDateWithinRange(dateString, range) {
  const current = toDateOnly(dateString);
  return current >= range.start && current <= range.end;
}

function getPersistedRange() {
  if (!state.selectedRange?.start || !state.selectedRange?.end) return null;
  return normalizeRange(state.selectedRange.start, state.selectedRange.end);
}

function getActiveRange() {
  if (dragSelection.dragging && dragSelection.start && dragSelection.end) {
    return normalizeRange(dragSelection.start, dragSelection.end);
  }
  return getPersistedRange();
}

function applySelectionHighlight() {
  const calendar = document.getElementById("year-calendar");
  if (!calendar) return;
  const range = getActiveRange();
  calendar.querySelectorAll(".day").forEach((day) => {
    const dateStr = day.dataset.date;
    if (!dateStr) {
      day.classList.remove("selected");
      return;
    }
    if (!range) {
      day.classList.remove("selected");
      return;
    }
    const current = toDateOnly(dateStr);
    const inRange = current >= range.start && current <= range.end;
    day.classList.toggle("selected", inRange);
  });
}

function fillFormWithRange(startDate, endDate) {
  if (!startDate || !endDate) return;
  if (els.eventStart) els.eventStart.value = toISO(startDate);
  if (els.eventEnd) els.eventEnd.value = toISO(endDate);
  if (els.createRangeLabel) {
    els.createRangeLabel.textContent = `${toISO(startDate)} — ${toISO(endDate)}`;
  }
}

function bindModalEvents() {
  els.createModalClose?.addEventListener("click", closeCreateModal);
  els.createModalOverlay?.addEventListener("click", closeCreateModal);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeCreateModal();
  });
}

function openCreateModal(range) {
  if (!els.createModal) return;
  const start = range?.start || range?.end || new Date();
  const end = range?.end || range?.start || start;
  fillFormWithRange(start, end);
  els.createModal.classList.add("open");
  els.createModal.setAttribute("aria-hidden", "false");
}

function closeCreateModal() {
  if (!els.createModal) return;
  els.createModal.classList.remove("open");
  els.createModal.setAttribute("aria-hidden", "true");
}

function loadLocalEvents() {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem("local_events") || "[]";
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn("Cannot load local events", e);
    return [];
  }
}

function saveLocalEvents(list) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem("local_events", JSON.stringify(list || []));
  } catch (e) {
    console.warn("Cannot save local events", e);
  }
}

function addLocalEvent(event) {
  const list = loadLocalEvents();
  list.push(event);
  saveLocalEvents(list);
}

function mergeLocalEventsIntoCalendar(calendar, localEvents) {
  if (!localEvents?.length) return calendar;
  const result = calendar.map((item) => ({
    employee: item.employee,
    events: [...(item.events || [])],
  }));

  const byId = new Map(result.map((item) => [item.employee.id, item]));
  localEvents.forEach((evt) => {
    const emp = state.employees?.find((e) => e.id === evt.employee_id);
    if (!emp) return;
    const holder = byId.get(emp.id) || { employee: emp, events: [] };
    holder.events.push({
      type: evt.type,
      start: evt.start,
      end: evt.end,
      local: true,
      id: evt.id,
    });
    if (!byId.has(emp.id)) {
      byId.set(emp.id, holder);
      result.push(holder);
    }
  });
  return result;
}

function appendLocalEventToState(evt) {
  state.calendar = mergeLocalEventsIntoCalendar(state.calendar || [], [evt]);
}

function bindTooltipEvents() {
  let delayTimeout = null;

  document.addEventListener("mouseover", (e) => {
    const t = e.target.closest(".day.active");
    if (!t) return;

    clearTimeout(delayTimeout);
    delayTimeout = setTimeout(() => {
      let parseData = parseJSON(e.target.dataset.tooltip);
      if (!parseData) {
        parseData = parseJSON(e.target.parentElement.dataset.tooltip);
        if (!parseData) {
          parseData = parseJSON(e.target.parentElement.parentElement.dataset.tooltip);
        }
      }
      createTooltip(parseData || []);
    }, 150);

    positionTooltip(e);
  });

  document.addEventListener("mouseout", (e) => {
    if (e.target.closest(".day.active") && 
        !e.relatedTarget?.closest(".day.active")) {
      clearTimeout(delayTimeout);
      tooltip.classList.remove("tooltip_visible");
      tooltip.setAttribute('aria-hidden', 'true');
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (!tooltip.classList.contains('tooltip_visible')) return;
    positionTooltip(e);
  });
}

function positionTooltip(e) {
  const offset = 12; // отступ от курсора
  let x = e.clientX + offset;
  let y = e.clientY + offset;

  const ttRect = tooltip.getBoundingClientRect();
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;

  // если не помещается справа — переносим влево
  if (x + ttRect.width > vw) {
    x = e.clientX - ttRect.width - offset;
  }
  // если не помещается снизу — поднимаем выше
  if (y + ttRect.height > vh) {
    y = e.clientY - ttRect.height - offset;
  }

  tooltip.style.left = x + 'px';
  tooltip.style.top = y + 'px';
}

function createTooltip(data) {
    if (data.length != 0) {
      tooltip.innerHTML = "";
      data.forEach((item) => {
        // Преобразуем дату в формат "1 янв"
        const startDate = new Date(item.start);
        const endDate = new Date(item.end);

        // Форматирование даты
        const options = { day: 'numeric', month: 'short' };
        const startFormatted = startDate.toLocaleDateString('ru-RU', options);
        const endFormatted = endDate.toLocaleDateString('ru-RU', options);

        const tooltipItem = document.createElement('div');
        tooltipItem.classList.add('tooltip-item', 'fl-col');
        tooltipItem.innerHTML = `
            <span class="tooltip-item__full_name">${item.full_name}</span>
            <span class="tooltip-item__period">${startFormatted} — ${endFormatted}</span>
        `;
        if (item.level === 'saved') {
          const redCircle = document.createElement('div');
          redCircle.classList.add('tooltip-item__red-circle');
          tooltipItem.insertAdjacentElement('afterbegin', redCircle);
        }

        let color;
        if (item.type === "vacation") { color = "--accent"; }
        else if (item.type === "business_trip") { color = "--accent-2"; }
        tooltipItem.style.borderLeft = `var(${color}) 2px solid`;
        tooltip.appendChild(tooltipItem);
      });
      tooltip.classList.add("tooltip_visible");
      tooltip.setAttribute('aria-hidden', 'false');
  } else {
    tooltip.classList.remove("tooltip_visible");
  }
}

function humanType(type) {
  if (type === "vacation") return "отпуск";
  if (type === "business_trip") return "командировка";
  return type || "событие";
}
