// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "ourshop-backend",
      script: "./src/server.js",
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
    },
  ],
};
