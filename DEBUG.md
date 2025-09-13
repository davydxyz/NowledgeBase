# 🐛 Debugging Guide for NowledgeBase

This guide provides systematic debugging approaches based on real-world troubleshooting experience with this Tauri + React application.

## Table of Contents
- [Quick Debug Setup](#quick-debug-setup)
- [Common Issues & Solutions](#common-issues--solutions)
- [Systematic Debugging Process](#systematic-debugging-process)
- [Debug Tools & Techniques](#debug-tools--techniques)
- [Platform-Specific Issues](#platform-specific-issues)

## Quick Debug Setup

### Enable Development Console
```bash
# Development mode (has debug console)
npm run tauri:dev

# Production mode (no console - harder to debug)
npm run tauri:build
```

### Add Temporary Debug UI
For packaged apps where console isn't available, create visual debug output:

```tsx
// Add to component state
const [debugInfo, setDebugInfo] = useState<string[]>([]);

// Debug helper
const addDebugInfo = (message: string) => {
  const timestamp = new Date().toLocaleTimeString();
  setDebugInfo(prev => [`${timestamp}: ${message}`, ...prev.slice(0, 4)]);
};

// Render debug panel
{debugInfo.length > 0 && (
  <div style={{
    position: 'fixed',
    top: '10px',
    left: '10px',
    background: 'rgba(0,0,0,0.9)',
    color: '#00ff00',
    padding: '10px',
    borderRadius: '4px',
    fontSize: '12px',
    zIndex: 10000,
    fontFamily: 'monospace',
    maxWidth: '400px'
  }}>
    {debugInfo.map((info, i) => <div key={i}>{info}</div>)}
  </div>
)}
```

## Common Issues & Solutions

### 1. Modal/Dialog Issues in Tauri

**Problem**: `window.confirm()`, `window.alert()` don't work in Tauri webview

**Solution**: Create custom React modals
```tsx
// ❌ Doesn't work in Tauri
const confirmed = window.confirm('Delete this item?');

// ✅ Works in Tauri
const [showConfirm, setShowConfirm] = useState(false);
// ... custom modal implementation
```

### 2. TypeScript Compilation Errors

**Common React Flow Issues**:
```tsx
// ❌ Type error with markerEnd
markerEnd: { type: 'arrowclosed' }

// ✅ Import and use proper enum
import { MarkerType } from 'reactflow';
markerEnd: { type: MarkerType.ArrowClosed }
```

**Unused Variable Warnings**:
```tsx
// ❌ Causes TS error
const [value, setValue] = useState();

// ✅ Prefix unused variables with underscore
const [value, _setValue] = useState();
```

### 3. State Management Issues

**Stale Closure Problem**:
```tsx
// ❌ May use stale state
const handleClick = () => {
  console.log(someState); // Stale value
};

// ✅ Use useCallback with dependencies
const handleClick = useCallback(() => {
  console.log(someState); // Fresh value
}, [someState]);
```

### 4. API Integration Problems

**Debug API Calls**:
```rust
// In Rust backend - add debug prints
#[tauri::command]
async fn save_note(content: String) -> Result<Note, String> {
    println!("DEBUG: save_note called with content length: {}", content.len());
    // ... rest of function
}
```

### 5. React Flow Graph Issues

**Nodes Not Updating**:
- Check if `useCallback` dependencies are correct
- Ensure state updates trigger re-renders
- Verify node data is being passed correctly

**Layout Problems**:
- Check if `initializeLayout()` is called after data changes
- Verify position saving/loading logic
- Test with smaller datasets first

## Systematic Debugging Process

### Phase 1: Reproduce Issue
1. **Isolate the problem**: Can you consistently reproduce it?
2. **Minimal test case**: What's the smallest action that triggers it?
3. **Environment**: Development vs production? Which OS?

### Phase 2: Gather Information
1. **Console logs**: Check browser console in dev mode
2. **Network tab**: Are API calls succeeding?
3. **React DevTools**: Check component state and props
4. **Tauri logs**: Check terminal output

### Phase 3: Hypothesis & Testing
1. **Form hypothesis**: What do you think is causing it?
2. **Add logging**: Insert debug statements at key points
3. **Test incrementally**: Change one thing at a time
4. **Verify fix**: Test the happy path and edge cases

### Phase 4: Clean Up
1. **Remove debug code**: Don't commit debug statements
2. **Add tests**: If possible, add tests to prevent regression
3. **Document**: Update this file with new learnings

## Debug Tools & Techniques

### React Developer Tools
```bash
# Install React DevTools browser extension
# Inspect component state, props, and context
```

### Tauri Debug Mode
```bash
# Enable debug logging
RUST_LOG=debug npm run tauri:dev

# Enable specific module logging
RUST_LOG=tauri=debug npm run tauri:dev
```

### State Inspection
```tsx
// Add to component for quick state inspection
useEffect(() => {
  console.log('Component state:', { 
    currentMode,
    notes: data.notes.length,
    categories: data.categories.length 
  });
}, [currentMode, data.notes.length, data.categories.length]);
```

### Network Debugging
```tsx
// Wrap API calls with debug logging
const debugApiCall = async (apiCall: () => Promise<any>, name: string) => {
  console.log(`🚀 API: ${name} - Starting`);
  try {
    const result = await apiCall();
    console.log(`✅ API: ${name} - Success`, result);
    return result;
  } catch (error) {
    console.error(`❌ API: ${name} - Failed`, error);
    throw error;
  }
};

// Usage
const notes = await debugApiCall(() => ApiService.getNotes(), 'getNotes');
```

## Platform-Specific Issues

### macOS
- **Permission issues**: Check if app has necessary permissions
- **Notarization**: Production builds need to be notarized
- **Keyboard shortcuts**: May conflict with system shortcuts

### Windows
- **Antivirus**: May block the app or slow it down
- **Path length**: Long file paths can cause issues
- **DPI scaling**: UI may look incorrect on high-DPI displays

### Linux
- **Dependencies**: May need additional system packages
- **Wayland vs X11**: Different display servers may behave differently
- **File permissions**: Check if files are readable/writable

## Best Practices for Debug-Friendly Code

### 1. Meaningful Error Messages
```rust
// ❌ Generic error
Err("Failed to save".to_string())

// ✅ Specific error with context
Err(format!("Failed to save note with id {}: {}", note_id, err))
```

### 2. Structured Logging
```tsx
// ❌ Random console logs
console.log("thing happened");

// ✅ Structured with context
console.log("📝 NOTE_SAVE:", { noteId, categoryPath, success: true });
```

### 3. Graceful Error Handling
```tsx
// ❌ Let errors crash the app
const result = await riskyOperation();

// ✅ Handle errors gracefully
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  console.error('Operation failed:', error);
  showError('Something went wrong. Please try again.');
  return fallbackValue;
}
```

### 4. Debug Flags
```tsx
const DEBUG = process.env.NODE_ENV === 'development';

if (DEBUG) {
  console.log('Debug info:', data);
}
```

## Emergency Debugging Techniques

### When Everything is Broken
1. **Revert to last working state**: Use git to go back
2. **Binary search**: Comment out half the changes, test, repeat
3. **Fresh start**: Delete `node_modules`, `target/`, rebuild
4. **Minimal reproduction**: Create a simple test case

### When You Can't See Console
1. **Alert debugging**: Use `alert()` for critical path debugging
2. **Visual indicators**: Change UI elements to show state
3. **File logging**: Write debug info to files (Tauri can do this)
4. **Remote debugging**: Set up remote console if possible

### Performance Issues
1. **React Profiler**: Use React DevTools Profiler
2. **Browser Performance tab**: Check for memory leaks
3. **Bundle analyzer**: Check if bundles are too large
4. **Database queries**: Log slow queries

## Remember
- **Start simple**: Don't over-engineer debugging
- **One change at a time**: Avoid changing multiple things
- **Document findings**: Help future you and others
- **Test fixes thoroughly**: Ensure you didn't break something else

Happy debugging! 🐛→✨