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

  if (url.includes("psacard.com") || url.includes("collectors.com")) {
    pageStatus.textContent = "PSA site detected";
    pageStatus.classList.add("success");
    importBtn.disabled = false;
    hint.textContent = "Click Import to pull your orders";
  } else {
    pageStatus.textContent = "Not on PSA website";
    pageStatus.classList.add("error");
    importBtn.disabled = true;
    hint.innerHTML =
      'Visit <strong>psacard.com</strong> and go to <strong>My Orders</strong>';
  }
});

// Wait for a tab to finish loading + extra time for JS rendering
function waitForTab(tabId, delay = 2500) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      resolve(); // Resolve anyway after timeout
    }, 15000);

    function listener(id, info) {
      if (id === tabId && info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        clearTimeout(timeout);
        setTimeout(resolve, delay);
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
  });
}

// Import button click
importBtn.addEventListener("click", async () => {
  importBtn.disabled = true;
  importBtnText.textContent = "Scanning page...";
  importSpinner.classList.remove("hidden");
  resultsDiv.classList.add("hidden");

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    // Phase 1: Scrape order list to get order entries + detail URLs
    const [listResult] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scrapeOrderList,
    });

    const orders = listResult.result;

    if (!orders || orders.length === 0) {
      importBtnText.textContent = "No orders found";
      importSpinner.classList.add("hidden");
      hint.textContent = "Make sure you're on the My Orders page";
      setTimeout(() => {
        importBtnText.textContent = "Import Submissions";
        importBtn.disabled = false;
      }, 3000);
      return;
    }

    // Phase 2: Open each order detail in a background tab, scrape, close
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      if (!order.detailUrl) continue;

      importBtnText.textContent = `Scraping order ${i + 1}/${orders.length}...`;

      let bgTab = null;
      try {
        // Open detail page in a background tab (not active)
        bgTab = await chrome.tabs.create({
          url: order.detailUrl,
          active: false,
        });

        await waitForTab(bgTab.id, 2500);

        // Scrape the fully rendered detail page
        const [detailResult] = await chrome.scripting.executeScript({
          target: { tabId: bgTab.id },
          func: scrapeOrderDetailPage,
        });

        if (detailResult.result) {
          const detail = detailResult.result;
          if (detail.expectedReturnDate)
            order.expectedReturnDate = detail.expectedReturnDate;
          if (detail.receivedDate) order.receivedDate = detail.receivedDate;
          if (detail.submittedDate) order.submittedDate = detail.submittedDate;
          if (detail.cards && detail.cards.length > 0)
            order.cards = detail.cards;
          if (detail.totalCards) order.totalCards = detail.totalCards;
          if (detail.status) order.status = detail.status;
        }
      } catch (e) {
        // Skip this order's detail, keep list-level data
      } finally {
        // Always close the background tab
        if (bgTab) {
          try { await chrome.tabs.remove(bgTab.id); } catch {}
        }
      }
    }

    // Phase 3: Send to tracker
    importBtnText.textContent = `Sending ${orders.length} orders to tracker...`;

    const response = await fetch(`${TRACKER_URL}/api/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissions: orders }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();

    // Show results
    const created =
      data.results?.filter((r) => r.action === "created").length ?? 0;
    const updated =
      data.results?.filter((r) => r.action === "updated").length ?? 0;
    const skipped =
      data.results?.filter((r) => r.action === "skipped").length ?? 0;
    const totalCards = orders.reduce(
      (sum, o) => sum + (o.cards?.length || 0),
      0
    );

    resultDetails.innerHTML = `
      <div class="stat"><span>Orders found</span><span class="num">${orders.length}</span></div>
      <div class="stat"><span>Cards found</span><span class="num">${totalCards}</span></div>
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
    hint.textContent =
      err.message || "Make sure PSA Tracker is running on localhost:3000";
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

// ============================================================
// INJECTED FUNCTIONS — these run inside the PSA page context
// ============================================================

// Phase 1: Scrape the orders list page for order entries + detail URLs
function scrapeOrderList() {
  const orders = [];
  const seen = new Set();

  // Walk up from an element to find the full row container
  function getRowContainer(el) {
    let current = el;
    let bestMatch = el;
    for (let i = 0; i < 8; i++) {
      if (!current.parentElement) break;
      current = current.parentElement;
      const text = current.textContent || "";

      // Stop if we've gone too high (contains multiple orders)
      const subCount = (text.match(/Sub\s*#\d{7,10}/gi) || []).length;
      if (subCount > 1) break;

      // Good candidate: contains both sub# and card count
      if (subCount === 1 && /\d+\s*(?:Cards?|Items?)/i.test(text)) {
        bestMatch = current;
      }
      if (current.tagName === "TR") return current;
    }
    return bestMatch;
  }

  // Find all links that point to order detail pages
  const allLinks = document.querySelectorAll("a[href]");

  for (const link of allLinks) {
    const linkText = link.textContent?.trim() || "";
    const href = link.href;

    // Match submission number links like "#14525746"
    const subNumMatch = linkText.match(/(\d{7,10})/);
    if (!subNumMatch) continue;
    if (!href || seen.has(subNumMatch[1])) continue;

    // Must look like an order/submission detail link
    if (
      !href.includes("/order") &&
      !href.includes("/submission") &&
      !href.includes("/myaccount")
    )
      continue;

    seen.add(subNumMatch[1]);

    // Walk up to get the full row text
    const row = getRowContainer(link);
    const rowText = row.textContent || "";

    const order = { detailUrl: href };

    // Extract submission number (Sub #14525746) — use as primary ID
    const subMatch = rowText.match(/Sub(?:mission)?\s*#?(\d{7,10})/i);
    if (subMatch) order.orderNumber = subMatch[1];

    // Extract PSA order number (#26536028) — store as submissionNumber
    const psaOrderMatch = rowText.match(/#(\d{7,10})\s*[·•]\s*Sub/i);
    if (psaOrderMatch) order.submissionNumber = psaOrderMatch[1];

    // Fallbacks
    if (!order.orderNumber && order.submissionNumber) order.orderNumber = order.submissionNumber;
    if (!order.orderNumber) continue;

    // Extract status — check most advanced first so it wins if multiple appear
    const statusPatterns = [
      [/\bdelivered\b/i, "delivered"],
      [/\bshipped\b/i, "shipped"],
      [/\bcompleting\b/i, "processing"],
      [/\bcomplete\b(?!\s*by)/i, "complete"],
      [/\bprocessing\b/i, "processing"],
      [/\bqa\s*checks?\b/i, "qa"],
      [/grades?\s*ready/i, "grades ready"],
      [/\bassembly\b/i, "assembly"],
      [/\bgrading\b/i, "grading"],
      [/research\s*&?\s*id/i, "research"],
      [/order\s*prep/i, "order prep"],
      [/\barrived\b/i, "arrived"],
    ];
    for (const [pattern, status] of statusPatterns) {
      if (pattern.test(rowText)) {
        order.status = status;
        break;
      }
    }

    // Extract service level
    const servicePatterns = [
      [/walk[\s-]*through/i, "walk-through"],
      [/super\s*express/i, "super express"],
      [/value\s*max/i, "value max"],
      [/value\s*plus/i, "value plus"],
      [/value\s*bulk/i, "value bulk"],
      [/tcg\s*bulk/i, "value_bulk"],
      [/\bexpress\b/i, "express"],
      [/\bregular\b/i, "regular"],
      [/value\s*\(/i, "value"],
      [/\bvalue\b/i, "value"],
      [/\beconomy\b/i, "economy"],
      [/\bbulk\b/i, "bulk"],
    ];
    for (const [pattern, level] of servicePatterns) {
      if (pattern.test(rowText)) {
        order.serviceLevel = level;
        break;
      }
    }

    // Extract card count
    const cardMatch = rowText.match(/(\d+)\s*(?:Cards?|Items?)/i);
    if (cardMatch) order.totalCards = parseInt(cardMatch[1]);

    orders.push(order);
  }

  // Fallback: broad text scan
  if (orders.length === 0) {
    const bodyText = document.body.textContent || "";
    const subMatches = [...bodyText.matchAll(/Sub\s*#?\s*(\d{7,10})/gi)];
    for (const match of subMatches) {
      const num = match[1];
      if (!seen.has(num)) {
        seen.add(num);
        orders.push({
          orderNumber: num,
          submissionNumber: num,
          detailUrl: null,
        });
      }
    }
  }

  return orders;
}

// Phase 2: Scrape a fully rendered order detail page (runs on the live DOM)
function scrapeOrderDetailPage() {
  const MONTHS = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
    january: "01", february: "02", march: "03", april: "04",
    june: "06", july: "07", august: "08", september: "09",
    october: "10", november: "11", december: "12",
  };

  function parseTextDate(str) {
    const m = str.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/);
    if (m) {
      const mo = MONTHS[m[1].toLowerCase()];
      if (mo) return `${m[3]}-${mo}-${m[2].padStart(2, "0")}`;
    }
    return null;
  }

  const text = document.body.textContent || "";
  const result = {
    cards: [],
    expectedReturnDate: null,
    receivedDate: null,
    submittedDate: null,
    totalCards: null,
    psaOrderNumber: null,
    status: null,
  };

  // Extract PSA order number: "Order #26536028"
  const orderMatch = text.match(/Order\s*#(\d{7,10})/i);
  if (orderMatch) result.psaOrderNumber = orderMatch[1];

  // Extract estimated completion: "Est. Complete by June 19, 2026"
  const estMatch = text.match(
    /Est\.?\s*Complete\s*by\s+(\w+\s+\d{1,2},?\s+\d{4})/i
  );
  if (estMatch) result.expectedReturnDate = parseTextDate(estMatch[1]);

  // Extract current status from the detail page
  // Strategy 1: PSA shows a description like "Your submission is going through
  // the authentication and grading process."
  const descPatterns = [
    [/shipped/i, "shipped"],
    [/delivered/i, "delivered"],
    [/completing/i, "processing"],
    [/qa\s*check/i, "qa"],
    [/grades?\s*ready/i, "grades ready"],
    [/assembly/i, "assembly"],
    [/grading/i, "grading"],
    [/research|identification/i, "research"],
    [/order\s*prep/i, "order prep"],
    [/arrived|received/i, "arrived"],
  ];
  // Look for the status description text specifically
  const descMatch = text.match(/your\s+submission\s+is\s+.{0,100}/i);
  if (descMatch) {
    for (const [pattern, status] of descPatterns) {
      if (pattern.test(descMatch[0])) {
        result.status = status;
        break;
      }
    }
  }

  // Strategy 2: Find the last bold/active step in the progress bar
  // Look for elements that appear to be the "current" status step
  if (!result.status) {
    const stepElements = document.querySelectorAll(
      "[class*='active'], [class*='current'], [aria-current], [data-active], strong, b"
    );
    for (const el of stepElements) {
      const stepText = el.textContent?.trim() || "";
      for (const [pattern, status] of descPatterns) {
        if (pattern.test(stepText) && stepText.length < 30) {
          result.status = status;
          break;
        }
      }
      if (result.status) break;
    }
  }

  // Extract arrival date from status timeline
  const arrivedMatch = text.match(
    /Order\s*Arrived\s*[\n\r\s]*(\w{3,9}\s+\d{1,2},?\s+\d{4})/i
  );
  if (arrivedMatch) {
    const date = parseTextDate(arrivedMatch[1]);
    if (date) {
      result.receivedDate = date;
      result.submittedDate = date;
    }
  }

  // Extract total items: "6 Items" or "Items 6"
  const itemsMatch = text.match(/(\d+)\s*Items/i);
  if (itemsMatch) result.totalCards = parseInt(itemsMatch[1]);

  // ---- Card/Item extraction from the rendered DOM ----
  const cardsSeen = new Set();

  // Strategy A: Look for item rows/cards in the Items section
  // Find all elements that might be card entries
  const allElements = document.querySelectorAll("*");
  const itemElements = [];

  for (const el of allElements) {
    // Look for elements whose direct text contains a card-like description
    // Card descriptions typically start with a year: "2025 POKEMON..."
    const directText = getDirectText(el);
    if (/^(19|20)\d{2}\s+[A-Z]/m.test(directText) && directText.length < 300) {
      itemElements.push(el);
    }
  }

  for (const el of itemElements) {
    const itemText = el.textContent?.trim() || "";
    if (itemText.length > 500) continue; // Skip containers that are too large

    // Parse card description: "2025 POKEMON JTG EN-JOURNEY TOGETHER BOOSTER..."
    const cardMatch = itemText.match(
      /\b((?:19|20)\d{2})\s+(.+)/
    );
    if (!cardMatch) continue;

    const fullDesc = cardMatch[0].substring(0, 200).trim();
    if (cardsSeen.has(fullDesc)) continue;
    cardsSeen.add(fullDesc);

    const year = cardMatch[1];
    const restOfDesc = cardMatch[2].trim();

    // Try to split into brand and subject
    // Brand is typically the first word(s) in ALL CAPS before the description
    const brandMatch = restOfDesc.match(/^([A-Z][A-Z0-9\s&'./-]+?)(?:\s+(?:EN-|#|\d|[a-z]))/);
    let brand = "";
    let subject = restOfDesc;

    if (brandMatch) {
      brand = brandMatch[1].trim();
      subject = restOfDesc.substring(brand.length).trim();
    } else {
      // Take first word as brand
      const parts = restOfDesc.split(/\s+/);
      brand = parts[0] || "";
      subject = parts.slice(1).join(" ");
    }

    // Look for card number pattern like #123 or /123
    let cardNumber = "";
    const numMatch = subject.match(/#(\d+(?:\/\d+)?)/);
    if (numMatch) cardNumber = numMatch[1];

    // Look for declared value near this element
    let declaredValue = 0;
    const parent = el.parentElement;
    if (parent) {
      const parentText = parent.textContent || "";
      const valMatch = parentText.match(/\$\s*([\d,]+(?:\.\d{2})?)/);
      if (valMatch) declaredValue = parseFloat(valMatch[1].replace(/,/g, ""));
    }

    result.cards.push({
      year,
      brand,
      cardNumber,
      subject: subject.substring(0, 150),
      declaredValue,
    });
  }

  // Strategy B: If no cards found via elements, try the full page text
  if (result.cards.length === 0) {
    // Look for lines that start with a year
    const lines = text.split(/\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      const cardMatch = trimmed.match(/^((?:19|20)\d{2})\s+([A-Z].{5,150})/);
      if (!cardMatch) continue;

      const desc = cardMatch[0].substring(0, 200);
      if (cardsSeen.has(desc)) continue;
      // Skip known non-card lines
      if (/order|arrived|business|complete|status|shipped|est\./i.test(desc)) continue;
      cardsSeen.add(desc);

      const year = cardMatch[1];
      const rest = cardMatch[2].trim();
      const parts = rest.split(/\s+/);
      const brand = parts[0] || "";
      const subject = parts.slice(1).join(" ");

      result.cards.push({
        year,
        brand,
        cardNumber: "",
        subject: subject.substring(0, 150),
        declaredValue: 0,
      });
    }
  }

  // Helper: get only the direct text of an element (not children's text)
  function getDirectText(el) {
    let text = "";
    for (const node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      }
    }
    return text.trim();
  }

  return result;
}
