// ecosystem.config.js - PM2 설정 파일
module.exports = {
  apps: [{
    name: 'marketingplat',
    script: 'npm',
    args: 'start',
    instances: 1,
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/home/ubuntu/logs/error.log',
    out_file: '/home/ubuntu/logs/out.log',
    log_file: '/home/ubuntu/logs/combined.log',
    time: true,
    merge_logs: true,
    max_restarts: 10,
    min_uptime: 10000,
    listen_timeout: 10000,
    kill_timeout: 5000
  }]
}
