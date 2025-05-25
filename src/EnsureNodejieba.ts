import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as tar from 'tar';
import { Logger } from './Logger';

const logger = new Logger('EnsureNodejieba');

const jiebaVersion = '3.4.4';

const SUPPORT_NODE_VERSIONS = [
    '108', // Node 18
    '115', // Node 20
    '127', // Node 21
];

async function downloadAndExtract(url: string, extractDir: string) {
    const tmpPath = path.join(extractDir, 'tmp.tar.gz');
    let file: fs.WriteStream | null = null;

    async function doGet(currentUrl: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            https.get(currentUrl, (res) => {
                if (res.statusCode === 302 && res.headers.location) {
                    logger.info(`[Redirect] ${currentUrl} -> ${res.headers.location}`);
                    doGet(res.headers.location).then(resolve, reject);
                    return;
                }
                if (res.statusCode !== 200) {
                    const errMsg = `[Download Error] Status: ${res.statusCode} URL: ${currentUrl}`;
                    logger.error(errMsg);
                    return reject(new Error(errMsg));
                }
                logger.info(`[Downloading] ${currentUrl}`);
                file = fs.createWriteStream(tmpPath);
                res.pipe(file);
                file.on('finish', () => {
                    file!.close(() => resolve());
                });
                file.on('error', (err) => {
                    logger.error(`[File Write Error] ${err.message}`);
                    reject(err);
                });
            }).on('error', (err) => {
                logger.error(`[HTTPS Error] ${err.message}`);
                reject(err);
            });
        });
    }

    try {
        await doGet(url);
        await tar.x({ file: tmpPath, cwd: extractDir });
    } catch (err: any) {
        logger.error(`[Extract Error] ${err.message}`);
        throw err;
    } finally {
        try {
            if (fs.existsSync(tmpPath)) {
                fs.unlinkSync(tmpPath);
            }
        } catch (err: any) {
            logger.warn(`[Cleanup Error] ${err.message}`);
        }
    }
}

export async function ensure(context: vscode.ExtensionContext): Promise<any> {
    const platform = process.platform;
    let nodeABIVersion = process.versions.modules;
    if (!SUPPORT_NODE_VERSIONS.includes(nodeABIVersion)) {
        const warnMsg = `[Unsupported Node ABI Version] ${nodeABIVersion}. Supported versions: ${SUPPORT_NODE_VERSIONS.join(', ')}. Try to install the latest ABI version of nodejieba.`;
        logger.warn(warnMsg);
        nodeABIVersion = SUPPORT_NODE_VERSIONS[SUPPORT_NODE_VERSIONS.length - 1];
    }
    const arch = process.arch;
    const binName = `nodejieba-v${jiebaVersion}-node-v${nodeABIVersion}-${platform}-${arch}.tar.gz`;
    const binDir = path.join(context.globalStorageUri.fsPath, 'nodejieba');
    const extractDir = path.join(binDir, `v${nodeABIVersion}-${platform}-${arch}`);
    const nodejiebaNodePath = path.join(extractDir, 'Release/nodejieba.node');
    const downloadUrl = `https://github.com/yanyiwu/nodejieba/releases/download/v${jiebaVersion}/${binName}`;
    logger.info(`[jiebaPath] ${nodejiebaNodePath}`);

    try {
        if (!fs.existsSync(nodejiebaNodePath)) {
            const progressOptions: vscode.ProgressOptions = {
                location: vscode.ProgressLocation.Notification,
                title: `Downloading ${binName} from GitHub...`,
                cancellable: false
            };

            await vscode.window.withProgress(progressOptions, async () => {
                try {
                    await fs.promises.mkdir(extractDir, { recursive: true });
                    await downloadAndExtract(downloadUrl, extractDir);
                } catch (err: any) {
                    logger.error(`[Download/Extract Error] ${err.message}`);
                    throw err;
                }
            });
        }
        let jieba: any;
        try {
            jieba = require(nodejiebaNodePath);
        } catch (err: any) {
            logger.error(`[Require Error] ${err.message}`);
            throw err;
        }

        return jieba;
    } catch (err: any) {
        logger.error(err);
        throw err;
    }
}
