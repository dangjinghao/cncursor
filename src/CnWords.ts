import * as vscode from 'vscode';
import * as jieba from 'nodejieba';
import { assert } from 'console';

interface WordInfo {
	word: string;
	start: number;
	end: number;
}

export class CnWords {
	private previousLine: string = '';
	private currentLineWords: WordInfo[] = [];

	static HasChinese(str: string): boolean {
		return /[\u3400-\u9FFF\uF900-\uFAFF]/.test(str);
	}

	public WatchLineSelection(): (event: vscode.TextEditorSelectionChangeEvent) => void {
		return (event: vscode.TextEditorSelectionChangeEvent) => {
			const editor = event.textEditor;
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
			this.previousLine = lineText;

			let words = jieba.cut(lineText, true);
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

	private CalculateWordStartOffset(wordIdx: number): number {
		return this.currentLineWords[wordIdx]?.start ?? 0;
	}

	private CalculateWordEndOffset(wordIdx: number): number {
		return this.currentLineWords[wordIdx]?.end ?? 0;
	}

	public MoveLeft(): () => void {
		return () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) { return; }

			const position = editor.selection.active;
			const offset = position.character;
			let wordIdx = this.LocateWordIndex(offset);

			assert(wordIdx >= 0, 'wordIdx should be >= 0');

			if (this.currentLineWords[wordIdx].word.trim() === '' && wordIdx > 0) {
				wordIdx -= 1;
			}

			const newOffset = this.CalculateWordStartOffset(wordIdx);
			const newPos = new vscode.Position(position.line, newOffset);
			editor.selection = new vscode.Selection(newPos, newPos);
		};
	}

	public MoveRight(): () => void {
		return () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) { return; }

			const position = editor.selection.active;
			const offset = position.character;
			let wordIdx = this.LocateWordIndex(offset);

			assert(wordIdx >= 0, 'wordIdx should be >= 0');

			if (offset === this.CalculateWordEndOffset(wordIdx) && wordIdx < this.currentLineWords.length - 1) {
				wordIdx += 1;
			}

			if (this.currentLineWords[wordIdx]?.word.trim() === '' && wordIdx < this.currentLineWords.length - 1) {
				wordIdx += 1;
			}

			const newOffset = this.CalculateWordEndOffset(wordIdx);
			const newPos = new vscode.Position(position.line, newOffset);
			editor.selection = new vscode.Selection(newPos, newPos);
		};
	}
}
