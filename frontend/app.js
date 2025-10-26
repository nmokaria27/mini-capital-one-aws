// API Gateway endpoints - UPDATE THESE AFTER DEPLOYMENT
const API_ENDPOINTS = {
    createUser: 'YOUR_API_GATEWAY_URL/createUser',
    transaction: 'YOUR_API_GATEWAY_URL/transaction',
    getBalance: 'YOUR_API_GATEWAY_URL/getBalance'
};

// Handle User Registration
document.getElementById('registrationForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const userData = {
        fullName: document.getElementById('fullName').value,
        dob: document.getElementById('dob').value,
        email: document.getElementById('email').value,
        initialBalance: parseFloat(document.getElementById('initialBalance').value)
    };

    try {
        const response = await fetch(API_ENDPOINTS.createUser, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });

        const result = await response.json();
        
        if (response.ok) {
            alert(`Account created successfully! Your User ID: ${result.userId}`);
            document.getElementById('registrationForm').reset();
        } else {
            alert('Error creating account: ' + result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to create account. Please try again.');
    }
});

// Handle Transactions
document.getElementById('transactionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const transactionData = {
        userId: document.getElementById('userId').value,
        transactionType: document.getElementById('transactionType').value,
        amount: parseFloat(document.getElementById('amount').value)
    };

    try {
        const response = await fetch(API_ENDPOINTS.transaction, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(transactionData)
        });

        const result = await response.json();
        
        if (response.ok) {
            alert(`Transaction successful! New balance: $${result.newBalance}`);
            document.getElementById('transactionForm').reset();
        } else {
            alert('Transaction failed: ' + result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Transaction failed. Please try again.');
    }
});

// Check Balance
async function checkBalance() {
    const userId = document.getElementById('balanceUserId').value;
    
    if (!userId) {
        alert('Please enter a User ID');
        return;
    }

    try {
        const response = await fetch(`${API_ENDPOINTS.getBalance}?userId=${userId}`);
        const result = await response.json();
        
        if (response.ok) {
            document.getElementById('balanceDisplay').innerHTML = `
                <strong>Account Balance:</strong> $${result.balance.toFixed(2)}<br>
                <strong>Account Holder:</strong> ${result.fullName}
            `;
        } else {
            document.getElementById('balanceDisplay').innerHTML = 
                `<span style="color: red;">Error: ${result.message}</span>`;
        }
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('balanceDisplay').innerHTML = 
            '<span style="color: red;">Failed to fetch balance</span>';
    }
}
