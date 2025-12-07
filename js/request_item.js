/**
 * =========================================================
 * REQUEST_ITEM.JS - External Module
 * Version: 6.0 - EXTERNAL FILE APPROACH
 * =========================================================
 */

console.log('🚀 [REQUEST_ITEM.JS] Loading...');

(function() {
    'use strict';
    
    let debugLogs = [];
    let initialized = false;
    
    // ========================================
    // DEBUG UTILITIES
    // ========================================
    function log(message, data = null) {
        const time = new Date().toLocaleTimeString();
        const entry = `[${time}] ${message}`;
        debugLogs.push(entry);
        if (data) debugLogs.push(JSON.stringify(data, null, 2));
        
        console.log(`[REQUEST_ITEM] ${entry}`, data || '');
        
        const logDiv = document.getElementById('debugLog');
        if (logDiv) {
            logDiv.textContent = debugLogs.join('\n');
            logDiv.scrollTop = logDiv.scrollHeight;
        }
    }
    
    function openDebug() {
        const panel = document.getElementById('debugPanel');
        if (panel) panel.style.display = 'block';
    }
    
    function closeDebug() {
        const panel = document.getElementById('debugPanel');
        if (panel) panel.style.display = 'none';
    }
    
    // ========================================
    // API TEST
    // ========================================
    async function testAPI() {
        log('🔍 Testing API...');
        const resultDiv = document.getElementById('testResult');
        if (!resultDiv) return;
        
        resultDiv.innerHTML = '<p>⏳ Testing...</p>';
        
        try {
            const sessionRes = await fetch('api/auth.php?action=check_session');
            const sessionData = await sessionRes.json();
            
            if (!sessionData.logged_in) {
                resultDiv.innerHTML = '<p style="color:var(--danger);">❌ Not logged in!</p>';
                return;
            }
            
            const getRes = await fetch('api/suppliers.php?action=my_requests');
            const getData = await getRes.json();
            
            resultDiv.innerHTML = `
                <div style="background:#dcfce7; padding:10px; border-radius:4px;">
                    <p style="margin:0; color:#166534; font-weight:600;">✅ Connection OK!</p>
                    <p style="margin:5px 0 0 0; font-size:0.85rem; color:#166534;">
                        User: ${sessionData.user.username}<br>
                        Role: ${sessionData.user.role}<br>
                        Records: ${getData.data?.length || 0}
                    </p>
                </div>
            `;
            
        } catch (error) {
            log('❌ Test failed:', error);
            resultDiv.innerHTML = `<p style="color:var(--danger);">❌ ${error.message}</p>`;
        }
    }
    
    // ========================================
    // SUBMIT FORM
    // ========================================
    async function submitForm(event) {
        event.preventDefault();
        event.stopPropagation();
        
        log('📤 Form submit triggered');
        console.log('📤 [REQUEST_ITEM] SUBMIT CALLED');
        
        const submitBtn = document.getElementById('submitBtn');
        if (!submitBtn) {
            console.error('[REQUEST_ITEM] Submit button not found!');
            return false;
        }
        
        const originalText = submitBtn.textContent;
        
        const name = document.getElementById('supplierName')?.value.trim() || '';
        const contact = document.getElementById('supplierContact')?.value.trim() || '';
        const phone = document.getElementById('supplierPhone')?.value.trim() || '';
        const address = document.getElementById('supplierAddress')?.value.trim() || '';
        
        log('Form data:', { name, contact, phone, address });
        
        if (!name) {
            log('❌ Validation failed');
            alert('Nama Supplier wajib diisi!');
            return false;
        }
        
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Mengirim...';
        
        const payload = { name, contact_person: contact, phone, address };
        
        try {
            log('Sending POST...');
            
            const response = await fetch('api/suppliers.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            const text = await response.text();
            log('Response:', text.substring(0, 200));
            
            const data = JSON.parse(text);
            
            if (data.success) {
                log('✅ Success!');
                alert('✅ ' + data.message);
                document.getElementById('formRequestSupplier')?.reset();
                setTimeout(loadHistory, 1000);
            } else {
                log('❌ Failed:', data.message);
                alert('❌ ' + data.message);
            }
            
        } catch (error) {
            log('❌ Error:', error);
            alert('Error: ' + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
        
        return false;
    }
    
    // ========================================
    // LOAD HISTORY
    // ========================================
    async function loadHistory() {
        log('📋 Loading history');
        
        const container = document.getElementById('historyContainer');
        if (!container) return;
        
        container.innerHTML = '<p style="text-align:center;">⏳ Memuat...</p>';
        
        try {
            const response = await fetch('api/suppliers.php?action=my_requests');
            const data = await response.json();
            
            if (!data.success || data.data.length === 0) {
                container.innerHTML = '<p style="text-align:center; color:var(--muted);">Belum ada request.</p>';
                return;
            }
            
            let html = '<table class="table"><thead><tr>';
            html += '<th>ID</th><th>Nama</th><th>Kontak</th><th>Status</th><th>Tanggal</th></tr></thead><tbody>';
            
            data.data.forEach(req => {
                const badge = req.is_active == 1 
                    ? '<span class="badge badge-success">✅ APPROVED</span>'
                    : '<span class="badge badge-warning">⏳ PENDING</span>';
                
                html += `
                    <tr>
                        <td>${req.id}</td>
                        <td><strong>${req.name}</strong></td>
                        <td class="small">${req.contact_person || '-'}</td>
                        <td>${badge}</td>
                        <td>${req.created_at.substring(0, 16)}</td>
                    </tr>
                `;
            });
            
            html += '</tbody></table>';
            container.innerHTML = html;
            log('✅ History loaded');
            
        } catch (error) {
            log('❌ Load failed:', error);
            container.innerHTML = `<p style="color:var(--danger);">❌ ${error.message}</p>`;
        }
    }
    
    // ========================================
    // INITIALIZATION
    // ========================================
    function initialize() {
        if (initialized) {
            log('⚠️ Already initialized');
            return;
        }
        
        log('🔧 Initializing...');
        console.log('[REQUEST_ITEM] Initializing module...');
        
        const form = document.getElementById('formRequestSupplier');
        if (!form) {
            log('❌ Form not found!');
            console.error('[REQUEST_ITEM] CRITICAL: Form not found!');
            
            // Retry after delay
            setTimeout(() => {
                const retryForm = document.getElementById('formRequestSupplier');
                if (retryForm) {
                    console.log('[REQUEST_ITEM] Form found on retry, attaching...');
                    retryForm.addEventListener('submit', submitForm);
                    retryForm.onsubmit = submitForm;
                    initialized = true;
                    loadHistory();
                }
            }, 500);
            
            return;
        }
        
        log('✅ Form found');
        console.log('[REQUEST_ITEM] Form element:', form);
        
        // Triple attachment for safety
        form.addEventListener('submit', submitForm);
        form.onsubmit = submitForm;
        
        // Also attach to button directly
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.addEventListener('click', function(e) {
                if (form.checkValidity()) {
                    e.preventDefault();
                    submitForm(e);
                }
            });
        }
        
        log('✅ Event handlers attached');
        console.log('[REQUEST_ITEM] Submit handler:', form.onsubmit !== null);
        
        loadHistory();
        
        initialized = true;
        log('✅ Initialization complete');
        console.log('[REQUEST_ITEM] ✅ Module ready');
    }
    
    // ========================================
    // PUBLIC API
    // ========================================
    const RequestItemModule = {
        testAPI: testAPI,
        submitForm: submitForm,
        loadHistory: loadHistory,
        openDebug: openDebug,
        closeDebug: closeDebug,
        initialize: initialize
    };
    
    // Expose to global
    window.RequestItemPage = RequestItemModule;
    window.testAPIConnection = testAPI;
    window.submitSupplierForm = submitForm;
    window.loadHistory = loadHistory;
    window.refreshHistory = loadHistory;
    window.openDebugPanel = openDebug;
    window.closeDebugPanel = closeDebug;
    
    window.init_request_item = function() {
        console.log('[REQUEST_ITEM] init_request_item called');
        initialize();
    };
    
    console.log('✅ [REQUEST_ITEM.JS] Module loaded');
    console.log('[REQUEST_ITEM] Exposed:', Object.keys(window.RequestItemPage));
    
})();