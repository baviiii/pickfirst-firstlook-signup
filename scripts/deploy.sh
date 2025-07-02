#!/bin/bash

# Deploy script for PickFirst FirstLook Signup
# This script builds the application and prepares it for deployment

set -e

echo "🚀 Starting deployment process..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf dist

# Build the application
echo "🔨 Building application..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo "❌ Error: Build failed. dist directory not found."
    exit 1
fi

echo "✅ Build completed successfully!"
echo "📁 Built files are in the 'dist' directory"

# If this is a GitHub repository, provide GitHub Pages instructions
if [ -d ".git" ]; then
    echo ""
    echo "🌐 To deploy to GitHub Pages:"
    echo "1. Push your code to GitHub"
    echo "2. Go to repository Settings > Pages"
    echo "3. Select 'GitHub Actions' as source"
    echo "4. The CI/CD pipeline will automatically deploy on push to main branch"
    echo ""
    echo "📋 Or manually upload the contents of 'dist/' to your web server"
fi

echo "🎉 Deployment preparation complete!" 