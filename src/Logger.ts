import * as vscode from 'vscode';

enum LogLevel {
    TRACE,
    DEBUG,
    INFO,
    WARN,
    ERROR,
};

let currentLogLevel = LogLevel.INFO;
const uniChannel = vscode.window.createOutputChannel("cncursor");

export function SetLogLevel(L: string) {
    switch (L) {
        default:
        case "trace":
            currentLogLevel = LogLevel.TRACE;
            break;
        case "debug":
            currentLogLevel = LogLevel.DEBUG;
            break;
        case "info":
            currentLogLevel = LogLevel.INFO;
            break;
        case "warn":
            currentLogLevel = LogLevel.WARN;
            break;
        case "error":
            currentLogLevel = LogLevel.ERROR;
            break;

    }
}


export class Logger {
    private componentName: string;
    constructor(name: string) {
        this.componentName = name;
    }
    public GetChannel(): vscode.OutputChannel {
        return uniChannel;
    }

    public debug(message: string) {
        if (currentLogLevel > LogLevel.DEBUG) {
            return;
        }
        const msg = `[DEBUG] [${this.componentName}] ${message}`;
        uniChannel.appendLine(msg);
    }

    public error(message: string) {
        if (currentLogLevel > LogLevel.ERROR) {
            return;
        }
        const msg = `[ERROR] [${this.componentName}] ${message}`;
        uniChannel.appendLine(msg);
        vscode.window.showErrorMessage(message);
    }
    public warn(message: string) {
        if (currentLogLevel > LogLevel.WARN) {
            return;
        }
        const msg = `[WARN] [${this.componentName}] ${message}`;
        uniChannel.appendLine(msg);
        vscode.window.showWarningMessage(message);
    }

    public info(message: string) {
        if (currentLogLevel > LogLevel.INFO) {
            return;
        }
        const msg = `[INFO] [${this.componentName}] ${message}`;
        uniChannel.appendLine(msg);
    }
    public trace(message: string) {
        if (currentLogLevel > LogLevel.TRACE) {
            return;
        }
        const msg = `[TRACE] [${this.componentName}] ${message}`;
        uniChannel.appendLine(msg);
    }
}
