export const API_BASE = "/api/v1";

export function toISO(date) {
  return new Date(date).toISOString().slice(0, 10);
}

export function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "short",
  });
}

export function translateType(type) {
  return type === "vacation" ? "Отпуск" : "Командировка";
}

export function bucket(dateString, mode) {
  const date = new Date(`${dateString}T00:00:00`);
  if (mode === "week") {
    const day = (date.getDay() + 6) % 7;
    const monday = addDays(date, -day);
    return toISO(monday);
  }
  if (mode === "month") {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}-01`;
  }
  return toISO(date);
}

export function parseJSON(jsonString) {
  if (typeof jsonString !== 'string' || !jsonString.trim()) {
    console.warn('Переданная строка пустая или не является строкой.');
    return null; // Если строка пустая или не является строкой, сразу возвращаем null
  }

  try {
    const parsedData = JSON.parse(jsonString);
    // Дополнительная проверка на валидность объекта (если нужно)
    if (typeof parsedData === 'object' && parsedData !== null) {
      return parsedData;
    } else {
      console.warn('Распарсенная строка не является объектом.');
      return null;
    }
  } catch (error) {
    console.error('Ошибка при парсинге JSON:', error);
    return null; // Возвращаем null в случае ошибки
  }
}

export function palette(index) {
  const colors = [
    { bg: "rgba(55, 208, 178, 0.35)", border: "rgba(55, 208, 178, 0.9)" },
    { bg: "rgba(244, 178, 61, 0.35)", border: "rgba(244, 178, 61, 0.9)" },
    { bg: "rgba(90, 158, 255, 0.35)", border: "rgba(90, 158, 255, 0.9)" },
    { bg: "rgba(255, 99, 146, 0.35)", border: "rgba(255, 99, 146, 0.9)" },
    { bg: "rgba(160, 119, 255, 0.35)", border: "rgba(160, 119, 255, 0.9)" },
    { bg: "rgba(104, 234, 255, 0.35)", border: "rgba(104, 234, 255, 0.9)" },
  ];
  return colors[index % colors.length];
}

export const icons = {
  filter: '<svg xmlns="http://www.w3.org/2000/svg" width="1rem" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>',
  update: '<svg xmlns="http://www.w3.org/2000/svg" width="1rem" height="1rem" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 5.21 5.64L1 10m22 4l-4.21 4.36A9 9 0 0 1 3.51 15"/></svg>',
}