# Analytics Dashboard

A self-hosted analytics dashboard built with Next.js, Material-UI, and TypeScript. This dashboard provides a comprehensive view of your Google Ads campaign performance metrics.

## Features

- Campaign overview with key metrics
- Detailed campaign performance table
- Responsive design
- Modern UI with dark mode support
- Real-time data updates (coming soon)

## Getting Started

### Prerequisites

- Node.js 14.0 or later
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd analytics-dashboard
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Start the development server:
```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── src/
│   ├── components/     # React components
│   ├── pages/         # Next.js pages
│   ├── theme/         # Theme configuration
│   ├── types/         # TypeScript types
│   └── data/          # Mock data (replace with API)
├── public/            # Static assets
└── package.json       # Dependencies and scripts
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Backup System

The dashboard includes a robust backup system for both test and production environments. Backups are encrypted and stored in AWS S3.

### Environment Variables

Add these to your `.env` file:

```env
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=your_region
BACKUP_BUCKET=your_backup_bucket
BACKUP_ENCRYPTION_KEY=32_byte_hex_encryption_key

# Database URLs (already in your .env)
DATABASE_URL=your_database_url
```

### Backup Commands

- `npm run backup`: Create a manual backup
- `npm run backup:auto`: Run automated backup with retention policy
- `npm run restore <backup-key>`: Restore from a backup

### Backup Retention Policy

- Daily backups: Kept for 7 days
- Weekly backups: Kept for 30 days
- Monthly backups: Kept for 1 year

### Setting Up Automated Backups

1. Create an AWS S3 bucket for backups
2. Generate a 32-byte hex encryption key:
   ```bash
   openssl rand -hex 32
   ```
3. Set up environment variables
4. Schedule automated backups using cron or a task scheduler:
   ```bash
   # Daily at 2 AM
   0 2 * * * cd /path/to/dashboard && npm run backup:auto
   ```

### Restoring from Backup

1. List available backups in S3
2. Run restore command with backup key:
   ```bash
   npm run restore backups/production/2024-02-20-02-00-00.sql.enc
   ```

### Security Notes

- Backups are encrypted using AES-256-GCM
- S3 bucket should have versioning enabled
- Use IAM roles with minimal required permissions
- Regularly rotate encryption keys
- Monitor backup success/failure 