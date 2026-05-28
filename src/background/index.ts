/**
 * Background Service Worker
 * Handles: extension icon click, side panel, tab communication
 */

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return
  chrome.sidePanel.open({ tabId: tab.id })
})

// Enable side panel for all tabs
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch(console.error)
})

// Message relay between content script and side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Relay element info from content script to side panel
  if (message.type === 'ELEMENT_HOVERED' || message.type === 'ELEMENT_CLICKED') {
    // Broadcast to all extension pages
    chrome.runtime.sendMessage(message).catch(() => {
      // Side panel might not be open, ignore
    })
    sendResponse({ ok: true })
    return true
  }

  // Take screenshot for annotation
  if (message.type === 'CAPTURE_SCREENSHOT') {
    const tabId = sender.tab?.id
    if (!tabId) {
      sendResponse({ error: 'No tab ID' })
      return true
    }

    chrome.tabs.captureVisibleTab(
      sender.tab?.windowId ?? chrome.windows.WINDOW_ID_CURRENT,
      { format: 'png', quality: 100 },
      (dataUrl) => {
        if (chrome.runtime.lastError) {
          sendResponse({ error: chrome.runtime.lastError.message })
        } else {
          sendResponse({ dataUrl })
        }
      }
    )
    return true // Keep channel open for async response
  }

  // Inject/enable inspector on current tab
  if (message.type === 'INIT_INSPECTOR' || message.type === 'DISABLE_INSPECTOR') {
    // Find active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0]
      if (!tab?.id) return
      chrome.tabs.sendMessage(tab.id, message).catch(console.error)
    })
    sendResponse({ ok: true })
    return true
  }

  // Edit CSS on page
  if (message.type === 'EDIT_CSS') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0]
      if (!tab?.id) return
      chrome.tabs.sendMessage(tab.id, message).catch(console.error)
    })
    sendResponse({ ok: true })
    return true
  }

  // Extract design tokens from active tab
  if (message.type === 'EXTRACT_TOKENS') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0]
      if (!tab?.id) {
        sendResponse({ error: 'No active tab' })
        return
      }
      chrome.tabs.sendMessage(tab.id, message, (response) => {
        sendResponse(response)
      })
    })
    return true
  }

  return false
})
