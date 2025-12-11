/**
 * =========================================================
 * OWNER_REPORT.JS - Monitoring and Reporting Module (FIXED RECURSION)
 * Dibuat sebagai file eksternal untuk memperbaiki Race Condition.
 * =========================================================
 */

console.log('📊 [OWNER_REPORT.JS] Loading...');

// State untuk menyimpan instance Chart agar tidak terjadi memory leak saat berganti tab
let chartInstance = null; 

/**
 * Fungsi utama (internal) untuk memuat dan merender laporan
 * @param {string} action - summary, inventory, atau history
 * @param {HTMLElement} sourceElement - Tombol yang diklik (untuk styling)
 */
async function _executeReportRender(action, sourceElement) {
    const contentDiv = document.getElementById('reportContent');
    const tabs = document.getElementById('reportTabs').querySelectorAll('button');
    
    // Reset tab styling
    tabs.forEach(btn => btn.classList.remove('primary'));
    if (sourceElement) {
        sourceElement.classList.add('primary'); 
    } else {
         // Jika dipanggil dari init (tanpa klik tombol), atur tombol pertama sebagai primary
         document.getElementById('reportTabs').querySelector('button:first-child').classList.add('primary');
    }
    
    // Hancurkan chart lama saat berganti tab
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }

    contentDiv.innerHTML = '<div class="card"><p>Memuat laporan...</p></div>';
    showLoadingModal(`Mengambil data ${action}...`);

    try {
        const response = await fetch(`api/report.php?action=${action}`);
        const data = await response.json();

        if (!data.success) {
            contentDiv.innerHTML = `<div class="card"><p class="small" style="color:var(--danger);">Gagal memuat laporan: ${data.message}</p></div>`;
            return;
        }

        // Panggil fungsi render spesifik
        if (action === 'summary') {
            renderSummary(data.data);
        } else if (action === 'inventory') {
            renderInventory(data.data);
        } else if (action === 'history') {
            renderHistory(data.data);
        }

    } catch (error) {
        contentDiv.innerHTML = `<div class="card"><p class="small" style="color:var(--danger);">Error jaringan: ${error.message}</p></div>`;
        console.error('Report fetch error:', error);
    } finally {
        hideLoadingModal();
    }
}

// ------------------------------------------------
// Renderer Laporan Ringkasan (Summary) - DENGAN CHART
// ------------------------------------------------
function renderSummary(stats) {
    const contentDiv = document.getElementById('reportContent');
    
    const chartLabels = ['Pending', 'Approved', 'Rejected'];
    const chartData = [
        stats.transactions.pending,
        stats.transactions.approved,
        stats.transactions.rejected
    ];

    let html = `
        <div class="card">
            <h3>Ringkasan Stok dan Aktivitas</h3>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:16px;">
                <div class="stat-box">
                    <div class="stat-label">Total Stok Semua Item</div>
                    <div class="stat-value">${stats.total_stock.toLocaleString()} Pcs</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Item Aktif Tercatat</div>
                    <div class="stat-value">${stats.total_items} Jenis</div>
                </div>
                <div class="stat-box warn">
                    <div class="stat-label">Item Stok Menipis (Low Stock)</div>
                    <div class="stat-value">${stats.low_stock} Item</div>
                </div>
                <div class="stat-box danger">
                    <div class="stat-label">Permintaan Item Baru PENDING</div>
                    <div class="stat-value">${stats.pending_items} Item</div>
                </div>
            </div>
        </div>
        
        <div class="card">
            <h3>Status Persetujuan Transaksi (Overview)</h3>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; align-items:center;">
                <div>
                    <div style="display:flex; gap:16px; flex-wrap:wrap;">
                        <div class="stat-box" style="background:var(--warning);">
                            <div class="stat-label">PENDING Approval</div>
                            <div class="stat-value">${stats.transactions.pending}</div>
                        </div>
                        <div class="stat-box success">
                            <div class="stat-label">Telah APPROVED</div>
                            <div class="stat-value">${stats.transactions.approved}</div>
                        </div>
                        <div class="stat-box danger">
                            <div class="stat-label">Telah REJECTED</div>
                            <div class="stat-value">${stats.transactions.rejected}</div>
                        </div>
                    </div>
                </div>
                <div style="max-width: 350px; margin: 0 auto;">
                    <canvas id="transactionChart"></canvas>
                </div>
            </div>
        </div>
    `;
    contentDiv.innerHTML = html;
    
    // Render Chart
    setTimeout(() => {
        const ctx = document.getElementById('transactionChart');
        // Check if Chart is available (from index.php)
        if (ctx && typeof Chart !== 'undefined') {
            
            if (chartInstance) {
                chartInstance.destroy();
            }
            
            chartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: chartLabels,
                    datasets: [{
                        label: 'Jumlah Transaksi',
                        data: chartData,
                        backgroundColor: ['#f59e0b', '#10b981', '#ef4444'],
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'right',
                        },
                        title: {
                            display: true,
                            text: 'Persentase Status Transaksi'
                        }
                    }
                }
            });
        }
    }, 100);
}

