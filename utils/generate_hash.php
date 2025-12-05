<?php
// File: generate_hash.php
// FUNGSI: Menghasilkan hash aman untuk password default.
// Akses: http://localhost/swims/utils/generate_hash.php

$password = '123456';
$hash = password_hash($password, PASSWORD_DEFAULT);

echo "<h2>Password Hash untuk SWIMS</h2>";
echo "<p>Gunakan password <strong>'$password'</strong> untuk login.</p>";
echo "<p><strong>Hash yang harus ada di database:</strong></p>";
echo "<textarea rows='3' cols='80' style='font-family:monospace; padding:10px;'>$hash</textarea>";
echo "<hr>";
echo "<h3>Copy SQL Query di bawah ini ke phpMyAdmin (SQL Tab):</h3>";
echo "<textarea rows='8' cols='80' style='font-family:monospace; padding:10px;'>";
echo "UPDATE users SET password = '$hash' WHERE username = 'admin';\n";
echo "UPDATE users SET password = '$hash' WHERE username = 'staff1';\n";
echo "UPDATE users SET password = '$hash' WHERE username = 'supervisor1';\n";
echo "UPDATE users SET password = '$hash' WHERE username = 'owner1';";
echo "</textarea>";
?>