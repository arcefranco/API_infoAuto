export default function fechaActual() {
  const fecha = new Date();
  const fechaFormateada = fecha.toISOString().split("T")[0]; // Obtiene la parte de la fecha en formato YYYY-MM-DD
  return `${fechaFormateada} 00:00:00`;
}
