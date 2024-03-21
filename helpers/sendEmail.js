import { transporter } from "./transporter.js";
import dotenv from "dotenv";
dotenv.config();

export const emailUpdateIA = async (email) => {
  try {
    transporter.sendMail({
      //Envio el mail a la casilla que encontramos segun su nombre de usuario
      from: "info@giama.com.ar",
      to: email,
      subject: "Actualización de Info Auto (cotizaciones)",
      template: "updatePrice",
    });
  } catch (error) {
    console.log(error);
    return JSON.stringify(error);
  }
};

export const emailUpdateML = async (email) => {
  try {
    transporter.sendMail({
      //Envio el mail a la casilla que encontramos segun su nombre de usuario
      from: "info@giama.com.ar",
      to: email,
      subject: "Actualización de cotizacion y fecha ML (API INFOAUTO)",
      template: "updateML",
    });
  } catch (error) {
    console.log(error);
    return JSON.stringify(error);
  }
};

export const emailError = async (email) => {
  try {
    transporter.sendMail({
      //Envio el mail a la casilla que encontramos segun su nombre de usuario
      from: "info@giama.com.ar",
      to: email,
      subject: "HUBO UN ERROR (API INFOAUTO)",
      template: "error",
    });
  } catch (error) {
    console.log(error);
    return JSON.stringify(error);
  }
};
