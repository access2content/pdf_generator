// ===========================
// PDF Generation
// ===========================

document.getElementById("sendBtn").addEventListener("click", sendJSON);

async function sendJSON() {
  try {
    const json = JSON.parse(document.getElementById("jsonInput").value);

    // Validate that all required fields from template are present
    const validation = await window.api.validateJSON(json);

    if (!validation.valid) {
      const missingFields = validation.missingFields.join(", ");
      showNotification(`Missing required fields: ${missingFields}`, "error");
      return;
    }

    const res = await window.api.submitJSON(json);

    if (res.status === "ok") {
      showNotification("Saved to: " + res.path, "success");
    } else {
      showNotification("Error generating PDF", "error");
    }
  } catch (err) {
    showNotification("Invalid JSON: " + err.message, "error");
  }
}

// ===========================
// Navigation
// ===========================

const pages = {
  home: document.getElementById("homePage"),
  info: document.getElementById("infoPage"),
};

function showPage(pageName) {
  // Hide all pages
  Object.values(pages).forEach((page) => page.classList.remove("active"));

  // Show selected page
  if (pages[pageName]) {
    pages[pageName].classList.add("active");
  }

  // Close dropdown when navigating
  closeDropdown();
}

// Info button
document.getElementById("infoBtn").addEventListener("click", () => {
  showPage("info");
  loadTemplatePath();
});

// Close info page button
document.getElementById("closeInfoBtn").addEventListener("click", () => {
  showPage("home");
});

// ===========================
// Dropdown Menu
// ===========================

const settingsBtn = document.getElementById("settingsBtn");
const settingsMenu = document.getElementById("settingsMenu");

settingsBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  settingsMenu.classList.toggle("show");
});

// Close dropdown when clicking outside
document.addEventListener("click", (e) => {
  if (!settingsMenu.contains(e.target) && e.target !== settingsBtn) {
    closeDropdown();
  }
});

function closeDropdown() {
  settingsMenu.classList.remove("show");
}

// ===========================
// Modal
// ===========================

const templatePathModal = document.getElementById("templatePathModal");

function showModal() {
  templatePathModal.classList.add("show");
  loadTemplatePathToModal();
}

function closeModal() {
  templatePathModal.classList.remove("show");
}

document.getElementById("closeModalBtn").addEventListener("click", closeModal);

// Close modal when clicking outside
templatePathModal.addEventListener("click", (e) => {
  if (e.target === templatePathModal) {
    closeModal();
  }
});

// Close modal/info page with Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    // Close modal if open
    if (templatePathModal.classList.contains("show")) {
      closeModal();
    }
    // Close info page if open
    else if (pages.info.classList.contains("active")) {
      showPage("home");
    }
    // Close dropdown
    closeDropdown();
  }
});

// ===========================
// Template Management
// ===========================

// View template path (opens modal)
document.getElementById("viewTemplatePathBtn").addEventListener("click", () => {
  closeDropdown();
  showModal();
});

// Open template folder
document
  .getElementById("openTemplateFolderBtn")
  .addEventListener("click", async () => {
    closeDropdown();
    try {
      await window.api.openTemplateFolder();
    } catch (err) {
      showNotification("Failed to open template folder", "error");
    }
  });

// Open from info page
document
  .getElementById("openTemplateFromInfoBtn")
  .addEventListener("click", async () => {
    try {
      await window.api.openTemplateFolder();
    } catch (err) {
      showNotification("Failed to open template folder", "error");
    }
  });

// Open from modal
document
  .getElementById("openFolderFromModalBtn")
  .addEventListener("click", async () => {
    try {
      await window.api.openTemplateFolder();
    } catch (err) {
      showNotification("Failed to open template folder", "error");
    }
  });

// Change template folder
document
  .getElementById("changeTemplateFolderBtn")
  .addEventListener("click", async () => {
    closeDropdown();
    try {
      const currentPath = await window.api.getTemplatePath();
      const newPath = await window.api.changeTemplateFolder();

      // Only show success if path actually changed (user didn't cancel)
      if (newPath && newPath !== currentPath) {
        showNotification("Template folder changed successfully", "success");
        // Reload paths if modal or info page is open
        loadTemplatePathToModal();
        loadTemplatePath();
      }
    } catch (err) {
      showNotification("Failed to change template folder", "error");
    }
  });

