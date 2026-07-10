// State: track if we're in selection mode
let isSelectionMode = false;
let highlightElement = null;
let selectedElement = null;
let selectionToolbar = null;
let previousStyle = null;
let annotatorOverlay = null;
let annotatorPanel = null;
let annotatorCanvasWrap = null;
let annotatorCanvas = null;
let annotatorCtx = null;
let annotatorImage = null;
let annotatorStrokes = [];
let annotatorCurrentStroke = null;

const ANNOTATION_COLOR = "#ff3b30";
const ANNOTATION_WIDTH = 4;

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

  let nextElement = null;

  if (direction === "up") {
    nextElement = selectedElement.parentElement;
  } else if (direction === "down") {
    nextElement = selectedElement.children[0] || null;
  } else if (direction === "left") {
    // previous element sibling (element node)
    nextElement = selectedElement.previousElementSibling;
  } else if (direction === "right") {
    // next element sibling
    nextElement = selectedElement.nextElementSibling;
  }

  if (!nextElement) {
    let msg = "No matching element.";
    if (direction === "up") msg = "No parent element.";
    if (direction === "down") msg = "No child element.";
    if (direction === "left") msg = "No previous sibling.";
    if (direction === "right") msg = "No next sibling.";
    alert(msg);
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

  const leftBtn = document.createElement("button");
  leftBtn.textContent = "← Left";
  leftBtn.style.cssText = `
    background:#eee; color:#333; border:none; padding:6px 10px; border-radius:4px; cursor:pointer; font-size:12px;
  `;
  leftBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    moveSelection("left");
  });

  const rightBtn = document.createElement("button");
  rightBtn.textContent = "→ Right";
  rightBtn.style.cssText = `
    background:#eee; color:#333; border:none; padding:6px 10px; border-radius:4px; cursor:pointer; font-size:12px;
  `;
  rightBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    moveSelection("right");
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
  downloadBtn.textContent = "Annotate";
  downloadBtn.style.cssText = `
    background:#4A90E2; color:white; border:none; padding:6px 10px; border-radius:4px; cursor:pointer; font-size:12px;
  `;
  downloadBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (selectedElement) processScreenshot(selectedElement, "annotate");
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
  toolbar.appendChild(leftBtn);
  toolbar.appendChild(rightBtn);
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

