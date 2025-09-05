#!/bin/bash

# This script automates the process of committing changes to Git and deploying to Firebase.
#
# Usage:
# 1. Make this script executable: chmod +x deploy.sh
# 2. Run the script from your project root: ./deploy.sh "Your commit message here"
#
# If you don't provide a commit message, a default one will be used.

# Exit immediately if a command exits with a non-zero status.
set -e

echo "✅ Starting deployment process..."

# 1. Update cache-buster value in apphosting.yaml
# This helps prevent issues with stale cached files on the client-side.
echo "🔄 Updating cache-buster..."
# Get current timestamp
TIMESTAMP=$(date +%s)
# Use sed to find and replace the CACHE_BUSTER value. Works on both macOS and Linux.
sed -i.bak "s/^\(\s*-\s*variable:\s*CACHE_BUSTER\s*\n\s*value:\s*\).*/\1\"$TIMESTAMP\"/" apphosting.yaml
rm apphosting.yaml.bak # Remove the backup file created by sed

echo "📦 Staging all changes..."
# 2. Add all changes to Git staging, including the updated apphosting.yaml
git add .

# 3. Commit changes
# Use the first argument as the commit message, or a default message if not provided.
COMMIT_MESSAGE=${1:-"Automated deployment to Firebase"}
echo "📝 Committing changes with message: '$COMMIT_MESSAGE'"
git commit -m "$COMMIT_MESSAGE"

# 4. Push changes to the remote repository
# Using -u (or --set-upstream) tells git to set the remote 'main' branch as the upstream for the local 'main' branch.
# This is only needed the first time but is safe to run on subsequent pushes.
echo "🔼 Pushing changes to remote repository..."
git push -u origin main

# 5. Deploy to Firebase
echo "🚀 Deploying to Firebase..."
# This command now deploys the web app AND the security rules for Firestore and Storage.
firebase deploy --only apphosting,firestore,storage

echo "🎉 Deployment complete!"
