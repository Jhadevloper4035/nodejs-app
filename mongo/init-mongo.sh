#!/usr/bin/env bash
set -euo pipefail

APP_DB="curve-comfort"
APP_USER="curve-comfort-user"
APP_PASS="password123"

mongosh --quiet <<EOF
// Switch to application database
db = db.getSiblingDB("${APP_DB}");

// Create app user only if it doesn't exist
if (db.getUser("${APP_USER}") === null) {
  db.createUser({
    user: "${APP_USER}",
    pwd: "${APP_PASS}",
    roles: [
      { role: "readWrite", db: "${APP_DB}" }
    ]
  });
  print("✅ Created app user '${APP_USER}' on database '${APP_DB}'");
} else {
  print("ℹ️ App user already exists: ${APP_USER}");
}
EOF
