#!/bin/bash

# Exit on error
set -e

echo "Running database migrations..."
npx prisma migrate deploy

echo "Verifying database connection..."
npx prisma db execute --stdin <<< "SELECT 1"

echo "Checking admin user..."
npx prisma db execute --stdin <<< "SELECT email, role FROM \"User\" WHERE email = 'manage@adverge.com'"

echo "Checking global settings..."
npx prisma db execute --stdin <<< "SELECT id FROM \"GlobalSettings\" LIMIT 1"

echo "Deployment complete!" 