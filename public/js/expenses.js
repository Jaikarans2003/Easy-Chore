// expenses.js - Client side expense management functions

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated
    firebase.auth().onAuthStateChanged(function(user) {
        if (!user) {
            // Redirect to login if not authenticated
            window.location.href = '/';
            return;
        }
        
        // Load home information
        loadHomeInfo();
        
        // Setup form submission if on add expense page
        const addExpenseForm = document.getElementById('add-expense-form');
        if (addExpenseForm) {
            addExpenseForm.addEventListener('submit', handleAddExpense);
        }
        
        // If on view expenses page, load expenses
        if (window.location.pathname.includes('view-expenses')) {
            loadExpenses();
        }
    });
});

// Load home information
function loadHomeInfo() {
    const homeId = localStorage.getItem('currentHomeId');
    
    if (!homeId) {
        // No home selected, redirect to create/join page
        window.location.href = '/create-join-home.html';
        return;
    }
    
    console.log('Loading home info for:', homeId);
    
    // Always fetch fresh data
    fetchHomeInfo(homeId);
}

// Function to display home information from data
function displayHomeInfo(homeData) {
    // Display home name
    const homeNameElement = document.getElementById('current-home-name');
    if (homeNameElement && homeData) {
        homeNameElement.textContent = homeData.name;
        console.log('Updated home name to:', homeData.name);
    } else {
        console.log('Could not update home name:', homeNameElement, homeData);
    }
    
    // If on add expense page, populate members dropdown
    if (window.location.pathname.includes('add-expense')) {
        console.log('On add expense page, populating members');
        if (homeData && homeData.members && Array.isArray(homeData.members)) {
            populateMembersDropdown(homeData.members);
        } else {
            console.error('Invalid members data:', homeData && homeData.members);
            showAlert('Failed to load member information', 'error');
        }
    }
}

