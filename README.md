# NowledgeBase

> **A powerful AI-assisted knowledge management system with smart categorization, visual knowledge graphs, and intuitive note organization.**

![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg)
![Tech](https://img.shields.io/badge/tech-React%2BTauri%2BRust-orange.svg)

## 🌟 Features

### 🤖 **AI-Powered Intelligence**
- **Smart Chat Interface** - AI assistant with multiple response types (Brief, Yes/No, Bullet points)
- **Automatic Title Generation** - AI creates concise, descriptive titles for your notes
- **Smart Categorization** - AI suggests and creates categories automatically
- **DeepSeek R1 Integration** - High-quality responses using state-of-the-art AI

### 📊 **Advanced Knowledge Management**
- **Three-Mode Interface**: Chat, Notes, and Visual Knowledge Graph
- **Visual Knowledge Graph** - Interactive node-based visualization of your knowledge
- **Note Linking System** - Create relationships between notes with custom link types
- **Hierarchical Categories** - Unlimited depth category trees with visual organization
- **Persistent Storage** - Local JSON storage with full data control

### 🎨 **Modern Desktop Experience**
- **Global Keyboard Shortcut** - `Cmd+Option+A` (Mac) / `Ctrl+Alt+A` (Windows/Linux)
- **System Tray Integration** - Always accessible, never gets in your way
- **Resizable Interface** - Customizable sidebar and window sizing
- **Toast Notifications** - Instant feedback for all operations
- **Always-on-Top Mode** - Stay productive without window switching

## 🚀 Quick Start

### Prerequisites
- **OpenRouter API Key** - Get one free at [openrouter.ai/keys](https://openrouter.ai/keys)

### Installation

1. **Download** the latest release for your platform
2. **Copy your OpenRouter API key** from [openrouter.ai/keys](https://openrouter.ai/keys)
3. **Set up environment**: Copy `.env.example` to `.env` and add your API key:
   ```bash
   cp .env.example .env
   # Edit .env and add your API key
   ```
4. **Launch** NowledgeBase

### First Run

1. **Global Shortcut**: Press `Cmd+Option+A` (Mac) or `Ctrl+Alt+A` (Windows/Linux)
2. **Chat Mode**: Start by asking the AI any question
3. **Save to Notes**: Click "Save to Notes" on any AI response
4. **Explore Graph**: Switch to Graph mode to visualize your knowledge network

## 📖 Usage Guide

### 💬 **Chat Mode**
- Ask questions and get AI-powered answers
- Choose response types: Brief, Yes/No, or Bullet points  
- Save interesting responses directly to your knowledge base
- Chat history is maintained during your session

### 📝 **Notes Mode**
- Create notes manually with rich categorization
- Browse your organized knowledge in the sidebar
- Edit, delete, and reorganize notes with ease
- Use the visual category picker for organization

### 🌐 **Knowledge Graph Mode**
- Visualize your notes as an interactive network
- Create links between related notes
- Drag and position nodes to organize visually
- Different link types: "relates to", "builds on", "contradicts", etc.

### 🗂️ **Category Management**
- **Auto-Creation**: AI creates categories when saving notes
- **Visual Browsing**: Navigate categories with the tree sidebar  
- **Unlimited Hierarchy**: Create subcategories as deep as needed
- **Smart Cleanup**: Categories stay organized automatically

## 🛠️ Development

### Prerequisites
- **Node.js** 18+ and npm
- **Rust** 1.70+ 
- **Tauri CLI** 2.0+

### Setup
```bash
# Clone the repository
git clone <repository-url>
cd NowledgeBase

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Add your OpenRouter API key to .env

# Run in development mode
npm run tauri:dev

# Build for production
npm run tauri:build
```

### Architecture
- **Frontend**: React 18 + TypeScript + Vite + ReactFlow
- **Backend**: Rust + Tauri v2 
- **AI Integration**: OpenRouter API (DeepSeek R1)
- **Storage**: Local JSON files with atomic operations
- **State Management**: React Context with reducer pattern

## 📁 Data & Configuration

### Environment Variables
Create a `.env` file in the project root:
```bash
# Required: Your OpenRouter API key
OPENROUTER_API_KEY=your_api_key_here

# Optional: AI model (defaults to deepseek/deepseek-r1)
AI_MODEL=deepseek/deepseek-r1

# Optional: Response length limits (defaults shown)
MAX_TOKENS=500              # Brief responses  
MAX_DETAILED_TOKENS=1500    # Detailed responses
MAX_YES_NO_TOKENS=100       # Yes/No responses
MAX_BULLET_TOKENS=400       # Bullet point responses
```

**Note**: Token limits are enforced with minimum safe values to prevent truncation bugs.

### Data Storage
```
macOS: ~/Library/Application Support/niubi-knowledgebase/
├── categories.json    # Category hierarchy and metadata
├── notes.json        # All your notes with content and references
└── links.json        # Note relationships and positions
```

### Backup Your Data
```bash
# Backup (macOS)
cp -r ~/Library/Application\ Support/niubi-knowledgebase/ ~/Desktop/backup/

# Restore
cp -r ~/Desktop/backup/ ~/Library/Application\ Support/niubi-knowledgebase/
```

## 🎯 Key Technical Features

### Knowledge Graph System
- **Interactive Visualization** - ReactFlow-powered graph interface
- **Custom Node Types** - Specialized note nodes with preview
- **Link Management** - Create, edit, and delete relationships
- **Persistent Positioning** - Node positions saved automatically
- **Real-time Updates** - Changes reflect immediately across modes

### AI Integration
- **Multiple Models** - DeepSeek R1 for high-quality responses
- **Contextual Prompts** - Optimized prompts for different response types
- **Rate Limit Handling** - Graceful error handling and fallbacks
- **Environment-based Config** - Secure API key management

### Data Architecture
- **Atomic Operations** - Safe concurrent access to data files
- **UUID References** - Robust referential integrity
- **Schema Validation** - Data consistency guarantees
- **Migration Support** - Backward compatibility for updates

## 🔧 Advanced Configuration

### Keyboard Shortcuts
- **Global Toggle**: `Cmd+Option+A` (Mac) / `Ctrl+Alt+A` (Windows/Linux)
- **Within App**: Standard shortcuts work (Cmd+C, Cmd+V, etc.)

### Window Behavior
- **Hide to Tray**: Closing hides to system tray (use tray menu to quit)
- **Always-on-Top**: Stays visible above other windows
- **Resizable**: Drag sidebar edges to resize

### AI Model Configuration
Edit your `.env` file to change AI models:
```bash
# Use different model (if supported by OpenRouter)
AI_MODEL=anthropic/claude-3-sonnet
```

## 🐛 Troubleshooting

### Common Issues

**"API key not set" Error**
- Ensure `.env` file exists in project root
- Verify `OPENROUTER_API_KEY` is set correctly
- Restart the application after changing `.env`

**App won't start**
- Check Node.js and Rust versions meet requirements
- Run `npm run tauri:dev` to see detailed error messages
- Ensure all dependencies are installed

**Graph not displaying**
- Check browser console for JavaScript errors
- Ensure ReactFlow dependencies are properly installed
- Try switching modes and back to Graph

**Data not saving**
- Check write permissions to application data directory
- Ensure sufficient disk space
- Look for error messages in console

### Getting Help
- Check this README for configuration details
- Open an issue on GitHub with detailed error information
- Include console logs and system information

## 🚧 Known Limitations

- **Large datasets**: JSON storage may slow with 1000+ notes (SQLite migration planned)
- **Offline only**: No cloud sync currently available
- **Single user**: No collaboration features

## 🎯 Roadmap

### Phase 1: Enhanced Safety
- [ ] Auto-backup system with version history
- [ ] Export/import in multiple formats
- [ ] Data integrity validation

### Phase 2: Performance & Scale  
- [ ] SQLite database migration
- [ ] Full-text search across all notes
- [ ] Lazy loading for large datasets

### Phase 3: Rich Features
- [ ] Rich text editing with formatting
- [ ] File attachments and images
- [ ] Dark mode and themes
- [ ] Advanced search filters

### Phase 4: Platform Expansion
- [ ] Mobile companion apps
- [ ] Optional cloud sync
- [ ] Browser extension for web clipping

## 🤝 Contributing

We welcome contributions! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

### Development Guidelines
- Follow Rust and TypeScript best practices
- Maintain type safety across the Tauri bridge
- Add proper error handling for new features
- Update documentation for user-facing changes

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **OpenRouter** - AI model API access
- **Tauri** - Cross-platform desktop framework  
- **ReactFlow** - Graph visualization
- **DeepSeek** - High-quality AI responses

---

**Made with ❤️ for knowledge workers who value privacy, organization, and AI-assisted productivity.**

*NowledgeBase - Where AI meets visual knowledge management.*