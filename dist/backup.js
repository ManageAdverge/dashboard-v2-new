"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.backupDatabase = backupDatabase;
const child_process_1 = require("child_process");
const util_1 = require("util");
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const path_1 = require("path");
const date_fns_1 = require("date-fns");
const zod_1 = require("zod");
const rest_1 = require("@octokit/rest");
const zlib_1 = require("zlib");
const util_2 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const gzipAsync = (0, util_2.promisify)(zlib_1.gzip);
const envSchema = zod_1.z.object({
    DATABASE_URL: zod_1.z.string(),
    GITHUB_TOKEN: zod_1.z.string(),
    GITHUB_OWNER: zod_1.z.string(),
    GITHUB_REPO: zod_1.z.string(),
    BACKUP_ENCRYPTION_KEY: zod_1.z.string(),
    NODE_ENV: zod_1.z.enum(['test', 'production']),
    VERCEL_ENV: zod_1.z.enum(['production', 'preview', 'development']).optional(),
});
const env = envSchema.parse(process.env);
const isProduction = env.VERCEL_ENV === 'production' || env.NODE_ENV === 'production';
const environment = isProduction ? 'production' : 'test';
const octokit = new rest_1.Octokit({
    auth: env.GITHUB_TOKEN,
});
async function backupDatabase() {
    const timestamp = (0, date_fns_1.format)(new Date(), 'yyyy-MM-dd-HH-mm-ss');
    const backupDir = (0, path_1.join)(__dirname, '../backups');
    const backupFile = `${environment}-${timestamp}.sql`;
    const backupPath = (0, path_1.join)(backupDir, backupFile);
    const encryptedFile = `${backupPath}.enc`;
    const compressedFile = `${backupPath}.gz`;
    try {
        (0, fs_1.mkdirSync)(backupDir, { recursive: true });
        const dbUrl = new URL(env.DATABASE_URL);
        const pgDumpCmd = isProduction
            ? `pg_dump "${env.DATABASE_URL}" --no-owner --no-acl > "${backupPath}"`
            : `pg_dump "${env.DATABASE_URL}" > "${backupPath}"`;
        const { stderr } = await execAsync(pgDumpCmd);
        if (stderr) {
            console.error('Backup stderr:', stderr);
        }
        const input = (0, fs_1.readFileSync)(backupPath);
        const compressed = await gzipAsync(input);
        await new Promise((resolve, reject) => {
            const compressedStream = (0, fs_1.createWriteStream)(compressedFile);
            compressedStream.on('error', reject);
            compressedStream.on('finish', resolve);
            compressedStream.end(compressed);
        });
        const iv = (0, crypto_1.randomBytes)(16);
        const cipher = (0, crypto_1.createCipheriv)('aes-256-gcm', Buffer.from(env.BACKUP_ENCRYPTION_KEY, 'hex'), iv);
        const encrypted = Buffer.concat([
            cipher.update(compressed),
            cipher.final(),
            cipher.getAuthTag(),
        ]);
        const encryptedStream = (0, fs_1.createWriteStream)(encryptedFile);
        encryptedStream.write(iv);
        encryptedStream.write(encrypted);
        encryptedStream.end();
        const releaseTag = `backup-${environment}-${timestamp}`;
        const releaseName = `Database Backup ${environment} ${timestamp}`;
        const backupContent = (0, fs_1.readFileSync)(encryptedFile);
        const { data: release } = await octokit.repos.createRelease({
            owner: env.GITHUB_OWNER,
            repo: env.GITHUB_REPO,
            tag_name: releaseTag,
            name: releaseName,
            body: `Database backup for ${environment} environment\nTimestamp: ${timestamp}\nDatabase: ${dbUrl.pathname.slice(1)}`,
            draft: true,
        });
        await octokit.repos.uploadReleaseAsset({
            owner: env.GITHUB_OWNER,
            repo: env.GITHUB_REPO,
            release_id: release.id,
            name: `${backupFile}.enc`,
            data: (0, fs_1.readFileSync)(encryptedFile),
            headers: {
                'content-type': 'application/octet-stream',
                'content-length': backupContent.length,
            },
        });
        (0, fs_1.unlinkSync)(backupPath);
        (0, fs_1.unlinkSync)(compressedFile);
        (0, fs_1.unlinkSync)(encryptedFile);
        console.log(`Backup completed successfully: ${releaseTag}`);
        return releaseTag;
    }
    catch (error) {
        console.error('Backup failed:', error);
        throw error;
    }
}
backupDatabase().catch((error) => {
    console.error('Backup script failed:', error);
    process.exit(1);
});
//# sourceMappingURL=backup.js.map