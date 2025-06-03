"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listBackups = listBackups;
exports.restoreDatabase = restoreDatabase;
const child_process_1 = require("child_process");
const util_1 = require("util");
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const path_1 = require("path");
const zod_1 = require("zod");
const rest_1 = require("@octokit/rest");
const zlib_1 = require("zlib");
const util_2 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const gunzipAsync = (0, util_2.promisify)(zlib_1.gunzip);
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
async function listBackups() {
    try {
        const { data: releases } = await octokit.repos.listReleases({
            owner: env.GITHUB_OWNER,
            repo: env.GITHUB_REPO,
        });
        return releases
            .filter(release => release.tag_name.startsWith(`backup-${environment}-`))
            .map(release => ({
            tag: release.tag_name,
            name: release.name,
            created_at: release.created_at,
            assets: release.assets.map(asset => ({
                id: asset.id,
                name: asset.name,
                size: asset.size,
            })),
        }));
    }
    catch (error) {
        console.error('Failed to list backups:', error);
        throw error;
    }
}
async function restoreDatabase(backupTag) {
    const backupDir = (0, path_1.join)(__dirname, '../backups');
    const tempDir = (0, path_1.join)(backupDir, 'temp');
    const encryptedFile = (0, path_1.join)(tempDir, 'backup.enc');
    const compressedFile = (0, path_1.join)(tempDir, 'backup.gz');
    const sqlFile = (0, path_1.join)(tempDir, 'backup.sql');
    try {
        (0, fs_1.mkdirSync)(tempDir, { recursive: true });
        const { data: release } = await octokit.repos.getReleaseByTag({
            owner: env.GITHUB_OWNER,
            repo: env.GITHUB_REPO,
            tag: backupTag,
        });
        if (!release.assets.length) {
            throw new Error('No backup assets found in release');
        }
        const asset = release.assets[0];
        const { data: backupData } = await octokit.repos.getReleaseAsset({
            owner: env.GITHUB_OWNER,
            repo: env.GITHUB_REPO,
            asset_id: asset.id,
            headers: {
                accept: 'application/octet-stream',
            },
        });
        const encryptedStream = (0, fs_1.createWriteStream)(encryptedFile);
        let encryptedBuffer;
        if (Buffer.isBuffer(backupData)) {
            encryptedBuffer = backupData;
        }
        else if (typeof backupData === 'string') {
            encryptedBuffer = Buffer.from(backupData, 'binary');
        }
        else {
            throw new Error('Unsupported backupData type');
        }
        encryptedStream.write(encryptedBuffer);
        await new Promise((resolve, reject) => {
            encryptedStream.on('error', reject);
            encryptedStream.on('finish', resolve);
            encryptedStream.end();
        });
        const encryptedContent = (0, fs_1.createReadStream)(encryptedFile);
        const iv = Buffer.alloc(16);
        await new Promise((resolve, reject) => {
            encryptedContent.on('error', reject);
            encryptedContent.on('data', (chunk) => {
                if (Buffer.isBuffer(chunk)) {
                    iv.set(chunk.slice(0, 16));
                }
                else {
                    iv.set(Buffer.from(chunk).slice(0, 16));
                }
                resolve();
            });
        });
        const decipher = (0, crypto_1.createDecipheriv)('aes-256-gcm', Buffer.from(env.BACKUP_ENCRYPTION_KEY, 'hex'), iv);
        const authTag = Buffer.alloc(16);
        const encryptedData = await new Promise((resolve, reject) => {
            const chunks = [];
            encryptedContent.on('data', (chunk) => {
                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            });
            encryptedContent.on('end', () => {
                const data = Buffer.concat(chunks);
                authTag.set(data.slice(-16));
                resolve(data.slice(16, -16));
            });
            encryptedContent.on('error', reject);
        });
        decipher.setAuthTag(authTag);
        const decrypted = Buffer.concat([
            decipher.update(encryptedData),
            decipher.final(),
        ]);
        const decompressed = await gunzipAsync(decrypted);
        const decompressedStream = (0, fs_1.createWriteStream)(compressedFile);
        await new Promise((resolve, reject) => {
            decompressedStream.on('error', reject);
            decompressedStream.on('finish', resolve);
            decompressedStream.end(decompressed);
        });
        const restoreCmd = isProduction
            ? `psql "${env.DATABASE_URL}" --no-owner --no-acl < "${compressedFile}"`
            : `psql "${env.DATABASE_URL}" < "${compressedFile}"`;
        const { stderr } = await execAsync(restoreCmd);
        if (stderr) {
            console.error('Restore stderr:', stderr);
        }
        console.log('Database restored successfully');
    }
    catch (error) {
        console.error('Restore failed:', error);
        throw error;
    }
    finally {
        try {
            (0, fs_1.unlinkSync)(encryptedFile);
            (0, fs_1.unlinkSync)(compressedFile);
            (0, fs_1.unlinkSync)(sqlFile);
        }
        catch (error) {
            console.warn('Failed to clean up temporary files:', error);
        }
    }
}
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args[0] === 'list') {
        listBackups()
            .then(backups => {
            console.log('Available backups:');
            backups.forEach(backup => {
                console.log(`\nTag: ${backup.tag}`);
                console.log(`Name: ${backup.name}`);
                console.log(`Created: ${backup.created_at}`);
                console.log('Assets:');
                backup.assets.forEach(asset => {
                    console.log(`  - ${asset.name} (${(asset.size / 1024 / 1024).toFixed(2)} MB)`);
                });
            });
        })
            .catch(error => {
            console.error('Failed to list backups:', error);
            process.exit(1);
        });
    }
    else if (args[0] === 'restore' && args[1]) {
        restoreDatabase(args[1])
            .catch(error => {
            console.error('Restore failed:', error);
            process.exit(1);
        });
    }
    else {
        console.log('Usage:');
        console.log('  npm run restore list                    # List available backups');
        console.log('  npm run restore restore <backup-tag>    # Restore from backup');
        process.exit(1);
    }
}
//# sourceMappingURL=restore.js.map