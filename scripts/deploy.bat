@echo off
REM Deploy script for PickFirst FirstLook Signup (Windows)
REM This script builds the application and prepares it for deployment

echo 🚀 Starting deployment process...

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: package.json not found. Please run this script from the project root.
    exit /b 1
)

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
)

REM Clean previous build
echo 🧹 Cleaning previous build...
if exist "dist" rmdir /s /q "dist"

REM Build the application
echo 🔨 Building application...
npm run build

REM Check if build was successful
if not exist "dist" (
    echo ❌ Error: Build failed. dist directory not found.
    exit /b 1
)

echo ✅ Build completed successfully!
echo 📁 Built files are in the 'dist' directory

REM If this is a GitHub repository, provide GitHub Pages instructions
if exist ".git" (
    echo.
    echo 🌐 To deploy to GitHub Pages:
    echo 1. Push your code to GitHub
    echo 2. Go to repository Settings ^> Pages
    echo 3. Select 'GitHub Actions' as source
    echo 4. The CI/CD pipeline will automatically deploy on push to main branch
    echo.
    echo 📋 Or manually upload the contents of 'dist/' to your web server
)

echo 🎉 Deployment preparation complete!
pause 