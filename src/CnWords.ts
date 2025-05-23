import * as vscode from 'vscode';
import { Logger } from './Logger';

interface WordInfo {
	word: string;
	start: number;
	end: number;
}

interface PosInfo {
	line: number;
	offset: number;
}

export class CnWords {
	private logger: Logger = new Logger('CnWords');
	private previousLine: string = '';
	private currentLineWords: WordInfo[] = [];
	private jieba: any;
	static HasChinese(str: string): boolean {
		return /[\u3400-\u9FFF\uF900-\uFAFF]/.test(str);
	}
	constructor(jieba: any) {
		this.jieba = jieba;
	}
	private UpdateWords(editor: vscode.TextEditor) {
		const position = editor.selection.active;
		const line = position.line;

		const lineText = editor.document.lineAt(line).text;
		if (lineText === '') {
			this.currentLineWords = [];
			this.previousLine = '';
			return;
		}

		if (this.previousLine === lineText) {
			return;
		}
		this.logger.debug("updating words");
		this.previousLine = lineText;
		let words = this.jieba.cut(lineText, true);

		// merge adjcent whitespace
		words = words.reduce((acc: string[], word: string) => {
			if (word.trim() === '') {
				if (acc.length > 0 && acc[acc.length - 1].trim() === '') {
					acc[acc.length - 1] += word;
				} else {
					acc.push(word);
				}
			} else {
				acc.push(word);
			}
			return acc;
		}, []);
		this.currentLineWords = [];
		let offset = 0;
		for (const word of words) {
			const start = offset;
			const end = offset + word.length;
			this.currentLineWords.push({ word, start, end });
			offset = end;
		}
	}

	public InitWords(): void {
		if (vscode.window.activeTextEditor) {
			this.UpdateWords(vscode.window.activeTextEditor);
		}
	}
	public WatchLineSelection(): (event: vscode.TextEditorSelectionChangeEvent) => void {
		return (event: vscode.TextEditorSelectionChangeEvent) => {
			this.UpdateWords(event.textEditor);
		};
	}

	private LocateWordIndex(charOffset: number): number {
		for (let i = 0; i < this.currentLineWords.length; i++) {
			if (this.currentLineWords[i].end >= charOffset) {
				return i;
			}
		}
		return -1;
	}

	private CurrentPos(editor: vscode.TextEditor): PosInfo {
		const position = editor.selection.active;
		return { line: position.line, offset: position.character };
	}

	private CalculateWordStartOffset(wordIdx: number): number {
		return this.currentLineWords[wordIdx]?.start ?? 0;
	}

	private CalculateWordEndOffset(wordIdx: number): number {
		return this.currentLineWords[wordIdx]?.end ?? 0;
	}
	private LeftWord(editor: vscode.TextEditor): PosInfo {
		this.UpdateWords(editor);
		const position = editor.selection.active;
		const offset = position.character;
		if (offset === 0 && position.line > 0) {
			// left word in the start of line
			const prevLineText = editor.document.lineAt(position.line - 1).text;
			return { line: position.line - 1, offset: prevLineText.length };
		}
		let wordIdx = this.LocateWordIndex(offset);

		if (wordIdx < 0) {
			return this.CurrentPos(editor);
		}

		if (this.currentLineWords[wordIdx].word.trim() === '' && wordIdx > 0) {
			wordIdx -= 1;
		}
		return { line: position.line, offset: this.CalculateWordStartOffset(wordIdx) };
	}

	public MoveLeft(): () => void {
		return () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				return;
			}
			const leftWordPos = this.LeftWord(editor);

			const newPos = new vscode.Position(leftWordPos.line, leftWordPos.offset);
			editor.selection = new vscode.Selection(newPos, newPos);
			editor.revealRange(new vscode.Range(newPos, newPos));
		};
	}

	private RightWord(editor: vscode.TextEditor): PosInfo {
		this.UpdateWords(editor);

		const position = editor.selection.active;
		const offset = position.character;
		if (offset === editor.document.lineAt(position.line).text.length && position.line < editor.document.lineCount - 1) {
			// right word in the end of line
			return { line: position.line + 1, offset: 0 };
		}
		let wordIdx = this.LocateWordIndex(offset);

		if (wordIdx < 0) {
			return this.CurrentPos(editor);
		}

		if (offset === this.CalculateWordEndOffset(wordIdx) && wordIdx < this.currentLineWords.length - 1) {
			wordIdx += 1;
		}

		if (this.currentLineWords[wordIdx]?.word.trim() === '' && wordIdx < this.currentLineWords.length - 1) {
			wordIdx += 1;
		}

		return {
			line: position.line,
			offset: this.CalculateWordEndOffset(wordIdx)
		};
	}
	public MoveRight(): () => void {
		return () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) { return; }
			const rightWordInfo = this.RightWord(editor);

			const newPos = new vscode.Position(rightWordInfo.line, rightWordInfo.offset);
			editor.selection = new vscode.Selection(newPos, newPos);
			editor.revealRange(new vscode.Range(newPos, newPos));
		};
	}
	// Delete: wordDirection: return the posInfo, and new cursor position
	private Delete(wordDirection: (editor: vscode.TextEditor) => [PosInfo, PosInfo]) {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}
		const position = editor.selection.active;
		const deleteInfo = wordDirection(editor);
		const deleteStart = deleteInfo[0].offset;
		const deleteEnd = position.character;
		const range = new vscode.Range(
			deleteInfo[0].line, deleteStart,
			position.line, deleteEnd
		);

		editor.edit(editBuilder => {
			editBuilder.delete(range);
		}).then(() => {
			const newPos = new vscode.Position(deleteInfo[1].line, deleteInfo[1].offset);
			editor.selection = new vscode.Selection(newPos, newPos);
			this.UpdateWords(editor);
			editor.revealRange(new vscode.Range(newPos, newPos));
		});

	}
	public DeleteLeft(): () => void {
		return () => this.Delete((e) => {
			let info = this.LeftWord(e);
			return [info, info];
		});
	}
	public DeleteRight(): () => void {
		return () => this.Delete((e) => {
			let info = this.RightWord(e);
			const position = e.selection.active;
			let offset = position.character;
			let line = position.line;
			return [info, { line: line, offset: offset }];
		});
	}

	private Select(wordDirection: (editor: vscode.TextEditor) => PosInfo): void {
		const editor = vscode.window.activeTextEditor;
		if (!editor) { return; }

		const selection = editor.selection;

		const targetPosInfo = wordDirection(editor);
		const targetPos = new vscode.Position(targetPosInfo.line, targetPosInfo.offset);

		editor.selection = new vscode.Selection(selection.anchor, targetPos);
		editor.revealRange(new vscode.Range(targetPos, targetPos));
	}


	public SelectLeft(): () => void {
		return () => {
			this.Select((e) => this.LeftWord(e));
		};
	}

	public SelectRight(): () => void {
		return () => {
			this.Select((e) => this.RightWord(e));
		};
	}

}
