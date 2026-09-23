export function formatAgeInYearsAndMonths(birthDate: string, today = new Date()): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsedDate = new Date(year, month - 1, day);

  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    return null;
  }

  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();

  let years = currentYear - year;
  let months = currentMonth - month;

  if (currentDay < day) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years < 0) return null;

  const yearLabel = years === 1 ? "ano" : "anos";
  const monthLabel = months === 1 ? "mês" : "meses";
  return `${years} ${yearLabel} e ${months} ${monthLabel}`;
}
