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

namespace MikoPBX\Core\System;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\System\Util;

/**
 * Class SslCertificateService
 * 
 * Service for managing SSL certificates in MikoPBX system.
 * Provides functionality for generating, validating, and parsing SSL certificates.
 * 
 * @package MikoPBX\Core\System
 */
class SslCertificateService
{
    /**
     * Default certificate validity period in days
     */
    private const int DEFAULT_CERT_VALIDITY_DAYS = 3650;
    
    /**
     * Default key size in bits
     */
    private const int DEFAULT_KEY_SIZE = 2048;
    
    /**
     * Standard paths for certificates
     */
    public const string ASTERISK_KEYS_DIR = '/etc/asterisk/keys';
    public const string ASTERISK_CERT_FILE = self::ASTERISK_KEYS_DIR . '/asterisk.crt';
    public const string ASTERISK_KEY_FILE = self::ASTERISK_KEYS_DIR . '/asterisk.key';
    
    private const string NGINX_CERT_FILE = '/etc/ssl/certs/nginx.crt';
    private const string NGINX_KEY_FILE = '/etc/ssl/private/nginx.key';
    
    /**
     * Generate a self-signed SSL certificate.
     *
     * @param array|null $options Certificate subject options
     * @param array|null $configArgsKey Private key configuration
     * @param array|null $configArgsCsr CSR configuration
     * @return array Array with 'PublicKey' and 'PrivateKey' strings
     */
    public static function generateSelfSignedCertificate(
        ?array $options = null, 
        ?array $configArgsKey = null, 
        ?array $configArgsCsr = null
    ): array {
        // Initialize options if not provided
        if (!$options) {
            // For self-signed certificates in opensource project, use system settings when available
            
            // Get country based on admin language
            $language = PbxSettings::getValueByKey(PbxSettings::WEB_ADMIN_LANGUAGE);
            $countryMap = [
                'ru' => 'RU',     // Russian
                'en' => 'GB',     // English (default to UK)
                'de' => 'DE',     // German  
                'es' => 'ES',     // Spanish
                'fr' => 'FR',     // French
                'it' => 'IT',     // Italian
                'pt' => 'PT',     // Portuguese
                'pt_BR' => 'BR',  // Portuguese Brazil
                'uk' => 'UA',     // Ukrainian
                'el' => 'GR',     // Greek
                'da' => 'DK',     // Danish
                'nl' => 'NL',     // Dutch
                'pl' => 'PL',     // Polish
                'sv' => 'SE',     // Swedish
                'ka' => 'GE',     // Georgian
                'ja' => 'JP',     // Japanese
                'cs' => 'CZ',     // Czech
                'tr' => 'TR',     // Turkish
                'vi' => 'VN',     // Vietnamese
                'th' => 'TH',     // Thai
                'az' => 'AZ',     // Azerbaijani
                'ro' => 'RO',     // Romanian
                'hu' => 'HU',     // Hungarian
                'hr' => 'HR',     // Croatian
                'fi' => 'FI',     // Finnish
            ];
            $countryCode = $countryMap[$language] ?? 'XX';
            
            // Get organization name from PBX name (sanitize to ASCII only)
            $pbxName = PbxSettings::getValueByKey(PbxSettings::PBX_NAME);
            $organizationName = !empty($pbxName) ? $pbxName : 'MikoPBX User';
            // Remove non-ASCII characters from organization name
            $organizationName = preg_replace('/[^\x20-\x7E]/', '', $organizationName);
            if (empty($organizationName)) {
                $organizationName = 'MikoPBX User';
            }

            // Get external SIP parameters for certificate
            $externalHost = PbxSettings::getValueByKey(PbxSettings::EXTERNAL_SIP_HOST_NAME);
            $externalIp = PbxSettings::getValueByKey(PbxSettings::EXTERNAL_SIP_IP_ADDR);

            // Validate hostname - only ASCII alphanumeric, dots, hyphens
            if (!empty($externalHost) && !preg_match('/^[a-zA-Z0-9.-]+$/', $externalHost)) {
                // Invalid hostname with non-ASCII or special characters
                SystemMessages::sysLogMsg(__METHOD__, "Invalid external hostname '$externalHost' contains non-ASCII characters, ignoring", LOG_WARNING);
                $externalHost = '';
            }

            // Determine common name - prefer hostname over IP, fallback to system hostname
            if (!empty($externalHost)) {
                $commonName = $externalHost;
            } elseif (!empty($externalIp)) {
                $commonName = $externalIp;
            } else {
                $commonName = gethostname() ?: 'localhost';
            }

            // Get email from system notifications
            $systemEmail = PbxSettings::getValueByKey(PbxSettings::SYSTEM_NOTIFICATIONS_EMAIL);
            if (empty($systemEmail) || !filter_var($systemEmail, FILTER_VALIDATE_EMAIL)) {
                $systemEmail = 'admin@' . ($commonName !== 'localhost' ? $commonName : 'localhost.localdomain');
            }

            $options = [
                "countryName" => $countryCode,
                "stateOrProvinceName" => 'State',
                "localityName" => 'City',
                "organizationName" => $organizationName,
                "organizationalUnitName" => 'PBX System',
                "commonName" => $commonName,
                "emailAddress" => $systemEmail,
                // Store external parameters for SAN generation
                "_externalHost" => $externalHost,
                "_externalIp" => $externalIp,
            ];
        }

        // Initialize CSR configuration arguments if not provided
        if (!$configArgsCsr) {
            $configArgsCsr = ['digest_alg' => 'sha256'];
        }

        // Initialize private key configuration arguments if not provided
        if (!$configArgsKey) {
            $configArgsKey = [
                "private_key_bits" => self::DEFAULT_KEY_SIZE,
                "private_key_type" => OPENSSL_KEYTYPE_RSA,
            ];
        }

        // Generate keys
        $privateKey = openssl_pkey_new($configArgsKey);
        if ($privateKey === false) {
            SystemMessages::sysLogMsg(__METHOD__, 'Failed to generate private key: ' . openssl_error_string(), LOG_ERR);
            return ['PublicKey' => '', 'PrivateKey' => ''];
        }

        // Extract external parameters before creating CSR (they're not valid DN fields)
        $externalHost = $options['_externalHost'] ?? '';
        $externalIp = $options['_externalIp'] ?? '';

        // Remove internal fields from DN options
        unset($options['_externalHost'], $options['_externalIp']);

        $csr = openssl_csr_new($options, $privateKey, $configArgsCsr);
        if ($csr === false) {
            SystemMessages::sysLogMsg(__METHOD__, 'Failed to generate CSR: ' . openssl_error_string(), LOG_ERR);
            return ['PublicKey' => '', 'PrivateKey' => ''];
        }

        // Create a temporary config file with SAN extension
        // Modern browsers (especially Safari) require Subject Alternative Name (SAN)
        // Use EXTERNAL_SIP_HOST_NAME and EXTERNAL_SIP_IP_ADDR for SAN entries
        $commonName = $options['commonName'] ?? 'localhost';

        $tempConfigFile = tempnam(sys_get_temp_dir(), 'ssl_config_');
        $configContent = <<<EOD
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req

[req_distinguished_name]

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
EOD;

        // Build SAN entries based on external SIP settings
        $sanIndex = 1;

        // Add external hostname to SAN if specified
        if (!empty($externalHost) && !filter_var($externalHost, FILTER_VALIDATE_IP)) {
            $configContent .= "\nDNS.{$sanIndex} = {$externalHost}";
            $sanIndex++;
        }

        // Add external IP to SAN if specified
        if (!empty($externalIp) && filter_var($externalIp, FILTER_VALIDATE_IP)) {
            $configContent .= "\nIP.{$sanIndex} = {$externalIp}";
            $sanIndex++;
        }

        // If no external parameters, fall back to commonName
        if ($sanIndex === 1) {
            if (filter_var($commonName, FILTER_VALIDATE_IP)) {
                $configContent .= "\nIP.1 = {$commonName}";
            } else {
                $configContent .= "\nDNS.1 = {$commonName}";
            }
        }

        file_put_contents($tempConfigFile, $configContent);

        // Add the config file and extensions to CSR config
        $configArgsCsrWithSan = array_merge($configArgsCsr, [
            'config' => $tempConfigFile,
            'x509_extensions' => 'v3_req',
        ]);

        $x509 = openssl_csr_sign($csr, null, $privateKey, self::DEFAULT_CERT_VALIDITY_DAYS, $configArgsCsrWithSan);

        // Clean up temporary config file
        if (file_exists($tempConfigFile)) {
            unlink($tempConfigFile);
        }

        if ($x509 === false) {
            SystemMessages::sysLogMsg(__METHOD__, 'Failed to sign certificate: ' . openssl_error_string(), LOG_ERR);
            return ['PublicKey' => '', 'PrivateKey' => ''];
        }

        // Export keys
        $certOut = '';
        $keyOut = '';
        
        if (!openssl_x509_export($x509, $certOut)) {
            SystemMessages::sysLogMsg(__METHOD__, 'Failed to export certificate: ' . openssl_error_string(), LOG_ERR);
            return ['PublicKey' => '', 'PrivateKey' => ''];
        }
        
        if (!openssl_pkey_export($privateKey, $keyOut)) {
            SystemMessages::sysLogMsg(__METHOD__, 'Failed to export private key: ' . openssl_error_string(), LOG_ERR);
            return ['PublicKey' => '', 'PrivateKey' => ''];
        }
        
        return ['PublicKey' => $certOut, 'PrivateKey' => $keyOut];
    }
    
