// PM2 Configuration for MarketingPlat Production Deployment
// This file configures PM2 process manager for Node.js application

module.exports = {
  apps: [{
    // Application name
    name: 'marketingplat',

    // Script to execute
    script: 'npm',
    args: 'start',

    // Working directory
    cwd: '/home/ubuntu/marketingplatformproject',

    // Cluster mode settings
    instances: 1,  // Start with 1 instance, increase based on server capacity
    exec_mode: 'cluster',

    // Auto restart settings
    autorestart: true,
    watch: false,  // Disable in production
    max_memory_restart: '1G',

    // Environment variables
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },

    // Log settings
    error_file: '/home/ubuntu/logs/marketingplat-err.log',
    out_file: '/home/ubuntu/logs/marketingplat-out.log',
    log_file: '/home/ubuntu/logs/marketingplat-combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',

    // Advanced settings
    min_uptime: '10s',
    listen_timeout: 10000,
    kill_timeout: 5000,

    // Graceful reload
    wait_ready: true,

    // Node.js arguments
    node_args: '--max-old-space-size=2048',

    // Restart delay
    restart_delay: 4000,

    // Monitoring
    instance_var: 'INSTANCE_ID',

    // Error handling
    max_restarts: 10,
    min_uptime: 10000,

    // Environment specific settings
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      instances: 1,
      exec_mode: 'cluster'
    },

    env_development: {
      NODE_ENV: 'development',
      PORT: 3000,
      instances: 1,
      exec_mode: 'fork',
      watch: true,
      ignore_watch: ['node_modules', '.next', '.git', 'logs', '*.log']
    }
  }, {
    // Scheduler Process (Optional - if not using Lambda)
    name: 'marketingplat-scheduler',
    script: './scripts/scheduler.js',
    instances: 1,
    exec_mode: 'fork',
    cron_restart: '0 0 * * *',  // Restart daily at midnight
    autorestart: true,
    watch: false,
    env: {
      NODE_ENV: 'production'
    },
    error_file: '/home/ubuntu/logs/scheduler-err.log',
    out_file: '/home/ubuntu/logs/scheduler-out.log',
    time: true
  }],

  // Deployment Configuration
  deploy: {
    production: {
      user: 'ubuntu',
      host: 'YOUR_EC2_IP_OR_DOMAIN',
      ref: 'origin/main',
      repo: 'https://github.com/your-username/marketingplatformproject.git',
      path: '/home/ubuntu/marketingplatformproject',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'mkdir -p /home/ubuntu/logs'
    }
  }
};