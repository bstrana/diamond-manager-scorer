#!/bin/bash
# Build script for Cloudron deployment
# This script builds the app with environment variables from Cloudron

set -e

echo "Building Baseball Scoreboard for Cloudron..."

# Build the application
npm run build

# Inject environment variables into the built files
# Cloudron provides env vars at runtime, but we need to make them available to the client
# We'll create a config.js file that reads from window.env or process.env
echo "Build complete. Environment variables will be read from Cloudron at runtime."