    /**
     * Validate SSL certificate and private key pair.
     *
     * @param string $publicKey The public certificate content (PEM format)
     * @param string $privateKey The private key content (PEM format)
     * @param string $logContext Context for logging (e.g., 'nginx', 'asterisk')
     * @return bool True if the certificate and key are valid and match
     */
    public static function validateCertificatePair(
        string $publicKey, 
        string $privateKey, 
        string $logContext = 'SslCertificateService'
    ): bool {
        try {
            // Parse certificate
            $certResource = openssl_x509_read($publicKey);
            if ($certResource === false) {
                SystemMessages::sysLogMsg($logContext, 'Invalid SSL certificate format', LOG_WARNING);
                return false;
            }
            
            // Parse private key
            $keyResource = openssl_pkey_get_private($privateKey);
            if ($keyResource === false) {
                SystemMessages::sysLogMsg($logContext, 'Invalid SSL private key format', LOG_WARNING);
                return false;
            }
            
            // Check if certificate and key match
            $certDetails = openssl_x509_parse($certResource);
            if ($certDetails === false) {
                SystemMessages::sysLogMsg($logContext, 'Failed to parse certificate details', LOG_WARNING);
                return false;
            }
            
            // Check certificate expiration
            if (!self::isCertificateValid($certDetails)) {
                SystemMessages::sysLogMsg($logContext, 'SSL certificate has expired or not yet valid', LOG_WARNING);
                return false;
            }
            
            // Verify the certificate matches the private key
            if (!self::verifyCertificateKeyMatch($certResource, $keyResource)) {
                SystemMessages::sysLogMsg($logContext, 'SSL certificate and private key do not match', LOG_WARNING);
                return false;
            }
            
            return true;
            
        } catch (\Exception $e) {
            SystemMessages::sysLogMsg($logContext, 'Exception validating certificates: ' . $e->getMessage(), LOG_WARNING);
            return false;
        }
    }
    
