# Release Instructions

## Prepare for GitHub Release

### 1. Initialize Git Repository
```bash
git init
git add .
git commit -m "Initial commit: Obsidian Zeplin Sync v0.1.0"
```

### 2. Create GitHub Repository
1. Go to https://github.com/new
2. Repository name: `obsidian-zeplin-sync`
3. Description: "Sync Zeplin design projects to Obsidian"
4. Public repository
5. Don't initialize with README (we already have one)
6. Click "Create repository"

### 3. Push to GitHub
```bash
git remote add origin https://github.com/asharpe/obsidian-zeplin-sync.git
git branch -M main
git push -u origin main
```

### 4. Create First Release
```bash
# Create and push a tag
git tag -a 0.1.0 -m "Release v0.1.0"
git push origin 0.1.0
```

The GitHub Action will automatically:
- Build the plugin
- Create a release
- Upload `main.js`, `manifest.json`, and `styles.css`

### 5. Verify Release
1. Go to https://github.com/asharpe/obsidian-zeplin-sync/releases
2. Verify the release has the 3 required files
3. Edit the release notes if needed

## Installing from Release

Users can install by:
1. Download `main.js`, `manifest.json`, `styles.css` from latest release
2. Create folder: `VaultFolder/.obsidian/plugins/zeplin-sync/`
3. Copy the 3 files into that folder
4. Restart Obsidian
5. Enable the plugin in Settings → Community Plugins

## Future Releases

For subsequent releases:
1. Update version in `manifest.json` and `package.json`
2. Update `versions.json` with new version
3. Update `CHANGELOG.md`
4. Commit changes
5. Create and push new tag:
   ```bash
   git tag -a 0.2.0 -m "Release v0.2.0"
   git push origin 0.2.0
   ```

## Submit to Obsidian Community Plugins

To submit to the official Obsidian plugin directory:
1. Fork https://github.com/obsidianmd/obsidian-releases
2. Add your plugin to `community-plugins.json`
3. Create a pull request
4. Wait for review and approval

See: https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin
