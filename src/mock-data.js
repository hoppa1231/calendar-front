import { addDays, toISO } from "./utils.js";

const MOCK_EMPLOYEES = [
  { id: 101, full_name: "Алексей Смирнов" },
  { id: 102, full_name: "Мария Иванова" },
  { id: 103, full_name: "Игорь Кузнецов" },
  { id: 104, full_name: "Дарья Павлова" },
];

export function buildMockCalendar(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const daysCount = Math.max(1, Math.round((endDate - startDate) / 86400000));

  return MOCK_EMPLOYEES.map((emp, idx) => {
    const events = [];
    // Сделаем по одной командировке и одному отпуску на сотрудника, чтобы увидеть заполнение
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

    return {
      employee: emp,
      events,
    };
  });
}

export function buildMockWorkload(start, end) {
  const range = buildRange(start, end);

  const employees = MOCK_EMPLOYEES.map((emp, idx) => {
    const workload = range.map((date, i) => ({
      date,
      percent: clampPercent(40 + (idx + 1) * 8 + Math.sin(i / 3 + idx) * 20),
    }));
    return { employee: emp, workload };
  });

  const total = range.map((date, i) => {
    const sum = employees.reduce((acc, emp) => acc + emp.workload[i].percent, 0);
    const avg = sum / employees.length;
    return { date, percent: clampPercent(avg) };
  });

  return { employees, total };
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
