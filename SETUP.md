# 🚀 NowledgeBase Setup Guide

## ✅ Security Fixed!
**The API key security vulnerability has been resolved:**
- API keys are now stored in `.env` (excluded from git)
- `.env.example` template provided for setup
- Comprehensive `.gitignore` prevents sensitive data commits

## 📋 Quick Setup

### 1. Set up your API key
```bash
# Copy the example file
cp .env.example .env

# Edit .env and replace YOUR_API_KEY_HERE with your actual OpenRouter API key
# Get your key from: https://openrouter.ai/keys
```

### 2. Install dependencies
```bash
npm install
```

### 3. Run the application
```bash
npm run tauri:dev
```

## 🚨 IMPORTANT SECURITY NOTES

1. **Never commit `.env` files** - they are excluded by `.gitignore`
2. **Use `.env.example` as a template** - commit this instead of actual `.env`
3. **Replace YOUR_API_KEY_HERE** with your real API key in `.env`

## 🐙 GitHub Repository Setup

To push this project to GitHub:

1. **Create a new repository on GitHub:**
   - Go to https://github.com/new
   - Name: `NowledgeBase` or your preferred name
   - Description: "AI-powered knowledge management system with graph visualization"
   - Make it **Public** or **Private** (your choice)
   - Don't initialize with README (we already have one)

2. **Add GitHub remote and push:**
   ```bash
   # Replace YOUR_USERNAME with your GitHub username
   git remote add origin https://github.com/YOUR_USERNAME/NowledgeBase.git
   
   # Push to GitHub
   git branch -M main
   git push -u origin main
   ```

3. **Verify security:**
   - Check that `.env` is NOT visible in your GitHub repository
   - Only `.env.example` should be visible
   - API keys should never appear in your GitHub repo

## 🛡️ Security Features Implemented

✅ **API Key Protection**
- Environment variables for sensitive data
- `.gitignore` excludes all `.env` files
- Template file (`.env.example`) for setup

✅ **Git Security**
- Comprehensive `.gitignore`
- Database files excluded
- Build artifacts excluded
- IDE files excluded

✅ **Clean Repository**
- No hardcoded secrets
- Modular, maintainable code
- Proper documentation

## 🎯 Next Steps

1. Set up your API key in `.env`
2. Create GitHub repository
3. Push code to GitHub
4. Start using your secure knowledge management system!

---
**Remember:** Always keep your `.env` file local and never commit API keys to version control!