/**
 * @swagger
 * tags:
 *   name: price
 * components:
 *    securitySchemes:
 *      BasicAuth:
 *        type: http
 *        scheme: basic
 *      BearerAuth:
 *        type: http
 *        scheme: bearer
 *        bearerFormat: JWT
 * /price:
 *   post:
 *     summary: Obtener monto
 *     tags: [price]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               codia:
 *                 type: number
 *                 description: El código de Infoauto
 *               year:
 *                 type: number
 *                 description: Año del auto
 *               km:
 *                 type: number
 *                 description: Kilometraje del auto
 *             required:
 *               - codia
 *               - year
 *               - km
 *     responses:
 *       200:
 *         description: Respuesta exitosa
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 result:
 *                   type: string
 *
 * /saviToken:
 *   get:
 *     summary: Obtener token para realizar consultas
 *     tags: [token]
 *     security:
 *       - BasicAuth: []
 *     responses:
 *       200:
 *         description: Respuesta exitosa
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 */

import express from "express";
import axios from "axios";
import { accessToken } from "./helpers/accessToken.js";
import { pa7_cgConnection, pa7_comunConnection } from "./helpers/connection.js";
import { QueryTypes } from "sequelize";
import { obtainCategory } from "./helpers/obtainCategory.js";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import { logRequestResponse } from "./logger.js";
import { generateUniqueId } from "./logger.js";
import auth from "basic-auth";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import authToken from "./middlewares/authToken.js";
import authCreateUser from "./middlewares/authCreateUser.js";
import swaggerjsdoc from "swagger-jsdoc";
import swaggerui from "swagger-ui-express";
import dotenv from "dotenv";
import session from "express-session";
import verifyUserCredentials from "./middlewares/verifyUserCredentials.js";
dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
app.use(express.json());
app.use(cors());
app.use(express.static(__dirname));
app.use(
  session({
    secret: process.env.TOKEN_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 60 * 1000, // 30 minutos en milisegundos
    },
    rolling: true,
  })
);
const PORT = 3000;
const baseUrl = "https://api.infoauto.com.ar/cars/pub/";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Documentación Savi api",
      description: `
        Mediante un usuario y contraseña que les vamos a proveer, deberán solicitar a ${process.env.SERVER}/saviToken el envío de un token.
        Ese token les servirá para consumir el endpoint que les devolverá el precio de toma a utilizar. El token tendrá una vida útil de 10 horas.
        Los parámetros que esperará el endpoint de consulta son:
        - codia: código de modelo exacto de infoauto
        - year: Año del auto
        - km: Kilometraje del auto
    `,
    },
    servers: [
      {
        url: process.env.SERVER,
      },
    ],
  },
  apis: ["index.js"],
};
const swaggerOptions = {
  customCss: `
    .swagger-ui .markdown code, .swagger-ui .renderedMarkdown code {
      color: #333;
      font-family: system-ui;
    }
  `,
  customSiteTitle: "Savi API Doc",
  /*   favicon16: "path/to/custom-favicon-16.png",
  favicon32: "path/to/custom-favicon-32.png", */
};
const spaces = swaggerjsdoc(options);

app.listen(PORT, (error) => {
  if (!error) console.log("Escuchando en puerto: " + PORT);
  else console.log("Ocurrió un error: ", error);
});

app.use(
  "/info",
  (req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  },
  verifyUserCredentials,
  swaggerui.serve,
  swaggerui.setup(spaces, swaggerOptions)
);

app.get("/", (req, res) => {
  const indexPath = path.resolve(__dirname, "index.html");
  res.sendFile(indexPath);
});

app.get("/menu", verifyUserCredentials, (req, res) => {
  const indexPath = path.resolve(__dirname, "menu.html");
  res.setHeader("Cache-Control", "no-store").sendFile(indexPath);
});

app.get("/createUser", authCreateUser, (req, res) => {
  const indexPath = path.resolve(__dirname, "createUserForm.html");
  res.setHeader("Cache-Control", "no-store").sendFile(indexPath);
});

app.post("/createUser", authCreateUser, async (req, res) => {
  /*   console.log("post create: ", req.body); */
  const { nombre, contraseña } = req.body;
  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(contraseña, 10);
    await pa7_comunConnection.query(
      "INSERT INTO usuarios_api_savi (nombre, contraseña) VALUES (?,?)",
      {
        replacements: [nombre, hashedPassword],
        type: QueryTypes.INSERT,
      }
    );
  } catch (error) {
    return res.send(error);
  }

  return res.send({ message: "Creado correctamente", success: true });
});

