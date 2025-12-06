/**
 * =========================================================
 * HISTORY_TRANSAKSI.JS - TRANSACTION HISTORY MODULE
 * Version: 1.0 - Separated from notes.js
 * =========================================================
 */

// ========================================
// INIT HISTORY TRANSAKSI PAGE
// ========================================
function init_history_transaksi() {
    console.log('🚀 Init History Transaksi Page v1.0');
    loadNotaHistory();
}

// ========================================
// LOAD NOTA HISTORY
// ========================================
async function loadNotaHistory() {
    const historyDiv = document.getElementById('notaHistoryList');
    if (!historyDiv) {
        console.error('notaHistoryList div not found!');
        return;
    }
    
    historyDiv.innerHTML = '<p style="text-align:center;">⏳ Memuat riwayat...</p>';
    
    try {
        console.log('Fetching nota history...');
        const response = await fetch('api/report.php?action=history');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Nota history data:', data);
        
        if (!data.success || data.data.length === 0) {
            historyDiv.innerHTML = '<p style="text-align:center; color:var(--muted);">Tidak ada nota transaksi yang sudah approved.</p>';
            return;
        }
        
        // Filter hanya APPROVED
        const approvedTransactions = data.data.filter(t => t.status === 'APPROVED');
        
        if (approvedTransactions.length === 0) {
            historyDiv.innerHTML = '<p style="text-align:center; color:var(--muted);">Belum ada transaksi yang approved.</p>';
            return;
        }
        
        let html = '<table class="table"><thead><tr>';
        html += '<th>No Nota</th><th>Type</th><th>Kode</th><th>Item</th><th>Qty</th><th>Disetujui</th><th>Waktu</th><th>QR Code</th><th>Verifikasi</th></tr></thead><tbody>';
        
        approvedTransactions.forEach(t => {
            const notaNumber = `NOTE-${Date.now() + Math.floor(Math.random() * 1000)}`;
            const typeBadge = t.type === 'IN' ? '<span class="badge badge-in">MASUK</span>' : '<span class="badge badge-out">KELUAR</span>';
            const qrId = `qr-${t.id}`;
            
            html += `
                <tr>
                    <td>${notaNumber.substring(0, 18)}...</td>
                    <td>${typeBadge}</td>
                    <td><b>${t.transaction_code}</b></td>
                    <td>${t.item_name} (${t.sku})</td>
                    <td>${t.quantity}</td>
                    <td>${t.approver || 'System'}</td>
                    <td>${t.approval_date ? t.approval_date.substring(0, 16) : '-'}</td>
                    <td>
                        <div id="${qrId}" style="display:inline-block;"></div>
                    </td>
                    <td>
                        <button class="btn primary btn-sm" onclick="quickVerifyTransaction('${t.transaction_code}')">🔍 Verify</button>
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        historyDiv.innerHTML = html;
        
        // Generate QR Codes setelah HTML dimuat
        setTimeout(() => {
            approvedTransactions.forEach(t => {
                const qrId = `qr-${t.id}`;
                const qrDiv = document.getElementById(qrId);
                if (qrDiv && typeof QRCode !== 'undefined') {
                    const qrData = `TXN-${t.transaction_code}|STATUS-APPROVED`;
                    new QRCode(qrDiv, {
                        text: qrData,
                        width: 60,
                        height: 60
                    });
                }
            });
            console.log('✅ QR Codes generated');
        }, 100);
        
    } catch (error) {
        console.error('Load nota history error:', error);
        historyDiv.innerHTML = `
            <div class="card">
                <p style="color:var(--danger);">Error: ${error.message}</p>
                <button class="btn primary btn-sm" onclick="loadNotaHistory()">🔄 Coba Lagi</button>
            </div>
        `;
    }
}

// ========================================
// VERIFY TRANSACTION QR
// ========================================
async function verifyTransactionQr() {
    const txnCode = document.getElementById('verifyTxnCode').value.trim();
    const resultDiv = document.getElementById('verificationResult');
    
    if (!txnCode) {
        resultDiv.textContent = '⚠️ Masukkan kode transaksi!';
        resultDiv.style.color = 'var(--warning)';
        return;
    }

    console.log('🔍 Verifying transaction:', txnCode);
    showLoadingModal('Memverifikasi...');
    
    try {
        const response = await fetch(`api/report.php?action=history`);
        const data = await response.json();

        if (!data.success) {
            resultDiv.textContent = '❌ Gagal mengambil data.';
            resultDiv.style.color = 'var(--danger)';
            return;
        }
        
        const transaction = data.data.find(t => t.transaction_code === txnCode);
        
        if (transaction && transaction.status === 'APPROVED') {
            resultDiv.innerHTML = `✅ <strong>VERIFIKASI BERHASIL!</strong><br>
                <span class="small">Kode: ${transaction.transaction_code} (${transaction.type}) | Item: ${transaction.item_name}<br>
                Status: ${transaction.status} | Disetujui: ${transaction.approver}</span>`;
            resultDiv.style.color = 'var(--success)';
            console.log('✅ Verification successful');
        } else if (transaction) {
            resultDiv.innerHTML = `⚠️ Transaksi ditemukan tapi status: ${transaction.status}`;
            resultDiv.style.color = 'var(--warning)';
            console.log('⚠️ Transaction found but not approved');
        } else {
            resultDiv.textContent = '❌ Kode transaksi tidak ditemukan.';
            resultDiv.style.color = 'var(--danger)';
            console.log('❌ Transaction not found');
        }
        
    } catch (error) {
        console.error('Verify error:', error);
        resultDiv.textContent = '❌ Error: ' + error.message;
        resultDiv.style.color = 'var(--danger)';
    } finally {
        hideLoadingModal();
    }
}

// Quick verify from table
function quickVerifyTransaction(txnCode) {
    console.log('⚡ Quick verify:', txnCode);
    document.getElementById('verifyTxnCode').value = txnCode;
    verifyTransactionQr();
}

// ========================================
// EXPOSE TO GLOBAL
// ========================================
window.init_history_transaksi = init_history_transaksi;
window.loadNotaHistory = loadNotaHistory;
window.verifyTransactionQr = verifyTransactionQr;
window.quickVerifyTransaction = quickVerifyTransaction;

console.log('✅ History Transaksi Module v1.0 loaded');