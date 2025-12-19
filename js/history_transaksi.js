/**
 * =========================================================
 * HISTORY_TRANSAKSI.JS - FIXED & COMPLETE v5.1
 * Features: 
 * - Integrated PDF Generator
 * - Restore VERIFY BUTTON
 * =========================================================
 */

console.log('📋 [HISTORY_TRANSAKSI v5.1] Loading Complete Version...');

(function() {
    'use strict';
    
    let allTransactionHistory = [];

    // ========================================
    // INIT
    // ========================================
    function init_history_transaksi() {
        console.log('🚀 Init History Transaksi');
        loadNotaHistory();
    }

    // ========================================
    // LOAD DATA
    // ========================================
    async function loadNotaHistory() {
        const historyDiv = document.getElementById('notaHistoryList');
        if (!historyDiv) return;
        
        historyDiv.innerHTML = '<p style="text-align:center;">⏳ Memuat riwayat...</p>';
        
        try {
            const response = await fetch('api/report.php?action=history');
            const data = await response.json();
            
            if (!data.success || !data.data || data.data.length === 0) {
                historyDiv.innerHTML = '<p style="text-align:center; color:var(--muted);">Belum ada riwayat transaksi approved.</p>';
                return;
            }
            
            // Filter hanya yang APPROVED
            allTransactionHistory = data.data.filter(t => t.status === 'APPROVED');
            renderNotaTable();
            
        } catch (error) {
            console.error('Load history error:', error);
            historyDiv.innerHTML = `<p style="color:var(--danger);">❌ Error: ${error.message}</p>`;
        }
    }

    // ========================================
    // RENDER TABLE
    // ========================================
    function renderNotaTable() {
        const historyDiv = document.getElementById('notaHistoryList');
        
        let html = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <div>
                    <h3 style="margin: 0;">📦 Riwayat Nota Resmi</h3>
                    <p class="small" style="margin: 5px 0 0 0;">Total: <strong>${allTransactionHistory.length}</strong> transaksi</p>
                </div>
                <div style="display: flex; gap: 8px;">
                    <input type="text" id="searchNota" placeholder="🔍 Cari kode/item..." 
                           style="max-width: 200px; padding: 5px 10px;" oninput="window.filterNotaTable()">
                </div>
            </div>
            <table class="table">
                <thead>
                    <tr>
                        <th>Kode</th>
                        <th>Tipe</th>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Approval</th>
                        <th>Status</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody id="notaTableBody">
        `;
        
        allTransactionHistory.forEach(t => {
            html += renderNotaRow(t);
        });
        
        html += '</tbody></table>';
        historyDiv.innerHTML = html;
    }

    // ========================================
    // RENDER ROW (TOMBOL VERIFY KEMBALI DI SINI)
    // ========================================
    function renderNotaRow(t) {
        const typeBadge = t.type === 'IN' 
            ? '<span class="badge badge-in">⬇️ MASUK</span>' 
            : '<span class="badge badge-out">⬆️ KELUAR</span>';
        
        // Cek apakah punya hash signature
        const hasHash = !!t.nota_hash;
        const securityBadge = hasHash 
            ? '<span class="badge" style="background:#10b981; color:white;">🔐 Sealed</span>'
            : '<span class="badge" style="background:#f59e0b; color:white;">⚠️ Legacy</span>';

        const safeCode = SecurityUtils.escapeHtml(t.transaction_code);
        const safeItem = SecurityUtils.escapeHtml(t.item_name);
        const safeQty = SecurityUtils.escapeHtml(t.quantity);
        const safeUnit = SecurityUtils.escapeHtml(t.unit || 'pcs');

        return `
            <tr>
                <td><strong>${safeCode}</strong></td>
                <td>${typeBadge}</td>
                <td>${safeItem}</td>
                <td>${safeQty} ${safeUnit}</td>
                <td>${t.approval_date ? t.approval_date.substring(0, 16) : '-'}</td>
                <td>${securityBadge}</td>
                <td>
                    <div style="display:flex; gap:4px;">
                        <button class="btn primary btn-sm" onclick='window.viewNotaDetail(${JSON.stringify(t).replace(/'/g, "&#39;")})' title="Lihat Detail">
                            👁️
                        </button>
                        <button class="btn success btn-sm" onclick='window.generateNotaPDF(${JSON.stringify(t).replace(/'/g, "&#39;")})' title="Download PDF">
                            📄
                        </button>
                        ${hasHash ? `
                            <button class="btn btn-sm" style="background:#6366f1; color:white;" onclick="window.verifyNotaHash('${safeCode}')" title="Verifikasi Hash Database">
                                🔍 Verify
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }

    // ========================================
    // FILTER
    // ========================================
    function filterNotaTable() {
        const query = document.getElementById('searchNota').value.toLowerCase();
        const tbody = document.getElementById('notaTableBody');
        if (!tbody) return;

        const filtered = allTransactionHistory.filter(t => 
            t.transaction_code.toLowerCase().includes(query) ||
            t.item_name.toLowerCase().includes(query)
        );
        tbody.innerHTML = filtered.map(t => renderNotaRow(t)).join('');
    }

    // ========================================
    // VIEW DETAIL
    // ========================================
    function viewNotaDetail(t) {
        const detailHtml = `
            <table class="table">
                <tr><td>Kode</td><td><strong>${t.transaction_code}</strong></td></tr>
                <tr><td>Item</td><td>${t.item_name}</td></tr>
                <tr><td>Jumlah</td><td>${t.quantity} ${t.unit}</td></tr>
                <tr><td>Status</td><td>${t.status}</td></tr>
                <tr><td>Requester</td><td>${t.requester_name || t.requester}</td></tr>
                <tr><td>Approver</td><td>${t.approver_name || t.approver}</td></tr>
                <tr><td>Hash</td><td style="word-break:break-all; font-family:monospace; font-size:10px;">${t.nota_hash || '-'}</td></tr>
            </table>
            <div style="margin-top:15px; text-align:center; display:flex; gap:10px; justify-content:center;">
                <button class="btn success" onclick='window.generateNotaPDF(${JSON.stringify(t).replace(/'/g, "&#39;")})'>
                    📄 PDF
                </button>
                ${t.nota_hash ? `
                    <button class="btn" style="background:#6366f1; color:white;" onclick="window.verifyNotaHash('${t.transaction_code}')">
                        🔍 Audit Forensik
                    </button>
                ` : ''}
            </div>
        `;
        showMessageModal('Detail Transaksi', detailHtml, false);
    }

    // ========================================
    // LOGIC VERIFIKASI (YANG HILANG TADI)
    // ========================================
    async function verifyNotaHash(transactionCode) {
        showMessageModal('Verifikasi', '⏳ Melakukan Audit Forensik...', false);
        
        try {
            const response = await fetch(`api/verify.php?code=${transactionCode}`);
            const result = await response.json();
            
            if (result.status === 'VALID') {
                showMessageModal('✅ DATA VALID', 
                    `<div style="text-align:left;">
                        <div style="background:#dcfce7; padding:10px; border-radius:6px; color:#166534; margin-bottom:10px;">
                            ✅ <strong>Integritas Terjamin</strong><br>
                            Data database COCOK dengan Hash Signature.
                        </div>
                        <p class="small">Hash: <code>${result.data.hash.substring(0, 20)}...</code></p>
                    </div>`, false);
            } else {
                showMessageModal('🚨 BAHAYA!', 
                    `<div style="text-align:left;">
                        <div style="background:#fee2e2; padding:10px; border-radius:6px; color:#991b1b; margin-bottom:10px;">
                            ❌ <strong>TAMPERING DETECTED!</strong><br>
                            Data telah diubah secara ilegal!
                        </div>
                        <p>Forensik: ${result.data.forensic_report ? result.data.forensic_report.join(', ') : 'Unknown'}</p>
                    </div>`, false);
            }
        } catch (error) {
            showMessageModal('Error', 'Gagal verifikasi: ' + error.message, false);
        }
    }

    // ========================================
    // PDF GENERATION (Tetap via Shared Module)
    // ========================================
    function generateNotaPDF(transaction) {
        if (typeof window.generateSecureNotaPDF === 'function') {
            showLoadingModal('Mencetak Nota...');
            window.generateSecureNotaPDF(transaction, 
                () => hideLoadingModal(), 
                (err) => { hideLoadingModal(); alert(err.message); }
            );
        } else {
            alert('Error: pdf_generator.js not loaded');
        }
    }

    // Expose Global
    window.init_history_transaksi = init_history_transaksi;
    window.loadNotaHistory = loadNotaHistory;
    window.filterNotaTable = filterNotaTable;
    window.viewNotaDetail = viewNotaDetail;
    window.generateNotaPDF = generateNotaPDF;
    window.verifyNotaHash = verifyNotaHash;

    console.log('✅ History Transaksi v5.1 Loaded');
})();