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

namespace MikoPBX\Core\Utilities;

/**
 * IPv4 and IPv6 address utility helper.
 *
 * Provides dual-stack IP address validation, version detection, CIDR parsing,
 * and network membership checking for both IPv4 and IPv6 addresses.
 *
 * @package MikoPBX\Core\Utilities
 */
class IpAddressHelper
{
    /**
     * IPv4 version constant
     */
    public const IP_VERSION_4 = 4;

    /**
     * IPv6 version constant
     */
    public const IP_VERSION_6 = 6;

    /**
     * Get IP address version (4, 6, or false if invalid)
     *
     * @param string $ip IP address to check
     * @return int|false Returns 4 for IPv4, 6 for IPv6, false for invalid IP
     */
    public static function getIpVersion(string $ip): int|false
    {
        if (empty($ip)) {
            return false;
        }

        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            return self::IP_VERSION_4;
        }

        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
            return self::IP_VERSION_6;
        }

        return false;
    }

    /**
     * Check if IP address is IPv4
     *
     * @param string $ip IP address to check
     * @return bool True if valid IPv4 address
     */
    public static function isIpv4(string $ip): bool
    {
        return filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) !== false;
    }

    /**
     * Check if IP address is IPv6
     *
     * @param string $ip IP address to check
     * @return bool True if valid IPv6 address
     */
    public static function isIpv6(string $ip): bool
    {
        return filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) !== false;
    }

    /**
     * Parse and normalize CIDR notation
     *
     * Returns array with IP address, prefix length, and IP version.
     * Handles both "192.168.1.0/24" and "2001:db8::/64" formats.
     *
     * @param string $cidr CIDR notation (e.g., "192.168.1.0/24" or "2001:db8::/64")
     * @return array{ip: string, prefix: int, version: int}|false Array with ip, prefix, version or false if invalid
     */
    public static function normalizeCidr(string $cidr): array|false
    {
        if (empty($cidr)) {
            return false;
        }

        // Check if CIDR notation contains '/'
        if (!str_contains($cidr, '/')) {
            return false;
        }

        $parts = explode('/', $cidr, 2);
        if (count($parts) !== 2) {
            return false;
        }

        [$ip, $prefix] = $parts;

        // Validate IP address
        $version = self::getIpVersion($ip);
        if ($version === false) {
            return false;
        }

        // Validate prefix length
        $prefixInt = filter_var($prefix, FILTER_VALIDATE_INT);
        if ($prefixInt === false) {
            return false;
        }

        // Check prefix length range based on IP version
        if ($version === self::IP_VERSION_4) {
            if ($prefixInt < 0 || $prefixInt > 32) {
                return false;
            }
        } elseif ($version === self::IP_VERSION_6) {
            if ($prefixInt < 0 || $prefixInt > 128) {
                return false;
            }
        }

        return [
            'ip' => $ip,
            'prefix' => $prefixInt,
            'version' => $version
        ];
    }

    /**
     * Check if an IP address is within a CIDR network range
     *
     * Supports both IPv4 and IPv6 CIDR notation.
     *
     * @param string $ip IP address to check
     * @param string $cidr CIDR network (e.g., "192.168.1.0/24" or "2001:db8::/64")
     * @return bool True if IP is within the CIDR range
     */
    public static function ipInNetwork(string $ip, string $cidr): bool
    {
        // Parse CIDR notation
        $cidrInfo = self::normalizeCidr($cidr);
        if ($cidrInfo === false) {
            return false;
        }

        // Validate IP address
        $ipVersion = self::getIpVersion($ip);
        if ($ipVersion === false) {
            return false;
        }

        // IP and network must be same version
        if ($ipVersion !== $cidrInfo['version']) {
            return false;
        }

        if ($ipVersion === self::IP_VERSION_4) {
            return self::ipv4InNetwork($ip, $cidrInfo['ip'], $cidrInfo['prefix']);
        } else {
            return self::ipv6InNetwork($ip, $cidrInfo['ip'], $cidrInfo['prefix']);
        }
    }

    /**
     * Validate subnet prefix length for given IP address
     *
     * @param string $ip IP address
     * @param int $prefixLength Prefix length (CIDR bits)
     * @return bool True if prefix length is valid for the IP version
     */
    public static function isValidSubnet(string $ip, int $prefixLength): bool
    {
        $version = self::getIpVersion($ip);
        if ($version === false) {
            return false;
        }

        if ($version === self::IP_VERSION_4) {
            return $prefixLength >= 0 && $prefixLength <= 32;
        } else {
            return $prefixLength >= 0 && $prefixLength <= 128;
        }
    }

    /**
     * Check if IPv4 address is within IPv4 network
     *
     * @param string $ip IPv4 address to check
     * @param string $networkIp IPv4 network address
     * @param int $prefixLength Prefix length (0-32)
     * @return bool True if IP is in network
     */
    private static function ipv4InNetwork(string $ip, string $networkIp, int $prefixLength): bool
    {
        // Convert IP addresses to long integers
        $ipLong = ip2long($ip);
        $networkLong = ip2long($networkIp);

        if ($ipLong === false || $networkLong === false) {
            return false;
        }

        // Calculate subnet mask
        if ($prefixLength === 0) {
            // /0 matches everything
            return true;
        }

        $mask = -1 << (32 - $prefixLength);

        // Compare network portions
        return ($ipLong & $mask) === ($networkLong & $mask);
    }

    /**
     * Check if IPv6 address is within IPv6 network
     *
     * @param string $ip IPv6 address to check
     * @param string $networkIp IPv6 network address
     * @param int $prefixLength Prefix length (0-128)
     * @return bool True if IP is in network
     */
    private static function ipv6InNetwork(string $ip, string $networkIp, int $prefixLength): bool
    {
        // Convert IPv6 addresses to binary
        $ipBin = inet_pton($ip);
        $networkBin = inet_pton($networkIp);

        if ($ipBin === false || $networkBin === false) {
            return false;
        }

        // /0 matches everything
        if ($prefixLength === 0) {
            return true;
        }

        // Calculate how many full bytes to compare
        $fullBytes = intdiv($prefixLength, 8);
        $remainingBits = $prefixLength % 8;

        // Compare full bytes
        if ($fullBytes > 0) {
            if (substr($ipBin, 0, $fullBytes) !== substr($networkBin, 0, $fullBytes)) {
                return false;
            }
        }

        // Compare remaining bits if any
        if ($remainingBits > 0) {
            $mask = 0xFF << (8 - $remainingBits);
            $ipByte = ord($ipBin[$fullBytes]);
            $networkByte = ord($networkBin[$fullBytes]);

            if (($ipByte & $mask) !== ($networkByte & $mask)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Parse IP address with optional port (supports both IPv4 and IPv6)
     *
     * Examples:
     * - IPv6 with port: [2001:db8::1]:5060 → ['2001:db8::1', '5060']
     * - IPv6 without port: 2001:db8::1 → ['2001:db8::1', null]
     * - IPv4 with port: 192.168.1.1:5060 → ['192.168.1.1', '5060']
     * - IPv4 without port: 192.168.1.1 → ['192.168.1.1', null]
     *
     * @param string $value IP address with optional port
     * @return array{0: string, 1: string|null}|false Array with [ip, port] or false if invalid
     */
    public static function parseIpWithOptionalPort(string $value): array|false
    {
        // IPv6 with port: [2001:db8::1]:5060
        if (preg_match('/^\[([^\]]+)\]:(\d+)$/', $value, $matches)) {
            return [$matches[1], $matches[2]];
        }

        // IPv6 without port: 2001:db8::1
        if (str_contains($value, ':') && !str_contains($value, '[')) {
            // Check if it's a valid IPv6 address (not IPv4:port)
            if (filter_var($value, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) !== false) {
                return [$value, null];
            }
        }

        // IPv4 with port: 192.168.1.1:5060
        if (preg_match('/^([^:]+):(\d+)$/', $value, $matches)) {
            // Verify it's IPv4 (to avoid false positives with malformed IPv6)
            if (filter_var($matches[1], FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) !== false) {
                return [$matches[1], $matches[2]];
            }
        }

        // IPv4 without port: 192.168.1.1
        if (filter_var($value, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) !== false) {
            return [$value, null];
        }

        // Unable to parse
        return false;
    }

    /**
     * Validates hostname according to RFC 952 and RFC 1123
     *
     * @param string $hostname Hostname to validate (can be empty)
     * @return bool True if valid, false otherwise
     */
    public static function validateHostname(string $hostname): bool
    {
        // Empty values are allowed
        if (empty($hostname)) {
            return true;
        }

        // Check length (max 253 characters total)
        if (strlen($hostname) > 253) {
            return false;
        }

        // Split into labels
        $labels = explode('.', $hostname);

        foreach ($labels as $label) {
            // Check label length (1-63 characters)
            $labelLength = strlen($label);
            if ($labelLength < 1 || $labelLength > 63) {
                return false;
            }

            // Check label format: only alphanumeric and hyphens, cannot start/end with hyphen
            if (!preg_match('/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/', $label)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Check if IPv6 address is a global unicast address (publicly routable)
     *
     * Global unicast addresses are defined by RFC 4291 as 2000::/3
     * (addresses starting with binary 001, which means first hex digit is 2 or 3)
     *
     * @param string $ip IPv6 address to check (can include CIDR notation)
     * @return bool True if the address is a global unicast IPv6 address
     */
    public static function isGlobalUnicast(string $ip): bool
    {
        if (!self::isIpv6($ip)) {
            return false;
        }

        // Remove CIDR notation if present
        $ipWithoutCidr = explode('/', $ip)[0];

        // Normalize to lowercase and trim
        $normalized = strtolower(trim($ipWithoutCidr));

        // Global Unicast: 2000::/3 (addresses starting with 2 or 3)
        return preg_match('/^[23]/', $normalized) === 1;
    }
}
