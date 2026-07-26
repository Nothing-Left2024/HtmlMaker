# HtmlMaker

[中文](./README.md) | [English](./README_EN.md)

A visual HTML / CSS / JavaScript block editor. Build complete web pages by dragging and combining blocks, with no coding required.

Author: Clean　Version: 1.1

---

## Introduction

HtmlMaker decomposes web development into three kinds of blocks: HTML tag blocks, CSS style blocks, and JavaScript statement blocks. Users drag and nest blocks across three independent pages to generate runnable web code. It is suitable for programming education, rapid prototyping, and no-code web creation.

## Features

### Three-Page Editing Architecture

- HTML page: Build page structure with container, text, media, form, list, and table tags
- CSS page: Write style rules with selectors as entry points and style property blocks nested inside
- JS page: Add interactive logic with events as top-level entry points and control flow / statements nested inside

### Block Editing

- Drag to add: Drag blocks from the left palette into the workspace
- Nesting: Container blocks can hold child blocks to build hierarchical structures
- Inline parameters: Input fields are shown directly on blocks for real-time editing
- Compatibility checks: Incompatible nesting is automatically rejected with a prompt
- Drag back to delete: Drag a block back to the left palette to remove it
- Semi-transparent preview: A translucent preview is shown at the drop position while dragging

### Interaction and Navigation

- Custom context menu: Replaces the browser default with copy, delete, and edit-attribute actions
- Category rail: The leftmost vertical bar organizes blocks by category; click an icon to jump
- Search filter: A search box at the top of the palette filters blocks by keyword
- Block hover tooltip: Hovering over a palette block shows its description

### View and Export

- Live code preview: The right panel shows the generated HTML / CSS / JS code in real time
- Render preview: Click the preview button to switch to an iframe render view (navigation and redirects disabled)
- Resizable code panel: Drag the divider to adjust the code panel width; the width is persisted automatically
- Export full HTML / CSS only / JS only / project JSON
- Import HTML file: Automatically parses tags, styles, and scripts into blocks
- Import project JSON: Restore a previously exported project

### User Experience

- Dark / light theme switch with smooth transition
- First-time tutorial (12 static steps + 4 interactive hands-on steps)
- Page transition animation (iOS-style horizontal slide)
- Undo / Redo (Ctrl+Z / Ctrl+Y)
- Copy / Paste / Duplicate in place (Ctrl+C / Ctrl+V / Ctrl+D)
- Auto-save to LocalStorage; survives refreshes

## Quick Start

No dependencies are required; just open it in a browser:

1. Download the project files
2. Open `index.html` with a modern browser (Chrome, Edge, Firefox, Safari)
3. A tutorial appears on first launch; follow the steps or click Skip

## User Guide

### Basic Operations

| Operation | How |
|-----------|-----|
| Add a block | Drag from the left palette into the workspace |
| Nest a block | Drop it inside another block |
| Insert between blocks | Drop it between two blocks |
| Delete a block | Drag it back to the palette, or use the right-click menu |
| Edit parameters | Click the input field on the block and type |
| Edit attributes | Right-click the block and use the menu |

### Block Categories

HTML page:

- Container: div, section, article, header, footer, nav, main, etc.
- Text: p, span, h1-h3, a, strong, em, br, etc.
- Media: img, video, audio, iframe, source
- Form: form, input, button, label, textarea, select, etc.
- List: ul, ol, li, dl, dt, dd
- Table: table, tr, td, th, thead, tbody, caption

CSS page:

- Entry points: tag selector, class selector, ID selector
- Style properties: width, height, color, background, font-size, margin, padding, border, radius, display, position, etc.

JS page:

- Events: page load, element click, input
- Control flow: if, loop, break, continue, try-catch, switch-case
- Variables: declaration, assignment
- Functions: definition, call, return
- DOM: get / set text, HTML, style, class, attribute
- Output: console.log, alert, prompt, confirm
- Math: add, subtract, multiply, divide, modulo, max, min, round, floor, ceil, random, abs
- String: length, uppercase, lowercase, substring, concat, replace, trim, split, conversions
- Array: create, push, pop, length, get, set, join, sort, reverse
- Object: create, get, set, keys
- JSON: parse, stringify
- Type conversion: parseInt, parseFloat, toFixed, typeof
- Async: Promise, await, fetch, timers

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Ctrl+S | Save manually |
| Ctrl+C | Copy selected block |
| Ctrl+V | Paste block |
| Ctrl+D | Duplicate selected block in place |
| Delete | Delete selected block |
| Escape | Close menu / dialog |
| Left / Right arrow | Switch tutorial steps |

### Import and Export

Click the "File" button in the top-right corner to open the import / export panel:

- Export full HTML: A standalone HTML file containing structure, styles, and scripts
- Export CSS only: All CSS rules
- Export JS only: All JavaScript statements
- Export project JSON: Full project data for backup and restore
- Import project JSON: Restore a project from a backup file
- Import HTML: Upload an HTML file; tags, inline styles, `<style>` and `<script>` blocks are parsed into editable blocks

## Project Structure

```
HtmlMaker/
  index.html              Entry page, contains all DOM structure
  css/
    main.css              Global styles (theme, layout, blocks, dialogs, animations)
  js/
    icons.js              Custom SVG icon system
    store.js              State management (data model, undo / redo, persistence)
    blocks.js             Block definitions (HTML tags, CSS selectors, JS statements)
    engine.js             Render engine (palette, workspace, drag, selection)
    props.js              Right-click context menu
    compile.js            Code generation (blocks to HTML / CSS / JS)
    preview.js            Preview panel (code view + iframe render + navigation blocking)
    cssPage.js            CSS page logic
    jsPage.js             JS page logic
    export.js             Import / export features
    importHtml.js         HTML file parser (tags / styles / scripts to blocks)
    app.js                Main entry (events, page switch, shortcuts, tutorial)
  src/
    img/
      html5icon.png       HTML5 icon
  CLAUDE.md               UI design guide
```

## Technical Notes

- Pure native HTML / CSS / JavaScript; no build tools or external dependencies
- Data is stored in LocalStorage; no backend required
- Blocks use a Scratch-style puzzle appearance (top tab + bottom slot interlock)
- Theming uses CSS variables with smooth dark / light transitions
- Page transitions animate only the transform property for GPU-composited smoothness
- The preview iframe uses both a sandbox attribute and an injected script to block navigation and redirects
- The HTML import parser is based on DOMParser and regex matching, supporting common tags, inline styles, `<style>` and `<script>` tags

## Design Principles

The interface follows an "emotional minimalism" style, referencing Apple design guidelines:

- Card-based layout: soft rounded corners, subtle shadows, clear hierarchy
- Double shadow: inset top highlight plus outer drop shadow for a layered, premium feel
- Hover feedback: interactive elements lift slightly on hover with shadow expansion
- Restrained color palette: low-saturation tones; dark mode brightens accent colors
- Accessibility: keyboard focus indicators, arrow-key navigation, Escape to close

## License

For learning and personal use only.
