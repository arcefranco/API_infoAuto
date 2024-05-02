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
import {
  pa7_cgConnection,
  pa7_comunConnection,
  pa7_alizzeConnection,
  pa7_autConnection,
  pa7_chConnection,
  pa7_cvConnection,
  pa7_detConnection,
  pa7_elyseesConnection,
  pa7_gfLuxcarConnection,
  pa7_simpliplan,
} from "./helpers/connection.js";
import cron from "cron";
import { QueryTypes } from "sequelize";
import { obtainCategory } from "./helpers/obtainCategory.js";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import {
  logRequestResponse,
  logCotizaciones,
  convertirTextoAJSON,
  writeToFileAsync,
} from "./logger.js";
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
import fechaActual from "./helpers/fechaActual.js";
import esUltimoDiaDelMes from "./helpers/ultimoDia.js";
import esDiaEspecifico from "./helpers/diaEspecifico.js";
import {
  emailUpdateIA,
  emailUpdateML,
  emailError,
  emailUpdateMLtoSistemas,
} from "./helpers/sendEmail.js";
import fs from "fs";
import moment from "moment";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const date = moment().format("YYYY-MM-DD");
const logFilePath = path.join(__dirname, `logsML/${date}.txt`);
const logMessage = "log message";

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

  console.log(
    process.env.DB_USERNAME,
    process.env.DB_PASSWORD,
    process.env.DB_HOST
  );

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
    console.log(userFinded[0].contraseña);
    try {
      const match = await bcrypt.compare(contraseña, userFinded[0].contraseña);
      if (match) {
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
        return res.send({
          success: false,
          message: "La contraseña no es válida",
        });
      }
    } catch (error) {
      return res.send(error);
    }
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
    console.log(userFinded);
    return res.send("El usuario no existe");
  } else {
    const match = await bcrypt.compare(
      credentials.pass,
      userFinded[0].contraseña
    );
    if (match) {
      const token = jwt.sign({ nombre: credentials.name }, process.env.SECRET, {
        expiresIn: "10h",
      });
      return res.send({ token: token });
    } else {
      return res.send("Error");
    }
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

const updatePrice = async () => {
  const dbs = [
    pa7_cgConnection,
    pa7_alizzeConnection,
    pa7_autConnection,
    pa7_chConnection,
    pa7_cvConnection,
    pa7_detConnection,
    pa7_elyseesConnection,
    pa7_gfLuxcarConnection,
    pa7_simpliplan,
  ];
  let now = fechaActual();
  console.log(now);
  let resultDB = [];
  let token;
  try {
    token = await accessToken();
  } catch (error) {
    await emailError("farce@giama.com.ar");
    return error;
  }
  for (let i = 0; i <= dbs.length - 1; i++) {
    try {
      resultDB = await dbs[i].query(
        "SELECT id AS idcotiza, precio_mercado, anio, modelo_info_auto FROM cotizaciones WHERE estadocotizacion NOT IN(4,6,0) AND DATEDIFF(CURRENT_DATE,FechaAltaRegistro) < 365",
        {
          type: QueryTypes.SELECT,
        }
      );
    } catch (error) {
      await emailError("farce@giama.com.ar");
      console.log("error en DB: ", error);
      return error;
    }
    //iteramos sobre el resultado obtenido por la DB:
    for (let x = 0; x <= resultDB.length - 1; x++) {
      //obtener actual precio info auto segun modelo y anio (api info auto)
      try {
        let resultInfoAuto = await axios.get(
          `https://api.infoauto.com.ar/cars/pub/models/${resultDB[x].modelo_info_auto}/prices`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        resultInfoAuto = resultInfoAuto.data.filter(
          (e) => e.year === resultDB[x].anio
        );
        //actualizo en cotizaciones el resultado
        try {
          await dbs[i].query(
            "UPDATE cotizaciones SET fecha_ultima_actualizacion_mercado = ?, precio_mercado = ? WHERE id = ?",
            {
              type: QueryTypes.UPDATE,
              replacements: [
                now,
                resultInfoAuto[0].price * 1000,
                resultDB[x].idcotiza,
              ],
            }
          );
        } catch (error) {
          await emailError("farce@giama.com.ar");
          return error;
        }
        //hago el insert en historiaPrecioCotiza
        try {
          await dbs[i].query(
            "INSERT historiaPrecioCotiza(idcotiza, fechaActualizacion, PrecioMercado) VALUES(?,?,?)",
            {
              type: QueryTypes.INSERT,
              replacements: [
                resultDB[x].idcotiza,
                now,
                resultInfoAuto[0].price * 1000,
              ],
            }
          );
        } catch (error) {
          await emailError("farce@giama.com.ar");
          return error;
        }
      } catch (error) {
        await emailError("farce@giama.com.ar");
        return error;
      }
    }
  }
  await emailUpdateIA("farce@giama.com.ar");
  return "OK";
};

const updateML = async () => {
  const dbs = [
    pa7_cgConnection,
    pa7_alizzeConnection,
    pa7_autConnection,
    pa7_chConnection,
    pa7_cvConnection,
    pa7_detConnection,
    pa7_elyseesConnection,
    pa7_gfLuxcarConnection,
    pa7_simpliplan,
  ];
  let now = fechaActual();
  let resultDB = [];
  let resultML = [];
  let jsonLog;
  //antes de empezar obtenemos el token para hacer las llamadas a a la api ML
  let token;
  try {
    await axios
      .post(
        "https://izpflmkchikadyvwunni.supabase.co/auth/v1/token?grant_type=password",
        { email: process.env.EMAIL_ML, password: process.env.PASS_ML },
        {
          headers: {
            apikey: process.env.API_KEY_ML,
          },
        }
      )
      .then((response) => (token = response.data["access_token"]));
  } catch (error) {
    await emailError("farce@giama.com.ar");
    console.log("error: ", error);
    throw error;
  }
  //recorremos las dbs
  for (let i = 0; i <= dbs.length - 1; i++) {
    try {
      resultDB = await dbs[i].query(
        "SELECT id AS idcotiza, precio_mercado, anio, modelo_info_auto FROM cotizaciones WHERE estadocotizacion NOT IN(4,6,0) AND DATEDIFF(CURRENT_DATE,FechaAltaRegistro) < 365",
        {
          type: QueryTypes.SELECT,
        }
      );
      console.log("resultDB: ", resultDB);
    } catch (error) {
      await emailError("farce@giama.com.ar");
      console.log(error);
      return error.toLocaleString();
    }

    for (let x = 0; x <= resultDB.length - 1; x++) {
      try {
        await axios
          .post(
            "https://izpflmkchikadyvwunni.supabase.co/rest/v1/rpc/get_price_by_codia",
            {
              codia: resultDB[x]["modelo_info_auto"],
              year: resultDB[x]["anio"],
            },
            {
              headers: {
                ["Content-Profile"]: "prices_api",
                Authorization: `Bearer ${token}`,
                apikey: process.env.API_KEY_ML,
              },
            }
          )
          .then((response) => {
            console.log("DATA: ", response.data);
            resultML = response.data;
          });
      } catch (error) {
        console.log("ERROR: ", error);
        await emailError("farce@giama.com.ar");
        throw error;
      }
      if (resultML) {
        console.log("entro");
        try {
          await dbs[i].query(
            "UPDATE cotizaciones SET precio_mercado_libre = ?, fecha_precio_mercado_libre = ? WHERE id = ?",
            {
              type: QueryTypes.UPDATE,
              replacements: [resultML["price"], now, resultDB[x]["idcotiza"]],
            }
          );
          jsonLog = {
            DB: dbs[i]["config"]["database"],
            id: resultDB[x]["idcotiza"],
            codia: resultDB[x]["modelo_info_auto"],
            anio: resultDB[x]["anio"],
            precioML: resultML["price"],
          };
          logCotizaciones(jsonLog);
        } catch (error) {
          console.log(error);
        }
      } else {
        console.log("no entro");
        jsonLog = {
          DB: dbs[i]["config"]["database"],
          id: resultDB[x]["idcotiza"],
          codia: resultDB[x]["modelo_info_auto"],
          anio: resultDB[x]["anio"],
          precioML: null,
        };
        logCotizaciones(jsonLog);
      }
    }
  }

  return "OK";
};

let taskUpdateML = new cron.CronJob("10 11 * * *", async function () {
  if (esDiaEspecifico("jueves")) {
    try {
      await updateML(); //tiro la funcion
    } catch (error) {
      await emailError("farce@giama.com.ar");
      console.error("Error al convertir texto a JSON:", error);
    }
  } else {
    console.log("No se deben actualizar los valores aún");
    return;
  }
  return;
});

let taskSendEmailML = new cron.CronJob("50 14 * * *", async function () {
  const date = moment().format("YYYY-MM-DD");
  const logs = convertirTextoAJSON(`logsML/${date}.txt`); //guardo el array q se crea en la variable logs
  if (esDiaEspecifico("jueves")) {
    if (logs) {
      console.log("HAY LOGS");
      //separo el array
      const preciosOK = logs.filter((log) => log.precioML !== null);
      const preciosNulos = logs.filter((log) => log.precioML === null);
      fs.access(logFilePath, fs.constants.F_OK, async (err) => {
        //inscribo cada array en un json
        if (err) {
          // El archivo no existe, así que se crea uno nuevo
          fs.writeFile(logFilePath, logMessage, (error) => {
            if (error) {
              console.error("Error writing to log file:", error);
            }
          });
          await emailError("farce@giama.com.ar");
        } else {
          try {
            await writeToFileAsync(
              `logsML/${date}_OK.txt`,
              JSON.stringify(preciosOK, null, 2)
            );
            await writeToFileAsync(
              `logsML/${date}_NULOS.txt`,
              JSON.stringify(preciosNulos, null, 2)
            );
          } catch (error) {
            console.log("ERROR EN LA CREACION DE ARCHIVOS");
            await emailError("farce@giama.com.ar");
          }
        }
      });

      const archivosAdjuntos = [
        //vuelvo a juntar en un array
        {
          filename: `${date}_OK.txt`,
          path: `logsML/${date}_OK.txt`,
        },
        {
          filename: `${date}_NULOS.txt`,
          path: `logsML/${date}_NULOS.txt`,
        },
      ];
      try {
        //envio el mail
        await emailUpdateMLtoSistemas("farce@giama.com.ar", archivosAdjuntos);
        await emailUpdateMLtoSistemas(
          "sistemas@giama.com.ar",
          archivosAdjuntos
        );
      } catch (error) {
        await emailError("farce@giama.com.ar");
        console.log("ERROR AL ENVIO DE MAILS OK: ", error);
      }

      // Eliminar los archivos después de enviar el correo electrónico

      console.log("Archivos creados correctamente");
    } else {
      await emailError("farce@giama.com.ar");
      console.error("No se pudo convertir el texto a JSON");
    }
  }
});

let taskDeleteML = new cron.CronJob("15 15 * * *", async function () {
  const date = moment().format("YYYY-MM-DD");
  if (esDiaEspecifico("jueves")) {
    try {
      fs.unlink(`logsML/${date}_OK.txt`, (err) => {
        if (err) {
          console.log(err);
        }
      });

      fs.unlink(`logsML/${date}_NULOS.txt`, (err) => {
        if (err) {
          console.log(err);
        }
      });

      return;
    } catch (error) {
      await emailError("farce@giama.com.ar");
      console.log(error);
    }
  }
});

let task = new cron.CronJob("50 9 * * *", async function () {
  if (esUltimoDiaDelMes()) {
    try {
      await updatePrice();
    } catch (error) {
      await emailError("farce@giama.com.ar");
      console.log(error);
    }
  }
});

taskUpdateML.start();
taskSendEmailML.start();
taskDeleteML.start();
task.start();