    /**
     * Parse certificate information for display.
     * 
     * @param string $certPem PEM formatted certificate
     * @return array Certificate information or error array on failure
     */
    public static function parseCertificateInfo(string $certPem): array
    {
        try {
            // Parse the certificate using OpenSSL functions
            $cert = openssl_x509_parse($certPem);
            
            if ($cert === false) {
                return ['error' => 'Invalid certificate format'];
            }
            
            // Extract useful information
            $info = [
                'subject' => '',
                'issuer' => '',
                'valid_from' => '',
                'valid_to' => '',
                'is_expired' => false,
                'days_until_expiry' => 0,
                'san' => [], // Subject Alternative Names
                'is_self_signed' => false
            ];
            
            // Extract subject (CN - Common Name)
            if (isset($cert['subject']['CN'])) {
                $info['subject'] = $cert['subject']['CN'];
            } elseif (isset($cert['subject']['O'])) {
                $info['subject'] = $cert['subject']['O']; // Organization as fallback
            }
            
            // Extract issuer
            if (isset($cert['issuer']['CN'])) {
                $info['issuer'] = $cert['issuer']['CN'];
            } elseif (isset($cert['issuer']['O'])) {
                $info['issuer'] = $cert['issuer']['O'];
            }
            
            // Format validity dates
            if (isset($cert['validFrom_time_t'])) {
                $info['valid_from'] = date('Y-m-d', $cert['validFrom_time_t']);
            }
            
            if (isset($cert['validTo_time_t'])) {
                $info['valid_to'] = date('Y-m-d', $cert['validTo_time_t']);
                
                // Check if expired and calculate days until expiry
                $now = time();
                $info['is_expired'] = $cert['validTo_time_t'] < $now;
                $info['days_until_expiry'] = (int)ceil(($cert['validTo_time_t'] - $now) / 86400);
            }
            
            // Extract Subject Alternative Names (SANs) if present
            if (isset($cert['extensions']['subjectAltName'])) {
                // Parse SAN string like "DNS:*.example.com, DNS:example.com"
                $sanString = $cert['extensions']['subjectAltName'];
                preg_match_all('/DNS:([^,\s]+)/', $sanString, $matches);
                if (!empty($matches[1])) {
                    $info['san'] = $matches[1];
                }
            }
            
            // Determine if self-signed
            if (isset($cert['subject']) && isset($cert['issuer'])) {
                $info['is_self_signed'] = $cert['subject'] === $cert['issuer'];
            }
            
            return $info;
            
        } catch (\Exception $e) {
            return ['error' => 'Failed to parse certificate: ' . $e->getMessage()];
        }
    }
    
