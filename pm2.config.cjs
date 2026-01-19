module.exports = {
  apps: [
    {
      name: 'dash-api',
      script: 'npm',
      args: 'run dev:server',
      cwd: __dirname,
      env: {
        NODE_ENV: 'development',
        PORT: process.env.SERVER_PORT || process.env.PORT || 4000,
        SERVER_PORT: process.env.SERVER_PORT || process.env.PORT || 4000,
        DASHBOARD_USER: 'vcollos',
        DASHBOARD_PASSWORD: 'soeusei22',
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        OPENAI_MODEL: process.env.OPENAI_MODEL,
        OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
        OPENAI_TIMEOUT_MS: process.env.OPENAI_TIMEOUT_MS,
      },
    },
    {
      name: 'dash-client',
      script: 'npm',
      args: 'run dev:client',
      cwd: __dirname,
      env: {
        NODE_ENV: 'development',
        VITE_API_PROXY: process.env.VITE_API_PROXY || 'http://localhost:4000',
        VITE_PORT: process.env.VITE_PORT || 5173,
      },
    },
  ],
}
