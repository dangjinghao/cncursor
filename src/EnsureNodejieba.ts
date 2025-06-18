import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as tar from 'tar';
import { Logger } from './Logger';

const logger = new Logger('EnsureNodejieba');

const jiebaVersion = '3.4.4';

const SUPPORT_NODE_VERSIONS = [
    '127', // Node 21
    '115', // Node 20
    '108', // Node 18
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

// Try to find the closest ceiling ABI version of the given version,
// if it does not found, return the latest version.
function ceilingVersion(version: string): string {
    const versions = SUPPORT_NODE_VERSIONS.map(v => parseInt(v, 10));
    const targetVersion = parseInt(version, 10);
    let closest = versions[versions.length - 1];
    for (const v of versions) {
        if (v < targetVersion) {
            closest = v;
            logger.debug(`[Ceiling Version] Found ${v} < ${targetVersion}, using it as closest.`);
            break;
        }
    }
    logger.info(`[Ceiling Version] ${version} -> ${closest}`);
    return closest.toString();
}

export async function ensure(context: vscode.ExtensionContext): Promise<any> {
    const platform = process.platform;
    let nodeABIVersion = process.versions.modules;
    if (!SUPPORT_NODE_VERSIONS.includes(nodeABIVersion)) {
        nodeABIVersion = ceilingVersion(nodeABIVersion);
    } else {
        logger.debug(`[Supported Node ABI Version] ${nodeABIVersion}.`);
    }
    const arch = process.arch;
    const binName = `nodejieba-v${jiebaVersion}-node-v${nodeABIVersion}-${platform}-${arch}.tar.gz`;
    const binDir = path.join(context.globalStorageUri.fsPath, 'nodejieba');
    const extractDir = path.join(binDir, `v${nodeABIVersion}-${platform}-${arch}`);
    const nodejiebaNodePath = path.join(extractDir, 'Release/nodejieba.node');
    const downloadUrl = `https://github.com/yanyiwu/nodejieba/releases/download/v${jiebaVersion}/${binName}`;
    logger.info(`[jiebaPath] ${nodejiebaNodePath}`);

    if (!fs.existsSync(nodejiebaNodePath)) {
        if (process.versions.modules !== nodeABIVersion) {
            // warn only when the nodejie is never installed before.
            const warnMsg = `[Unsupported Node ABI Version] ${process.versions.modules}. Supported versions: ${SUPPORT_NODE_VERSIONS.join(', ')}. Try to install the latest ABI version of nodejieba.`;
            logger.warn(warnMsg);
        }
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

    try {
        let jieba = require(nodejiebaNodePath);
        return jieba;
    } catch (err: any) {
        logger.error(`[Require Error] ${err.message}`);
        throw err;
    }


}

export function clearCache(context: vscode.ExtensionContext) {
    const binDir = path.join(context.globalStorageUri.fsPath, 'nodejieba');
    if (fs.existsSync(binDir)) {
        try {
            fs.rmSync(binDir, { recursive: true, force: true });
            logger.info(`[Cache Cleared] Removed directory: ${binDir}`);
        } catch (err: any) {
            logger.error(`[Cache Clear Error] ${err.message}`);
        }
    } else {
        logger.info(`[Cache Not Found] Directory does not exist: ${binDir}`);
    }
}