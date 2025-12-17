<?php
/**
 * =========================================================
 * PASSWORD VALIDATOR MODULE
 * File: utils/PasswordValidator.php
 * Purpose: Validate password strength untuk SWIMS
 * =========================================================
 */

class PasswordValidator {
    
    /**
     * Validate password strength
     * 
     * @param string $password Password to validate
     * @return array ['valid' => bool, 'message' => string, 'strength' => string]
     */
    public static function validate($password) {
        $errors = [];
        $strength = 'weak';
        
        // Check minimum length
        if (strlen($password) < 8) {
            $errors[] = "Password minimal 8 karakter";
        }
        
        // Check for uppercase letters
        if (!preg_match('/[A-Z]/', $password)) {
            $errors[] = "Password harus mengandung minimal 1 huruf besar";
        }
        
        // Check for lowercase letters
        if (!preg_match('/[a-z]/', $password)) {
            $errors[] = "Password harus mengandung minimal 1 huruf kecil";
        }
        
        // Check for numbers
        if (!preg_match('/[0-9]/', $password)) {
            $errors[] = "Password harus mengandung minimal 1 angka";
        }
        
        // Optional: Check for special characters (untuk password lebih kuat)
        $hasSpecialChar = preg_match('/[!@#$%^&*(),.?":{}|<>]/', $password);
        
        // Determine strength
        if (count($errors) === 0) {
            if (strlen($password) >= 12 && $hasSpecialChar) {
                $strength = 'strong';
            } elseif (strlen($password) >= 10 || $hasSpecialChar) {
                $strength = 'medium';
            } else {
                $strength = 'weak';
            }
        }
        
        // Return result
        return [
            'valid' => count($errors) === 0,
            'message' => count($errors) > 0 ? implode('. ', $errors) : 'Password valid',
            'strength' => $strength,
            'errors' => $errors
        ];
    }
    
    /**
     * Check if password meets minimum requirements
     * Simple version for quick validation
     * 
     * @param string $password Password to check
     * @return bool True if valid
     */
    public static function isValid($password) {
        $result = self::validate($password);
        return $result['valid'];
    }
    
    /**
     * Get strength indicator
     * 
     * @param string $password Password to evaluate
     * @return string weak|medium|strong
     */
    public static function getStrength($password) {
        $result = self::validate($password);
        return $result['strength'];
    }
}

/**
 * =========================================================
 * USAGE EXAMPLES
 * =========================================================
 */

/*
// In api/admin_user.php (when creating/updating user):
include('../utils/PasswordValidator.php');

$password = $_POST['password'];
$validation = PasswordValidator::validate($password);

if (!$validation['valid']) {
    api_response(false, $validation['message'], null, 400);
}

// Or simple check:
if (!PasswordValidator::isValid($password)) {
    api_response(false, "Password tidak memenuhi syarat keamanan", null, 400);
}
*/
?>