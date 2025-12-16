import { API_BASE } from "./utils.js";

async function request(url, options = {}, errorMessage) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${errorMessage || "Запрос завершился ошибкой"}. Ответ: ${text || res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export function fetchCalendar(start, end) {
  const url = `${API_BASE}/calendar?start_date=${start}&end_date=${end}`;
  return request(url, {}, "Не удалось получить события календаря");
}

export function fetchWorkload(start, end) {
  const url = `${API_BASE}/workload?start_date=${start}&end_date=${end}`;
  return request(url, {}, "Не удалось получить данные по загрузке");
}

export function fetchDepartments() {
  const url = `${API_BASE}/departments`;
  return request(url, {}, "Не удалось получить отделы");
}

export function fetchEmployees() {
  const url = `${API_BASE}/employees`;
  return request(url, {}, "Не удалось получить сотрудников");
}

export function patchData() {
  const url = `${API_BASE}/data`;
  return request(url, {}, "Не удалось синхронизировать данные");
}

export function createEvent(payload) {
  return request(
    `${API_BASE}/events`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    "Не удалось создать событие"
  );
}