    /**
     * Prepare certificates for Nginx service.
     * Always returns valid certificates (user-provided or self-signed fallback).
     *
     * @return array Array with 'certPath', 'keyPath', 'usedFallback' keys
     */
    public static function prepareNginxCertificates(): array
    {
        $result = [
            'certPath' => self::NGINX_CERT_FILE,
            'keyPath' => self::NGINX_KEY_FILE,
            'usedFallback' => false
        ];
        
        // Standard fallback paths for Nginx
        $fallbackCertPath = '/etc/ssl/certs/nginx-fallback.crt';
        $fallbackKeyPath = '/etc/ssl/private/nginx-fallback.key';
        
        // Prepare and save certificates
        $certs = self::prepareServiceCertificates(
            $fallbackCertPath,
            $fallbackKeyPath,
            $result['certPath'],
            $result['keyPath'],
            'nginx'
        );
        
        if ($certs['success']) {
            $result['usedFallback'] = $certs['usedFallback'];
            return $result;
        }
        
        // Failed to prepare certificates
        return ['certPath' => '', 'keyPath' => '', 'usedFallback' => false];
    }
    
    /**
     * Prepare certificates for Asterisk services (HTTP, RTP/DTLS, PJSIP/WSS).
     * Uses a unified approach with separate certificate and key files.
     *
     * @param string $service Service identifier for logging ('asterisk-http', 'asterisk-rtp', 'asterisk-pjsip')
     * @return array Array with 'certPath', 'keyPath', 'usedFallback' keys
     */
    public static function prepareAsteriskCertificates(string $service = 'asterisk'): array
    {
        $result = [
            'certPath' => self::ASTERISK_CERT_FILE,
            'keyPath' => self::ASTERISK_KEY_FILE,
            'usedFallback' => false
        ];
        
        // Standard fallback paths for Asterisk
        $fallbackCertPath = self::ASTERISK_KEYS_DIR . '/asterisk-fallback.crt';
        $fallbackKeyPath = self::ASTERISK_KEYS_DIR . '/asterisk-fallback.key';
        
        // Prepare and save certificates
        $certs = self::prepareServiceCertificates(
            $fallbackCertPath,
            $fallbackKeyPath,
            $result['certPath'],
            $result['keyPath'],
            $service
        );
        
        if ($certs['success']) {
            $result['usedFallback'] = $certs['usedFallback'];
            return $result;
        }
        
        // Failed to prepare certificates
        return ['certPath' => '', 'keyPath' => '', 'usedFallback' => false];
    }
    
