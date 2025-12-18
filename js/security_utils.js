/**
 * =========================================================
 * SECURITY UTILS - XSS Protection Module
 * File: js/security_utils.js
 * Purpose: Sanitize user input untuk mencegah XSS attack
 * =========================================================
 */

(function(window) {
    'use strict';
    
    /**
     * Escape HTML special characters untuk mencegah XSS
     * Contoh: "<script>alert('xss')</script>" → "&lt;script&gt;alert('xss')&lt;/script&gt;"
     */
    function escapeHtml(text) {
        if (text === null || text === undefined) {
            return '';
        }
        
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;',
            '/': '&#x2F;'
        };
        
        return String(text).replace(/[&<>"'\/]/g, function(char) {
            return map[char];
        });
    }
    
    /**
     * Sanitize object - escape semua string properties
     * Berguna untuk sanitize data dari API sebelum render
     */
    function sanitizeObject(obj) {
        if (typeof obj !== 'object' || obj === null) {
            return obj;
        }
        
        const sanitized = Array.isArray(obj) ? [] : {};
        
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                const value = obj[key];
                
                if (typeof value === 'string') {
                    sanitized[key] = escapeHtml(value);
                } else if (typeof value === 'object') {
                    sanitized[key] = sanitizeObject(value); // Recursive untuk nested object
                } else {
                    sanitized[key] = value; // Number, boolean, dll tidak perlu escape
                }
            }
        }
        
        return sanitized;
    }
    
    /**
     * Strip HTML tags completely
     * Contoh: "<b>Hello</b> <script>alert(1)</script>" → "Hello alert(1)"
     */
    function stripHtml(html) {
        const tmp = document.createElement('DIV');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    }
    
    /**
     * Validate URL untuk mencegah javascript: protocol
     */
    function sanitizeUrl(url) {
        if (!url) return '';
        
        const urlStr = String(url).trim();
        
        // Block dangerous protocols
        if (urlStr.match(/^(javascript|data|vbscript):/i)) {
            return '#'; // Return safe placeholder
        }
        
        return urlStr;
    }
    
    // Expose ke global window
    window.SecurityUtils = {
        escapeHtml: escapeHtml,
        sanitizeObject: sanitizeObject,
        stripHtml: stripHtml,
        sanitizeUrl: sanitizeUrl
    };
    
    console.log('✅ Security Utils loaded - XSS Protection active');
    
})(window);