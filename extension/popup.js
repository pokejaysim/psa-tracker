const TRACKER_URL = "http://localhost:3000";

const importBtn = document.getElementById("importBtn");
const importBtnText = document.getElementById("importBtnText");
const importSpinner = document.getElementById("importSpinner");
const pageStatus = document.getElementById("pageStatus");
const resultsDiv = document.getElementById("results");
const resultDetails = document.getElementById("resultDetails");
const hint = document.getElementById("hint");
const openTracker = document.getElementById("openTracker");

// Check if we're on a PSA page
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  const url = tab?.url || "";

  if (
    url.includes("psacard.com/myaccount") ||
    url.includes("psacard.com/submissions") ||
    url.includes("psacard.com/myorders") ||
    url.includes("psacard.com/account") ||
    url.includes("collectors.com")
  ) {
    pageStatus.textContent = "PSA Dashboard detected";
    pageStatus.classList.add("success");
    importBtn.disabled = false;
    hint.textContent = "Click Import to pull your submissions";
  } else if (url.includes("psacard.com")) {
    pageStatus.textContent = "PSA site — navigate to My Submissions";
    pageStatus.classList.add("warning");
    importBtn.disabled = true;
    hint.innerHTML = 'Go to <strong>My Account → My Orders</strong> first';
  } else {
    pageStatus.textContent = "Not on PSA website";
    pageStatus.classList.add("error");
    importBtn.disabled = true;
    hint.innerHTML = 'Visit <strong>psacard.com</strong> and log in first';
  }
});

