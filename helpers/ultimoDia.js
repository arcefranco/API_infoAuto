export default function esUltimoDiaDelMes() {
  const hoy = new Date();
  const mañana = new Date(hoy);
  mañana.setDate(mañana.getDate() + 1);
  return mañana.getDate() === 1;
}
