/**
 * =========================================================
 * APPROVAL.JS - APPROVAL MODULE
 * Menangani logika Supervisor untuk menyetujui transaksi dan master data baru.
 * =========================================================
 */

/* init_approval - Approval Transaksi */
function init_approval(){
    // loadApprovalData() diasumsikan ada di sini atau di file yang dimuat sebelumnya
    loadApprovalData('transactions'); 
}

/* init_approval_items - Approval Item/Supplier Baru */
function init_approval_items(){
    const content = document.getElementById('content');
    if (!document.getElementById('itemApprovalTabs')) {
         content.innerHTML = `
            <div class="card">
                <h2>✅ Approval Item & Klien Baru</h2>
                <p class="small">Supervisor menyetujui Item dan Klien yang diajukan Staff agar dapat digunakan dalam transaksi.</p>
            </div>
            <div class="menu" id="itemApprovalTabs">
                <button class="btn primary" onclick="renderItemApprovalContent('items', this)">Permintaan Item Baru</button>
                <button class="btn" onclick="renderItemApprovalContent('suppliers', this)">Permintaan Klien/Supplier Baru</button>
            </div>
            <div id="approvalItemsList"></div>
        `;
    }
    renderItemApprovalContent('items', document.querySelector('#itemApprovalTabs button:first-child'));
}

/**
 * Merender konten spesifik di halaman approval_items.php
 */
function renderItemApprovalContent(type, element) {
    const tabs = document.getElementById('itemApprovalTabs').querySelectorAll('button');
    tabs.forEach(btn => btn.className = 'btn');
    element.className = 'btn primary';

    // loadApprovalData() diasumsikan ada di sini atau di file yang dimuat sebelumnya
    loadApprovalData(type);
}

// Expose init functions and helpers
window.init_approval = init_approval;
window.init_approval_items = init_approval_items;
window.renderItemApprovalContent = renderItemApprovalContent;

// Catatan: Anda perlu mendefinisikan fungsi loadApprovalData dan handleApprovalAction (jika belum) 
// di file ini atau di file lain yang dimuat (misalnya utils.js)