    /**
     * Common method to prepare certificates for any service.
     * Handles user certificates validation and fallback generation.
     *
     * @param string $fallbackCertPath Path for fallback certificate
     * @param string $fallbackKeyPath Path for fallback key
     * @param string $targetCertPath Path to save the final certificate
     * @param string $targetKeyPath Path to save the final key
     * @param string $service Service name for logging
     * @return array Array with 'success' and 'usedFallback' keys
     */
    private static function prepareServiceCertificates(
        string $fallbackCertPath,
        string $fallbackKeyPath,
        string $targetCertPath,
        string $targetKeyPath,
        string $service
    ): array {
        // Get user certificates from settings
        $userPublicKey = PbxSettings::getValueByKey(PbxSettings::WEB_HTTPS_PUBLIC_KEY);
        $userPrivateKey = PbxSettings::getValueByKey(PbxSettings::WEB_HTTPS_PRIVATE_KEY);
        
        $publicKey = '';
        $privateKey = '';
        $usedFallback = false;
        
        // Try to use user certificates if provided and valid
        if (!empty($userPublicKey) && !empty($userPrivateKey)) {
            if (self::validateCertificatePair($userPublicKey, $userPrivateKey, $service)) {
                $publicKey = $userPublicKey;
                $privateKey = $userPrivateKey;
                SystemMessages::sysLogMsg($service, 'Using user-provided SSL certificates', LOG_INFO);
            } else {
                SystemMessages::sysLogMsg($service, 'User certificates validation failed, will use fallback', LOG_WARNING);
            }
        }
        
        // If no valid user certificates, generate or use fallback
        if (empty($publicKey) || empty($privateKey)) {
            $usedFallback = true;
            
            // Check if fallback certificates exist
            if (file_exists($fallbackCertPath) && file_exists($fallbackKeyPath)) {
                $publicKey = file_get_contents($fallbackCertPath);
                $privateKey = file_get_contents($fallbackKeyPath);

                // Validate fallback certificates (they might be expired)
                if (!self::validateCertificatePair($publicKey, $privateKey, $service)) {
                    // Fallback certificates are invalid, regenerate
                    $publicKey = '';
                    $privateKey = '';
                } else {
                    // Check if hostname changed - if so, regenerate certificate
                    $certDetails = openssl_x509_parse($publicKey);
                    if ($certDetails !== false) {
                        $currentCommonName = $certDetails['subject']['CN'] ?? '';
                        $externalHost = PbxSettings::getValueByKey(PbxSettings::EXTERNAL_SIP_HOST_NAME);

                        if (!empty($externalHost) && $currentCommonName !== $externalHost) {
                            // Hostname changed - regenerate certificate with new hostname
                            SystemMessages::sysLogMsg($service, "Hostname changed from '$currentCommonName' to '$externalHost', regenerating certificate", LOG_INFO);
                            $publicKey = '';
                            $privateKey = '';
                        }
                    }
                }
            }
            
            // Generate new fallback if needed
            if (empty($publicKey) || empty($privateKey)) {
                SystemMessages::sysLogMsg($service, 'Generating new fallback SSL certificates', LOG_INFO);
                $certData = self::generateSelfSignedCertificate();
                
                if (empty($certData['PublicKey']) || empty($certData['PrivateKey'])) {
                    SystemMessages::sysLogMsg($service, 'Failed to generate fallback certificates', LOG_ERR);
                    return ['success' => false, 'usedFallback' => false];
                }
                
                $publicKey = $certData['PublicKey'];
                $privateKey = $certData['PrivateKey'];
                
                // Save fallback certificates for future use
                self::saveCertificatesToFiles($publicKey, $privateKey, $fallbackCertPath, $fallbackKeyPath);
            }
            
            SystemMessages::sysLogMsg($service, 'Using fallback SSL certificates', LOG_INFO);
        }
        
        // Save certificates to target locations
        $success = self::saveCertificatesToFiles($publicKey, $privateKey, $targetCertPath, $targetKeyPath);
        
        if (!$success) {
            SystemMessages::sysLogMsg($service, 'Failed to save certificates to target locations', LOG_ERR);
            return ['success' => false, 'usedFallback' => false];
        }
        
        return ['success' => true, 'usedFallback' => $usedFallback];
    }
    
