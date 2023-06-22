import express from "express";

const app = express();
const PORT = 3000;

app.listen(PORT, (error) => {
  if (!error) console.log("Escuchando en puerto: " + PORT);
  else console.log("Ocurrió un error: ", error);
});

app.get("/", (req, res) => {
  res.json("Bienvenido a la API Info Auto");
});
