# Obsidian Zeplin Sync Plugin

Sync your Zeplin design projects, components, and screens directly into Obsidian as markdown files.

## Features

- ✅ **Sync Zeplin Projects** - Import entire design projects
- ✅ **Individual Screen Pages** - Each screen gets its own markdown file
- ✅ **Component Library** - Sync all components with previews
- ✅ **Design Tokens** - Import colors and text styles
- ✅ **Visual Previews** - Display design images in Obsidian
- ✅ **Auto-linking** - Navigate between screens and components easily
- ✅ **Metadata** - Links back to Zeplin, tags, sections, descriptions
- ✅ **Filtering** - Exclude screens and components using glob patterns

## Installation

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css`
2. Create a folder in your vault: `.obsidian/plugins/zeplin-sync/`
3. Copy the three files into that folder
4. Reload Obsidian
5. Enable the plugin in Settings → Community Plugins

### From Release

1. Go to Settings → Community Plugins → Browse
2. Search for "Zeplin Sync"
3. Install and enable

## Setup

1. Get your Zeplin API token:
   - Go to https://app.zeplin.io/profile/developer
   - Create a personal access token

2. Configure the plugin:
   - Open Obsidian Settings
   - Go to Zeplin Sync settings
   - Paste your API token
   - Choose your default folder (e.g., "Zeplin")

## Usage

### Sync a Project

1. Click the sync icon in the ribbon, OR
2. Open Command Palette (`Cmd/Ctrl+P`)
3. Run "Sync from Zeplin"
4. Select your project
5. Wait for sync to complete

### Folder Structure

**With "Organize by Sections" enabled (default: on) and "Create Project Folder" enabled:**

```
Zeplin/
└── ProjectName/
    ├── README.md           (project overview)
    ├── Components.md       (index of components)
    ├── Components/
    │   ├── Section A/
    │   │   ├── Button.md
    │   │   └── Card.md
    │   └── Section B/
    │       └── Input.md
    ├── Screens.md          (index of screens)
    ├── Screens/
    │   ├── Onboarding/
    │   │   ├── Welcome.md
    │   │   └── Login.md
    │   └── Main/
    │       └── Home.md
    └── Design Tokens.md    (colors & typography)
```

**With "Organize by Sections" disabled and "Create Project Folder" disabled:**

```
Zeplin/
├── README.md           (project overview)
├── Components.md       (index of components)
├── Components/
│   ├── Button.md
│   ├── Card.md
│   └── ...
├── Screens.md          (index of screens)
├── Screens/
│   ├── Home.md
│   ├── Login.md
│   └── ...
└── Design Tokens.md    (colors & typography)
```

### What Gets Synced

**For Each Screen:**
- Description
- Tags
- Section
- Visual preview image
- Link to view in Zeplin

**For Each Component:**
- Description
- Section
- Visual preview image
- Link to view in Zeplin

**Design Tokens:**
- Color palette with hex values
- Text styles (font, size, weight)

## Settings

- **Zeplin API Token** - Your personal access token
- **Default Folder** - Where to sync content (default: "Zeplin")
- **Image Storage** - How to handle images:
  - `assets` - Use direct URLs (recommended)
  - `inline` - Embed as base64 (works offline)
- **Template Format** - Detail level:
  - `detailed` - Full information
  - `minimal` - Compact view
- **Create Project Folder** - Create a folder with the project name inside the default folder (default: off)
  - Enabled: syncs to `Zeplin/ProjectName/`
  - Disabled: syncs directly to `Zeplin/`
- **Organize by Sections** - Create folders based on Zeplin sections (default: on)
  - Enabled: organizes screens and components into section subfolders
  - Disabled: all screens and components in flat structure
- **Exclude Patterns** - Glob patterns to skip screens and components (one per line):
  - Example: `*-old` - excludes items ending with "-old"
  - Example: `test-*` - excludes items starting with "test-"
  - Example: `*-deprecated` - excludes items ending with "-deprecated"

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Type check
npm run typecheck
```

## Troubleshooting

**"No Zeplin projects found"**
- Check your API token is valid
- Ensure you have access to projects in Zeplin

**"Connection failed"**
- Verify your internet connection
- Check Zeplin API status
- Confirm token hasn't expired

**Images not showing**
- Check image URLs in markdown
- Try switching image storage mode in settings

## License

MIT

## Support

For issues and feature requests, please visit the [GitHub repository](https://github.com/yourusername/obsidian-zeplin-sync).
