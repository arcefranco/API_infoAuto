import axios from "axios";

document.addEventListener("DOMContentLoaded", () => {
  const formulario = document.getElementById("consultaForm");
  const resultadoElemento = document.getElementById("resultado");
  const porcentajeElemento = document.getElementById("porcentaje");
  const categoriaElemento = document.getElementById("categoria");
  formulario.addEventListener("submit", async (event) => {
    event.preventDefault();

    const codia = formulario.elements.codia.value;
    const year = formulario.elements.year.value;
    const brand = formulario.elements.brand.value;
    const group = formulario.elements.group.value;
    const km = formulario.elements.km.value;

    try {
      const response = await axios.post("/proc", {
        codia: codia,
        year: year,
        brand: brand,
        group: group,
        km: km,
      });

      const resultado = response.data;

      resultadoElemento.textContent = `Resultado: ${resultado.result}`;
      porcentajeElemento.textContent = `Porcentaje: ${
        resultado.percentage * 10
      }%`;
      categoriaElemento.textContent = `Categoría: ${resultado.category}`;

      const limpiarFormulario = () => {
        formulario.reset();
        resultadoElemento.textContent = "";
        porcentajeElemento.textContent = "";
        categoriaElemento.textContent = "";
      };

      const limpiarButton = document.getElementById("limpiarButton");
      limpiarButton.addEventListener("click", limpiarFormulario);
    } catch (error) {
      console.error("Error al realizar la consulta:", error);
    }
  });
});
