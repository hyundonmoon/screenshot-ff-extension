// State: track if we're in selection mode
let isSelectionMode = false;
let highlightElement = null;
let selectedElement = null;
let selectionToolbar = null;
let previousStyle = null;

// Create a highlight overlay for hovered elements
function createHighlight() {
  const div = document.createElement("div");
  div.id = "element-screenshot-highlight";
  div.style.cssText = `
    position: fixed;
    border: 2px solid #4A90E2;
    background-color: rgba(74, 144, 226, 0.08);
    pointer-events: none;
    z-index: 100000;
    display: none;
  `;
  document.body.appendChild(div);
  return div;
}

// Show highlight on element
function showHighlight(element) {
  if (!element || !highlightElement) return;
  const rect = element.getBoundingClientRect();
  highlightElement.style.left = rect.left + "px";
  highlightElement.style.top = rect.top + "px";
  highlightElement.style.width = rect.width + "px";
  highlightElement.style.height = rect.height + "px";
  highlightElement.style.display = "block";
}

// Hide highlight
function hideHighlight() {
  if (highlightElement) {
    highlightElement.style.display = "none";
  }
}

function applySelectionStyle(element) {
  if (!element) return;
  // save previous inline outline/boxShadow to restore later
  previousStyle = {
    outline: element.style.outline,
    boxShadow: element.style.boxShadow,
  };
  element.style.outline = "3px solid #4A90E2";
  element.style.boxShadow = "0 0 0 3px rgba(74,144,226,0.2)";
}

function clearSelectionStyle(element) {
  if (!element) return;
  element.style.outline = previousStyle && previousStyle.outline ? previousStyle.outline : "";
  element.style.boxShadow = previousStyle && previousStyle.boxShadow ? previousStyle.boxShadow : "";
  previousStyle = null;
}

function selectElement(element) {
  if (!element) return;

  if (selectedElement && selectedElement !== element) {
    clearSelectionStyle(selectedElement);
  }

  selectedElement = element;
  applySelectionStyle(selectedElement);
  hideHighlight();
  showToolbarNearElement(selectedElement);
}

function moveSelection(direction) {
  if (!selectedElement) return;

  const nextElement =
    direction === "up"
      ? selectedElement.parentElement
      : selectedElement.children[0] || null;

  if (!nextElement) {
    alert(direction === "up" ? "No parent element." : "No child element.");
    return;
  }

  selectElement(nextElement);
}

function createSelectionToolbar() {
  const toolbar = document.createElement("div");
  toolbar.id = "element-screenshot-toolbar";
  toolbar.style.cssText = `
    position: fixed;
    z-index: 100001;
    display: flex;
    gap: 6px;
    background: rgba(255,255,255,0.95);
    padding: 8px;
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    font-family: sans-serif;
    pointer-events: auto;
  `;

  const upBtn = document.createElement("button");
  upBtn.textContent = "↑ Up";
  upBtn.style.cssText = `
    background:#eee; color:#333; border:none; padding:6px 10px; border-radius:4px; cursor:pointer; font-size:12px;
  `;
  upBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    moveSelection("up");
  });

  const downBtn = document.createElement("button");
  downBtn.textContent = "↓ Down";
  downBtn.style.cssText = `
    background:#eee; color:#333; border:none; padding:6px 10px; border-radius:4px; cursor:pointer; font-size:12px;
  `;
  downBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    moveSelection("down");
  });

  const copyBtn = document.createElement("button");
  copyBtn.textContent = "Copy";
  copyBtn.style.cssText = `
    background:#4A90E2; color:white; border:none; padding:6px 10px; border-radius:4px; cursor:pointer; font-size:12px;
  `;
  copyBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (selectedElement) processScreenshot(selectedElement, "copy");
  });

  const downloadBtn = document.createElement("button");
  downloadBtn.textContent = "Download";
  downloadBtn.style.cssText = `
    background:#4A90E2; color:white; border:none; padding:6px 10px; border-radius:4px; cursor:pointer; font-size:12px;
  `;
  downloadBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (selectedElement) processScreenshot(selectedElement, "download");
  });

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  cancelBtn.style.cssText = `
    background:#eee; color:#333; border:none; padding:6px 10px; border-radius:4px; cursor:pointer; font-size:12px;
  `;
  cancelBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    clearSelection();
    exitSelectionMode();
  });

  toolbar.appendChild(upBtn);
  toolbar.appendChild(downBtn);
  toolbar.appendChild(copyBtn);
  toolbar.appendChild(downloadBtn);
  toolbar.appendChild(cancelBtn);
  document.body.appendChild(toolbar);
  return toolbar;
}

