import express from "express";
import axios from "axios";
import { accessToken } from "./helpers/accessToken.js";
import { pa7_cgConnection } from "./helpers/connection.js";
import { QueryTypes } from "sequelize";
import { obtainCategory } from "./helpers/obtainCategory.js";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import { logRequestResponse } from "./logger.js";
import { generateUniqueId } from "./logger.js";
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
app.use(express.json());
app.use(cors());
app.use(express.static(__dirname));
const PORT = 3000;
const baseUrl = "https://api.infoauto.com.ar/cars/pub/";

app.listen(PORT, (error) => {
  if (!error) console.log("Escuchando en puerto: " + PORT);
  else console.log("Ocurrió un error: ", error);
});

app.get("/", (req, res) => {
  const indexPath = path.resolve(__dirname, "index.html");
  res.sendFile(indexPath);
});

app.post("/price", async (req, res) => {
  const requestId = generateUniqueId();
  const { codia, year, km } = req.body;
  let token;
  logRequestResponse(requestId, req.body);
  if (!codia || !year || !km) {
    logRequestResponse(requestId, {
      result: "Faltan parámetros para realizar la consulta",
    });

    return res
      .status(404)
      .send({ result: "Faltan parámetros para realizar la consulta" });
  }
  try {
    token = await accessToken();
  } catch (error) {
    logRequestResponse(requestId, {
      success: false,
      result: "Error al generar o acceder al token",
    });
    return res.send({
      success: false,
      result: "Error al generar o acceder al token",
    });
  }

  const currentYear = new Date().getFullYear();
  const brand = Math.floor(codia / 10000);
  let group;
  let pricesResponse;
  let rotation;
  let percentage;
  try {
    let groupResponse = await axios.get(baseUrl + `models/${codia}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    group = groupResponse.data.group.id;
  } catch (error) {
    logRequestResponse(requestId, {
      success: false,
      result: "Error al buscar el grupo",
    });
    return res.send({ success: false, result: "Error al buscar el grupo" });
  }
  try {
    pricesResponse = await axios.get(baseUrl + `models/${codia}/prices`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (error) {
    logRequestResponse(requestId, {
      result: "Verifique el código enviado",
      success: false,
    });
    return res.send({ success: false, result: "Verifique el código enviado" });
  }

  const prices = pricesResponse.data.filter((e) => {
    return e.year == year;
  });
  if (!prices.length) {
    logRequestResponse(requestId, {
      success: false,
      result: "No hay precio para el año indicado",
    });
    return res.send({
      success: false,
      result: "No hay precio para el año indicado",
    });
  }
  const finalPrice = prices[0].price * 1000;
  try {
    rotation = await pa7_cgConnection.query(
      "SELECT rotacion FROM usados_rotacion WHERE marca = ? AND grupo = ?",
      {
        replacements: [brand, group],
        type: QueryTypes.SELECT,
      }
    );
  } catch (error) {
    logRequestResponse(requestId, {
      success: false,
      result: JSON.stringify(error),
    });
    return res.send({ result: JSON.stringify(error), success: false });
  }
  if (!rotation.length) {
    logRequestResponse(requestId, {
      success: false,
      result: "La marca o el grupo son incorrectos",
    });
    return res.send({
      success: false,
      result: "La marca o el grupo son incorrectos",
    });
  }
  const antiquity = currentYear - year;
  const category = obtainCategory(rotation[0].rotacion, antiquity, km);
  try {
    percentage = await pa7_cgConnection.query(
      `SELECT porcentaje
      FROM porcentajes_cotiza
      WHERE tipo_origen = 1 AND categoria = ?
      `,
      {
        replacements: [category],
        type: QueryTypes.SELECT,
      }
    );
  } catch (error) {
    logRequestResponse(requestId, {
      success: false,
      result: JSON.stringify(error),
    });
    return res.send({ result: JSON.stringify(error), success: false });
  }
  logRequestResponse(requestId, {
    success: true,
    result: Math.round(finalPrice * percentage[0].porcentaje),
    percentage: percentage[0].porcentaje,
    category: category,
    price: finalPrice,
    rotation: rotation[0].rotacion,
  });
  return res.send({
    success: true,
    result: Math.round(finalPrice * percentage[0].porcentaje),
  });
});
