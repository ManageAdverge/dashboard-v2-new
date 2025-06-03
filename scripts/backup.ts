import { exec } from 'child_process';
import { promisify } from 'util';
import { createCipheriv, randomBytes } from 'crypto';
import { createWriteStream, readFileSync, writeFileSync, unlinkSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { format } from 'date-fns';
import { z } from 'zod';
import { Octokit } from '@octokit/rest';
import { gzip } from 'zlib';
import { promisify as p } from 'util';

const execAsync = promisify(exec);
const gzipAsync = p(gzip);

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

async function backupDatabase() {
  const timestamp = format(new Date(), 'yyyy-MM-dd-HH-mm-ss');
  const backupDir = join(__dirname, '../backups');
  const backupFile = `${environment}-${timestamp}.sql`;
  const backupPath = join(backupDir, backupFile);
  const encryptedFile = `${backupPath}.enc`;
  const compressedFile = `${backupPath}.gz`;

  try {
    // Create backup directory if it doesn't exist
    mkdirSync(backupDir, { recursive: true });

    // Create database backup using pg_dump
    const dbUrl = new URL(env.DATABASE_URL);
    const pgDumpCmd = isProduction
      ? `/usr/lib/postgresql/17/bin/pg_dump "${env.DATABASE_URL}" --no-owner --no-acl`
      : `/usr/lib/postgresql/17/bin/pg_dump "${env.DATABASE_URL}"`;

    let stdout, stderr;
    try {
      ({ stdout, stderr } = await execAsync(pgDumpCmd));
      console.log('pg_dump stdout:', stdout);
      console.error('pg_dump stderr:', stderr);
    } catch (error) {
      console.error('pg_dump failed:', error);
      throw error;
    }

    if (!stdout || !stdout.trim()) {
      console.error('pg_dump produced no output!');
    }
    writeFileSync(backupPath, stdout);

    if (!existsSync(backupPath)) {
      console.error('Backup file was not created:', backupPath);
      throw new Error('Backup file was not created');
    }

    const input = readFileSync(backupPath);

    // Compress the backup file
    const compressed = await gzipAsync(input);
    await new Promise<void>((resolve, reject) => {
      const compressedStream = createWriteStream(compressedFile);
      compressedStream.on('error', reject);
      compressedStream.on('finish', resolve);
      compressedStream.end(compressed);
    });

    // Encrypt the compressed file
    const iv = randomBytes(16);
    const cipher = createCipheriv(
      'aes-256-gcm',
      Buffer.from(env.BACKUP_ENCRYPTION_KEY, 'hex'),
      iv
    );

    const encrypted = Buffer.concat([
      cipher.update(compressed),
      cipher.final(),
      cipher.getAuthTag(),
    ]);

    // Write encrypted file
    const encryptedStream = createWriteStream(encryptedFile);
    encryptedStream.write(iv);
    encryptedStream.write(encrypted);
    await new Promise<void>((resolve, reject) => {
      encryptedStream.on('finish', resolve);
      encryptedStream.on('error', reject);
      encryptedStream.end();
    });
    const backupContent = readFileSync(encryptedFile);

    // Upload to GitHub Packages
    const releaseTag = `backup-${environment}-${timestamp}`;
    const releaseName = `Database Backup ${environment} ${timestamp}`;

    // Create a new release
    const { data: release } = await octokit.repos.createRelease({
      owner: env.GITHUB_OWNER,
      repo: env.GITHUB_REPO,
      tag_name: releaseTag,
      name: releaseName,
      body: `Database backup for ${environment} environment\nTimestamp: ${timestamp}\nDatabase: ${dbUrl.pathname.slice(1)}`,
      draft: true, // Create as draft to allow cleanup of old backups
    });

    // Upload backup as release asset
    await octokit.repos.uploadReleaseAsset({
      owner: env.GITHUB_OWNER,
      repo: env.GITHUB_REPO,
      release_id: release.id,
      name: `${backupFile}.enc`,
      data: readFileSync(encryptedFile) as unknown as string,
      headers: {
        'content-type': 'application/octet-stream',
        'content-length': backupContent.length,
      },
    });

    // Clean up local files
    unlinkSync(backupPath);
    unlinkSync(compressedFile);
    unlinkSync(encryptedFile);

    console.log(`Backup completed successfully: ${releaseTag}`);
    return releaseTag;
  } catch (error) {
    console.error('Backup failed:', error);
    throw error;
  }
}

// Run backup
backupDatabase().catch((error) => {
  console.error('Backup script failed:', error);
  process.exit(1);
});

export { backupDatabase }; 