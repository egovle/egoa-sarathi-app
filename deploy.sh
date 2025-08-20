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

# 1. Add all changes to Git staging
echo "📦 Staging all changes..."
git add .

# 2. Commit changes
# Use the first argument as the commit message, or a default message if not provided.
COMMIT_MESSAGE=${1:-"Automated deployment to Firebase"}
echo "📝 Committing changes with message: '$COMMIT_MESSAGE'"
git commit -m "$COMMIT_MESSAGE"

# 3. Push changes to the remote repository
echo "🔼 Pushing changes to remote repository..."
git push

# 4. Deploy to Firebase
echo "🚀 Deploying to Firebase App Hosting..."
firebase deploy --only apphosting

echo "🎉 Deployment complete!"