    /**
     * Save certificates to files with proper permissions.
     *
     * @param string $publicKey Certificate content
     * @param string $privateKey Private key content
     * @param string $certPath Path to save certificate
     * @param string $keyPath Path to save private key
     * @return bool True if all files were saved successfully
     */
    public static function saveCertificatesToFiles(
        string $publicKey,
        string $privateKey,
        string $certPath,
        string $keyPath
    ): bool {
        try {
            // Ensure directories exist
            $certDir = dirname($certPath);
            $keyDir = dirname($keyPath);
            
            if (!is_dir($certDir)) {
                Util::mwMkdir($certDir, true);
            }
            if (!is_dir($keyDir)) {
                Util::mwMkdir($keyDir, true);
            }
            
            // Save certificate
            if (file_put_contents($certPath, $publicKey) === false) {
                return false;
            }
            chmod($certPath, 0644);
            
            // Save private key
            if (file_put_contents($keyPath, $privateKey) === false) {
                return false;
            }
            chmod($keyPath, 0600);
            
            return true;
            
        } catch (\Exception $e) {
            SystemMessages::sysLogMsg(__METHOD__, 'Exception saving certificates: ' . $e->getMessage(), LOG_ERR);
            return false;
        }
    }
    
    /**
     * Check if certificate is still valid (not expired).
     *
     * @param array $certDetails Parsed certificate details
     * @return bool True if certificate is valid
     */
    private static function isCertificateValid(array $certDetails): bool
    {
        $currentTime = time();
        
        // Check if certificate has started
        if (isset($certDetails['validFrom_time_t']) && $certDetails['validFrom_time_t'] > $currentTime) {
            return false; // Certificate not yet valid
        }
        
        // Check if certificate has expired
        if (isset($certDetails['validTo_time_t']) && $certDetails['validTo_time_t'] < $currentTime) {
            return false; // Certificate expired
        }
        
        return true;
    }
    
    /**
     * Verify that certificate and private key match.
     *
     * @param mixed $certResource OpenSSL certificate resource
     * @param mixed $keyResource OpenSSL key resource
     * @return bool True if certificate and key match
     */
    private static function verifyCertificateKeyMatch($certResource, $keyResource): bool
    {
        // Verify the certificate matches the private key by checking if we can create a test signature
        $testData = 'test_signature_data_' . uniqid();
        $signature = '';
        
        if (!openssl_sign($testData, $signature, $keyResource)) {
            return false;
        }
        
        $pubKeyFromCert = openssl_pkey_get_public($certResource);
        if ($pubKeyFromCert === false) {
            return false;
        }
        
        $verifyResult = openssl_verify($testData, $signature, $pubKeyFromCert);
        
        return $verifyResult === 1;
    }
    
}