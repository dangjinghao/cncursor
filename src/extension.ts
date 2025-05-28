import * as vscode from 'vscode';
import * as ensureNodejieba from './EnsureNodejieba';
import { CnWords } from './CnWords';
import path from 'path';
import { Logger, SetLogLevel } from './Logger';
import assert from 'assert';


const DICT_DIR = path.join(__dirname, 'dict/');
const DEFAULT_DICT = DICT_DIR + "jieba.dict.utf8";
const DEFAULT_HMM_DICT = DICT_DIR + "hmm_model.utf8";
const DEFAULT_USER_DICT = DICT_DIR + "user.dict.utf8";
const DEFAULT_IDF_DICT = DICT_DIR + "idf.utf8";
const DEFAULT_STOP_WORD_DICT = DICT_DIR + "stop_words.utf8";

function LoadUserWords(jieba: any, rawWords: string) {
	const logger = new Logger("loadUserWords");
	if (rawWords === "") {
		return;
	}
	const words = rawWords.split(" ");
	for (let w of words) {
		w = w.trim();
		if (w !== "") {
			logger.debug(`load user word: ${w}`);
			jieba.insertWord(w);
		}
	}
}



export async function activate(context: vscode.ExtensionContext) {
	const logger = new Logger("cncursor");
	const config = vscode.workspace.getConfiguration("cncursor");
	const logLevel = config.get<string>("logLevel");
	const userWords = config.get<string>("userWords");
	const userDictPath = config.get<string>("userDictPath");

	assert(logLevel !== undefined);
	assert(userWords !== undefined);
	assert(userDictPath !== undefined);

	SetLogLevel(logLevel);

	logger.trace(`config: logLevel: '${logLevel}' userWords: '${userWords}' userDictPath: '${userDictPath}'`);

	const jieba = await ensureNodejieba.ensure(context);
	jieba.load(DEFAULT_DICT,
		DEFAULT_HMM_DICT,
		userDictPath === "" ? DEFAULT_USER_DICT : userDictPath,
		DEFAULT_IDF_DICT,
		DEFAULT_STOP_WORD_DICT);

	LoadUserWords(jieba, userWords);
	logger.info(`nodejieba loaded successfully.`);

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

