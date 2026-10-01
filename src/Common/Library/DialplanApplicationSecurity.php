<?php

declare(strict_types=1);

namespace MikoPBX\Common\Library;

use InvalidArgumentException;

/**
 * Security boundary for dialplan application identifiers and generated AGI scripts.
 */
final class DialplanApplicationSecurity
{
    public const string ID_SCHEMA_PATTERN = '^[A-Za-z0-9-]{1,128}$';

    public const string ID_PATTERN = '/' . self::ID_SCHEMA_PATTERN . '/D';

    public static function isValidId(mixed $id): bool
    {
        return is_string($id) && preg_match(self::ID_PATTERN, $id) === 1;
    }

    public static function buildScriptPath(string $agiBinDir, mixed $id): string
    {
        if (!self::isValidId($id)) {
            throw new InvalidArgumentException('Invalid dialplan application ID');
        }

        return rtrim($agiBinDir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $id . '.php';
    }

    public static function writeScript(string $agiBinDir, mixed $id, string $contents): bool
    {
        if (!is_dir($agiBinDir)) {
            return false;
        }

        try {
            $targetPath = self::buildScriptPath($agiBinDir, $id);
        } catch (InvalidArgumentException) {
            return false;
        }

        $temporaryPath = @tempnam($agiBinDir, '.dialplan-');
        if ($temporaryPath === false) {
            return false;
        }

        $written = @file_put_contents($temporaryPath, $contents, LOCK_EX);
        if ($written === false || !@chmod($temporaryPath, 0755) || !@rename($temporaryPath, $targetPath)) {
            @unlink($temporaryPath);
            return false;
        }

        return true;
    }
}
