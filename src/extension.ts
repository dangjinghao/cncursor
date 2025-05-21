// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as jieba from 'nodejieba';
import { CnWords } from './CnWords';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	jieba.load();

	let cnw = new CnWords();
	// vscode.window.onDidChangeTextEditorSelection(cnw.WatchLineSelection());

	const disposableLeft = vscode.commands.registerCommand('cncursor.moveLeft', cnw.MoveLeft());
	const disposableRight = vscode.commands.registerCommand('cncursor.moveRight', cnw.MoveRight());
	const disposableDeleteLeft = vscode.commands.registerCommand('cncursor.deleteLeft', cnw.DeleteLeft());
	const disposableDeleteRight = vscode.commands.registerCommand('cncursor.deleteRight', cnw.DeleteRight());
	const disposableSelectLeft = vscode.commands.registerCommand('cncursor.selectLeft', cnw.SelectLeft());
	const disposableSelectRight = vscode.commands.registerCommand('cncursor.selectRight', cnw.SelectRight());
	context.subscriptions.push(disposableLeft, disposableRight,
		disposableDeleteLeft, disposableDeleteRight,
		disposableSelectLeft, disposableSelectRight);

	// cnw.InitWords();
}

// This method is called when your extension is deactivated
export function deactivate() { }