// ------------------------------------------------
// Renderer Laporan Inventaris Lengkap
// ------------------------------------------------
function renderInventory(inventory) {
    if (chartInstance) chartInstance.destroy();
    chartInstance = null;

    const contentDiv = document.getElementById('reportContent');
    let html = '<div class="card"><h3>Laporan Stok Per Klien & Item</h3>';
    
    if (inventory.length === 0) {
         html += '<p style="text-align:center; color:var(--muted);">Tidak ada data inventaris yang ditemukan.</p>';
         contentDiv.innerHTML = html;
         return;
    }

    html += '<table class="table"><thead><tr>';
    html += '<th>ID</th><th>SKU</th><th>Item</th><th>Unit</th><th>Stok Saat Ini</th><th>Stok Min</th><th>Klien Pemilik</th><th>Status</th>';
    html += '</tr></thead><tbody>';
    
    inventory.forEach(item => {
        const statusBadge = item.is_approved == 1 ? '<span class="badge badge-success">APPROVED</span>' : '<span class="badge badge-warning">PENDING</span>';
        const rowClass = item.current_stock <= item.min_stock && item.is_approved == 1 ? 'style="background-color:#ffe4e6;"' : '';

        html += `
            <tr ${rowClass}>
                <td>${item.id}</td>
                <td>${item.sku}</td>
                <td>${item.item_name}</td>
                <td>${item.unit}</td>
                <td><b>${item.current_stock}</b></td>
                <td>${item.min_stock}</td>
                <td>${item.supplier_name}</td>
                <td>${statusBadge}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    contentDiv.innerHTML = html;
}

// ------------------------------------------------
// Renderer Riwayat Transaksi
// ------------------------------------------------
function renderHistory(history) {
    if (chartInstance) chartInstance.destroy();
    chartInstance = null;
    
    const contentDiv = document.getElementById('reportContent');
    let html = '<div class="card"><h3>Riwayat Transaksi Mutasi Barang (50 Transaksi Terbaru)</h3>';

    if (history.length === 0) {
         html += '<p style="text-align:center; color:var(--muted);">Tidak ada riwayat transaksi yang ditemukan.</p>';
         contentDiv.innerHTML = html;
         return;
    }
    
    html += '<table class="table"><thead><tr>';
    html += '<th>Kode Trans</th><th>Tipe</th><th>Item (SKU)</th><th>Qty</th><th>Status</th><th>Requester</th><th>Approver</th><th>Tanggal Request</th>';
    html += '</tr></thead><tbody>';

    history.forEach(t => {
        const typeBadge = t.type === 'IN' ? '<span class="badge badge-in">MASUK</span>' : '<span class="badge badge-out">KELUAR</span>';
        let statusBadge;
        if (t.status === 'APPROVED') {
            statusBadge = '<span class="badge badge-success">APPROVED</span>';
        } else if (t.status === 'REJECTED') {
            statusBadge = '<span class="badge badge-danger">REJECTED</span>';
        } else {
            statusBadge = '<span class="badge badge-warning">PENDING</span>';
        }
        
        html += `
            <tr>
                <td>${t.transaction_code}</td>
                <td>${typeBadge}</td>
                <td>${t.item_name} (${t.sku})</td>
                <td>${t.quantity}</td>
                <td>${statusBadge}</td>
                <td>${t.requester}</td>
                <td>${t.approver ?? '-'}</td>
                <td>${t.request_date.substring(0, 10)}</td>
            </tr>
        `;
    });

    html += '</tbody></table></div>';
    contentDiv.innerHTML = html;
}

// Inisialisasi: Panggil laporan ringkasan saat halaman dimuat
window.init_owner_report = function() {
    console.log('🚀 Initializing Owner Report Page...');
    
    // Ambil elemen tombol pertama untuk inisialisasi status aktif
    const firstButton = document.getElementById('reportTabs').querySelector('button:first-child');
    
    // Panggil fungsi internal _executeReportRender
    _executeReportRender('summary', firstButton);
}

// Expose fungsi ke global scope agar bisa diakses oleh onclick
// Ini adalah fungsi yang dipanggil oleh tombol di HTML
window.renderReport = function(action, element) {
    // Panggil fungsi internal _executeReportRender
    _executeReportRender(action, element);
};