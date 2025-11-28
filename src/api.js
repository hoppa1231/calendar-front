import { API_BASE } from "./utils.js";

async function request(url, options, errorMessage) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `${errorMessage || "Ошибка запроса"}. Ответ: ${text || res.status}`
    );
  }
  if (res.status === 204) return null;
  return res.json();
}

export function fetchCalendar(start, end) {
  const url = `${API_BASE}/calendar?start_date=${start}&end_date=${end}`;
  return request(url, {}, "Не удалось получить календарь");
}

export function fetchWorkload(start, end) {
  const url = `${API_BASE}/workload?start_date=${start}&end_date=${end}`;
  return request(url, {}, "Не удалось получить загрузку");
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