function getElementCoords(element) {
  const rect = element.getBoundingClientRect();
  const dpr = window.devicePixelRatio;
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  return {
    x: Math.round((rect.left + scrollX) * dpr),
    y: Math.round((rect.top + scrollY) * dpr),
    width: Math.round(rect.width * dpr),
    height: Math.round(rect.height * dpr),
  };
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function captureElementCanvas(element) {
  return new Promise((resolve, reject) => {
    const elementCoords = getElementCoords(element);

    browser.runtime
      .sendMessage({
        action: "captureTab",
      })
      .then((response) => {
        if (response.error) {
          reject(new Error(response.error));
          return;
        }

        const img = new Image();
        img.onload = () => {
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

          resolve(canvas);
        };

        img.onerror = () => reject(new Error("Failed to load screenshot image"));
        img.src = response.imageData;
      })
      .catch(reject);
  });
}

function openAnnotator(imageDataUrl) {
  hideToolbar();
  ensureAnnotator();
  annotatorOverlay.style.display = "flex";

  const image = new Image();
  image.onload = () => {
    annotatorImage = image;
    annotatorStrokes = [];
    annotatorCurrentStroke = null;

    const maxWidth = Math.max(320, window.innerWidth - 32);
    const maxHeight = Math.max(240, window.innerHeight - 96);
    const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
    const displayWidth = Math.max(320, Math.min(image.width, maxWidth));
    const displayHeight = Math.max(240, Math.min(Math.round(image.height * (displayWidth / image.width)), maxHeight));

    annotatorCanvas.width = image.width;
    annotatorCanvas.height = image.height;
    annotatorCanvas.style.width = `${Math.max(1, Math.floor(image.width * scale))}px`;
    annotatorCanvas.style.height = `${Math.max(1, Math.floor(image.height * scale))}px`;

    annotatorOverlay.style.alignItems = "flex-start";
    annotatorOverlay.style.overflow = "auto";
    annotatorOverlay.style.justifyContent = "center";
    annotatorOverlay.style.paddingTop = "16px";

    if (annotatorPanel) {
      annotatorPanel.style.width = `${displayWidth + 24}px`;
      annotatorPanel.style.maxWidth = `${maxWidth}px`;
      annotatorPanel.style.maxHeight = `${maxHeight}px`;
      annotatorPanel.style.overflow = "hidden";
    }

    if (annotatorCanvasWrap) {
      annotatorCanvasWrap.style.width = "100%";
      annotatorCanvasWrap.style.maxWidth = "100%";
      annotatorCanvasWrap.style.maxHeight = `${Math.max(0, displayHeight)}px`;
    }

    redrawAnnotator();
  };

  image.src = imageDataUrl;
}

function ensureAnnotator() {
  if (annotatorOverlay) return;

  annotatorOverlay = document.createElement("div");
  annotatorOverlay.id = "element-screenshot-annotator";
  annotatorOverlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 100002;
    display: none;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.55);
    padding: 16px;
  `;

  annotatorPanel = document.createElement("div");
  annotatorPanel.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 100%;
    max-height: 100%;
    background: #fff;
    padding: 12px;
    border-radius: 10px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.28);
  `;

  const header = document.createElement("div");
  header.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    font-family: sans-serif;
  `;

  const title = document.createElement("div");
  title.textContent = "Annotate screenshot";
  title.style.cssText = `font-size: 14px; font-weight: 600; color: #333;`;

  const actions = document.createElement("div");
  actions.style.cssText = `display: flex; gap: 8px;`;

  const undoBtn = document.createElement("button");
  undoBtn.textContent = "Undo";
  undoBtn.style.cssText = `
    background:#eee; color:#333; border:none; padding:6px 10px; border-radius:4px; cursor:pointer; font-size:12px;
  `;
  undoBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (annotatorStrokes.length > 0) {
      annotatorStrokes.pop();
      redrawAnnotator();
    }
  });

  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save";
  saveBtn.style.cssText = `
    background:#4A90E2; color:white; border:none; padding:6px 10px; border-radius:4px; cursor:pointer; font-size:12px;
  `;
  saveBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    saveAnnotatedScreenshot();
  });

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  cancelBtn.style.cssText = `
    background:#eee; color:#333; border:none; padding:6px 10px; border-radius:4px; cursor:pointer; font-size:12px;
  `;
  cancelBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    closeAnnotator(true);
  });

  actions.appendChild(undoBtn);
  actions.appendChild(saveBtn);
  actions.appendChild(cancelBtn);
  header.appendChild(title);
  header.appendChild(actions);

  annotatorCanvasWrap = document.createElement("div");
  annotatorCanvasWrap.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: auto;
    max-width: calc(100vw - 48px);
    max-height: calc(100vh - 96px);
  `;

  annotatorCanvas = document.createElement("canvas");
  annotatorCanvas.style.cssText = `
    display: block;
    max-width: 100%;
    max-height: 100%;
    cursor: crosshair;
    touch-action: none;
  `;

  annotatorCtx = annotatorCanvas.getContext("2d");

  annotatorCanvas.addEventListener("pointerdown", onAnnotatorPointerDown);
  annotatorCanvas.addEventListener("pointermove", onAnnotatorPointerMove);
  annotatorCanvas.addEventListener("pointerup", onAnnotatorPointerUp);
  annotatorCanvas.addEventListener("pointercancel", onAnnotatorPointerUp);
  annotatorCanvas.addEventListener("pointerleave", onAnnotatorPointerUp);

  annotatorCanvasWrap.appendChild(annotatorCanvas);
  annotatorPanel.appendChild(header);
  annotatorPanel.appendChild(annotatorCanvasWrap);
  annotatorOverlay.appendChild(annotatorPanel);
  document.body.appendChild(annotatorOverlay);
}

function redrawAnnotator() {
  if (!annotatorCanvas || !annotatorCtx || !annotatorImage) return;

  annotatorCtx.clearRect(0, 0, annotatorCanvas.width, annotatorCanvas.height);
  annotatorCtx.drawImage(annotatorImage, 0, 0, annotatorCanvas.width, annotatorCanvas.height);

  const drawStroke = (stroke) => {
    if (!stroke || stroke.points.length === 0) return;

    annotatorCtx.save();
    annotatorCtx.strokeStyle = stroke.color;
    annotatorCtx.lineWidth = stroke.width;
    annotatorCtx.lineCap = "round";
    annotatorCtx.lineJoin = "round";

    if (stroke.points.length === 1) {
      const point = stroke.points[0];
      annotatorCtx.beginPath();
      annotatorCtx.arc(point.x, point.y, stroke.width / 2, 0, Math.PI * 2);
      annotatorCtx.fillStyle = stroke.color;
      annotatorCtx.fill();
      annotatorCtx.restore();
      return;
    }

    annotatorCtx.beginPath();
    annotatorCtx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i += 1) {
      annotatorCtx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    annotatorCtx.stroke();
    annotatorCtx.restore();
  };

  annotatorStrokes.forEach(drawStroke);
}

function canvasPointFromEvent(event) {
  const rect = annotatorCanvas.getBoundingClientRect();
  const scaleX = annotatorCanvas.width / rect.width;
  const scaleY = annotatorCanvas.height / rect.height;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function onAnnotatorPointerDown(event) {
  if (event.button !== 0) return;
  event.preventDefault();
  annotatorCanvas.setPointerCapture(event.pointerId);
  annotatorCurrentStroke = {
    color: ANNOTATION_COLOR,
    width: ANNOTATION_WIDTH,
    points: [canvasPointFromEvent(event)],
  };
  annotatorStrokes.push(annotatorCurrentStroke);
  redrawAnnotator();
}

function onAnnotatorPointerMove(event) {
  if (!annotatorCurrentStroke) return;
  event.preventDefault();
  annotatorCurrentStroke.points.push(canvasPointFromEvent(event));
  redrawAnnotator();
}

function onAnnotatorPointerUp(event) {
  if (!annotatorCurrentStroke) return;
  event.preventDefault();
  if (annotatorCanvas.hasPointerCapture(event.pointerId)) {
    annotatorCanvas.releasePointerCapture(event.pointerId);
  }
  annotatorCurrentStroke = null;
}

function closeAnnotator(restoreToolbar) {
  if (!annotatorOverlay) return;

  annotatorOverlay.style.display = "none";
  annotatorCurrentStroke = null;
  annotatorStrokes = [];

  if (restoreToolbar && selectedElement) {
    showToolbarNearElement(selectedElement);
  }
}

function saveAnnotatedScreenshot() {
  if (!annotatorCanvas) return;

  annotatorCanvas.toBlob((blob) => {
    downloadBlob(blob, `annotated-screenshot-${Date.now()}.png`);
    closeAnnotator(false);
    exitSelectionMode();
  }, "image/png");
}

// Convert canvas to blob and perform action
async function processScreenshot(element, action) {
  try {
    const canvas = await captureElementCanvas(element);

    if (action === "annotate") {
      openAnnotator(canvas.toDataURL("image/png"));
      return;
    }

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));

    if (action === "download") {
      downloadBlob(blob, `screenshot-${Date.now()}.png`);
    } else if (action === "copy") {
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        alert("Screenshot copied to clipboard!");
      } catch (err) {
        console.error("Clipboard error:", err);
        alert("Failed to copy to clipboard: " + err.message);
      }
    }

    exitSelectionMode();
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
  if (annotatorOverlay && annotatorOverlay.contains(event.target)) return;
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
  if (annotatorOverlay && annotatorOverlay.contains(event.target)) return;
  event.preventDefault();
  event.stopPropagation();
  selectElement(event.target);
}

function onKeyDown(event) {
  if (!isSelectionMode) return;
  if (annotatorOverlay && annotatorOverlay.style.display === "flex") {
    if (event.key === "Escape") {
      event.preventDefault();
      closeAnnotator(true);
    }
    return;
  }
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

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    moveSelection("left");
    return;
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    moveSelection("right");
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