function showToolbarNearElement(element) {
  if (!element) return;
  if (!selectionToolbar) selectionToolbar = createSelectionToolbar();
  const rect = element.getBoundingClientRect();
  selectionToolbar.style.display = "flex";

  const toolbarWidth = selectionToolbar.offsetWidth || 0;
  const preferredTop = rect.top - 48;
  const top = preferredTop >= 8 ? preferredTop : Math.min(window.innerHeight - 48, rect.bottom + 8);
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - toolbarWidth - 8));

  selectionToolbar.style.top = `${top}px`;
  selectionToolbar.style.left = `${left}px`;
}

function hideToolbar() {
  if (selectionToolbar) selectionToolbar.style.display = "none";
}

function clearSelection() {
  if (selectedElement) {
    clearSelectionStyle(selectedElement);
    selectedElement = null;
  }
  hideToolbar();
}

// Convert canvas to blob and perform action
async function processScreenshot(element, action) {
  try {
    // Get element coordinates
    const rect = element.getBoundingClientRect();
    const dpr = window.devicePixelRatio;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    // Element coordinates in page space (accounting for scroll)
    const elementCoords = {
      x: Math.round((rect.left + scrollX) * dpr),
      y: Math.round((rect.top + scrollY) * dpr),
      width: Math.round(rect.width * dpr),
      height: Math.round(rect.height * dpr),
    };

    // Request screenshot from background
    const response = await browser.runtime.sendMessage({
      action: "captureTab",
    });

    if (response.error) {
      alert("Screenshot failed: " + response.error);
      return;
    }

    // Create image from data URL
    const img = new Image();
    img.onload = () => {
      // Create canvas and crop
      const canvas = document.createElement("canvas");
      canvas.width = elementCoords.width;
      canvas.height = elementCoords.height;
      const ctx = canvas.getContext("2d");

      ctx.drawImage(
        img,
        elementCoords.x,
        elementCoords.y,
        elementCoords.width,
        elementCoords.height,
        0,
        0,
        elementCoords.width,
        elementCoords.height
      );

      // Convert canvas to blob
      canvas.toBlob(async (blob) => {
        if (action === "download") {
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `screenshot-${Date.now()}.png`;
          link.click();
          URL.revokeObjectURL(url);
        } else if (action === "copy") {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ "image/png": blob }),
            ]);
            alert("Screenshot copied to clipboard!");
          } catch (err) {
            console.error("Clipboard error:", err);
            alert("Failed to copy to clipboard: " + err.message);
          }
        }

        // Exit selection mode
        exitSelectionMode();
      });
    };

    img.onerror = () => {
      throw new Error("Failed to load screenshot image");
    };

    img.src = response.imageData;
  } catch (error) {
    console.error("Capture error:", error);
    alert("Failed to capture: " + error.message);
    exitSelectionMode();
  }
}

// Enter selection mode
function enterSelectionMode() {
  isSelectionMode = true;
  document.body.style.cursor = "crosshair";
  document.addEventListener("mouseover", onMouseOver);
  document.addEventListener("mouseout", onMouseOut);
  document.addEventListener("click", onClick, true);
  document.addEventListener("keydown", onKeyDown);
}

// Exit selection mode
function exitSelectionMode() {
  isSelectionMode = false;
  document.body.style.cursor = "auto";
  hideHighlight();
  clearSelection();
  document.removeEventListener("mouseover", onMouseOver);
  document.removeEventListener("mouseout", onMouseOut);
  document.removeEventListener("click", onClick, true);
  document.removeEventListener("keydown", onKeyDown);
}

// Event handlers
function onMouseOver(event) {
  if (!isSelectionMode) return;
  // don't highlight toolbar
  if (selectionToolbar && selectionToolbar.contains(event.target)) return;
  // ignore the highlight element itself
  if (event.target.id === "element-screenshot-highlight") return;
  showHighlight(event.target);
}

function onMouseOut() {
  if (!isSelectionMode) return;
  hideHighlight();
}

function onClick(event) {
  if (!isSelectionMode) return;
  // allow clicks on toolbar buttons
  if (selectionToolbar && selectionToolbar.contains(event.target)) return;
  event.preventDefault();
  event.stopPropagation();
  selectElement(event.target);
}

function onKeyDown(event) {
  if (!isSelectionMode) return;
  // ESC to cancel selection mode
  if (event.key === "Escape") {
    event.preventDefault();
    clearSelection();
    exitSelectionMode();
    return;
  }
  if (!selectedElement) return;

  if (event.key === "ArrowUp") {
    event.preventDefault();
    moveSelection("up");
    return;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    moveSelection("down");
    return;
  }

  // Enter to download when an element is selected
  if (event.key === "Enter" && selectedElement) {
    event.preventDefault();
    processScreenshot(selectedElement, "download");
  }
}

// Listen for messages from popup or background
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startSelection") {
    if (!highlightElement) {
      highlightElement = createHighlight();
    }
    enterSelectionMode();
  }
});

// Initialize highlight element on load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    highlightElement = createHighlight();
  });
} else {
  highlightElement = createHighlight();
}
