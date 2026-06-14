// Calcula o primeiro e o último dia de um mês como strings "yyyy-MM-dd",
// sem passar por toISOString() (que converte para UTC e pode "voltar"
// um dia em timezones positivos, perdendo transações do último dia do mês).
export function getMonthRange(year, month) {
  const lastDayDate = new Date(year, month, 0);

  const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = `${lastDayDate.getFullYear()}-${String(lastDayDate.getMonth() + 1).padStart(2, "0")}-${String(lastDayDate.getDate()).padStart(2, "0")}`;

  return { firstDay, lastDay };
}
