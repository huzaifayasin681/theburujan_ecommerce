#!/bin/bash
echo "Waiting for MySQL to be ready..."
while ! docker exec theburujanecommerce-mysql-1 mysqladmin ping -h localhost -p"local-root-change-me" --silent; do
    sleep 2
done

echo "Database is ready! Running migrations and seed..."
npm run db:migrate
npm run db:seed

echo "Starting development server..."
npm run dev
