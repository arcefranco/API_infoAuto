export default function esDiaEspecifico(diaEspecifico) {
  const diasSemana = [
    "domingo",
    "lunes",
    "martes",
    "miercoles",
    "jueves",
    "viernes",
    "sabado",
  ];
  const hoy = new Date();
  const diaActual = hoy.getDay(); // 0 para domingo, 1 para lunes, ..., 6 para sábado
  console.log(diasSemana[diaActual]);
  return diasSemana[diaActual] === diaEspecifico.toLowerCase();
}
