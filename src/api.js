import { API_BASE } from "./utils.js";

const REQUEST_TIMEOUT = 2500;
const MOCK_KEY_UPDATES = "mock_updates";
const MOCK_KEY_DELETES = "mock_deletes";

async function request(url, options = {}, errorMessage) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${errorMessage || "Запрос завершился ошибкой"}. Ответ: ${text || res.status}`);
    }
    if (res.status === 204) return null;
    return res.json();
  } finally {
    clearTimeout(timeout);
  }
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
  return request(url, { method: "PATCH" }, "Не удалось обновить данные");
}

export async function updateEventLevel(eventId, level) {
  try {
    return await request(
      `${API_BASE}/events/${eventId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_level: level }),
      },
      "Не удалось обновить событие"
    );
  } catch (err) {
    mockStoreUpdate(eventId, level);
    return { mocked: true };
  }
}

export async function deleteEvent(eventId) {
  try {
    return await request(
      `${API_BASE}/events/${eventId}`,
      { method: "DELETE" },
      "Не удалось удалить событие"
    );
  } catch (err) {
    mockStoreDelete(eventId);
    return { mocked: true };
  }
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

export function getMockUpdates() {
  try {
    return JSON.parse(localStorage.getItem(MOCK_KEY_UPDATES) || "{}");
  } catch {
    return {};
  }
}

export function getMockDeletes() {
  try {
    return JSON.parse(localStorage.getItem(MOCK_KEY_DELETES) || "[]");
  } catch {
    return [];
  }
}

function mockStoreUpdate(eventId, level) {
  try {
    const store = getMockUpdates();
    store[eventId] = { level };
    localStorage.setItem(MOCK_KEY_UPDATES, JSON.stringify(store));
  } catch (e) {
    console.warn("Cannot persist mock update", e);
  }
}

function mockStoreDelete(eventId) {
  try {
    const store = getMockDeletes();
    if (!store.includes(eventId)) store.push(eventId);
    localStorage.setItem(MOCK_KEY_DELETES, JSON.stringify(store));
  } catch (e) {
    console.warn("Cannot persist mock delete", e);
  }
}
