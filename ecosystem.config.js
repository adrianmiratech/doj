module.exports = {
  apps: [
    {
      name: "doj-web",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 4173",
      cwd: __dirname,
      autorestart: true,
      watch: false,
      env: { NODE_ENV: "production" },
    },
    {
      name: "doj-bot",
      script: "node_modules/tsx/dist/cli.mjs",
      args: "bot/index.ts",
      cwd: __dirname,
      autorestart: true,
      watch: false,
    },
    {
      name: "doj-tunnel",
      script: "C:/Program Files (x86)/cloudflared/cloudflared.exe",
      args: "tunnel --config C:/Users/Usuario/.cloudflared/doj-quick.yml --url http://localhost:4173",
      cwd: __dirname,
      autorestart: true,
      watch: false,
    },
  ],
};
