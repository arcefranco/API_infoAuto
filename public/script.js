import axios from "axios";

document.addEventListener("DOMContentLoaded", () => {
  const formulario = document.getElementById("consultaForm");
  const resultadoElemento = document.getElementById("resultado");

  formulario.addEventListener("submit", async (event) => {
    event.preventDefault();

    const codia = formulario.elements.codia.value;
    const year = formulario.elements.year.value;
    const brand = formulario.elements.brand.value;
    const group = formulario.elements.group.value;
    const km = formulario.elements.km.value;

    try {
      const response = await axios.post("http://localhost:3000/proc", {
        codia: codia,
        year: year,
        brand: brand,
        group: group,
        km: km,
      });

      const resultado = response.data;

      resultadoElemento.textContent = `Resultado: ${resultado.result}`;
    } catch (error) {
      console.error("Error al realizar la consulta:", error);
    }
  });
});
