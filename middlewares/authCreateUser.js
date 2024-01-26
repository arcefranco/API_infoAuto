import dotenv from "dotenv";
import { pa7_comunConnection } from "../helpers/connection.js";
import bcrypt from "bcrypt";
import { QueryTypes } from "sequelize";
import jwt from "jsonwebtoken";
dotenv.config();

export const authCreateUser = async (req, res, next) => {
  const token = req.session.token;
  let decoded;
  if (!token) {
    return res.send("No hay token");
  }

  try {
    decoded = jwt.verify(token, process.env.TOKEN_SECRET);
    const nombreAuth = decoded.nombre;
    const contraseñaAuth = decoded.contraseña;
    if (nombreAuth !== "franco") {
      return res.send(
        "Usuario o contraseña no válidos para realizar esta acción"
      );
    }

    const userFinded = await pa7_comunConnection.query(
      "SELECT * FROM usuarios_api_savi WHERE nombre = ?",
      {
        replacements: [nombreAuth],
        type: QueryTypes.SELECT,
      }
    );

    if (!userFinded.length) {
      return res.send("El usuario no existe");
    } else {
      const match = await bcrypt.compare(
        contraseñaAuth,
        userFinded[0].contraseña
      );
      if (match) {
        next();
      } else {
        return res.send("Error");
      }
    }
  } catch (error) {
    return res.send("Token inválido");
  }
};

export default authCreateUser;
