// ==== SET THIS TO YOUR API GATEWAY INVOKE URL ====
// If your stage is $default, do NOT add a stage suffix.
const API_BASE = "https://wmg52t8w3j.execute-api.us-east-1.amazonaws.com";

// Store current user ID
let currentUserId = null;

// ---------- Helpers ----------
async function httpPost(url, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  // Helpful logging while debugging:
  console.log("POST", url, "status:", res.status, "body:", text);
  if (!res.ok) {
    // try to surface Lambda's error payload if JSON
    try { throw new Error(JSON.parse(text).error || text); }
    catch { throw new Error(text || `HTTP ${res.status}`); }
  }
  return text ? JSON.parse(text) : {};
}

// ---------- Create User ----------
document.getElementById("registrationForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const userData = {
    fullName: document.getElementById("fullName").value.trim(),
    dob: document.getElementById("dob").value, // YYYY-MM-DD
    email: document.getElementById("email").value.trim(),
    initialBalance: Number(document.getElementById("initialBalance").value),
    emailNotifications: document.getElementById("emailNotifications").checked,
  };

  // Basic client-side validation
  if (!userData.fullName || !userData.dob || !userData.email || isNaN(userData.initialBalance)) {
    alert("Please fill all fields correctly.");
    return;
  }

  try {
    const data = await httpPost(`${API_BASE}/users`, userData);
    currentUserId = data.userId;
    
    // Show success message with copy option
    const copyPrompt = confirm(`Account created successfully!\n\nUser ID: ${data.userId}\nStarting balance: $${Number(data.balance).toFixed(2)}\n\nClick OK to copy your User ID to clipboard.`);
    
    if (copyPrompt) {
      navigator.clipboard.writeText(data.userId).then(() => {
        alert("User ID copied to clipboard!");
      }).catch(() => {
        alert("Could not copy automatically. Your User ID is: " + data.userId);
      });
    }
    
    // Show user ID banner and unlock features
    document.getElementById("displayedUserId").textContent = data.userId;
    document.getElementById("userIdDisplay").style.display = "block";
    document.getElementById("transactions").style.display = "block";
    document.getElementById("balance").style.display = "block";
    document.getElementById("statements").style.display = "block";
    
    // Show notification status
    if (data.emailNotifications) {
      console.log("Email notifications enabled for this account");
    }
    
    // Hide registration form
    document.getElementById("registration").style.display = "none";
    
    document.getElementById("registrationForm").reset();
  } catch (err) {
    console.error("CreateUser failed:", err);
    alert("Failed to create account. Please check console (F12 → Console) for details.");
  }
});

// ---------- Copy User ID ----------
document.getElementById("copyUserIdBtn").addEventListener("click", () => {
  if (currentUserId) {
    navigator.clipboard.writeText(currentUserId).then(() => {
      const btn = document.getElementById("copyUserIdBtn");
      const originalText = btn.textContent;
      btn.textContent = "✓ Copied!";
      setTimeout(() => {
        btn.textContent = originalText;
      }, 2000);
    }).catch(() => {
      alert("Could not copy. Your User ID is: " + currentUserId);
    });
  }
});

// ---------- Transactions ----------
document.getElementById("transactionForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!currentUserId) {
    alert("Please create an account first.");
    return;
  }

  const txTypeRaw = document.getElementById("transactionType").value;
  const amountNum = Number(document.getElementById("amount").value);

  if (!txTypeRaw || isNaN(amountNum) || amountNum <= 0) {
    alert("Please select a transaction type and enter a positive amount.");
    return;
  }

  // Lambda expects keys: userId, type ("DEPOSIT"/"WITHDRAW"), amount (number)
  const payload = {
    userId: currentUserId,
    type: txTypeRaw.toUpperCase() === "DEPOSIT" ? "DEPOSIT" : "WITHDRAW",
    amount: amountNum,
  };

  try {
    const data = await httpPost(`${API_BASE}/transactions`, payload);
    alert(`Transaction successful! New balance: $${Number(data.balance).toFixed(2)}\nTxn ID: ${data.transactionId}`);
    document.getElementById("transactionForm").reset();
  } catch (err) {
    console.error("Transaction failed:", err);
    alert(`Transaction failed: ${err.message || err}`);
  }
});

// ---------- Check Balance ----------
document.getElementById("checkBalanceBtn")?.addEventListener("click", async () => {
  if (!currentUserId) {
    alert("Please create an account first.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/users/${currentUserId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });
    
    const text = await res.text();
    console.log("GET balance", `${API_BASE}/users/${currentUserId}`, "status:", res.status, "body:", text);
    
    if (!res.ok) {
      const error = text ? JSON.parse(text).error : `HTTP ${res.status}`;
      throw new Error(error);
    }
    
    const data = JSON.parse(text);
    alert(`User: ${data.fullName}\nEmail: ${data.email}\nBalance: $${Number(data.balance).toFixed(2)}\nLast Updated: ${new Date(data.updatedAt).toLocaleString()}`);
  } catch (err) {
    console.error("Balance check failed:", err);
    alert(`Failed to check balance: ${err.message || err}`);
  }
});

// ---------- Download Statement ----------
document.getElementById("downloadStatementBtn")?.addEventListener("click", async () => {
  if (!currentUserId) {
    alert("Please create an account first.");
    return;
  }

  const statusDiv = document.getElementById("statementStatus");
  statusDiv.style.display = "block";
  statusDiv.textContent = "Fetching statement...";
  statusDiv.className = "status-message loading";

  try {
    const res = await fetch(`${API_BASE}/statements/${currentUserId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });
    
    const text = await res.text();
    console.log("GET statement", `${API_BASE}/statements/${currentUserId}`, "status:", res.status, "body:", text);
    
    if (!res.ok) {
      const errorData = text ? JSON.parse(text) : {};
      throw new Error(errorData.message || errorData.error || `HTTP ${res.status}`);
    }
    
    const data = JSON.parse(text);
    
    if (data.latestStatement && data.latestStatement.url) {
      // Open statement in new tab
      window.open(data.latestStatement.url, '_blank');
      statusDiv.textContent = "Statement opened in new tab!";
      statusDiv.className = "status-message success";
      
      // Show available statements count
      if (data.availableStatements && data.availableStatements.length > 1) {
        statusDiv.textContent += ` (${data.availableStatements.length} statements available)`;
      }
    } else {
      throw new Error("No statement URL returned");
    }
  } catch (err) {
    console.error("Statement download failed:", err);
    statusDiv.textContent = err.message || "Failed to download statement";
    statusDiv.className = "status-message error";
  }
  
  // Hide status after 5 seconds
  setTimeout(() => {
    statusDiv.style.display = "none";
  }, 5000);
});
