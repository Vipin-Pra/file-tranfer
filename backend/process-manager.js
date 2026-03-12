import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const CONFIG = {
    maxRestarts: 10,
    restartDelay: 2000,
    crashWindow: 60000,
    port: process.env.PORT || 3001,
};

class ProcessManager {
    constructor() {
        this.restartCount = 0;
        this.crashTimestamps = [];
        this.serverProcess = null;
        this.isShuttingDown = false;
    }

    log(message, level = 'INFO') {
        console.log(`[${new Date().toISOString()}] [${level}] ${message}`);
    }

    shouldRestart() {
        const now = Date.now();
        this.crashTimestamps = this.crashTimestamps.filter((t) => now - t < CONFIG.crashWindow);
        if (this.crashTimestamps.length >= CONFIG.maxRestarts) {
            this.log('Too many crashes in window. Stopping auto-restart.', 'CRITICAL');
            return false;
        }
        return this.restartCount < CONFIG.maxRestarts;
    }

    async startServer() {
        if (this.isShuttingDown) return;
        this.log(`Starting server (attempt ${this.restartCount + 1})...`);

        this.serverProcess = spawn('node', ['server.js'], {
            cwd: __dirname,
            stdio: 'inherit',
            env: { ...process.env },
        });

        this.serverProcess.on('error', (err) => {
            this.log(`Process error: ${err.message}`, 'ERROR');
            this.handleCrash();
        });

        this.serverProcess.on('exit', (code, signal) => {
            if (this.isShuttingDown) return;
            if (code !== 0 || signal) {
                this.log(`Server exited (code: ${code}, signal: ${signal})`, 'ERROR');
                this.handleCrash();
            }
        });
    }

    async handleCrash() {
        this.crashTimestamps.push(Date.now());
        this.restartCount++;

        if (!this.shouldRestart()) {
            this.log('Max restarts reached. Manual intervention required.', 'CRITICAL');
            process.exit(1);
        }

        this.log(`Restarting in ${CONFIG.restartDelay}ms...`, 'WARN');
        await new Promise((r) => setTimeout(r, CONFIG.restartDelay));
        this.startServer();
    }

    start() {
        this.log('='.repeat(50));
        this.log('Process Manager Starting');
        this.log(`Max Restarts: ${CONFIG.maxRestarts} | Delay: ${CONFIG.restartDelay}ms | Port: ${CONFIG.port}`);
        this.log('='.repeat(50));

        const shutdown = async (sig) => {
            this.log(`${sig} received, shutting down...`);
            this.isShuttingDown = true;
            if (this.serverProcess) this.serverProcess.kill('SIGTERM');
            await new Promise((r) => setTimeout(r, 5000));
            process.exit(0);
        };

        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('uncaughtException', (err) => this.log(`Uncaught: ${err.message}`, 'CRITICAL'));
        process.on('unhandledRejection', (reason) => this.log(`Unhandled rejection: ${reason}`, 'CRITICAL'));

        this.startServer();
    }
}

new ProcessManager().start();
