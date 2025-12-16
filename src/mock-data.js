import { addDays, toISO } from "./utils.js";

export const MOCK_DEPARTMENTS = [
  { id: 1, name: "Разработка" },
  { id: 2, name: "Продажи" },
  { id: 3, name: "Маркетинг" },
  { id: 4, name: "Поддержка" },
];

export const MOCK_EMPLOYEES = [
  { id: 101, full_name: "Анна Петрова", department_ids: [1] },
  { id: 102, full_name: "Игорь Смирнов", department_ids: [1, 3] },
  { id: 103, full_name: "Елена Орлова", department_ids: [2] },
  { id: 104, full_name: "Дмитрий Ковалёв", department_ids: [3] },
  { id: 105, full_name: "Мария Соколова", department_ids: [4] },
  { id: 106, full_name: "Сергей Иванов", department_ids: [2, 4] },
];

export function buildMockDepartments() {
  return [...MOCK_DEPARTMENTS];
}

export function buildMockEmployees() {
  return [...MOCK_EMPLOYEES];
}

export function buildMockCalendar(start, end, employees = MOCK_EMPLOYEES) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const daysCount = Math.max(1, Math.round((endDate - startDate) / 86400000));

  return employees.map((emp, idx) => {
    const events = [];
    const vacStart = addDays(startDate, (idx * 5) % daysCount);
    const vacEnd = addDays(vacStart, 4);
    if (vacStart <= endDate) {
      events.push({
        type: "vacation",
        start: toISO(vacStart),
        end: toISO(vacEnd <= endDate ? vacEnd : endDate),
      });
    }

    const tripStart = addDays(startDate, (idx * 7 + 10) % daysCount);
    const tripEnd = addDays(tripStart, 2);
    if (tripStart <= endDate) {
      events.push({
        type: "business_trip",
        start: toISO(tripStart),
        end: toISO(tripEnd <= endDate ? tripEnd : endDate),
      });
    }

    return { employee: emp, events };
  });
}

export function buildMockWorkload(start, end, employees = MOCK_EMPLOYEES) {
  const range = buildRange(start, end);

  const employeesWithLoad = employees.map((emp, idx) => {
    const workload = range.map((date, i) => ({
      date,
      percent: clampPercent(40 + (idx + 1) * 8 + Math.sin(i / 3 + idx) * 20),
    }));
    return { employee: emp, workload };
  });

  const total = range.map((date, i) => {
    const sum = employeesWithLoad.reduce((acc, emp) => acc + emp.workload[i].percent, 0);
    const avg = sum / employeesWithLoad.length;
    return { date, percent: clampPercent(avg) };
  });

  return { employees: employeesWithLoad, total };
}

function buildRange(start, end) {
  const result = [];
  let cursor = new Date(start);
  const endDate = new Date(end);
  while (cursor <= endDate) {
    result.push(toISO(cursor));
    cursor = addDays(cursor, 1);
  }
  return result;
}

function clampPercent(value) {
  if (value < 0) return 0;
  if (value > 130) return 130;
  return Number(value.toFixed(1));
}