app.post("/login", async (req, res) => {
  const { nombre, contraseña } = req.body;
  let userFinded;
  if (!nombre || !contraseña)
    return res.send({ success: false, message: "Datos incompletos" });
  try {
    userFinded = await pa7_comunConnection.query(
      "SELECT * FROM usuarios_api_savi WHERE nombre = ?",
      {
        replacements: [nombre],
        type: QueryTypes.SELECT,
      }
    );
  } catch (error) {
    return res.send(error);
  }

  if (!userFinded.length) {
    return res.send({ success: false, message: "El usuario no existe" });
  } else {
    bcrypt.compare(
      contraseña,
      userFinded[0].contraseña,
      function (err, result) {
        if (result === true) {
          const token = jwt.sign(
            {
              userId: userFinded[0].id,
              nombre: nombre,
              contraseña: contraseña,
            },
            process.env.TOKEN_SECRET,
            { expiresIn: "1h" }
          );

          // Almacenar el token JWT en la sesión
          req.session.token = token;
          return res.send({ success: true });
        } else {
          return res.send(err);
        }
      }
    );
  }
});

app.get("/saviToken", async (req, res) => {
  const credentials = auth(req);
  let userFinded;
  if (!credentials) return res.send("Enviar auth header");
  try {
    userFinded = await pa7_comunConnection.query(
      "SELECT * FROM usuarios_api_savi WHERE nombre = ?",
      {
        replacements: [credentials.name],
        type: QueryTypes.SELECT,
      }
    );
  } catch (error) {
    return res.send(error);
  }

  if (!userFinded.length) {
    return res.send("El usuario no existe");
  } else {
    bcrypt.compare(
      credentials.pass,
      userFinded[0].contraseña,
      function (err, result) {
        if (result === true) {
          const token = jwt.sign(
            { nombre: credentials.name },
            process.env.SECRET,
            { expiresIn: "10h" }
          );
          return res.send({ token: token });
        } else {
          return res.send(err);
        }
      }
    );
  }
});

app.post("/price", authToken, async (req, res) => {
  const requestId = generateUniqueId();
  req.body["nombre"] = req.usuario.nombre;
  logRequestResponse(requestId, req.body);
  const { codia, year, km } = req.body;
  const currentYear = new Date().getFullYear();
  const brand = Math.floor(codia / 10000);
  let group;
  let pricesResponse;
  let rotation;
  let percentage;
  let token;
  try {
    token = await accessToken();
  } catch (error) {
    error["nombre"] = req.body.nombre;
    logRequestResponse(requestId, error);
    return res.send(error);
  }

  if (!codia || !year || km === undefined) {
    logRequestResponse(requestId, {
      success: false,
      nombre: req.body.nombre,
      result: "Faltan parámetros para realizar la consulta",
    });
    return res.send({
      success: false,
      result: "Faltan parámetros para realizar la consulta",
    });
  } else if (
    isNaN(codia) ||
    isNaN(year) ||
    isNaN(km) ||
    km === null ||
    km === ""
  ) {
    logRequestResponse(requestId, {
      success: false,
      nombre: req.body.nombre,
      result: "Todos los parámetros deben ser del tipo numérico",
    });
    return res.send({
      success: false,
      result: "Todos los parámetros deben ser del tipo numérico",
    });
  }
  try {
    let groupResponse = await axios.get(baseUrl + `models/${codia}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    group = groupResponse.data.group.id;
  } catch (error) {
    logRequestResponse(requestId, {
      success: false,
      nombre: req.body.nombre,
      result: "Error al buscar el grupo",
    });
    return res.send({
      success: false,

      result: "Error al buscar el grupo",
    });
  }
  try {
    pricesResponse = await axios.get(baseUrl + `models/${codia}/prices`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!pricesResponse.data.length) throw "Verifique el código enviado";
  } catch (error) {
    logRequestResponse(requestId, {
      result: error,
      nombre: req.body.nombre,
      success: false,
    });
    return res.send({
      result: error,
      success: false,
    });
  }

  const prices = pricesResponse.data.filter((e) => {
    return e.year == year;
  });
  if (!prices.length) {
    logRequestResponse(requestId, {
      success: false,
      nombre: req.body.nombre,
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
      nombre: req.body.nombre,
      result: JSON.stringify(error),
    });
    return res.send({
      success: false,
      result: JSON.stringify(error),
    });
  }
  if (!rotation.length) {
    logRequestResponse(requestId, {
      success: false,
      nombre: req.body.nombre,
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
      nombre: req.body.nombre,
      result: JSON.stringify(error),
    });
    return res.send({
      success: false,
      result: JSON.stringify(error),
    });
  }
  logRequestResponse(requestId, {
    success: true,
    nombre: req.body.nombre,
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
