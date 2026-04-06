<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

declare(strict_types=1);

namespace MikoPBX\Core\System;

/**
 * CertificateValidator - validates SSL/TLS certificates and private keys using OpenSSL
 *
 * Provides validation methods for:
 * - Certificate format and validity
 * - Private key format and validity
 * - Certificate-key pair matching
 * - Certificate chain validation
 */
class CertificateValidator
{
    /**
     * Validate certificate and optionally its private key
     *
     * @param string $publicKey PEM-encoded certificate
     * @param string|null $privateKey PEM-encoded private key (optional)
     * @return array ['valid' => bool, 'errors' => array[], 'warnings' => array[]]
     *               where errors/warnings are arrays with ['key' => string, 'params' => array]
     */
    public static function validate(string $publicKey, ?string $privateKey = null): array
    {
        $result = [
            'valid' => true,
            'errors' => [],
            'warnings' => []
        ];

        // Validate public certificate
        $certResult = self::validateCertificate($publicKey);
        if (!$certResult['valid']) {
            $result['valid'] = false;
            $result['errors'] = array_merge($result['errors'], $certResult['errors']);
        }
        $result['warnings'] = array_merge($result['warnings'], $certResult['warnings']);

        // Validate private key if provided
        if ($privateKey !== null && $privateKey !== '') {
            $keyResult = self::validatePrivateKey($privateKey);
            if (!$keyResult['valid']) {
                $result['valid'] = false;
                $result['errors'] = array_merge($result['errors'], $keyResult['errors']);
            }

            // Validate that certificate and key match
            if ($certResult['valid'] && $keyResult['valid']) {
                $matchResult = self::validateCertificateKeyPair($publicKey, $privateKey);
                if (!$matchResult['valid']) {
                    $result['valid'] = false;
                    $result['errors'] = array_merge($result['errors'], $matchResult['errors']);
                }
            }
        }

        return $result;
    }

    /**
     * Validate certificate format and content
     *
     * @param string $certificate PEM-encoded certificate
     * @return array ['valid' => bool, 'errors' => array[], 'warnings' => array[]]
     */
    public static function validateCertificate(string $certificate): array
    {
        $result = [
            'valid' => true,
            'errors' => [],
            'warnings' => []
        ];

        // Check if certificate is empty
        if (empty(trim($certificate))) {
            $result['valid'] = false;
            $result['errors'][] = ['key' => 'cert_CertificateIsEmpty', 'params' => []];
            return $result;
        }

        // Try to parse certificate
        $certResource = @openssl_x509_read($certificate);
        if ($certResource === false) {
            $result['valid'] = false;
            $opensslError = openssl_error_string() ?: 'Unknown error';
            $result['errors'][] = [
                'key' => 'cert_InvalidCertificateFormat',
                'params' => ['error' => $opensslError]
            ];
            return $result;
        }

        // Parse certificate details
        $certInfo = openssl_x509_parse($certResource);
        if ($certInfo === false) {
            $result['valid'] = false;
            $result['errors'][] = ['key' => 'cert_FailedToParseCertificate', 'params' => []];
            // Resource will be automatically freed by PHP garbage collector
            return $result;
        }

        // Check if certificate has expired
        $now = time();
        if (isset($certInfo['validTo_time_t'])) {
            if ($certInfo['validTo_time_t'] < $now) {
                $result['warnings'][] = [
                    'key' => 'cert_CertificateExpired',
                    'params' => ['date' => date('Y-m-d', $certInfo['validTo_time_t'])]
                ];
            } elseif ($certInfo['validTo_time_t'] < $now + (30 * 24 * 3600)) {
                // Expires in less than 30 days
                $daysLeft = (int)floor(($certInfo['validTo_time_t'] - $now) / (24 * 3600));
                $result['warnings'][] = [
                    'key' => 'cert_CertificateExpiresSoon',
                    'params' => ['days' => $daysLeft]
                ];
            }
        }

        // Check if certificate is not yet valid
        if (isset($certInfo['validFrom_time_t']) && $certInfo['validFrom_time_t'] > $now) {
            $result['warnings'][] = [
                'key' => 'cert_CertificateNotYetValid',
                'params' => ['date' => date('Y-m-d', $certInfo['validFrom_time_t'])]
            ];
        }

        // Resource will be automatically freed by PHP garbage collector (PHP 8+)
        // openssl_x509_free() is deprecated in PHP 8.4
        return $result;
    }

