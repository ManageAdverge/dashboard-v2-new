"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_s3_1 = require("@aws-sdk/client-s3");
const zod_1 = require("zod");
const date_fns_1 = require("date-fns");
const backup_1 = require("./backup");
const envSchema = zod_1.z.object({
    AWS_ACCESS_KEY_ID: zod_1.z.string(),
    AWS_SECRET_ACCESS_KEY: zod_1.z.string(),
    AWS_REGION: zod_1.z.string(),
    BACKUP_BUCKET: zod_1.z.string(),
    NODE_ENV: zod_1.z.enum(['test', 'production']),
});
const env = envSchema.parse(process.env);
const s3Client = new client_s3_1.S3Client({
    region: env.AWS_REGION,
    credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
});
const RETENTION_POLICIES = {
    daily: 7,
    weekly: 30,
    monthly: 365,
};
async function cleanupOldBackups() {
    const now = new Date();
    const cutoffDates = {
        daily: (0, date_fns_1.subDays)(now, RETENTION_POLICIES.daily),
        weekly: (0, date_fns_1.subDays)(now, RETENTION_POLICIES.weekly),
        monthly: (0, date_fns_1.subDays)(now, RETENTION_POLICIES.monthly),
    };
    try {
        const { Contents } = await s3Client.send(new client_s3_1.ListObjectsV2Command({
            Bucket: env.BACKUP_BUCKET,
            Prefix: `backups/${env.NODE_ENV}/`,
        }));
        if (!Contents)
            return;
        for (const object of Contents) {
            if (!object.Key)
                continue;
            const backupDate = new Date(object.LastModified || 0);
            const isDaily = (0, date_fns_1.isAfter)(backupDate, cutoffDates.daily);
            const isWeekly = (0, date_fns_1.isAfter)(backupDate, cutoffDates.weekly) && (0, date_fns_1.isBefore)(backupDate, cutoffDates.daily);
            const isMonthly = (0, date_fns_1.isAfter)(backupDate, cutoffDates.monthly) && (0, date_fns_1.isBefore)(backupDate, cutoffDates.weekly);
            if (!isDaily && !isWeekly && !isMonthly) {
                await s3Client.send(new client_s3_1.DeleteObjectCommand({
                    Bucket: env.BACKUP_BUCKET,
                    Key: object.Key,
                }));
                console.log(`Deleted old backup: ${object.Key}`);
            }
        }
    }
    catch (error) {
        console.error('Cleanup failed:', error);
        throw error;
    }
}
async function runAutomatedBackup() {
    try {
        await (0, backup_1.backupDatabase)();
        await cleanupOldBackups();
        console.log('Automated backup completed successfully');
    }
    catch (error) {
        console.error('Automated backup failed:', error);
        throw error;
    }
}
runAutomatedBackup().catch((error) => {
    console.error('Automated backup script failed:', error);
    process.exit(1);
});
//# sourceMappingURL=auto-backup.js.map