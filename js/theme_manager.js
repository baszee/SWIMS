/**
 * =========================================================
 * THEME MANAGER v2.0 - Complete Implementation
 * File: js/theme_manager.js
 * 
 * Features:
 * - Dynamic role-based color injection
 * - CSS variable management
 * - Component styling automation
 * - No hardcoded colors in HTML/JS
 * =========================================================
 */

(function(window) {
    'use strict';
    
    console.log('🎨 [ThemeManager v2.0] Loading...');
    
    // ========================================
    // ROLE COLOR PALETTES
    // ========================================
    const ROLE_THEMES = {
        admin: {
            primary: '#E07A5F',
            primaryRGB: '224, 122, 95',
            primaryDark: '#c86650',
            primaryLight: '#e89682',
            primaryPale: '#fceae6',
            gradient: 'linear-gradient(135deg, #E07A5F 0%, #c86650 100%)',
            shadow: 'rgba(224, 122, 95, 0.25)'
        },
        owner: {
            primary: '#D9A441',
            primaryRGB: '217, 164, 65',
            primaryDark: '#c08f2e',
            primaryLight: '#e4b86a',
            primaryPale: '#fdf6e8',
            gradient: 'linear-gradient(135deg, #D9A441 0%, #c08f2e 100%)',
            shadow: 'rgba(217, 164, 65, 0.25)'
        },
        supervisor: {
            primary: '#6CA78C',
            primaryRGB: '108, 167, 140',
            primaryDark: '#5a8f75',
            primaryLight: '#88bba4',
            primaryPale: '#eef6f3',
            gradient: 'linear-gradient(135deg, #6CA78C 0%, #5a8f75 100%)',
            shadow: 'rgba(108, 167, 140, 0.25)'
        },
        staff: {
            primary: '#5E81AC',
            primaryRGB: '94, 129, 172',
            primaryDark: '#4c6a8f',
            primaryLight: '#7a9ac0',
            primaryPale: '#edf2f7',
            gradient: 'linear-gradient(135deg, #5E81AC 0%, #4c6a8f 100%)',
            shadow: 'rgba(94, 129, 172, 0.25)'
        }
    };
    
    // ========================================
    // THEME MANAGER
    // ========================================
    class ThemeManager {
        constructor() {
            this.currentRole = null;
            this.currentTheme = null;
            this.styleElement = null;
        }
        
        /**
         * Apply theme for specific role
         */
        applyTheme(role) {
            if (!role || !ROLE_THEMES[role]) {
                console.error('[ThemeManager] Invalid role:', role);
                return;
            }
            
            this.currentRole = role;
            this.currentTheme = ROLE_THEMES[role];
            
            console.log(`🎨 [ThemeManager] Applying ${role} theme`, this.currentTheme);
            
            // Update CSS Variables
            this.updateCSSVariables();
            
            // Inject Dynamic Styles
            this.injectDynamicStyles();
            
            // Update Body Class
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
        }
        
        /**
         * Inject dynamic CSS rules
         */
        injectDynamicStyles() {
            // Remove existing
            if (this.styleElement) {
                this.styleElement.remove();
            }
            
            this.styleElement = document.createElement('style');
            this.styleElement.id = 'dynamic-role-theme';
            
            const theme = this.currentTheme;
            
            const css = `
                /* ===================================
                   DYNAMIC ROLE THEME - ${this.currentRole.toUpperCase()}
                   =================================== */
                
                /* Primary Buttons */
                .btn.primary {
                    background: ${theme.gradient} !important;
                    border-color: ${theme.primary} !important;
                    box-shadow: 0 2px 4px ${theme.shadow} !important;
                }
                
                .btn.primary:hover {
                    background: ${theme.primaryDark} !important;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 8px ${theme.shadow} !important;
                }
                
                /* Modal Buttons */
                .modal-actions .btn.primary,
                #modalConfirm {
                    background: ${theme.gradient} !important;
                }
                
                /* Links & Active States */
                a:hover,
                .nav-item.active {
                    color: ${theme.primary} !important;
                    border-left-color: ${theme.primary} !important;
                }
                
                /* Form Focus States */
                input:focus,
                textarea:focus,
                select:focus {
                    border-color: ${theme.primary} !important;
                    box-shadow: 0 0 0 3px ${theme.primaryPale} !important;
                }
                
                /* Table Row Hover */
                .table tbody tr:hover {
                    background: ${theme.primaryPale} !important;
                }
                
                /* Selection Highlight */
                ::selection {
                    background: ${theme.primaryLight} !important;
                    color: white !important;
                }
                
                /* Loading Spinner */
                .loading-spinner {
                    border-left-color: ${theme.primary} !important;
                }
                
                /* Scrollbar (Webkit) */
                ::-webkit-scrollbar-thumb {
                    background: ${theme.primaryLight} !important;
                }
                
                ::-webkit-scrollbar-thumb:hover {
                    background: ${theme.primary} !important;
                }
            `;
            
            this.styleElement.textContent = css;
            document.head.appendChild(this.styleElement);
        }
        
        /**
         * Update body class for role-specific targeting
         */
        updateBodyClass() {
            document.body.classList.remove('role-admin', 'role-owner', 'role-supervisor', 'role-staff');
            document.body.classList.add(`role-${this.currentRole}`);
        }
        
        /**
         * Get current theme
         */
        getTheme() {
            return this.currentTheme;
        }
        
        /**
         * Get specific color
         */
        getColor(colorKey) {
            return this.currentTheme ? this.currentTheme[colorKey] : null;
        }
    }
    
    // ========================================
    // INITIALIZE & EXPOSE
    // ========================================
    const themeManager = new ThemeManager();
    
    window.ThemeManager = themeManager;
    window.ROLE_THEMES = ROLE_THEMES;
    
    console.log('✅ [ThemeManager v2.0] Module loaded');
    
})(window);