// Reset templates
document
  .getElementById("resetTemplatesBtn")
  .addEventListener("click", async () => {
    closeDropdown();

    // Show confirmation
    const confirmed = confirm(
      "Reset to default templates?\n\n" +
        "This will copy the default templates to your user data folder.\n" +
        "It might replace any template already there",
    );

    if (!confirmed) return;

    try {
      const defaultPath = await window.api.resetTemplates();
      showNotification("Templates reset to defaults", "success");
      // Reload paths
      loadTemplatePathToModal();
      loadTemplatePath();
    } catch (err) {
      showNotification("Failed to reset templates", "error");
    }
  });

// Click to copy path in modal
document
  .getElementById("modalTemplatePath")
  .addEventListener("click", async (e) => {
    try {
      const path = e.target.textContent;
      if (path && path !== "Loading..." && path !== "Error loading path") {
        await navigator.clipboard.writeText(path);
        showNotification("Path copied to clipboard", "success");
      }
    } catch (err) {
      showNotification("Failed to copy path", "error");
    }
  });

// ===========================
// Load Template Path
// ===========================

async function loadTemplatePath() {
  try {
    const path = await window.api.getTemplatePath();
    const displayEl = document.getElementById("templatePathDisplay");
    if (displayEl) {
      displayEl.textContent = path;
    }
  } catch (err) {
    console.error("Failed to load template path:", err);
    const displayEl = document.getElementById("templatePathDisplay");
    if (displayEl) {
      displayEl.textContent = "Error loading path";
    }
  }
}

async function loadTemplatePathToModal() {
  try {
    const path = await window.api.getTemplatePath();
    document.getElementById("modalTemplatePath").textContent = path;
  } catch (err) {
    console.error("Failed to load template path:", err);
    document.getElementById("modalTemplatePath").textContent =
      "Error loading path";
  }
}

// ===========================
// Notifications
// ===========================

function showNotification(message, type = "info") {
  // Create notification element
  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.textContent = message;

  // Add to document
  document.body.appendChild(notification);

  // Trigger animation
  setTimeout(() => notification.classList.add("show"), 10);

  // Remove after 5 seconds
  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

// Add notification styles dynamically
const style = document.createElement("style");
style.textContent = `
  .notification {
    position: fixed;
    bottom: 24px;
    right: 24px;
    padding: 14px 20px;
    background: rgba(30, 28, 40, 0.95);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(65, 78, 98, 0.4);
    border-radius: 12px;
    color: #FCFCFC;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    z-index: 3000;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.3s cubic-bezier(0, 0, 0.2, 1);
    max-width: 400px;
  }

  .notification.show {
    opacity: 1;
    transform: translateY(0);
  }

  .notification-success {
    border-left: 3px solid #40BF7F;
  }

  .notification-error {
    border-left: 3px solid #FF9193;
  }

  .notification-info {
    border-left: 3px solid #5c54ff;
  }
`;
document.head.appendChild(style);

// ===========================
// Sample JSON Management
// ===========================

// Update placeholder with sample JSON
function updatePlaceholder(sampleJson) {
  const jsonInput = document.getElementById("jsonInput");
  const formatted = JSON.stringify(sampleJson, null, 2);
  jsonInput.setAttribute("placeholder", formatted);
}

// Load sample JSON on startup and set placeholder
async function loadSampleJsonCache() {
  try {
    const sampleJson = await window.api.getSampleJson();
    updatePlaceholder(sampleJson);
    console.log("✓ Sample JSON loaded and placeholder updated");
  } catch (err) {
    console.error("Failed to load sample JSON:", err);
    const fallback = { title: "Sample Document", content: "Sample content" };
    updatePlaceholder(fallback);
  }
}

// Load Sample JSON button - generates FRESH sample each time
document.getElementById("loadSampleBtn").addEventListener("click", async () => {
  try {
    // Always generate fresh sample JSON (not cached)
    const freshSampleJson = await window.api.getSampleJson();
    const formatted = JSON.stringify(freshSampleJson, null, 2);

    // Format and load into textarea
    const jsonInput = document.getElementById("jsonInput");
    jsonInput.value = formatted;

    // Update placeholder
    updatePlaceholder(freshSampleJson);

    showNotification("Sample JSON loaded", "success");
  } catch (err) {
    showNotification("Failed to load sample JSON", "error");
  }
});

// ===========================
// Initialize
// ===========================

document.addEventListener("DOMContentLoaded", async () => {
  console.log("✓ PDF Generator loaded");

  // Load sample JSON cache on startup
  await loadSampleJsonCache();
});
