import { Sequelize } from "sequelize";
import dotenv from "dotenv";
dotenv.config();

export const pa7_comunConnection = new Sequelize(
  "pa7_comun",
  process.env.DB_USERNAME,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: "mysql",
    dialectOptions: {
      multipleStatements: true,
    },
  }
);
export const pa7_simpliplan = new Sequelize(
  "pa7_simpliplan",
  process.env.DB_USERNAME,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: "mysql",
    dialectOptions: {
      multipleStatements: true,
    },
  }
);

export const pa7_cgConnection = new Sequelize(
  "pa7_cg",
  process.env.DB_USERNAME,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: "mysql",
    dialectOptions: {
      multipleStatements: true,
    },
  }
);

export const pa7_elyseesConnection = new Sequelize(
  "pa7_elysees",
  process.env.DB_USERNAME,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT,
    dialectOptions: {
      multipleStatements: true,
    },
  }
);

export const pa7_autConnection = new Sequelize(
  "pa7_aut",
  process.env.DB_USERNAME,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT,
    dialectOptions: {
      multipleStatements: true,
    },
  }
);

export const pa7_alizzeConnection = new Sequelize(
  "pa7_alizze",
  process.env.DB_USERNAME,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT,
    dialectOptions: {
      multipleStatements: true,
    },
  }
);

export const pa7_chConnection = new Sequelize(
  "pa7_ch",
  process.env.DB_USERNAME,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT,
    dialectOptions: {
      multipleStatements: true,
    },
  }
);

export const pa7_detConnection = new Sequelize(
  "pa7_det",
  process.env.DB_USERNAME,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT,
    dialectOptions: {
      multipleStatements: true,
    },
  }
);

export const pa7_cvConnection = new Sequelize(
  "pa7_cv",
  process.env.DB_USERNAME,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT,
    dialectOptions: {
      multipleStatements: true,
    },
  }
);

export const pa7_gfConnection = new Sequelize(
  "pa7_gf",
  process.env.DB_USERNAME,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT,
    dialectOptions: {
      multipleStatements: true,
    },
  }
);

export const pa7_gfLuxcarConnection = new Sequelize(
  "pa7_gf_luxcar",
  process.env.DB_USERNAME,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT,
    dialectOptions: {
      multipleStatements: true,
    },
  }
);
