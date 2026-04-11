# TopMusic

Electron-based music player app.

## Features
- Library management (add files, folders, drag & drop)
- Custom categories / playlists
- Activity graph (Canvas-based, interactive)
- ID3 metadata reading (title, artist, album, cover art)
- EQ per track, playback speed control
- Shuffle, repeat, like
- Recently played history
- Folder sync

## Running

```bash
npm install
npm start
# Dev mode with DevTools:
npm start -- --dev
```

## Keyboard Shortcuts
| Key | Action |
|-----|--------|
| Space | Play / Pause |
| → | Seek +5s |
| ← | Seek -5s |
| Esc | Clear selection / close menus |
| Ctrl+Click | Multi-select tracks |
