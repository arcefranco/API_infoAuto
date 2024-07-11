module.exports = {
  apps: [
    {
      name: "API INFOAUTO",
      script: "./index.js",
      ignore_watch: ["logs", "logsML"],
      watch: true,
      node_args: "-r dotenv/config",
      env: {
        DOTENV_CONFIG_PATH: "./.env",
      },
    },
  ],
};
