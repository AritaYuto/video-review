#!/bin/sh
set -e

echo "Waiting for database..."
until pg_isready -h db -p 5432; do
  sleep 1
done

echo "Database setup"
npm run prisma:deploy
npm run prisma:generate

echo "Service build"
npm run build

echo "Service start"
npm run start
