
const { useState, createContext, useContext, useEffect, useCallback } = React;

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Tree component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return React.createElement('div', { className: 'error-boundary' },
        React.createElement('h2', null, 'Something went wrong'),
        React.createElement('p', null, 'The file tree encountered an error. Please refresh the page.'),
        React.createElement('button', {
          onClick: () => window.location.reload(),
          className: 'error-retry-btn'
        }, 'Reload Page')
      );
    }
    return this.props.children;
  }
}

// Notification Context
const NotificationContext = createContext();

// Status Provider for subtle status messages
const StatusProvider = ({ children }) => {
  const [status, setStatus] = useState({ message: '', type: 'info', visible: false });
  const [timeoutId, setTimeoutId] = useState(null);

  const showStatus = useCallback((message, type = 'info', duration = 3000) => {
    // Clear existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    setStatus({ message, type, visible: true });
    
    if (duration > 0) {
      const newTimeoutId = setTimeout(() => {
        setStatus(prev => ({ ...prev, visible: false }));
      }, duration);
      setTimeoutId(newTimeoutId);
    }
  }, [timeoutId]);

  const hideStatus = useCallback(() => {
    setStatus(prev => ({ ...prev, visible: false }));
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
  }, [timeoutId]);

  return React.createElement(NotificationContext.Provider, {
    value: { addNotification: showStatus, removeNotification: hideStatus, status }
  }, children);
};

// Custom hook for notifications
const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

// Input validation utilities
const validateFileName = (name) => {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: 'Name is required' };
  }
  
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Name cannot be empty' };
  }
  
  if (trimmed.length > 255) {
    return { isValid: false, error: 'Name is too long (max 255 characters)' };
  }
  
  // Check for invalid characters
  const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (invalidChars.test(trimmed)) {
    return { isValid: false, error: 'Name contains invalid characters' };
  }
  
  // Check for reserved names (Windows)
  const reserved = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
  if (reserved.test(trimmed)) {
    return { isValid: false, error: 'Name is reserved' };
  }
  
  return { isValid: true, sanitized: trimmed };
};

const TreeContext = createContext();

const TreeNode = ({ node, level = 0, onDelete, onAddFolder, onAddFile, onRename, editingNodeId, setEditingNodeId }) => {
  const { openNodes, toggleNode } = useContext(TreeContext);
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(editingNodeId === node.id);
  const [editName, setEditName] = useState(node.name);
  const isOpen = openNodes[node.id] || false;
  const hasChildren = node.children && node.children.length > 0;
  const isFolder = node.children !== undefined;

  // Handle when this node should enter edit mode
  useEffect(() => {
    if (editingNodeId === node.id) {
      setIsEditing(true);
      setEditName(node.name);
    }
  }, [editingNodeId, node.id, node.name]);

  const handleToggle = () => {
    if (hasChildren) {
      toggleNode(node.id);
    }
  };

  const handleDoubleClick = () => {
    setIsEditing(true);
    setEditName(node.name);
  };

  const handleRename = async () => {
    if (editName.trim() && editName !== node.name) {
      try {
        await onRename(node.id, editName.trim());
      } catch (error) {
        console.error('Rename failed:', error);
        // Reset to original name on error
        setEditName(node.name);
        return;
      }
    }
    setIsEditing(false);
    setEditingNodeId(null);
  };

  const handleKeyPress = async (e) => {
    if (e.key === 'Enter') {
      await handleRename();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditName(node.name);
      setEditingNodeId(null);
    }
  };

  const handleBlur = () => {
    handleRename();
  };

  return React.createElement("div", { className: "tree-node" },
    React.createElement("div", {
      className: "node-content",
      style: { paddingLeft: `${level * 20 + 8}px` },
      onMouseEnter: () => setShowActions(true),
      onMouseLeave: () => setShowActions(false)
    },
      React.createElement("span", {
        className: "chevron-container",
        onClick: handleToggle
      },
        hasChildren && (
          isOpen 
            ? React.createElement(Icons.ChevronDown, { className: "icon icon-gray" })
            : React.createElement(Icons.ChevronRight, { className: "icon icon-gray" })
        )
      ),
      isFolder 
        ? React.createElement(Icons.Folder, { className: "icon icon-folder" })
        : React.createElement(Icons.File, { className: "icon icon-file" }),
      isEditing 
        ? React.createElement("input", {
            type: "text",
            value: editName,
            onChange: (e) => setEditName(e.target.value),
            onKeyDown: handleKeyPress,
            onBlur: handleBlur,
            onFocus: (e) => e.target.select(),
            className: "node-name-input",
            autoFocus: true,
            onClick: (e) => e.stopPropagation()
          })
        : React.createElement("span", { 
            className: "node-name", 
            onDoubleClick: handleDoubleClick 
          }, node.name),
      showActions && React.createElement("div", { className: "actions" },
        isFolder && [
          React.createElement("button", {
            key: "folder",
            onClick: async () => {
              try {
                await onAddFolder(node.id);
              } catch (error) {
                console.error('Failed to add folder:', error);
              }
            },
            className: "action-btn folder-action",
            title: "Add folder"
          }, React.createElement(Icons.FolderPlus, { className: "icon-small icon-blue-dark" })),
          React.createElement("button", {
            key: "file",
            onClick: async () => {
              try {
                await onAddFile(node.id);
              } catch (error) {
                console.error('Failed to add file:', error);
              }
            },
            className: "action-btn file-action",
            title: "Add file"
          }, React.createElement(Icons.FilePlus, { className: "icon-small icon-green" }))
        ],
        React.createElement("button", {
          onClick: () => onDelete(node.id),
          className: "action-btn delete-action",
          title: "Delete"
        }, React.createElement(Icons.Trash2, { className: "icon-small icon-red" }))
      )
    ),
    hasChildren && isOpen && React.createElement("div", null,
      node.children.map((child) =>
        React.createElement(TreeNode, {
          key: child.id,
          node: child,
          level: level + 1,
          onDelete: onDelete,
          onAddFolder: onAddFolder,
          onAddFile: onAddFile,
          onRename: onRename,
          editingNodeId: editingNodeId,
          setEditingNodeId: setEditingNodeId
        })
      )
    )
  );
};

