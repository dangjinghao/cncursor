import * as vscode from 'vscode';

export class Logger {
    private channel: vscode.OutputChannel;
    constructor(name: string) {
        this.channel = vscode.window.createOutputChannel(name);
    }
    public GetChannel(): vscode.OutputChannel {
        if (!this.channel) {
            this.channel = vscode.window.createOutputChannel('CnWords');
        }
        return this.channel;
    }

    public debug(message: string) {
        const msg = `[DEBUG] ${message}`;
        this.channel.appendLine(msg);
    }

    public error(message: string) {
        const msg = `[ERROR] ${message}`;
        this.channel.appendLine(msg);
        vscode.window.showErrorMessage(message);
    }
    public warn(message: string) {
        const msg = `[WARN] ${message}`;
        this.channel.appendLine(msg);
        vscode.window.showWarningMessage(message);
    }

    public info(message: string) {
        const msg = `[INFO] ${message}`;
        this.channel.appendLine(msg);
    }
}
