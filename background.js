// Listen for messages from content script
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "captureTab") {
    // Get the active tab in the current window
    browser.tabs
      .query({ active: true, currentWindow: true })
      .then((tabs) => {
        if (tabs.length === 0) {
          sendResponse({ error: "No active tab found" });
          return;
        }

        const activeTab = tabs[0];
        const windowId = activeTab.windowId;

        // Capture the visible tab as PNG data URL
        return browser.tabs.captureVisibleTab(windowId, { format: "png" });
      })
      .then((imageData) => {
        sendResponse({ imageData });
      })
      .catch((error) => {
        console.error("Capture failed:", error);
        sendResponse({ error: error.message });
      });

    // Return true to indicate we'll send response asynchronously
    return true;
  }
});
