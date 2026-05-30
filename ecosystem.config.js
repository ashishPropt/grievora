module.exports = {
  apps: [
    {
      name: 'grievora-api',
      script: '/opt/grievora/backend/dist/index.js',
      cwd: '/opt/grievora/backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      env_file: '/opt/grievora/backend/.env',
    },
    {
      name: 'grievora-frontend',
      script: '/opt/grievora/frontend/node_modules/.bin/next',
      args: 'start -p 3000',
      cwd: '/opt/grievora/frontend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_file: '/opt/grievora/frontend/.env',
    },
  ],
};