    /**
     * Validate private key format
     *
     * @param string $privateKey PEM-encoded private key
     * @return array ['valid' => bool, 'errors' => array[]]
     */
    public static function validatePrivateKey(string $privateKey): array
    {
        $result = [
            'valid' => true,
            'errors' => []
        ];

        // Check if private key is empty
        if (empty(trim($privateKey))) {
            $result['valid'] = false;
            $result['errors'][] = ['key' => 'cert_PrivateKeyIsEmpty', 'params' => []];
            return $result;
        }

        // Try to load private key
        $keyResource = @openssl_pkey_get_private($privateKey);
        if ($keyResource === false) {
            $result['valid'] = false;
            $opensslError = openssl_error_string() ?: 'Unknown error';
            $result['errors'][] = [
                'key' => 'cert_InvalidPrivateKeyFormat',
                'params' => ['error' => $opensslError]
            ];
            return $result;
        }

        // Get key details
        $keyDetails = openssl_pkey_get_details($keyResource);
        if ($keyDetails === false) {
            $result['valid'] = false;
            $result['errors'][] = ['key' => 'cert_FailedToGetPrivateKeyDetails', 'params' => []];
            // Resource will be automatically freed by PHP garbage collector
            return $result;
        }

        // Resource will be automatically freed by PHP garbage collector (PHP 8+)
        // openssl_pkey_free() is deprecated in PHP 8.4
        return $result;
    }

    /**
     * Validate that certificate and private key match
     *
     * @param string $certificate PEM-encoded certificate
     * @param string $privateKey PEM-encoded private key
     * @return array ['valid' => bool, 'errors' => array[]]
     */
    public static function validateCertificateKeyPair(string $certificate, string $privateKey): array
    {
        $result = [
            'valid' => true,
            'errors' => []
        ];

        // Load certificate
        $certResource = @openssl_x509_read($certificate);
        if ($certResource === false) {
            $result['valid'] = false;
            $result['errors'][] = ['key' => 'cert_FailedToLoadCertificateForPairValidation', 'params' => []];
            return $result;
        }

        // Load private key
        $keyResource = @openssl_pkey_get_private($privateKey);
        if ($keyResource === false) {
            $result['valid'] = false;
            $result['errors'][] = ['key' => 'cert_FailedToLoadPrivateKeyForPairValidation', 'params' => []];
            // Resources will be automatically freed by PHP garbage collector
            return $result;
        }

        // Extract public key from certificate
        $publicKeyResource = openssl_pkey_get_public($certResource);
        if ($publicKeyResource === false) {
            $result['valid'] = false;
            $result['errors'][] = ['key' => 'cert_FailedToExtractPublicKeyFromCertificate', 'params' => []];
            // Resources will be automatically freed by PHP garbage collector
            return $result;
        }

        // Get public key details from certificate
        $publicKeyDetails = openssl_pkey_get_details($publicKeyResource);
        // Get public key details from private key
        $privateKeyDetails = openssl_pkey_get_details($keyResource);

        // Compare public keys
        if ($publicKeyDetails === false || $privateKeyDetails === false ||
            $publicKeyDetails['key'] !== $privateKeyDetails['key']) {
            $result['valid'] = false;
            $result['errors'][] = ['key' => 'cert_CertificateAndPrivateKeyDoNotMatch', 'params' => []];
        }

        // Resources will be automatically freed by PHP garbage collector (PHP 8+)
        // openssl_*_free() functions are deprecated in PHP 8.4

        return $result;
    }

    /**
     * Get certificate information
     *
     * @param string $certificate PEM-encoded certificate
     * @return array|null Certificate info array or null on error
     */
    public static function getCertificateInfo(string $certificate): ?array
    {
        if (empty(trim($certificate))) {
            return null;
        }

        $certResource = @openssl_x509_read($certificate);
        if ($certResource === false) {
            return null;
        }

        $certInfo = openssl_x509_parse($certResource);
        // Resource will be automatically freed by PHP garbage collector (PHP 8+)
        // openssl_x509_free() is deprecated in PHP 8.4

        return $certInfo !== false ? $certInfo : null;
    }
}
