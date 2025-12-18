/**
 * =========================================================
 * THEME MANAGER v3.0 - CLEAN CSS VARIABLES
 * File: js/theme_manager.js
 * 
 * ✅ NO !important
 * ✅ Pure CSS Variables
 * ✅ Better Performance
 * ✅ Easier Debugging
 * ✅ Production Ready
 * =========================================================
 */

(function(window) {
    'use strict';
    
    console.log('🎨 [ThemeManager v3.0] Clean CSS Variables System');
    
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
            primary: '#f0660a',
            primaryRGB: '240, 102, 10',
            primaryDark: '#3E2723',
            primaryLight: '#ff8534',
            primaryPale: '#fff3e0',
            gradient: 'linear-gradient(135deg, #f0660a 0%, #3E2723 100%)',
            shadow: 'rgba(240, 102, 10, 0.25)'
        },
        staff: {
            primary: '#f8c61e',
            primaryRGB: '248, 198, 30',
            primaryDark: '#252c37',
            primaryLight: '#ffd84d',
            primaryPale: '#fffbea',
            gradient: 'linear-gradient(135deg, #f8c61e 0%, #252c37 100%)',
            shadow: 'rgba(248, 198, 30, 0.25)'
        }
    };
    
    // ========================================
    // THEME MANAGER CLASS
    // ========================================
    class ThemeManager {
        constructor() {
            this.currentRole = null;
            this.currentTheme = null;
        }
        
        /**
         * Apply theme by updating CSS variables only
         */
        applyTheme(role) {
            if (!role || !ROLE_THEMES[role]) {
                console.error('[ThemeManager] Invalid role:', role);
                return;
            }
            
            this.currentRole = role;
            this.currentTheme = ROLE_THEMES[role];
            
            console.log(`🎨 [ThemeManager v3.0] Applying ${role} theme`);
            console.log('   Colors:', {
                primary: this.currentTheme.primary,
                dark: this.currentTheme.primaryDark,
                gradient: this.currentTheme.gradient
            });
            
            // Only update CSS variables - no inline styles injection
            this.updateCSSVariables();
            this.updateBodyClass();
            
            console.log('✅ [ThemeManager] Theme applied via CSS Variables');
        }
        
        /**
         * Update CSS custom properties (variables)
         */
        updateCSSVariables() {
            const root = document.documentElement;
            const theme = this.currentTheme;
            
            // Set all theme variables
            root.style.setProperty('--current-role-color', theme.primary);
            root.style.setProperty('--current-role-rgb', theme.primaryRGB);
            root.style.setProperty('--current-role-dark', theme.primaryDark);
            root.style.setProperty('--current-role-light', theme.primaryLight);
            root.style.setProperty('--current-role-pale', theme.primaryPale);
            root.style.setProperty('--current-role-gradient', theme.gradient);
            root.style.setProperty('--current-role-shadow', theme.shadow);
            
            console.log('✅ CSS Variables updated:', {
                '--current-role-color': theme.primary,
                '--current-role-gradient': theme.gradient
            });
        }
        
        /**
         * Update body class for role-specific targeting
         */
        updateBodyClass() {
            document.body.classList.remove('role-admin', 'role-owner', 'role-supervisor', 'role-staff');
            document.body.classList.add(`role-${this.currentRole}`);
            console.log(`✅ Body class: role-${this.currentRole}`);
        }
        
        /**
         * Get current theme object
         */
        getTheme() {
            return this.currentTheme;
        }
        
        /**
         * Get specific color value
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
    
    console.log('✅ [ThemeManager v3.0] Module loaded - Clean CSS Variables');
    console.log('📋 Available themes:', Object.keys(ROLE_THEMES));
    console.log('🎨 Updated themes:');
    console.log('   - Supervisor: Orange #f0660a + Brown #3E2723');
    console.log('   - Staff: Golden #f8c61e + Navy #252c37');
    
})(window);