# File Tree Explorer

A modern, interactive file tree explorer built with vanilla React that leverages the File System Access API to provide seamless file and folder management directly in the browser.

![File Tree Explorer](https://img.shields.io/badge/React-18.x-blue)
![File System Access API](https://img.shields.io/badge/File%20System%20Access%20API-Supported-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ Features

- **🗂️ Real File System Integration**: Connect to actual directories on your computer
- **📁 File & Folder Operations**: Create, rename, and delete files and folders
- **🎯 Intuitive Interface**: Clean, modern UI with collapsible tree structure
- **⚡ Real-time Updates**: Automatic synchronization with file system changes
- **🔒 Secure**: Uses browser's native File System Access API
- **📱 Responsive**: Works on desktop browsers with File System Access API support
- **🎨 Elegant Status Messages**: Subtle feedback for all operations
- **🛡️ Error Handling**: Comprehensive error boundaries and validation

## 🚀 Demo

[Live Demo](https://your-username.github.io/file-tree-explorer) *(Replace with your GitHub Pages URL)*

## 📋 Prerequisites

- Modern browser with File System Access API support:
  - Chrome 86+
  - Edge 86+
  - Opera 72+
- Local web server (for development)

## 🛠️ Installation

### Option 1: Direct Download
1. Clone or download this repository
2. Open [index.html](cci:7://file:///Users/Mani/Desktop/tree/index.html:0:0-0:0) in a supported browser
3. Serve from a local web server (required for File System Access API)

### Option 2: Local Development Server
```bash
# Clone the repository
git clone [https://github.com/your-username/file-tree-explorer.git](https://github.com/your-username/file-tree-explorer.git)
cd file-tree-explorer

# Serve with Python (if you have Python installed)
python -m http.server 8000
# OR with Node.js
npx serve .
# OR with any other local server

# Open http://localhost:8000 in your browser