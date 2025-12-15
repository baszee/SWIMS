/**
 * =========================================================
 * ENHANCED ROLE-BASED THEMING SYSTEM v2.0
 * File: js/theme_manager.js
 * 
 * Purpose: Centralized color management per role
 * Features:
 * - Dynamic CSS variable injection
 * - Role-specific color palettes
 * - Automatic component styling
 * - Dark mode support (future)
 * =========================================================
 */

(function(window) {
    'use strict';
    
    // ========================================
    // ROLE COLOR PALETTES (Extended)
    // ========================================
    const ROLE_THEMES = {
        admin: {
            primary: '#E07A5F',      // Clay Red
            primaryRGB: '224, 122, 95',
            primaryDark: '#c86650',
            primaryLight: '#e89682',
            primaryPale: '#fceae6',
            secondary: '#3b82f6',
            accent: '#8b5cf6',
            gradient: 'linear-gradient(135deg, #E07A5F 0%, #c86650 100%)',
            shadow: 'rgba(224, 122, 95, 0.25)',
            // Status colors aligned with theme
            success: '#10b981',
            warning: '#f59e0b',
            danger: '#dc2626',
            info: '#3b82f6'
        },
        owner: {
            primary: '#D9A441',      // Golden Amber
            primaryRGB: '217, 164, 65',
            primaryDark: '#c08f2e',
            primaryLight: '#e4b86a',
            primaryPale: '#fdf6e8',
            secondary: '#10b981',
            accent: '#ec4899',
            gradient: 'linear-gradient(135deg, #D9A441 0%, #c08f2e 100%)',
            shadow: 'rgba(217, 164, 65, 0.25)',
            success: '#10b981',
            warning: '#f59e0b',
            danger: '#dc2626',
            info: '#3b82f6'
        },
        supervisor: {
            primary: '#6CA78C',      // Sage Green
            primaryRGB: '108, 167, 140',
            primaryDark: '#5a8f75',
            primaryLight: '#88bba4',
            primaryPale: '#eef6f3',
            secondary: '#3b82f6',
            accent: '#f59e0b',
            gradient: 'linear-gradient(135deg, #6CA78C 0%, #5a8f75 100%)',
            shadow: 'rgba(108, 167, 140, 0.25)',
            success: '#10b981',
            warning: '#f59e0b',
            danger: '#dc2626',
            info: '#3b82f6'
        },
        staff: {
            primary: '#5E81AC',      // Dusty Blue
            primaryRGB: '94, 129, 172',
            primaryDark: '#4c6a8f',
            primaryLight: '#7a9ac0',
            primaryPale: '#edf2f7',
            secondary: '#10b981',
            accent: '#8b5cf6',
            gradient: 'linear-gradient(135deg, #5E81AC 0%, #4c6a8f 100%)',
            shadow: 'rgba(94, 129, 172, 0.25)',
            success: '#10b981',
            warning: '#f59e0b',
            danger: '#dc2626',
            info: '#3b82f6'
        }
    };
    
    // ========================================
    // THEME MANAGER CLASS
    // ========================================
    class ThemeManager {
        constructor() {
            this.currentRole = null;
            this.currentTheme = null;
            this.styleElement = null;
        }
        
        /**
         * Apply theme for specific role
         * @param {string} role - User role (admin, owner, supervisor, staff)
         */
        applyTheme(role) {
            if (!role || !ROLE_THEMES[role]) {
                console.error('[ThemeManager] Invalid role:', role);
                return;
            }
            
            this.currentRole = role;
            this.currentTheme = ROLE_THEMES[role];
            
            console.log(`🎨 [ThemeManager] Applying ${role} theme`);
            
            // 1. Update CSS Variables
            this.updateCSSVariables();
            
            // 2. Inject Dynamic Styles
            this.injectDynamicStyles();
            
            // 3. Update Body Class
            this.updateBodyClass();
            
            console.log('✅ [ThemeManager] Theme applied successfully');
        }
        
        /**
         * Update CSS custom properties
         */
        updateCSSVariables() {
            const root = document.documentElement;
            const theme = this.currentTheme;
            
            root.style.setProperty('--current-role-color', theme.primary);
            root.style.setProperty('--current-role-rgb', theme.primaryRGB);
            root.style.setProperty('--current-role-dark', theme.primaryDark);
            root.style.setProperty('--current-role-light', theme.primaryLight);
            root.style.setProperty('--current-role-pale', theme.primaryPale);
            root.style.setProperty('--current-role-gradient', theme.gradient);
            root.style.setProperty('--current-role-shadow', theme.shadow);
            
            // Status colors
            root.style.setProperty('--theme-success', theme.success);
            root.style.setProperty('--theme-warning', theme.warning);
            root.style.setProperty('--theme-danger', theme.danger);
            root.style.setProperty('--theme-info', theme.info);
        }
        
        /**
         * Inject dynamic CSS rules for role-specific styling
         */
        injectDynamicStyles() {
            // Remove existing dynamic styles
            if (this.styleElement) {
                this.styleElement.remove();
            }
            
            // Create new style element
            this.styleElement = document.createElement('style');
            this.styleElement.id = 'dynamic-role-theme';
            
            const theme = this.currentTheme;
            
            // Dynamic CSS rules
            const css = `
                /* ===================================
                   DYNAMIC ROLE THEME - ${this.currentRole.toUpperCase()}
                   =================================== */
                
                /* Primary Buttons */
                .btn.primary,
                .btn-primary {
                    background: ${theme.gradient} !important;
                    border-color: ${theme.primary} !important;
                    box-shadow: 0 2px 4px ${theme.shadow} !important;
                }
                
                .btn.primary:hover,
                .btn-primary:hover {
                    background: ${theme.primaryDark} !important;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 8px ${theme.shadow} !important;
                }
                
                /* Links & Active States */
                a:hover,
                .nav-item:hover,
                .nav-item.active {
                    color: ${theme.primary} !important;
                }
                
                .nav-item.active {
                    border-left-color: ${theme.primary} !important;
                }
                
                /* Form Focus States */
                input:focus,
                textarea:focus,
                select:focus {
                    border-color: ${theme.primary} !important;
                    box-shadow: 0 0 0 3px ${theme.primaryPale} !important;
                }
                
                /* Role Badge */
                .role-badge,
                .user-role {
                    background: ${theme.gradient} !important;
                    color: white !important;
                }
                
                /* Stat Boxes with Role Color */
                .stat-box:not(.success):not(.warning):not(.danger),
                .stat-card {
                    background: ${theme.gradient} !important;
                    color: white !important;
                }
                
                .stat-card::before {
                    background: ${theme.gradient} !important;
                }
                
                /* Sidebar Header */
                .sidebar-header {
                    background: ${theme.gradient} !important;
                }
                
                /* User Avatar */
                .user-avatar {
                    background: ${theme.gradient} !important;
                }
                
                /* Cards with Role Accent */
                .card:hover {
                    border-color: ${theme.primaryLight} !important;
                }
                
                /* Table Row Hover */
                .table tbody tr:hover {
                    background: ${theme.primaryPale} !important;
                }
                
                /* Progress Bars */
                .progress-bar {
                    background: ${theme.gradient} !important;
                }
                
                /* Badges - Primary */
                .badge.badge-primary {
                    background: ${theme.primaryLight} !important;
                    color: ${theme.primaryDark} !important;
                }
                
                /* Loading Spinner */
                .loading-spinner {
                    border-left-color: ${theme.primary} !important;
                }
                
                /* Selection Highlight */
                ::selection {
                    background: ${theme.primaryLight} !important;
                    color: white !important;
                }
                
                /* Login Card for Current Role */
                .card.login-${this.currentRole} {
                    border-color: ${theme.primary} !important;
                    box-shadow: 0 0 20px ${theme.shadow} !important;
                }
                
                /* Scrollbar (Webkit) */
                ::-webkit-scrollbar-thumb {
                    background: ${theme.primaryLight} !important;
                }
                
                ::-webkit-scrollbar-thumb:hover {
                    background: ${theme.primary} !important;
                }
                
                /* Tabs Active State */
                .tab.active,
                .menu button.active {
                    border-bottom-color: ${theme.primary} !important;
                    color: ${theme.primary} !important;
                }
                
                /* Alert/Notice Boxes with Role Color */
                .notice-primary,
                .alert-primary {
                    background: ${theme.primaryPale} !important;
                    border-left-color: ${theme.primary} !important;
                    color: ${theme.primaryDark} !important;
                }
                
                /* Checkboxes & Radio (Custom) */
                input[type="checkbox"]:checked,
                input[type="radio"]:checked {
                    accent-color: ${theme.primary} !important;
                }
                
                /* Stats Grid - Override for consistent theming */
                #adminDashboard .admin-stat {
                    background: ${theme.gradient} !important;
                }
            `;
            
            this.styleElement.textContent = css;
            document.head.appendChild(this.styleElement);
        }
        
        /**
         * Update body class for role-specific targeting
         */
        updateBodyClass() {
            // Remove existing role classes
            document.body.classList.remove('role-admin', 'role-owner', 'role-supervisor', 'role-staff');
            
            // Add current role class
            document.body.classList.add(`role-${this.currentRole}`);
        }
        
        /**
         * Get current theme colors
         * @returns {Object} Theme object
         */
        getTheme() {
            return this.currentTheme;
        }
        
        /**
         * Get specific color from current theme
         * @param {string} colorKey - Color key (e.g., 'primary', 'success')
         * @returns {string} Color value
         */
        getColor(colorKey) {
            return this.currentTheme ? this.currentTheme[colorKey] : null;
        }
    }
    
    // ========================================
    // INITIALIZE & EXPOSE
    // ========================================
    const themeManager = new ThemeManager();
    
    // Expose to global scope
    window.ThemeManager = themeManager;
    window.ROLE_THEMES = ROLE_THEMES;
    
    // Auto-apply theme when user is loaded
    window.addEventListener('DOMContentLoaded', () => {
        const user = window.currentUser ? window.currentUser() : null;
        if (user && user.role) {
            themeManager.applyTheme(user.role);
        }
    });
    
    console.log('✅ [ThemeManager] Module loaded');
    
})(window);

