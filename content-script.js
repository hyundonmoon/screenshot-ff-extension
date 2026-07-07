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

function createSelectionToolbar() {
  const toolbar = document.createElement("div");
  toolbar.id = "element-screenshot-toolbar";
  toolbar.style.cssText = `
    position: absolute;
    z-index: 100001;
    display: flex;
    gap: 8px;
    background: rgba(255,255,255,0.95);
    padding: 6px;
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    font-family: sans-serif;
    pointer-events: auto;
  `;

  const captureBtn = document.createElement("button");
  captureBtn.textContent = "Capture";
  captureBtn.style.cssText = `
    background:#4A90E2; color:white; border:none; padding:6px 10px; border-radius:4px; cursor:pointer;
  `;
  captureBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (selectedElement) captureElement(selectedElement);
  });

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  cancelBtn.style.cssText = `
    background:#eee; color:#333; border:none; padding:6px 10px; border-radius:4px; cursor:pointer;
  `;
  cancelBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    clearSelection();
    exitSelectionMode();
  });

  toolbar.appendChild(captureBtn);
  toolbar.appendChild(cancelBtn);
  document.body.appendChild(toolbar);
  return toolbar;
}

function showToolbarNearElement(element) {
  if (!element) return;
  if (!selectionToolbar) selectionToolbar = createSelectionToolbar();
  const rect = element.getBoundingClientRect();
  // position above the element if possible
  const top = Math.max(8, rect.top - 40);
  const left = Math.min(window.innerWidth - 150, rect.left);
  selectionToolbar.style.top = `${top}px`;
  selectionToolbar.style.left = `${left}px`;
  selectionToolbar.style.display = "flex";
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

// Capture and crop the selected element
async function captureElement(element) {
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

      // Convert canvas to blob and download
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `screenshot-${Date.now()}.png`;
        link.click();
        URL.revokeObjectURL(url);

        // Exit selection mode
        exitSelectionMode();
      });
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
  // set selection instead of capturing immediately
  selectedElement = event.target;
  applySelectionStyle(selectedElement);
  hideHighlight();
  showToolbarNearElement(selectedElement);
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
  // Enter to capture when an element is selected
  if (event.key === "Enter" && selectedElement) {
    event.preventDefault();
    captureElement(selectedElement);
  }
}

// Listen for messages from popup or background
browser.runtime.onMessage.addListener((request) => {
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
