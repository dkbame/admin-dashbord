#!/bin/bash

# =====================================================
# DEPLOYMENT SCRIPT FOR APPSTORE DISCOVERY
# =====================================================
# This script automates the deployment process for GitHub and Netlify

set -e  # Exit on any error

echo "🚀 Starting deployment process..."
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if git is initialized
if [ ! -d ".git" ]; then
    print_error "Git repository not found. Initializing..."
    git init
fi

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
print_status "Current branch: $CURRENT_BRANCH"

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    print_warning "Uncommitted changes detected. Committing changes..."
    
    # Add all changes
    git add .
    
    # Commit with timestamp
    COMMIT_MESSAGE="Deploy: $(date '+%Y-%m-%d %H:%M:%S') - Refactored codebase with optimizations"
    git commit -m "$COMMIT_MESSAGE"
    print_success "Changes committed: $COMMIT_MESSAGE"
else
    print_status "No uncommitted changes found."
fi

# Check if remote origin exists
if ! git remote get-url origin > /dev/null 2>&1; then
    print_warning "No remote origin found. Please add your GitHub repository:"
    echo "git remote add origin https://github.com/yourusername/iOSstore.git"
    echo ""
    read -p "Enter your GitHub repository URL: " GITHUB_URL
    
    if [ -n "$GITHUB_URL" ]; then
        git remote add origin "$GITHUB_URL"
        print_success "Remote origin added: $GITHUB_URL"
    else
        print_error "No GitHub URL provided. Skipping remote setup."
        exit 1
    fi
fi

# Push to GitHub
print_status "Pushing to GitHub..."
if git push origin "$CURRENT_BRANCH"; then
    print_success "Successfully pushed to GitHub!"
else
    print_error "Failed to push to GitHub. Please check your credentials and try again."
    exit 1
fi

# Build admin dashboard
print_status "Building admin dashboard..."
cd admin-dashboard

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
fi

# Run linting
print_status "Running linting..."
if npm run lint; then
    print_success "Linting passed!"
else
    print_warning "Linting failed. Continuing with deployment..."
fi

# Build the project
print_status "Building Next.js project..."
if npm run build; then
    print_success "Build completed successfully!"
else
    print_error "Build failed. Please fix the errors and try again."
    exit 1
fi

cd ..

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    print_warning "Netlify CLI not found. Installing..."
    npm install -g netlify-cli
fi

# Deploy to Netlify
print_status "Deploying to Netlify..."
if netlify deploy --prod --dir=admin-dashboard/.next; then
    print_success "Successfully deployed to Netlify!"
else
    print_error "Netlify deployment failed. Please check your configuration."
    exit 1
fi

# Database migration reminder
echo ""
print_status "Database Migration Reminder:"
echo "================================================"
echo "Don't forget to apply the database migration to Supabase:"
echo ""
echo "1. Apply the consolidated migration:"
echo "   supabase db push"
echo ""
echo "2. Verify the migration:"
echo "   supabase db diff"
echo ""
echo "3. Check the database documentation:"
echo "   cat DATABASE_DOCUMENTATION.md"
echo ""

# Final status
echo ""
print_success "Deployment completed successfully!"
echo "================================================"
echo "✅ Code pushed to GitHub"
echo "✅ Admin dashboard built"
echo "✅ Deployed to Netlify"
echo "⚠️  Remember to apply database migrations to Supabase"
echo ""

# Show deployment URLs
print_status "Deployment URLs:"
echo "GitHub: $(git remote get-url origin)"
echo "Netlify: Check your Netlify dashboard for the deployment URL"
echo "Supabase: Check your Supabase dashboard for database status"
echo ""

print_success "🎉 Deployment process completed!" 