/**
 * =========================================================
 * INTEGRATION WITH APP.JS
 * Add to checkSessionAndRender() and after login
 * =========================================================
 */

// Example integration in checkSessionAndRender():
/*
async function checkSessionAndRender(){
    try {
        const response = await fetch('api/auth.php?action=check_session');
        const data = await response.json();
        
        if (data.logged_in) {
            storageSet('swims_current_user', data.user); 
            
            // ✅ APPLY THEME IMMEDIATELY
            if (window.ThemeManager) {
                window.ThemeManager.applyTheme(data.user.role);
            }
            
            renderSidebarUser();
            renderSidebarNav();
            
            const currentHash = window.location.hash.replace('#', '');
            if (!currentHash || currentHash === 'login') {
                loadPage(roleLanding(data.user.role));
            } else {
                loadPage(currentHash);
            }
        } else {
            storageSet('swims_current_user', null);
            hideSidebar();
            loadPage('login');
        }
    } catch (error) {
        console.error('Error checking session:', error);
        storageSet('swims_current_user', null);
        hideSidebar();
        loadPage('login');
    }
}
*/

// Example integration in auth.js after successful login:
/*
if (data.success) {
    msg.textContent = '✅ Login berhasil! Redirecting...';
    msg.style.color = '#16a34a';
    
    window.storageSet('swims_current_user', { 
        username: username, 
        role: data.role 
    });
    
    // ✅ APPLY THEME BEFORE RENDERING
    if (window.ThemeManager) {
        window.ThemeManager.applyTheme(data.role);
    }
    
    window.renderSidebarUser(); 
    window.renderSidebarNav(); 
    window.loadPage(window.roleLanding(data.role)); 
}
*/