// Import button click
importBtn.addEventListener("click", async () => {
  importBtn.disabled = true;
  importBtnText.textContent = "Scraping...";
  importSpinner.classList.remove("hidden");
  resultsDiv.classList.add("hidden");

  try {
    // Inject content script and scrape data
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scrapePSADashboard,
    });

    const submissions = result.result;

    if (!submissions || submissions.length === 0) {
      importBtnText.textContent = "No submissions found";
      importSpinner.classList.add("hidden");
      hint.textContent = "Make sure you're on the Orders/Submissions page";
      setTimeout(() => {
        importBtnText.textContent = "Import Submissions";
        importBtn.disabled = false;
      }, 3000);
      return;
    }

    importBtnText.textContent = `Sending ${submissions.length} to tracker...`;

    // Send to local tracker
    const response = await fetch(`${TRACKER_URL}/api/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissions }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();

    // Show results
    const created = data.results?.filter((r) => r.action === "created").length ?? 0;
    const updated = data.results?.filter((r) => r.action === "updated").length ?? 0;
    const skipped = data.results?.filter((r) => r.action === "skipped").length ?? 0;

    resultDetails.innerHTML = `
      <div class="stat"><span>Found on page</span><span class="num">${submissions.length}</span></div>
      <div class="stat"><span>New imported</span><span class="num" style="color:#059669">${created}</span></div>
      <div class="stat"><span>Updated</span><span class="num" style="color:#6366f1">${updated}</span></div>
      <div class="stat"><span>Already up to date</span><span class="num" style="color:#94a3b8">${skipped}</span></div>
    `;
    resultsDiv.classList.remove("hidden");

    importBtnText.textContent = "Import Complete!";
    importSpinner.classList.add("hidden");
    hint.textContent = "Open PSA Tracker to see your submissions";

    setTimeout(() => {
      importBtnText.textContent = "Import Again";
      importBtn.disabled = false;
    }, 2000);
  } catch (err) {
    importBtnText.textContent = "Import Failed";
    importSpinner.classList.add("hidden");
    hint.textContent = err.message || "Make sure PSA Tracker is running on localhost:3000";
    resultDetails.innerHTML = `<div class="value error">${err.message}</div>`;
    resultsDiv.classList.remove("hidden");

    setTimeout(() => {
      importBtnText.textContent = "Retry Import";
      importBtn.disabled = false;
    }, 3000);
  }
});

// Open tracker button
openTracker.addEventListener("click", () => {
  chrome.tabs.create({ url: TRACKER_URL });
});

// This function runs inside the PSA page context
function scrapePSADashboard() {
  const submissions = [];

  // Strategy 1: Look for table rows with order data
  const tables = document.querySelectorAll("table");
  for (const table of tables) {
    const rows = table.querySelectorAll("tbody tr");
    for (const row of rows) {
      const cells = row.querySelectorAll("td");
      if (cells.length < 2) continue;

      const text = row.textContent || "";
      // Look for order number patterns (e.g., 65-123456789 or just numeric)
      const orderMatch = text.match(/(\d{2}-\d{6,12})/);
      const subMatch = text.match(/Sub[#:\s]*(\d+)/i);

      if (orderMatch) {
        const sub = {
          orderNumber: orderMatch[1],
          submissionNumber: subMatch ? subMatch[1] : undefined,
        };

        // Try to extract status from the row
        const statusKeywords = [
          "arrived", "received", "grading", "assembly", "shipped",
          "delivered", "complete", "processing", "research", "qa",
          "order prep", "submitted", "grades ready", "packaging",
        ];
        for (const kw of statusKeywords) {
          if (text.toLowerCase().includes(kw)) {
            sub.status = kw;
            break;
          }
        }

        // Try to extract service level
        const serviceKeywords = [
          "walk-through", "walkthrough", "super express", "express",
          "regular", "value max", "value plus", "value bulk", "value",
          "premium", "economy", "bulk",
        ];
        for (const kw of serviceKeywords) {
          if (text.toLowerCase().includes(kw)) {
            sub.serviceLevel = kw;
            break;
          }
        }

        // Try to extract dates (MM/DD/YYYY or YYYY-MM-DD patterns)
        const dateMatches = text.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/g);
        if (dateMatches && dateMatches.length > 0) {
          sub.submittedDate = parseDateToISO(dateMatches[0]);
          if (dateMatches.length > 1) {
            sub.expectedReturnDate = parseDateToISO(dateMatches[dateMatches.length - 1]);
          }
        }

        // Try to extract card count
        const cardMatch = text.match(/(\d+)\s*(?:card|item|qty)/i);
        if (cardMatch) {
          sub.totalCards = parseInt(cardMatch[1]);
        }

        submissions.push(sub);
      }
    }
  }

  // Strategy 2: Look for card/list-based layouts if no table found
  if (submissions.length === 0) {
    // Look for any elements containing order numbers
    const allElements = document.querySelectorAll(
      "[class*='order'], [class*='submission'], [class*='card'], [class*='item'], [class*='row'], [data-order], [data-submission]"
    );

    for (const el of allElements) {
      const text = el.textContent || "";
      const orderMatch = text.match(/(\d{2}-\d{6,12})/);

      if (orderMatch) {
        // Avoid duplicates
        if (submissions.some((s) => s.orderNumber === orderMatch[1])) continue;

        const sub = { orderNumber: orderMatch[1] };

        const statusKeywords = [
          "arrived", "received", "grading", "assembly", "shipped",
          "delivered", "complete", "processing", "research", "qa",
          "order prep", "submitted", "grades ready",
        ];
        for (const kw of statusKeywords) {
          if (text.toLowerCase().includes(kw)) {
            sub.status = kw;
            break;
          }
        }

        const dateMatches = text.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/g);
        if (dateMatches && dateMatches.length > 0) {
          sub.submittedDate = parseDateToISO(dateMatches[0]);
        }

        submissions.push(sub);
      }
    }
  }

  // Strategy 3: Full page text scan as last resort
  if (submissions.length === 0) {
    const bodyText = document.body.textContent || "";
    const orderMatches = bodyText.match(/\d{2}-\d{6,12}/g);
    if (orderMatches) {
      const unique = [...new Set(orderMatches)];
      for (const orderNum of unique) {
        submissions.push({ orderNumber: orderNum });
      }
    }
  }

  function parseDateToISO(dateStr) {
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      let [m, d, y] = parts;
      if (y.length === 2) y = "20" + y;
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    return dateStr;
  }

  return submissions;
}