// Function to fetch home info from the server
function fetchHomeInfo(homeId) {
    // Show loading state
    const homeNameElement = document.getElementById('current-home-name');
    if (homeNameElement) {
        homeNameElement.textContent = 'Loading...';
    }
    
    // Get current user token
    firebase.auth().currentUser.getIdToken()
        .then(token => {
            // Fetch home details
            return fetch(`/api/homes/${homeId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load home information');
            }
            return response.json();
        })
        .then(data => {
            if (data.home) {
                // Store in cache for future use
                HomeDataCache.storeHome(data.home);
                
                // Display the home info
                displayHomeInfo(data.home);
            } else {
                throw new Error('Invalid home data received');
            }
        })
        .catch(error => {
            console.error('Error loading home info:', error);
            showAlert('Failed to load home information', 'error');
        });
}

// Populate members dropdown and debtors
function populateMembersDropdown(members) {
    const payerSelect = document.getElementById('expense-payer');
    const debtorsContainer = document.getElementById('debtors-container');
    
    if (!payerSelect || !debtorsContainer) {
        console.error('Could not find payer select or debtors container');
        return;
    }
    
    // Clear previous options except the placeholder
    while (payerSelect.options.length > 1) {
        payerSelect.remove(1);
    }
    
    // Clear previous debtors
    debtorsContainer.innerHTML = '';
    
    // Add members to payer dropdown
    members.forEach(member => {
        const option = document.createElement('option');
        option.value = member.name;
        option.textContent = member.name;
        payerSelect.appendChild(option);
        
        // Add member to debtors list
        const debtorDiv = document.createElement('div');
        debtorDiv.className = 'debtor-item';
        debtorDiv.innerHTML = `
            <label class="checkbox-label">
                <input type="checkbox" name="debtor" value="${member.name}" checked>
                ${member.name}
            </label>
            <div class="amount-input custom-amount" style="display: none;">
                <span class="currency-symbol">$</span>
                <input type="number" name="amount-${member.name}" min="0.01" step="0.01">
            </div>
        `;
        debtorsContainer.appendChild(debtorDiv);
    });
    
    // Setup split type change handler
    const splitTypeSelect = document.getElementById('expense-split-type');
    if (splitTypeSelect) {
        splitTypeSelect.addEventListener('change', function() {
            const isCustomSplit = this.value === 'custom';
            const amountInputs = document.querySelectorAll('.custom-amount');
            
            amountInputs.forEach(input => {
                input.style.display = isCustomSplit ? 'flex' : 'none';
            });
        });
    }
}

// Handle adding a new expense
function handleAddExpense(e) {
    e.preventDefault();
    
    const payer = document.getElementById('expense-payer').value;
    const amount = parseFloat(document.getElementById('expense-amount').value);
    const reason = document.getElementById('expense-reason').value;
    const splitType = document.getElementById('expense-split-type').value;
    
    if (!payer || isNaN(amount) || amount <= 0 || !reason) {
        showAlert('Please fill in all required fields', 'error');
        return;
    }
    
    // Get selected debtors
    const debtorCheckboxes = document.querySelectorAll('input[name="debtor"]:checked');
    if (debtorCheckboxes.length === 0) {
        showAlert('Please select at least one person to split with', 'error');
        return;
    }
    
    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Saving...';
    submitBtn.disabled = true;
    
    // Get home ID
    const homeId = localStorage.getItem('currentHomeId');
    
    // Calculate shares based on split type
    const debtors = [];
    const selectedDebtors = Array.from(debtorCheckboxes).map(cb => cb.value);
    
    if (splitType === 'equal') {
        // Equal split among all selected debtors
        const perPersonAmount = amount / selectedDebtors.length;
        
        selectedDebtors.forEach(debtorName => {
            debtors.push({
                name: debtorName,
                amount: parseFloat(perPersonAmount.toFixed(2)),
                paid: debtorName === payer // Payer has already paid their share
            });
        });
    } else {
        // Custom split - get amounts from inputs
        selectedDebtors.forEach(debtorName => {
            const amountInput = document.querySelector(`input[name="amount-${debtorName}"]`);
            const debtorAmount = parseFloat(amountInput.value);
            
            if (isNaN(debtorAmount) || debtorAmount < 0) {
                showAlert(`Please enter a valid amount for ${debtorName}`, 'error');
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
                throw new Error('Invalid custom split amount');
            }
            
            debtors.push({
                name: debtorName,
                amount: parseFloat(debtorAmount.toFixed(2)),
                paid: debtorName === payer // Payer has already paid their share
            });
        });
        
        // Verify total matches the expense amount
        const totalSplit = debtors.reduce((sum, debtor) => sum + debtor.amount, 0);
        if (Math.abs(totalSplit - amount) > 0.01) { // Allow small rounding differences
            showAlert(`The sum of individual amounts ($${totalSplit.toFixed(2)}) does not match the total expense ($${amount.toFixed(2)})`, 'error');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            return;
        }
    }
    
    // Create expense data
    const expenseData = {
        homeId: homeId,
        payer: payer,
        amount: amount,
        reason: reason,
        splitType: splitType,
        debtors: debtors,
        date: new Date().toISOString()
    };
    
    // Get current user token
    firebase.auth().currentUser.getIdToken()
        .then(token => {
            // Create expense in backend
            return fetch('/api/expenses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(expenseData)
            });
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.message || 'Failed to add expense');
                });
            }
            return response.json();
        })
        .then(data => {
            // Show success message
            showAlert('Expense added successfully!', 'success');
            console.log('Expense created:', data.expense);
            
            // Reset form
            e.target.reset();
            
            // Reset button
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            
            // Redirect to view expenses page after a delay
            setTimeout(() => {
                window.location.href = 'view-expenses.html';
            }, 2000);
        })
        .catch(error => {
            console.error('Error adding expense:', error);
            showAlert('Failed to add expense. Please try again. Error: ' + error.message, 'error');
            
            // Reset button
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        });
}

// Load expenses for the view expenses page
function loadExpenses() {
    const homeId = localStorage.getItem('currentHomeId');
    const expensesList = document.getElementById('expenses-list');
    
    if (!homeId || !expensesList) {
        return;
    }
    
    // Show loading
    expensesList.innerHTML = '<li class="list-item loading">Loading expenses...</li>';
    
    // Get current user token
    firebase.auth().currentUser.getIdToken()
        .then(token => {
            // Fetch expenses
            return fetch(`/api/expenses/home/${homeId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load expenses');
            }
            return response.json();
        })
        .then(data => {
            // Clear loading
            expensesList.innerHTML = '';
            
            if (!data.expenses || data.expenses.length === 0) {
                expensesList.innerHTML = '<li class="list-item empty">No expenses found. Add your first expense!</li>';
                return;
            }
            
            console.log('Loaded expenses:', data.expenses);
            
            // Sort expenses by date (newest first)
            const sortedExpenses = [...data.expenses].sort((a, b) => 
                new Date(b.date) - new Date(a.date)
            );
            
            // Use the displayExpenses function instead of the inline code
            displayExpenses(sortedExpenses);
        })
        .catch(error => {
            console.error('Error loading expenses:', error);
            expensesList.innerHTML = '<li class="list-item error">Failed to load expenses. Please try again.</li>';
        });
}

// Show expense details modal
function showExpenseDetails(expense) {
    // Check if modal already exists, remove if it does
    let modal = document.getElementById('expense-details-modal');
    if (modal) {
        modal.remove();
    }
    
    // Create modal
    modal = document.createElement('div');
    modal.id = 'expense-details-modal';
    modal.className = 'modal';
    
    const expenseDate = new Date(expense.date);
    const formattedDate = expenseDate.toLocaleDateString();
    const formattedTime = expenseDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2>${expense.reason}</h2>
            <div class="expense-details">
                <p><strong>Paid by:</strong> ${expense.payer}</p>
                <p><strong>Date:</strong> ${formattedDate} at ${formattedTime}</p>
                <p><strong>Amount:</strong> $${expense.amount.toFixed(2)}</p>
                <p><strong>Split type:</strong> ${expense.splitType === 'equal' ? 'Equal Split' : 'Custom Split'}</p>
            </div>
            <h3>Split Details</h3>
            <ul class="modal-debtors-list">
                ${expense.debtors.map(debtor => `
                    <li>
                        <div class="debtor-info">
                            <span>${debtor.name}: $${debtor.amount.toFixed(2)}</span>
                            <span class="payment-status ${debtor.paid ? 'paid' : 'unpaid'}">
                                ${debtor.paid ? 'Paid' : 'Unpaid'}
                            </span>
                        </div>
                    </li>
                `).join('')}
            </ul>
        </div>
    `;
    
    // Add modal to the page
    document.body.appendChild(modal);
    
    // Show modal
    modal.style.display = 'block';
    
    // Add close functionality
    const closeBtn = modal.querySelector('.close');
    closeBtn.addEventListener('click', function() {
        modal.style.display = 'none';
    });
    
    // Close when clicking outside the modal
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Show alert message
function showAlert(message, type) {
    // Remove any existing alerts
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
    
    // Create new alert
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    
    // Add alert to the page
    const container = document.querySelector('.container');
    container.insertBefore(alertDiv, container.firstChild);
    
    // Remove alert after 3 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

// Display expenses in the UI
function displayExpenses(expenses) {
    const expensesList = document.getElementById('expenses-list');
    if (!expensesList) return;

    expensesList.innerHTML = '';
    
    expenses.forEach(expense => {
        const expenseCard = document.createElement('div');
        expenseCard.className = 'expense-card';
        expenseCard.innerHTML = `
            <div class="expense-header">
                <h3>${expense.reason}</h3>
                <div class="expense-actions">
                    ${canDeleteExpense(expense) ? `<button class="btn-icon delete-btn" onclick="deleteExpense('${expense._id}')" title="Delete Expense">
                        <i class="fas fa-trash"></i>
                    </button>` : ''}
                </div>
            </div>
            <p class="expense-details">
                Paid by: ${expense.payer}<br>
                Amount: $${expense.amount.toFixed(2)}<br>
                Date: ${new Date(expense.date).toLocaleDateString()}<br>
                Split Type: ${expense.splitType}
            </p>
            <div class="debtors-list">
                <h4>Debtors:</h4>
                <ul>
                    ${expense.debtors.map(debtor => `
                        <li>
                            ${debtor.name}: $${debtor.amount.toFixed(2)}
                            ${debtor.paid ? '<span class="paid-badge">Paid</span>' : ''}
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
        expensesList.appendChild(expenseCard);
    });
}

// Check if user can delete an expense
function canDeleteExpense(expense) {
    const homeData = HomeDataCache.getHome();
    if (!homeData) return false;
    
    const currentUser = firebase.auth().currentUser;
    if (!currentUser) return false;
    
    const userMember = homeData.members.find(member => member.uid === currentUser.uid);
    const isHomeCreator = homeData.createdBy === currentUser.uid;
    const isExpensePayer = userMember && userMember.name === expense.payer;
    
    return isHomeCreator || isExpensePayer;
}

// Delete an expense
async function deleteExpense(expenseId) {
    if (!confirm('Are you sure you want to delete this expense?')) {
        return;
    }
    
    try {
        const token = await firebase.auth().currentUser.getIdToken();
        const response = await fetch(`/api/expenses/${expenseId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete expense');
        }
        
        showAlert('Expense deleted successfully', 'success');
        loadExpenses(); // Reload the expenses list
    } catch (error) {
        console.error('Delete expense error:', error);
        showAlert(error.message || 'Failed to delete expense', 'error');
    }
}
