import axios from "axios";

document.addEventListener("DOMContentLoaded", () => {
  const formulario = document.getElementById("consultaForm");
  const resultadoElemento = document.getElementById("resultado");
  const porcentajeElemento = document.getElementById("porcentaje");
  const categoriaElemento = document.getElementById("categoria");
  const precioElemento = document.getElementById("precio");
  const rotacionElemento = document.getElementById("rotacion");
  const JSONElemento = document.getElementById("JSON");
  formulario.addEventListener("submit", async (event) => {
    event.preventDefault();

    const codia = formulario.elements.codia.value;
    const year = formulario.elements.year.value;
    const km = formulario.elements.km.value;

    try {
      const response = await axios.post("/proc", {
        codia: codia,
        year: year,
        km: km,
      });

      const resultado = response.data;

      resultadoElemento.textContent = `Resultado: ${resultado.result}`;
      porcentajeElemento.textContent = `Porcentaje: ${resultado.percentage}%`;
      categoriaElemento.textContent = `Categoría: ${resultado.category}`;
      precioElemento.textContent = `Precio: ${resultado.price}`;
      rotacionElemento.textContent = `Rotación: ${resultado.rotation}`;
      JSONElemento.textContent = JSON.stringify(resultado);

      const limpiarFormulario = () => {
        formulario.reset();
        resultadoElemento.textContent = "";
        porcentajeElemento.textContent = "";
        categoriaElemento.textContent = "";
        precioElemento.textContent = "";
        rotacionElemento.textContent = "";
        JSONElemento.textContent = "";
      };

      const limpiarButton = document.getElementById("limpiarButton");
      limpiarButton.addEventListener("click", limpiarFormulario);
    } catch (error) {
      console.error("Error al realizar la consulta:", error);
    }
  });
});
