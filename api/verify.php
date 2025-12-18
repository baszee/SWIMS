<?php
/**
 * =========================================================
 * FILE: api/verify.php - FIXED v4.4 (Tamper-Proof & Forensic)
 * =========================================================
 */
session_start();
include('../config/db_config.php');
include('../config/security_config.php');

header('Content-Type: application/json');

function api_response($success, $status, $message = '', $data = null) {
    echo json_encode(['success' => $success, 'status' => $status, 'message' => $message, 'data' => $data]);
    exit();
}

if (!isset($_SESSION['user'])) api_response(false, 'UNAUTHORIZED', 'Login required');

$code = $_GET['code'] ?? '';
if (empty($code)) api_response(false, 'ERROR', 'Transaction code required');

try {
    // 1. AMBIL DATA CURRENT
    $stmt = $pdo->prepare("
        SELECT t.*, i.sku 
        FROM transactions t
        JOIN items i ON t.item_id = i.id
        WHERE t.transaction_code = ?
    ");
    $stmt->execute([$code]);
    $trx = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$trx) api_response(false, 'NOT_FOUND', 'Transaksi tidak ditemukan');

    // Cek Legacy
    if (empty($trx['nota_hash']) || empty($trx['nota_snapshot'])) {
        api_response(false, 'NO_HASH', 'Transaksi Legacy (Dibuat sebelum fitur keamanan aktif)');
    }

    // ============================================================
    // TAHAP 1: INTEGRITY CHECK (Cek Keaslian Snapshot)
    // ============================================================
    $storedSnapshotJSON = $trx['nota_snapshot'];
    $storedHash = $trx['nota_hash'];
    
    // Hitung ulang hash: (Snapshot dari DB) + (Key dari Server)
    $recalcHash = hash('sha256', $storedSnapshotJSON . APP_SECRET_KEY);

    if ($recalcHash !== $storedHash) {
        // 🚨 CRITICAL: Snapshot sudah diedit hacker!
        api_response(true, 'INVALID', 'CORRUPTED SNAPSHOT', [
            'transaction_code' => $trx['transaction_code'],
            'tampering_detected' => true,
            'forensic_report' => [
                'CRITICAL: Bukti Snapshot telah dirusak/dipalsukan!',
                'Hash Signature tidak cocok dengan data Snapshot.',
                'Data history di database tidak dapat dipercaya.'
            ],
            'stored_hash' => substr($storedHash, 0, 8).'...',
            'calculated_hash' => substr($recalcHash, 0, 8).'...'
        ]);
    }

    // ============================================================
    // TAHAP 2: FORENSIC CHECK (Snapshot Asli vs Data Sekarang)
    // ============================================================
    $snapshot = json_decode($storedSnapshotJSON, true);
    $changes = [];

    // Bandingkan Qty
    if ((string)$snapshot['quantity'] !== (string)$trx['quantity']) {
        $changes[] = "Quantity berubah dari <b>{$snapshot['quantity']}</b> (Asli) menjadi <b>{$trx['quantity']}</b> (Database)";
    }

    // Bandingkan Alamat
    $snapAddr = isset($snapshot['recipient_address']) ? (string)$snapshot['recipient_address'] : '';
    $currAddr = isset($trx['recipient_address']) ? (string)$trx['recipient_address'] : '';
    if ($snapAddr !== $currAddr) {
        $changes[] = "Alamat berubah dari <b>{$snapAddr}</b> menjadi <b>{$currAddr}</b>";
    }

    // Bandingkan SKU
    if ((string)$snapshot['sku'] !== (string)$trx['sku']) {
        $changes[] = "Item SKU berubah dari <b>{$snapshot['sku']}</b> menjadi <b>{$trx['sku']}</b>";
    }

    if (count($changes) > 0) {
        // ❌ Data Diedit (Tapi Snapshot Masih Selamat)
        api_response(true, 'INVALID', 'TAMPERING DETECTED', [
            'transaction_code' => $trx['transaction_code'],
            'current_quantity' => $trx['quantity'],
            'tampering_detected' => true,
            'forensic_report' => $changes // List detail perubahan
        ]);
    } else {
        // ✅ SEMUA AMAN
        api_response(true, 'VALID', 'Data Aman & Terverifikasi', [
            'transaction_code' => $trx['transaction_code'],
            'quantity' => $trx['quantity'],
            'hash' => substr($storedHash, 0, 8).'...'
        ]);
    }

} catch (PDOException $e) {
    api_response(false, 'ERROR', 'Database Error');
}
?>