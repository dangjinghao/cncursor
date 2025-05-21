import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as tar from 'tar';

const jiebaVersion = '3.4.4';

async function downloadAndExtract(url: string, extractDir: string) {
    const tmpPath = path.join(extractDir, 'tmp.tar.gz');
    const file = fs.createWriteStream(tmpPath);

    async function doGet(currentUrl: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            https.get(currentUrl, (res) => {
                if (res.statusCode === 302 && res.headers.location) {
                    // Follow redirect
                    // console.log('Redirecting to:', res.headers.location);
                    doGet(res.headers.location).then(resolve, reject);
                    return;
                }
                if (res.statusCode !== 200) {
                    return reject(new Error('Download failed, status: ' + res.statusCode));
                }
                // console.log('Downloading:', currentUrl);
                res.pipe(file);
                file.on('finish', () => {
                    file.close(() => resolve());
                });
            }).on('error', reject);
        });
    }

    await doGet(url);
    await tar.x({ file: tmpPath, cwd: extractDir });
    fs.unlinkSync(tmpPath);
}

const DICT_DIR = path.join(__dirname, 'dict/');

const DEFAULT_DICT = DICT_DIR + "jieba.dict.utf8";
const DEFAULT_HMM_DICT = DICT_DIR + "hmm_model.utf8";
const DEFAULT_USER_DICT = DICT_DIR + "user.dict.utf8";
const DEFAULT_IDF_DICT = DICT_DIR + "idf.utf8";
const DEFAULT_STOP_WORD_DICT = DICT_DIR + "stop_words.utf8";

export async function ensure(context: vscode.ExtensionContext): Promise<any> {
    // e.g. https://github.com/yanyiwu/nodejieba/releases/download/v3.4.4/nodejieba-v3.4.4-node-v108-darwin-arm64.tar.gz

    const platform = process.platform;
    const nodeVersion = process.versions.modules;
    const arch = process.arch;
    const binName = `nodejieba-v${jiebaVersion}-node-v${nodeVersion}-${platform}-${arch}.tar.gz`;
    const binDir = path.join(context.globalStorageUri.fsPath, 'nodejieba');
    const extractDir = path.join(binDir, `v${nodeVersion}-${platform}-${arch}`);
    const nodejiebaNodePath = path.join(extractDir, 'Release/nodejieba.node');
    const downloadUrl = `https://github.com/yanyiwu/nodejieba/releases/download/v${jiebaVersion}/${binName}`;

    if (!fs.existsSync(nodejiebaNodePath)) {
        await fs.promises.mkdir(extractDir, { recursive: true });
        await downloadAndExtract(downloadUrl, extractDir);
    }
    const jieba = require(nodejiebaNodePath);
    jieba.load(DEFAULT_DICT, DEFAULT_HMM_DICT, DEFAULT_USER_DICT, DEFAULT_IDF_DICT, DEFAULT_STOP_WORD_DICT);
    return jieba;
}