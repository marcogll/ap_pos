cat > /home/marco/Documents/code/ap_pos/ap-pos/ecosystem.config.js <<'EOF'
module.exports = {
  apps: [
    {
      name: "ap-pos",
      script: "server.js",
      cwd: "/home/marco/Documents/code/ap_pos/ap-pos",
      watch: true,
      watch_delay: 2000,
      ignore_watch: [
        "node_modules",
        "logs",
        "*.log",
        "*.sqlite",
        "*.db",
        ".git"
      ],
      env: {
        NODE_ENV: "production"
      }
    }
  ]
}
EOF
