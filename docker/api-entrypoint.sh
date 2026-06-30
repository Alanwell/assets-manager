#!/bin/sh
set -eu

cd /app/apps/api
node --import tsx src/database/migrate.ts
exec node dist/main.js

