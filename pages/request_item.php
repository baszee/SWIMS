<div class="card">
    <div style="display: flex; align-items: center; margin-bottom: 5px;">
        <h2 style="margin: 0; display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.5rem;">🔗</span> Request Klien/Supplier Baru
        </h2>
    </div>
    <p class="small">Jika Klien/PT pemilik barang belum terdaftar di sistem, ajukan pendaftarannya di sini. Klien baru akan masuk status **PENDING** sampai disetujui Supervisor.</p>
</div>

<!-- DEBUG INFO -->
<div id="debugPanel" class="card" style="background:#fff3cd; border-color:#ffc107; display:none;">
    <h4 style="margin-top:0; color:#856404;">🔍 Debug Console</h4>
    <pre id="debugLog" style="background:#fff; padding:10px; border-radius:4px; font-size:0.85rem; max-height:200px; overflow:auto;"></pre>
    <button class="btn btn-sm" onclick="document.getElementById('debugPanel').style.display='none'">Close</button>
</div>

<!-- Form Pengajuan Klien/Supplier Baru -->
<div class="card">
    <h3>Form Pengajuan Klien/Supplier</h3>
    <form id="formRequestSupplier">
        <label>Nama Klien/PT <span style="color:red;">*</span></label>
        <input type="text" id="reqSupplierName" required placeholder="Contoh: PT Samsung Indonesia">
        
        <label>Nama Kontak Person</label>
        <input type="text" id="reqSupplierContact" placeholder="Opsional: Nama kontak">
        
        <label>Nomor Telepon</label>
        <input type="text" id="reqSupplierPhone" placeholder="Opsional: 0812xxxxxx">

        <label>Alamat Lengkap</label>
        <textarea id="reqSupplierAddress" rows="3" placeholder="Alamat Gudang / Kantor Klien"></textarea>
        
        <button type="submit" class="btn primary" style="width:100%; margin-top:20px;">
            <span id="btnText">Kirim Request Klien</span>
        </button>
        <button type="button" class="btn btn-sm" onclick="showDebugPanel()" style="margin-top:10px;">
            🔍 Show Debug Info
        </button>
    </form>
    
    <div class="card" style="margin-top:16px;background:#dbeafe;border-color:#3b82f6;">
        <h4 style="margin-top:0;">ℹ️ Informasi</h4>
        <p class="small" style="color:#1e3a8a;margin:0;">
            Setelah mengirim request, Supervisor akan mereview dan menyetujui. Anda dapat memantau status di tabel Riwayat Request di bawah.
        </p>
    </div>
</div>

<!-- Tabel Riwayat Request Saya -->
<div class="card">
    <div style="display: flex; justify-content: space-between; align-items: center;">
        <h3>Riwayat Request Saya</h3>
        <button class="btn btn-sm" onclick="loadRequestHistory()">🔄 Refresh</button>
    </div>
    <p class="small">Status pengajuan Klien/Supplier yang pernah Anda buat.</p>
    <div id="requestHistoryPanel">
        <p>Memuat riwayat...</p>
    </div>
</div>

<script>
console.log('='.repeat(60));
console.log('🚀 REQUEST ITEM PAGE v2.0 - DEBUG MODE');
console.log('='.repeat(60));

let debugLogs = [];

function addDebugLog(message, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    debugLogs.push(logEntry);
    if (data) {
        debugLogs.push(JSON.stringify(data, null, 2));
    }
    console.log(logEntry, data || '');
}

function showDebugPanel() {
    const debugPanel = document.getElementById('debugPanel');
    const debugLog = document.getElementById('debugLog');
    debugLog.textContent = debugLogs.join('\n');
    debugPanel.style.display = 'block';
}

