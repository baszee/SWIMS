<?php
// File: generate_hash.php
// Akses: http://localhost/swims/generate_hash.php

$password = '123456';
$hash = password_hash($password, PASSWORD_DEFAULT);

echo "<h2>Password Hash untuk SWIMS</h2>";
echo "<p><strong>Password:</strong> $password</p>";
echo "<p><strong>Hash:</strong></p>";
echo "<textarea rows='3' cols='80' style='font-family:monospace; padding:10px;'>$hash</textarea>";
echo "<hr>";
echo "<h3>Copy SQL Query di bawah ini ke phpMyAdmin:</h3>";
echo "<textarea rows='8' cols='80' style='font-family:monospace; padding:10px;'>";
echo "UPDATE users SET password = '$hash' WHERE username = 'admin';\n";
echo "UPDATE users SET password = '$hash' WHERE username = 'staff1';\n";
echo "UPDATE users SET password = '$hash' WHERE username = 'supervisor1';\n";
echo "UPDATE users SET password = '$hash' WHERE username = 'owner1';";
echo "</textarea>";
?>
```

2. **Buka di browser:**
```
http://localhost/swims/generate_hash.php