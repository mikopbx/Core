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

namespace MikoPBX\PBXCoreREST\Lib\Common;

use MikoPBX\Core\System\SystemMessages;

/**
 * Security validator for program code in dialplan applications
 */
class CodeSecurityValidator 
{
    /**
     * Validate code security without breaking syntax
     * 
     * @param string $code The program code to validate
     * @param string $type Code type ('php' or 'plaintext')
     * @param string $applicationName Application name for logging
     * @return array Array of security issues found
     */
    public static function validateCodeSecurity(string $code, string $type, string $applicationName): array
    {
        $securityIssues = [];
        
        // Check for potentially dangerous PHP functions
        if ($type === 'php') {
            $dangerousFunctions = [
                'exec', 'system', 'shell_exec', 'passthru', 'eval',
                'file_get_contents', 'file_put_contents', 'fopen', 'fwrite',
                'curl_exec', 'proc_open', 'popen'
            ];
            
            foreach ($dangerousFunctions as $func) {
                if (preg_match('/\b' . preg_quote($func, '/') . '\s*\(/i', $code)) {
                    $securityIssues[] = "Potentially dangerous function detected: {$func}";
                }
            }
        }
        
        // Check code size limits
        if (strlen($code) > 100000) { // 100KB limit
            $securityIssues[] = 'Code exceeds maximum size limit (100KB)';
        }
        
        // Check for suspicious patterns
        $suspiciousPatterns = [
            '/\$_(?:GET|POST|REQUEST|COOKIE|SERVER)\s*\[/' => 'Direct superglobal access detected',
            '/\bpassword\s*=\s*["\'][^"\']*["\']/i' => 'Hardcoded password detected',
            '/\bapikey\s*=\s*["\'][^"\']*["\']/i' => 'Hardcoded API key detected',
        ];
        
        foreach ($suspiciousPatterns as $pattern => $message) {
            if (preg_match($pattern, $code)) {
                $securityIssues[] = $message;
            }
        }
        
        // Log security audit results
        if (!empty($securityIssues)) {
            SystemMessages::sysLogMsg(
                __METHOD__, 
                "Security audit for dialplan application '{$applicationName}': " . implode(', ', $securityIssues), 
                LOG_WARNING
            );
        }
        
        return $securityIssues;
    }
    
    /**
     * Sanitize code preserving syntax integrity
     * 
     * @param string $code The code to sanitize
     * @param string $type Code type
     * @return string Sanitized code
     */
    public static function sanitizeCodePreservingSyntax(string $code, string $type): string
    {
        // For dialplan applications, we preserve the code as-is
        // since any modification could break the functionality
        // Security validation is done separately without modification
        return $code;
    }
}