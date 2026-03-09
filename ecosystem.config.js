module.exports = {
    apps: [
        {
            name: 'jarvis-backend',
            script: './dist/index.js',
            cwd: './packages/jarvis-backend',
            watch: false,
            max_memory_restart: '1G',
            restart_delay: 5000,
            env: {
                NODE_ENV: 'development',
            }
        },
        {
            name: 'jarvis-gateway',
            script: './node_modules/tsx/dist/cli.mjs',
            args: 'watch src/index.ts',
            cwd: './jarvis-gateway',
            watch: false,
            max_memory_restart: '512M',
            restart_delay: 5000,
            env: {
                NODE_ENV: 'development',
            }
        },
        {
            name: 'jarvis-ui',
            script: './node_modules/vite/bin/vite.js',
            args: '--port 8080 --host',
            cwd: './jarvis-ui',
            watch: false,
            max_memory_restart: '512M',
            restart_delay: 5000,
            env: {
                NODE_ENV: 'development',
                VITE_API_URL: 'http://localhost:3000',
                VITE_WS_URL: 'ws://localhost:3000',
            }
        }
    ]
};
