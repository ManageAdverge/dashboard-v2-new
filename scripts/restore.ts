import { exec } from 'child_process';
import { promisify } from 'util';
import { createDecipheriv } from 'crypto';
import { createWriteStream, createReadStream, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';
import { Octokit } from '@octokit/rest';
import { gunzip } from 'zlib';
import { promisify as p } from 'util';

const execAsync = promisify(exec);
const gunzipAsync = p(gunzip);

// Environment validation
const envSchema = z.object({
  DATABASE_URL: z.string(),
  GITHUB_TOKEN: z.string(),
  GITHUB_OWNER: z.string(),
  GITHUB_REPO: z.string(),
  BACKUP_ENCRYPTION_KEY: z.string(),
  NODE_ENV: z.enum(['test', 'production']),
  VERCEL_ENV: z.enum(['production', 'preview', 'development']).optional(),
});

const env = envSchema.parse(process.env);

// Determine environment
const isProduction = env.VERCEL_ENV === 'production' || env.NODE_ENV === 'production';
const environment = isProduction ? 'production' : 'test';

// GitHub client setup
const octokit = new Octokit({
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
  } catch (error) {
    console.error('Failed to list backups:', error);
    throw error;
  }
}

async function restoreDatabase(backupTag: string) {
  const backupDir = join(__dirname, '../backups');
  const tempDir = join(backupDir, 'temp');
  const encryptedFile = join(tempDir, 'backup.enc');
  const compressedFile = join(tempDir, 'backup.gz');
  const sqlFile = join(tempDir, 'backup.sql');

  try {
    // Create temp directory
    mkdirSync(tempDir, { recursive: true });

    // Get the release
    const { data: release } = await octokit.repos.getReleaseByTag({
      owner: env.GITHUB_OWNER,
      repo: env.GITHUB_REPO,
      tag: backupTag,
    });

    if (!release.assets.length) {
      throw new Error('No backup assets found in release');
    }

    // Download the backup asset
    const asset = release.assets[0];
    const { data: backupData } = await octokit.repos.getReleaseAsset({
      owner: env.GITHUB_OWNER,
      repo: env.GITHUB_REPO,
      asset_id: asset.id,
      headers: {
        accept: 'application/octet-stream',
      },
    });

    // Write encrypted backup to file
    const encryptedStream = createWriteStream(encryptedFile);
    let encryptedBuffer: Buffer;
    if (Buffer.isBuffer(backupData)) {
      encryptedBuffer = backupData;
    } else if (typeof backupData === 'string') {
      encryptedBuffer = Buffer.from(backupData, 'binary');
    } else {
      throw new Error('Unsupported backupData type');
    }
    encryptedStream.write(encryptedBuffer);
    await new Promise<void>((resolve, reject) => {
      encryptedStream.on('error', reject);
      encryptedStream.on('finish', resolve);
      encryptedStream.end();
    });

    // Read and decrypt the backup
    const encryptedContent = createReadStream(encryptedFile);
    const iv = Buffer.alloc(16);
    await new Promise<void>((resolve, reject) => {
      encryptedContent.on('error', reject);
      encryptedContent.on('data', (chunk: string | Buffer) => {
        if (Buffer.isBuffer(chunk)) {
          iv.set(chunk.slice(0, 16));
        } else {
          iv.set(Buffer.from(chunk).slice(0, 16));
        }
        resolve();
      });
    });

    const decipher = createDecipheriv(
      'aes-256-gcm',
      Buffer.from(env.BACKUP_ENCRYPTION_KEY, 'hex'),
      iv
    );

    const authTag = Buffer.alloc(16);
    const encryptedData = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      encryptedContent.on('data', (chunk: string | Buffer) => {
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

    // Decompress the backup
    const decompressed = await gunzipAsync(decrypted);
    const decompressedStream = createWriteStream(compressedFile);
    await new Promise<void>((resolve, reject) => {
      decompressedStream.on('error', reject);
      decompressedStream.on('finish', resolve);
      decompressedStream.end(decompressed);
    });

    // Restore the database
    const restoreCmd = isProduction
      ? `psql "${env.DATABASE_URL}" --no-owner --no-acl < "${compressedFile}"`
      : `psql "${env.DATABASE_URL}" < "${compressedFile}"`;

    const { stderr } = await execAsync(restoreCmd);

    if (stderr) {
      console.error('Restore stderr:', stderr);
    }

    console.log('Database restored successfully');
  } catch (error) {
    console.error('Restore failed:', error);
    throw error;
  } finally {
    // Clean up temporary files
    try {
      unlinkSync(encryptedFile);
      unlinkSync(compressedFile);
      unlinkSync(sqlFile);
    } catch (error) {
      console.warn('Failed to clean up temporary files:', error);
    }
  }
}

// If run directly
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
  } else if (args[0] === 'restore' && args[1]) {
    restoreDatabase(args[1])
      .catch(error => {
        console.error('Restore failed:', error);
        process.exit(1);
      });
  } else {
    console.log('Usage:');
    console.log('  npm run restore list                    # List available backups');
    console.log('  npm run restore restore <backup-tag>    # Restore from backup');
    process.exit(1);
  }
}

export { listBackups, restoreDatabase }; 