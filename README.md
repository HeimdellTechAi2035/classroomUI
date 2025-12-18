# RemoteAbility Local Remote Classroom

A complete, local-first classroom management system for delivering RemoteAbility's 6-week training programmes. Designed to run entirely from an external hard drive with no external database dependencies.

## 🎯 Features

### Trainer Cockpit
- **Today's Session Dashboard** - Everything you need for your current session
- **Live Register** - Mark attendance with status (present, late, absent) and mood scores
- **Session Timer** - Track session time with break reminders
- **Zoom Controls** - Quick access to your meeting links
- **Support Request Queue** - See trainees who need help
- **AI Helper** - Optional AI assistance for trainers (local, privacy-first)

### Training Content
- **Weeks 1-6 Library** - Complete curriculum with slides, trainer notes, and activities
- **Outcome Tracking** - Monitor trainee progress through learning outcomes
- **Resource Vault** - Searchable library of training materials

### Trainee Features
- **Live Classroom** - View shared content, chat, and request support
- **Policy Centre** - Read and acknowledge required policies
- **Accessibility Controls** - Font size, high contrast, dyslexia fonts, reduced motion

### Data Management
- **Local SQLite Database** - All data stored securely on your device
- **Encrypted Sensitive Data** - Safeguarding logs encrypted with AES-256
- **Backup & Restore** - Full backup capability to prevent data loss
- **Export Options** - CSV, PDF exports for registers and reports

## 🚀 Getting Started

### Prerequisites
- Node.js 18 or later
- npm or yarn

### Installation

1. **Clone or download** the project to your external hard drive:
   ```bash
   cd /path/to/external/drive
   git clone [repository-url] RemoteAbilityClassroom
   cd RemoteAbilityClassroom
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start in development mode**:
   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   ```

### First Run
On first launch, the app will:
1. Ask you to confirm the storage location
2. Create necessary folder structure
3. Initialize the database
4. Offer to import sample content

## 📁 Folder Structure

```
RemoteAbilityClassroom/
├── content/
│   ├── weeks/
│   │   ├── week-1/
│   │   │   ├── overview.md
│   │   │   ├── slides/
│   │   │   ├── activities/
│   │   │   └── resources/
│   │   ├── week-2/
│   │   └── ... (weeks 3-6)
│   ├── policies/
│   │   ├── safeguarding.md
│   │   ├── code-of-conduct.md
│   │   └── health-safety.md
│   └── resources/
│       └── (shared resources)
├── data/
│   ├── classroom.db        # SQLite database
│   └── encryption.key      # Local encryption key (never share!)
├── exports/                # Generated exports
├── backups/               # Backup files
└── src/                   # Application source code
```

## 🔒 Security & Privacy

### Data Protection
- All data stays local - nothing is sent to external servers
- Sensitive fields (safeguarding notes, personal data) are encrypted
- Encryption key is generated locally and stored on your device

### Important Notes
- **Never share your encryption.key file**
- Keep regular backups on a separate drive
- The database contains personal data - handle with care

## 📚 Adding Content

### Week Content
Add week content to `/content/weeks/week-N/`:
- `overview.md` - Main content and trainer notes
- `/slides/` - Presentation slides (PNG, PDF)
- `/activities/` - Activity instructions
- `/resources/` - Week-specific resources

### Policies
Add policy documents to `/content/policies/`:
- Use Markdown format
- Include frontmatter for metadata:
  ```yaml
  ---
  title: Policy Name
  version: 1.0
  requiresAcknowledgement: true
  ---
  ```

### Resources
Add general resources to `/content/resources/`:
- Supported formats: PDF, DOCX, images, links
- Resources appear in the Resource Vault automatically

## ♿ Accessibility

Built with accessibility in mind:
- **Font Sizes**: Normal, Large, Larger options
- **High Contrast Mode**: Enhanced colour contrast
- **Dyslexia Font**: OpenDyslexic option
- **Reduced Motion**: Minimises animations
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader Support**: ARIA labels throughout

## 🛠 Trainer Toolkit

### Session Setup
- Pre-built session templates
- Customisable agendas
- Pre-session checklists

### Exports
- Register exports (CSV, PDF)
- Progress reports
- Session packs (offline use)

### Backup
- One-click full backup
- Restore from any backup
- Database integrity checks

## 🤖 AI Helper (Optional)

The AI helper is optional and off by default. When enabled:
- Runs completely locally using local models
- No data sent to external AI services
- Provides coaching prompts and explanations
- Can be enabled per-session or globally

## 🔧 Configuration

### Settings
Access via the Settings page:
- Accessibility preferences
- Default Zoom link
- Auto-save intervals
- Notification preferences
- AI helper configuration

### Environment
The app supports:
- **Portable Mode**: Auto-detects base path when run from external drive
- **Custom Path**: Specify data location on first run

## 📝 License

Proprietary - RemoteAbility CIC

## 🆘 Support

For technical support:
- Email: tech@remoteability.org

For training support:
- Contact your programme coordinator
