// ==== SET THIS TO YOUR API GATEWAY INVOKE URL ====
// If your stage is $default, do NOT add a stage suffix.
const API_BASE = "https://wmg52t8w3j.execute-api.us-east-1.amazonaws.com";

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
  };

  // Basic client-side validation
  if (!userData.fullName || !userData.dob || !userData.email || isNaN(userData.initialBalance)) {
    alert("Please fill all fields correctly.");
    return;
  }

  try {
    const data = await httpPost(`${API_BASE}/users`, userData);
    alert(`Account created! User ID: ${data.userId}\nStarting balance: $${Number(data.balance).toFixed(2)}`);
    // Optionally stash userId for convenience
    const userIdInput = document.getElementById("userId");
    if (userIdInput) userIdInput.value = data.userId;
    document.getElementById("registrationForm").reset();
  } catch (err) {
    console.error("CreateUser failed:", err);
    alert("Failed to create account. Please check console (F12 → Console) for details.");
  }
});

// ---------- Transactions ----------
document.getElementById("transactionForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const userId = document.getElementById("userId").value.trim();
  const txTypeRaw = document.getElementById("transactionType").value; // e.g., "deposit" | "withdraw"
  const amountNum = Number(document.getElementById("amount").value);

  if (!userId || !txTypeRaw || isNaN(amountNum) || amountNum <= 0) {
    alert("Please enter a valid User ID, transaction type, and positive amount.");
    return;
  }

  // Lambda expects keys: userId, type ("DEPOSIT"/"WITHDRAW"), amount (number)
  const payload = {
    userId,
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

// ---------- Check Balance (TODO) ----------
// We haven't implemented a GET balance endpoint yet.
// Leaving this as a placeholder so your UI doesn't break.
// When Team B adds e.g. GET /users/{userId} or GET /balance?userId=...,
// update the fetch URL accordingly.
async function checkBalance() {
  alert("Balance lookup not implemented yet. Ask your teammate to add a GET endpoint (e.g., GET /users/{userId}).");
}
