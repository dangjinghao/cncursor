import * as vscode from 'vscode';
import * as ensureNodejieba from './ensureNodejieba';
import { CnWords } from './CnWords';

export async function activate(context: vscode.ExtensionContext) {
	const jieba = await ensureNodejieba.ensure(context);

	let cnw = new CnWords(jieba);
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

export function deactivate() { }
