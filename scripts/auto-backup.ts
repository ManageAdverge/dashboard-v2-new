import { S3Client, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { z } from 'zod';
import { subDays, isAfter, isBefore } from 'date-fns';
import { backupDatabase } from './backup';

// Environment validation
const envSchema = z.object({
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
  AWS_REGION: z.string(),
  BACKUP_BUCKET: z.string(),
  NODE_ENV: z.enum(['test', 'production']),
});

const env = envSchema.parse(process.env);

// S3 client setup
const s3Client = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

// Retention policies (in days)
const RETENTION_POLICIES = {
  daily: 7, // Keep daily backups for 7 days
  weekly: 30, // Keep weekly backups for 30 days
  monthly: 365, // Keep monthly backups for 1 year
};

async function cleanupOldBackups() {
  const now = new Date();
  const cutoffDates = {
    daily: subDays(now, RETENTION_POLICIES.daily),
    weekly: subDays(now, RETENTION_POLICIES.weekly),
    monthly: subDays(now, RETENTION_POLICIES.monthly),
  };

  try {
    // List all backups
    const { Contents } = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: env.BACKUP_BUCKET,
        Prefix: `backups/${env.NODE_ENV}/`,
      })
    );

    if (!Contents) return;

    // Process each backup
    for (const object of Contents) {
      if (!object.Key) continue;

      const backupDate = new Date(object.LastModified || 0);
      const isDaily = isAfter(backupDate, cutoffDates.daily);
      const isWeekly = isAfter(backupDate, cutoffDates.weekly) && isBefore(backupDate, cutoffDates.daily);
      const isMonthly = isAfter(backupDate, cutoffDates.monthly) && isBefore(backupDate, cutoffDates.weekly);

      // Delete if older than retention policy
      if (!isDaily && !isWeekly && !isMonthly) {
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: env.BACKUP_BUCKET,
            Key: object.Key,
          })
        );
        console.log(`Deleted old backup: ${object.Key}`);
      }
    }
  } catch (error) {
    console.error('Cleanup failed:', error);
    throw error;
  }
}

async function runAutomatedBackup() {
  try {
    // Run backup
    await backupDatabase();

    // Cleanup old backups
    await cleanupOldBackups();

    console.log('Automated backup completed successfully');
  } catch (error) {
    console.error('Automated backup failed:', error);
    throw error;
  }
}

// Run automated backup
runAutomatedBackup().catch((error) => {
  console.error('Automated backup script failed:', error);
  process.exit(1);
}); 