export const API_BASE = window.__API_BASE__ || "/api/v1";

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
