const captureBtn = document.getElementById("captureBtn");
const statusDiv = document.getElementById("status");

// Show status message
function showStatus(message, isError = false) {
  statusDiv.textContent = message;
  statusDiv.classList.toggle("error", isError);
  statusDiv.classList.toggle("active", true);
}

// Clear status message
function clearStatus() {
  statusDiv.classList.remove("active", "error");
  statusDiv.textContent = "";
}

// Handle capture button click
captureBtn.addEventListener("click", async () => {
  try {
    captureBtn.disabled = true;
    showStatus("Getting active tab...");

    // Query the active tab
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });

    if (tabs.length === 0) {
      throw new Error("No active tab found");
    }

    const activeTab = tabs[0];

    // Send message to content script to start selection mode
    await browser.tabs.sendMessage(activeTab.id, {
      action: "startSelection",
    });

    showStatus("Select an element to capture. Press ESC to cancel.");

    // Auto-hide status after 3 seconds
    setTimeout(clearStatus, 3000);
  } catch (error) {
    console.error("Error:", error);
    showStatus("Error: " + error.message, true);
    captureBtn.disabled = false;
  }
});

// Re-enable button when popup closes and reopens
window.addEventListener("focus", () => {
  captureBtn.disabled = false;
  clearStatus();
});