// ========================================
// HANDLER: Submit Request Supplier
// ========================================
async function handleSupplierRequest(e) {
    e.preventDefault();
    
    addDebugLog('📤 Form submit triggered');
    
    const form = document.getElementById('formRequestSupplier');
    const btnText = document.getElementById('btnText');
    const submitBtn = form.querySelector('button[type="submit"]');
    
    // Ambil data form
    const name = document.getElementById('reqSupplierName').value.trim();
    const contact = document.getElementById('reqSupplierContact').value.trim();
    const phone = document.getElementById('reqSupplierPhone').value.trim();
    const address = document.getElementById('reqSupplierAddress').value.trim();
    
    addDebugLog('📋 Form data:', { name, contact, phone, address });
    
    // Validasi minimal
    if (!name) {
        showMessageModal('Validasi', 'Nama Klien/Supplier wajib diisi!', false);
        addDebugLog('❌ Validation failed: Name is empty');
        return;
    }
    
    // Disable button
    submitBtn.disabled = true;
    btnText.textContent = 'Mengirim...';
    
    const payload = {
        name: name,
        contact_person: contact,
        phone: phone,
        address: address
    };
    
    addDebugLog('📦 Payload prepared:', payload);
    
    try {
        addDebugLog('🌐 Sending POST to api/suppliers.php');
        
        const response = await fetch('api/suppliers.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        addDebugLog('📡 Response received:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            addDebugLog('❌ Response not OK:', errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        addDebugLog('✅ Response parsed:', data);
        
        if (data.success) {
            showMessageModal('✅ Sukses!', data.message, false);
            addDebugLog('✅ Request successful!');
            form.reset();
            
            // Reload history setelah 1 detik
            setTimeout(() => {
                addDebugLog('🔄 Reloading history...');
                loadRequestHistory();
            }, 1000);
        } else {
            showMessageModal('❌ Gagal!', data.message, false);
            addDebugLog('❌ Request failed:', data.message);
        }
    } catch (error) {
        addDebugLog('❌ CRITICAL ERROR:', {
            message: error.message,
            stack: error.stack
        });
        console.error('Request error:', error);
        showMessageModal('Error Jaringan', 'Gagal terhubung ke server: ' + error.message, false);
    } finally {
        // Re-enable button
        submitBtn.disabled = false;
        btnText.textContent = 'Kirim Request Klien';
        addDebugLog('🔓 Button re-enabled');
    }
}

// ========================================
// FUNCTION: Load Request History
// ========================================
async function loadRequestHistory() {
    addDebugLog('📋 loadRequestHistory() called');
    
    const historyDiv = document.getElementById('requestHistoryPanel');
    const user = currentUser();
    
    addDebugLog('👤 Current user:', user);
    
    if (!user) {
        historyDiv.innerHTML = '<p class="small" style="color:var(--danger);">❌ User tidak terdeteksi. Silakan login ulang.</p>';
        addDebugLog('❌ No user found in session!');
        return;
    }
    
    historyDiv.innerHTML = '<p style="text-align:center;"><em>⏳ Memuat riwayat...</em></p>';
    
    try {
        const endpoint = 'api/suppliers.php?action=my_requests';
        addDebugLog('🌐 Fetching from: ' + endpoint);
        
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        
        addDebugLog('📡 Response:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            addDebugLog('❌ Response error text:', errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        addDebugLog('✅ History data received:', data);

        if (!data.success) {
            historyDiv.innerHTML = `<p class="small" style="color:var(--danger);">❌ Gagal memuat riwayat: ${data.message}</p>`;
            addDebugLog('❌ API returned success=false:', data.message);
            return;
        }

        if (data.data.length === 0) {
            historyDiv.innerHTML = `
                <div style="text-align:center; padding:20px;">
                    <p style="font-size:3rem; margin:0;">📦</p>
                    <p style="color:var(--muted);">Anda belum pernah mengajukan Klien/Supplier baru.</p>
                </div>
            `;
            addDebugLog('ℹ️ No history records found');
            return;
        }

        addDebugLog('✅ Found ' + data.data.length + ' history records');

        let tableHtml = '<table class="table"><thead><tr>';
        tableHtml += '<th>ID</th><th>Nama Klien/PT</th><th>Kontak</th><th>Status</th><th>Diajukan</th></tr></thead><tbody>';
        
        data.data.forEach(req => {
            let statusBadge;
            if (req.is_active == 1) {
                statusBadge = '<span class="badge badge-success">✅ APPROVED</span>';
            } else {
                statusBadge = '<span class="badge badge-warning">⏳ PENDING</span>';
            }
            
            tableHtml += `
                <tr>
                    <td>${req.id}</td>
                    <td><strong>${req.name}</strong></td>
                    <td class="small">${req.contact_person || '-'}<br>${req.phone || '-'}</td>
                    <td>${statusBadge}</td>
                    <td>${req.created_at ? req.created_at.substring(0, 16) : '-'}</td>
                </tr>
            `;
        });

        tableHtml += '</tbody></table>';
        historyDiv.innerHTML = tableHtml;
        
        addDebugLog('✅ History table rendered successfully');

    } catch (error) {
        addDebugLog('❌ CRITICAL ERROR in loadRequestHistory:', {
            message: error.message,
            stack: error.stack
        });
        
        console.error('History load error:', error);
        
        historyDiv.innerHTML = `
            <div class="card" style="background:#fee2e2; border-color:#ef4444; padding:20px;">
                <h4 style="color:#991b1b; margin-top:0;">❌ Error Memuat History</h4>
                <p style="color:#7f1d1d; margin-bottom:15px;">
                    <strong>Error:</strong> ${error.message}
                </p>
                <details style="background:#fff; padding:10px; border-radius:4px; margin-bottom:15px;">
                    <summary style="cursor:pointer; font-weight:600; color:#991b1b;">Technical Details</summary>
                    <pre style="margin-top:10px; font-size:0.85rem; overflow:auto;">${error.stack || 'No stack trace available'}</pre>
                </details>
                <div style="background:#fff3cd; padding:10px; border-radius:4px; margin-bottom:15px;">
                    <h5 style="margin-top:0; color:#856404;">🔧 Kemungkinan Penyebab:</h5>
                    <ul class="small" style="margin:0; color:#856404;">
                        <li>File <code>api/suppliers.php</code> tidak ditemukan</li>
                        <li>Endpoint <code>?action=my_requests</code> tidak tersedia</li>
                        <li>Session expired atau user tidak terautentikasi</li>
                        <li>WAMP/XAMPP tidak running</li>
                        <li>Database connection error</li>
                    </ul>
                </div>
                <div style="display:flex; gap:10px;">
                    <button class="btn primary btn-sm" onclick="loadRequestHistory()">🔄 Coba Lagi</button>
                    <button class="btn btn-sm" onclick="showDebugPanel()">🔍 Show Debug Log</button>
                </div>
            </div>
        `;
    }
}

// ========================================
// INIT FUNCTION
// ========================================
window.init_request_item = function() {
    console.log('='.repeat(60));
    console.log('🚀 INITIALIZING REQUEST ITEM PAGE');
    console.log('='.repeat(60));
    
    addDebugLog('🔧 init_request_item() called');
    
    // Check current user
    const user = currentUser();
    addDebugLog('👤 Current user check:', user);
    
    if (!user) {
        addDebugLog('❌ No user found! Redirecting to login...');
        showMessageModal('Session Expired', 'Silakan login kembali.', false);
        setTimeout(() => loadPage('login'), 2000);
        return;
    }
    
    addDebugLog('✅ User authenticated:', {
        username: user.username,
        role: user.role
    });
    
    // Setup Submit Handler
    const form = document.getElementById('formRequestSupplier');
    if (form) {
        form.onsubmit = handleSupplierRequest;
        addDebugLog('✅ Form submit handler attached');
    } else {
        addDebugLog('❌ Form element not found!');
        console.error('Form #formRequestSupplier not found!');
    }
    
    // Load history
    addDebugLog('📋 Loading request history...');
    loadRequestHistory();
    
    addDebugLog('✅ Initialization complete');
    console.log('✅ Request Item page initialized');
}

// Expose to global
window.loadRequestHistory = loadRequestHistory;
window.showDebugPanel = showDebugPanel;

console.log('✅ Request Item Module v2.0 loaded');
</script>