const TreeView = () => {
  const [openNodes, setOpenNodes] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [treeData, setTreeData] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState(null);
  
  const [directoryHandles, setDirectoryHandles] = useState(new Map());
  const [rootDirectoryHandle, setRootDirectoryHandle] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [operationLoading, setOperationLoading] = useState(null); // Track specific operations
  
  const { addNotification, status } = useNotifications();



  useEffect(() => {
    // Initialize with empty tree data
    setTreeData([]);
    setIsLoading(false);
  }, []);



  const toggleNode = (nodeId) => {
    setOpenNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };


  const deleteNode = async (nodeId) => {
    const confirmed = confirm('Are you sure you want to delete this item? This will permanently delete the actual file/folder.');
    if (!confirmed) return;

    setOperationLoading(`delete-${nodeId}`);
    
    try {
      // Check if we have real directory handles
      if (directoryHandles.size > 0) {
        await deleteRealNode(nodeId);
        addNotification('Item deleted successfully', 'success');
      } else {
        deleteVirtualNode(nodeId);
        addNotification('Item deleted successfully', 'success');
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      addNotification(`Failed to delete item: ${error.message}`, 'error');
    } finally {
      setOperationLoading(null);
    }
  };

  const deleteRealNode = async (nodeId) => {
    // Find parent directory and item name
    const pathParts = nodeId.split('/');
    const itemName = pathParts[pathParts.length - 1];
    const parentPath = pathParts.slice(0, -1).join('/');
    
    const parentHandle = directoryHandles.get(parentPath);
    if (!parentHandle) {
      throw new Error('Parent directory not found');
    }

    // Remove from filesystem
    await parentHandle.removeEntry(itemName, { recursive: true });
    
    // Remove from directory handles if it was a directory
    if (directoryHandles.has(nodeId)) {
      const newHandleMap = new Map(directoryHandles);
      newHandleMap.delete(nodeId);
      setDirectoryHandles(newHandleMap);
    }

    // Update tree data
    deleteVirtualNode(nodeId);
  };

  const deleteVirtualNode = (nodeId) => {
    const removeNode = (nodes) => {
      return nodes.filter(node => {
        if (node.id === nodeId) return false;
        if (node.children) node.children = removeNode(node.children);
        return true;
      });
    };
    setTreeData(removeNode([...treeData]));
  };

  const addFolder = async (parentId) => {
    setOperationLoading(`add-folder-${parentId}`);
    
    try {
      // Check if we have real directory handles
      if (directoryHandles.size > 0 && rootDirectoryHandle) {
        await addRealFolder(parentId);
        addNotification('Folder created successfully', 'success');
      } else {
        await addVirtualFolder(parentId);
        addNotification('Folder created successfully', 'success');
      }
    } catch (error) {
      console.error('Error adding folder:', error);
      addNotification(`Failed to create folder: ${error.message}`, 'error');
      throw error;
    } finally {
      setOperationLoading(null);
    }
  };

  const addRealFolder = async (parentId) => {
    // Handle root level - use rootDirectoryHandle.name as root ID
    const rootId = rootDirectoryHandle.name;
    const actualParentId = parentId === '' ? rootId : parentId;
    const parentHandle = parentId === '' ? rootDirectoryHandle : directoryHandles.get(parentId);
    if (!parentHandle) {
      throw new Error(`Parent directory not found for path: ${parentId}`);
    }

    // Verify we still have write permission
    const permission = await parentHandle.requestPermission({ mode: 'readwrite' });
    if (permission !== 'granted') {
      throw new Error('Write permission denied');
    }

    // Find existing names in parent
    const existingNames = [];
    try {
      for await (const [name] of parentHandle.entries()) {
        existingNames.push(name);
      }
    } catch (error) {
      console.error('Error reading parent directory:', error);
      throw new Error('Cannot read parent directory');
    }

    // Generate unique folder name
    let folderName = 'NewFolder';
    let counter = 1;
    while (existingNames.includes(folderName)) {
      folderName = `NewFolder${counter}`;
      counter++;
    }

    // Create real directory
    try {
      const newDirHandle = await parentHandle.getDirectoryHandle(folderName, { create: true });
      // Generate ID that matches buildTreeFromDirectory format
      const newFolderId = `${actualParentId}/${folderName}`;
      
      // Refresh the entire tree to ensure it's in sync
      await refreshTreeStructure();
      
      // Set the new folder for editing after refresh
      setTimeout(() => {
        setEditingNodeId(newFolderId);
        if (parentId !== '') {
          setOpenNodes(prev => ({ ...prev, [actualParentId]: true }));
        }
      }, 200);
    } catch (error) {
      console.error('Failed to create directory:', error);
      throw new Error(`Failed to create directory: ${error.message}`);
    }
  };

  const addVirtualFolder = async (parentId) => {
    // Find the parent node to check existing names
    const findParent = (nodes) => {
      for (const node of nodes) {
        if (node.id === parentId) return node;
        if (node.children) {
          const found = findParent(node.children);
          if (found) return found;
        }
      }
      return null;
    };

    const parent = findParent(treeData);
    const existingNames = parent ? parent.children.map(child => child.name) : [];
    
    // Generate unique folder name
    let folderName = 'NewFolder';
    let counter = 1;
    while (existingNames.includes(folderName)) {
      folderName = `NewFolder${counter}`;
      counter++;
    }

    const newFolder = { id: `folder-${Date.now()}`, name: folderName, children: [] };
    const addToParent = (nodes) => {
      return nodes.map(node => {
        if (node.id === parentId) {
          return { ...node, children: [...(node.children || []), newFolder] };
        }
        if (node.children) return { ...node, children: addToParent(node.children) };
        return node;
      });
    };

    setTreeData(addToParent([...treeData]));
    setOpenNodes(prev => ({ ...prev, [parentId]: true }));
    setEditingNodeId(newFolder.id);
  };

  const addFile = async (parentId) => {
    setOperationLoading(`add-file-${parentId}`);
    
    try {
      // Check if we have real directory handles
      if (directoryHandles.size > 0) {
        await addRealFile(parentId);
        addNotification('File created successfully', 'success');
      } else {
        await addVirtualFile(parentId);
        addNotification('File created successfully', 'success');
      }
    } catch (error) {
      console.error('Error adding file:', error);
      addNotification(`Failed to create file: ${error.message}`, 'error');
    } finally {
      setOperationLoading(null);
    }
  };

  const addRealFile = async (parentId) => {
    // Handle root level - use rootDirectoryHandle.name as root ID
    const rootId = rootDirectoryHandle.name;
    const actualParentId = parentId === '' ? rootId : parentId;
    const parentHandle = parentId === '' ? rootDirectoryHandle : directoryHandles.get(parentId);
    if (!parentHandle) {
      throw new Error(`Parent directory not found for path: ${parentId}`);
    }

    // Verify we still have write permission
    const permission = await parentHandle.requestPermission({ mode: 'readwrite' });
    if (permission !== 'granted') {
      throw new Error('Write permission denied');
    }

    // Find existing names in parent
    const existingNames = [];
    try {
      for await (const [name] of parentHandle.entries()) {
        existingNames.push(name);
      }
    } catch (error) {
      console.error('Error reading parent directory:', error);
      throw new Error('Cannot read parent directory');
    }

    // Generate unique file name with .tex extension
    let fileName = 'NewFile.tex';
    let counter = 1;
    while (existingNames.includes(fileName)) {
      fileName = `NewFile${counter}.tex`;
      counter++;
    }

    // Create real file
    try {
      const fileHandle = await parentHandle.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write('% New LaTeX file\n\\documentclass{article}\n\\begin{document}\n\n\\end{document}');
      await writable.close();

      // Generate ID that matches buildTreeFromDirectory format
      const newFileId = `${actualParentId}/${fileName}`;

      // Refresh the entire tree to ensure it's in sync
      await refreshTreeStructure();
      
      // Set the new file for editing after refresh
      setTimeout(() => {
        setEditingNodeId(newFileId);
        if (parentId !== '') {
          setOpenNodes(prev => ({ ...prev, [actualParentId]: true }));
        }
      }, 200);
    } catch (error) {
      console.error('Failed to create file:', error);
      throw new Error(`Failed to create file: ${error.message}`);
    }
  };

  const addVirtualFile = async (parentId) => {
    // Find the parent node to check existing names
    const findParent = (nodes) => {
      for (const node of nodes) {
        if (node.id === parentId) return node;
        if (node.children) {
          const found = findParent(node.children);
          if (found) return found;
        }
      }
      return null;
    };

    const parent = findParent(treeData);
    const existingNames = parent ? parent.children.map(child => child.name) : [];
    
    // Generate unique file name with .tex extension
    let fileName = 'NewFile.tex';
    let counter = 1;
    while (existingNames.includes(fileName)) {
      fileName = `NewFile${counter}.tex`;
      counter++;
    }

    const newFile = { id: `file-${Date.now()}`, name: fileName };
    const addToParent = (nodes) => {
      return nodes.map(node => {
        if (node.id === parentId) {
          return { ...node, children: [...(node.children || []), newFile] };
        }
        if (node.children) return { ...node, children: addToParent(node.children) };
        return node;
      });
    };

    setTreeData(addToParent([...treeData]));
    setOpenNodes(prev => ({ ...prev, [parentId]: true }));
    setEditingNodeId(newFile.id);
  };

  const renameNode = async (nodeId, newName) => {
    // Validate input
    const validation = validateFileName(newName);
    if (!validation.isValid) {
      addNotification(`Invalid name: ${validation.error}`, 'error');
      throw new Error(validation.error);
    }
    
    const sanitizedName = validation.sanitized;
    setOperationLoading(`rename-${nodeId}`);
    
    try {
      // Check if we have real directory handles
      if (directoryHandles.size > 0) {
        await renameRealNode(nodeId, sanitizedName);
        addNotification('Item renamed successfully', 'success');
      } else {
        renameVirtualNode(nodeId, sanitizedName);
        addNotification('Item renamed successfully', 'success');
      }
    } catch (error) {
      console.error('Error in renameNode:', error);
      addNotification(`Failed to rename item: ${error.message}`, 'error');
      throw error; // Re-throw so handleRename can catch it
    } finally {
      setOperationLoading(null);
    }
  };

  const renameRealNode = async (nodeId, newName) => {
    // Parse the path
    const pathParts = nodeId.split('/');
    const oldName = pathParts[pathParts.length - 1];
    const parentPath = pathParts.slice(0, -1).join('/');
    
    if (oldName === newName) {
      return;
    }
    
    const parentHandle = directoryHandles.get(parentPath);
    if (!parentHandle) {
      throw new Error(`Parent directory not found for path: ${parentPath}`);
    }

    // Check if new name already exists
    const existingNames = [];
    for await (const [name] of parentHandle.entries()) {
      existingNames.push(name);
    }
    
    if (existingNames.includes(newName)) {
      throw new Error(`An item named "${newName}" already exists`);
    }

    // Get the old handle
    const oldHandle = await parentHandle.getFileHandle(oldName).catch(async () => {
      return await parentHandle.getDirectoryHandle(oldName);
    });

    if (oldHandle.kind === 'directory') {
      // For directories, we need to create new and copy contents
      await renameDirectory(parentHandle, oldName, newName, nodeId);
    } else {
      // For files, we need to copy content and delete old
      await renameFile(parentHandle, oldName, newName);
    }

    // Refresh tree structure from disk to ensure sync
    await refreshTreeStructure();
  };

  const renameDirectory = async (parentHandle, oldName, newName, oldNodeId) => {
    // Create new directory
    const newDirHandle = await parentHandle.getDirectoryHandle(newName, { create: true });
    const oldDirHandle = await parentHandle.getDirectoryHandle(oldName);
    
    // Copy all contents recursively
    await copyDirectoryContents(oldDirHandle, newDirHandle);
    
    // Remove old directory
    await parentHandle.removeEntry(oldName, { recursive: true });
    
    // Update directory handles map
    const newNodeId = oldNodeId.replace(new RegExp(`/${oldName}$`), `/${newName}`);
    const newHandleMap = new Map(directoryHandles);
    
    // Update all handles that start with the old path
    for (const [path, handle] of directoryHandles.entries()) {
      if (path.startsWith(oldNodeId)) {
        const newPath = path.replace(oldNodeId, newNodeId);
        newHandleMap.delete(path);
        if (path === oldNodeId) {
          newHandleMap.set(newPath, newDirHandle);
        }
      }
    }
    
    setDirectoryHandles(newHandleMap);
  };

  const renameFile = async (parentHandle, oldName, newName) => {
    // Get old file content
    const oldFileHandle = await parentHandle.getFileHandle(oldName);
    const file = await oldFileHandle.getFile();
    const content = await file.text();
    
    // Create new file with same content
    const newFileHandle = await parentHandle.getFileHandle(newName, { create: true });
    const writable = await newFileHandle.createWritable();
    await writable.write(content);
    await writable.close();
    
    // Remove old file
    await parentHandle.removeEntry(oldName);
  };

  const copyDirectoryContents = async (sourceDir, targetDir) => {
    for await (const [name, handle] of sourceDir.entries()) {
      if (handle.kind === 'directory') {
        const newSubDir = await targetDir.getDirectoryHandle(name, { create: true });
        await copyDirectoryContents(handle, newSubDir);
      } else {
        const file = await handle.getFile();
        const content = await file.text();
        const newFileHandle = await targetDir.getFileHandle(name, { create: true });
        const writable = await newFileHandle.createWritable();
        await writable.write(content);
        await writable.close();
      }
    }
  };


  const renameVirtualNode = (nodeId, newName) => {
    const updateNode = (nodes) => {
      return nodes.map(node => {
        if (node.id === nodeId) {
          return { ...node, name: newName };
        }
        if (node.children) {
          return { ...node, children: updateNode(node.children) };
        }
        return node;
      });
    };
    setTreeData(updateNode([...treeData]));
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };



  // Refresh the tree structure from filesystem
  const refreshTreeStructure = async () => {
    if (!rootDirectoryHandle || isRefreshing) {
      return;
    }

    setIsRefreshing(true);

    try {
      // Clear existing data first to avoid stale entries
      setTreeData([]);
      setDirectoryHandles(new Map());
      
      // Rebuild from scratch
      const handleMap = new Map();
      const treeStructure = await buildTreeFromDirectory(rootDirectoryHandle, rootDirectoryHandle.name, handleMap);
      
      // Set the fresh data - show children directly instead of parent directory
      setTreeData(treeStructure.children || []);
      setDirectoryHandles(handleMap);
    } catch (error) {
      console.error('Error refreshing tree structure:', error);
      alert('Failed to refresh directory structure: ' + error.message);
    } finally {
      setIsRefreshing(false);
    }
  };






  // Load real directory structure
  const loadRealDirectory = async (isReconnect = false) => {
    try {
      // Check if File System Access API is supported
      if ('showDirectoryPicker' in window) {
        const dirHandle = await window.showDirectoryPicker({
          mode: 'readwrite' // Request write permissions
        });
        
        // Verify we have write permission
        const permission = await dirHandle.requestPermission({ mode: 'readwrite' });
        if (permission !== 'granted') {
          alert('Write permission is required to create/delete files and folders.');
          return;
        }
        
        const handleMap = new Map();
        const treeStructure = await buildTreeFromDirectory(dirHandle, dirHandle.name, handleMap);
        // Show children directly instead of the parent directory
        setTreeData(treeStructure.children || []);
        setDirectoryHandles(handleMap);
        setRootDirectoryHandle(dirHandle);
        
        
      } else {
        alert('File System Access API not supported in this browser. Try Chrome/Edge.');
      }
    } catch (error) {
      console.error('Error loading directory:', error);
      if (error.name === 'AbortError') {
        // User cancelled directory selection
      } else {
        alert('Failed to load directory: ' + error.message);
      }
    }
  };

  // Recursively build tree structure from directory handle
  const buildTreeFromDirectory = async (dirHandle, path = '', handleMap) => {
    const children = [];
    const currentPath = path || dirHandle.name;
    
    // Store directory handle for this path
    handleMap.set(currentPath, dirHandle);
    
    for await (const [name, handle] of dirHandle.entries()) {
      // Skip hidden files and directories starting with .
      if (name.startsWith('.')) {
        continue;
      }
      
      const id = `${currentPath}/${name}`;
      
      if (handle.kind === 'directory') {
        // Store subdirectory handle
        handleMap.set(id, handle);
        // Recursively process subdirectory
        const subChildren = await buildTreeFromDirectory(handle, id, handleMap);
        children.push({
          id,
          name,
          children: subChildren.children || []
        });
      } else {
        // File
        children.push({
          id,
          name
        });
      }
    }
    
    return {
      id: currentPath,
      name: dirHandle.name,
      children
    };
  };

  if (isLoading) {
    return React.createElement("div", { className: "container loading" },
      React.createElement("div", null, "Loading...")
    );
  }

  return React.createElement("div", { className: "app" },
    React.createElement("div", { className: `sidebar ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}` },
      React.createElement("div", { className: "sidebar-header" },
        React.createElement("button", { 
          onClick: toggleSidebar, 
          className: "hamburger-btn",
          title: isSidebarOpen ? 'Close sidebar' : 'Open sidebar'
        },
          React.createElement(Icons.Menu, { className: "hamburger-icon" })
        ),
        isSidebarOpen && React.createElement("div", { className: "sidebar-controls" },
          React.createElement("h2", { className: "sidebar-title" }, "Nool"),
          React.createElement("div", { className: "connection-status" },
            React.createElement("button", { 
              className: `status-indicator ${rootDirectoryHandle ? 'connected' : 'disconnected'}`,
              onClick: rootDirectoryHandle ? () => {
                setRootDirectoryHandle(null);
                setDirectoryHandles(new Map());
                setTreeData([]);
              } : null,
              title: rootDirectoryHandle ? 'Click to disconnect' : 'Not connected',
              style: { cursor: rootDirectoryHandle ? 'pointer' : 'default' }
            }, rootDirectoryHandle ? '🟢' : '🔴')
          ),
          rootDirectoryHandle && React.createElement("div", { className: "header-actions" },
            React.createElement("button", {
              onClick: () => addFolder(''),
              className: "action-btn folder-action",
              title: "Add folder"
            }, React.createElement(Icons.FolderPlus, { className: "icon-small icon-blue-dark" })),
            React.createElement("button", {
              onClick: () => addFile(''),
              className: "action-btn file-action", 
              title: "Add file"
            }, React.createElement(Icons.FilePlus, { className: "icon-small icon-green" }))
          )
        )
      ),
      isSidebarOpen && React.createElement("div", { className: "tree-container" },
        treeData.length === 0 && !rootDirectoryHandle
          ? React.createElement("div", { className: "empty-state" },
              React.createElement("div", { className: "empty-icon" }, "📁"),
              React.createElement("h3", { className: "empty-title" }, "No Directory Connected"),
              React.createElement("p", { className: "empty-description" }, 
                "Click the folder button above to connect to a directory and start managing your files."
              ),
              React.createElement("button", {
                onClick: loadRealDirectory,
                className: "empty-connect-btn"
              }, "Connect Directory")
            )
          : React.createElement(TreeContext.Provider, { value: { openNodes, toggleNode } },
              treeData.map((node) =>
                React.createElement(TreeNode, {
                  key: node.id,
                  node: node,
                  onDelete: deleteNode,
                  onAddFolder: addFolder,
                  onAddFile: addFile,
                  onRename: renameNode,
                  editingNodeId: editingNodeId,
                  setEditingNodeId: setEditingNodeId
                })
              )
            ),
            // Status bar at bottom of tree
            status.visible && React.createElement('div', {
              className: `tree-status tree-status-${status.type}`
            }, status.message)
      )
    ),
    React.createElement("div", { className: "main-content" },
      React.createElement("div", { className: "content-placeholder" },
        React.createElement("h1", null, "Main Content Area"),
        React.createElement("p", null, "This is where your main application content would go.")
      )
    )
  );
};

// Main App Component with Error Boundary and Status
const App = () => {
  return React.createElement(ErrorBoundary, null,
    React.createElement(StatusProvider, null,
      React.createElement(TreeView, null)
    )
  );
};

// React 18 API
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));