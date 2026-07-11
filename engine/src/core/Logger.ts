/**
 * :wk-id: frontend-logger
 * :wk-tags: typescript, logging, mcp, debug
 * :wk-categories: system-architecture
 *
 * Provides logging functionality for the frontend. Forwards logs to the Python backend
 * to be accessible via MCP and centralizes error tracking.
 */

export const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
};

export class Logger {
    private subsystem: string;

    constructor(subsystem: string) {
        this.subsystem = subsystem;
    }

    private sendLog(level: string, message: string) {
        // Send to backend endpoint without triggering global interceptors if it fails
        fetch('/api/logs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                level,
                subsystem: this.subsystem,
                message
            })
        }).catch(() => {
            // Silently ignore network errors so we don't spam the console recursively
        });
    }

    public debug(msg: string) {
        originalConsole.debug(`[${this.subsystem}] ${msg}`);
        this.sendLog("DEBUG", msg);
    }

    public info(msg: string) {
        originalConsole.info(`[${this.subsystem}] ${msg}`);
        this.sendLog("INFO", msg);
    }

    public warn(msg: string) {
        originalConsole.warn(`[${this.subsystem}] ${msg}`);
        this.sendLog("WARNING", msg);
    }

    public error(msg: string) {
        originalConsole.error(`[${this.subsystem}] ${msg}`);
        this.sendLog("ERROR", msg);
    }
}
