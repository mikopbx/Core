<?php

declare(strict_types=1);

/**
 * Validate module-owned OpenAPI translation keys in English and Russian catalogs.
 *
 * Usage:
 *   php validate-rest-api-translations.php /path/to/ModuleName
 */

$arguments = $_SERVER['argv'] ?? [];
if (!is_array($arguments) || count($arguments) !== 2 || !isset($arguments[1]) || !is_string($arguments[1])) {
    fwrite(STDERR, "Usage: php validate-rest-api-translations.php /path/to/ModuleName\n");
    exit(2);
}

$moduleDir = realpath($arguments[1]);
if ($moduleDir === false || !is_dir($moduleDir)) {
    fwrite(STDERR, "Module directory does not exist: {$arguments[1]}\n");
    exit(2);
}

$restApiDir = $moduleDir . '/Lib/RestAPI';
if (!is_dir($restApiDir)) {
    echo "OpenAPI translations: SKIP (Lib/RestAPI is absent)\n";
    exit(0);
}

/** @return list<string> */
function phpFilesRecursively(string $directory): array
{
    $files = [];
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($directory, FilesystemIterator::SKIP_DOTS)
    );

    foreach ($iterator as $file) {
        if ($file->isFile() && $file->getExtension() === 'php') {
            $files[] = $file->getPathname();
        }
    }

    sort($files);
    return $files;
}

/** @return array<string, string> */
function loadCatalog(string $messagesDir, string $locale): array
{
    $catalog = [];
    $directoryLayout = $messagesDir . '/' . $locale;
    $singleFileLayout = $messagesDir . '/' . $locale . '.php';

    if (is_dir($directoryLayout)) {
        $files = glob($directoryLayout . '/*.php') ?: [];
        sort($files);
        foreach ($files as $file) {
            $translations = require $file;
            if (is_array($translations)) {
                $catalog = array_merge($catalog, $translations);
            }
        }
        return $catalog;
    }

    if (is_file($singleFileLayout)) {
        $translations = require $singleFileLayout;
        if (is_array($translations)) {
            $catalog = $translations;
        }
    }

    return $catalog;
}

/**
 * @param list<string> $files
 * @return list<string>
 */
function collectOpenApiKeys(array $files): array
{
    $keys = [];
    foreach ($files as $file) {
        $source = file_get_contents($file);
        if ($source === false) {
            continue;
        }
        preg_match_all('/[\'\"]((?:rest|module)_[A-Za-z0-9_]+)[\'\"]/', $source, $matches);
        $keys = array_merge($keys, $matches[1]);
    }

    $keys = array_values(array_unique($keys));
    sort($keys);
    return $keys;
}

/**
 * @param list<string> $files
 * @return list<string>
 */
function collectTagKeys(array $files): array
{
    $keys = [];
    foreach ($files as $file) {
        if (basename($file) !== 'Controller.php') {
            continue;
        }

        $source = file_get_contents($file);
        if ($source === false) {
            continue;
        }

        preg_match_all('/tags\s*:\s*\[(.*?)\]/s', $source, $tagLists);
        foreach ($tagLists[1] as $tagList) {
            preg_match_all('/[\'\"]([^\'\"]+)[\'\"]/', $tagList, $tags);
            foreach ($tags[1] as $tag) {
                $cleaned = preg_replace('/[^a-zA-Z0-9\s]/', '', $tag) ?? '';
                $pascalCase = str_replace(' ', '', ucwords($cleaned));
                $keys[] = 'rest_tag_' . $pascalCase;
            }
        }
    }

    $keys = array_values(array_unique($keys));
    sort($keys);
    return $keys;
}

/**
 * @param list<string> $files
 * @return array{keys: list<string>, raw: list<string>}
 */
function collectTranslatableMetadata(array $files, string $restApiDir): array
{
    $keys = [];
    $raw = [];

    foreach ($files as $file) {
        $basename = basename($file);
        if ($basename !== 'Controller.php' && !str_contains($basename, 'DataStructure')) {
            continue;
        }

        $source = file_get_contents($file);
        if ($source === false) {
            continue;
        }

        $values = [];
        if ($basename === 'Controller.php') {
            preg_match_all('/(?:summary|description)\s*:\s*([\'\"])(.*?)\1/s', $source, $namedArguments);
            preg_match_all('/ApiResponse\(\s*\d+\s*,\s*([\'\"])(.*?)\1/s', $source, $responses);
            $values = array_merge($values, $namedArguments[2], $responses[2]);
        }

        if (str_contains($basename, 'DataStructure')) {
            preg_match_all('/[\'\"]description[\'\"]\s*=>\s*([\'\"])(.*?)\1/s', $source, $descriptions);
            $values = array_merge($values, $descriptions[2]);
        }

        $relativePath = ltrim(str_replace($restApiDir, '', $file), DIRECTORY_SEPARATOR);
        foreach ($values as $value) {
            if (preg_match('/^[A-Za-z][A-Za-z0-9]*(?:_[A-Za-z0-9]+)+$/', $value) === 1) {
                $keys[] = $value;
                continue;
            }
            $raw[] = $relativePath . ': ' . $value;
        }
    }

    $keys = array_values(array_unique($keys));
    $raw = array_values(array_unique($raw));
    sort($keys);
    sort($raw);
    return ['keys' => $keys, 'raw' => $raw];
}

$coreRoot = dirname(__DIR__, 4);
$coreEnglish = loadCatalog($coreRoot . '/src/Common/Messages', 'en');
$restFiles = phpFilesRecursively($restApiDir);
$referencedKeys = collectOpenApiKeys($restFiles);
$metadata = collectTranslatableMetadata($restFiles, $restApiDir);
$referencedKeys = array_values(array_unique(array_merge($referencedKeys, $metadata['keys'])));
$moduleOwnedKeys = array_values(array_diff($referencedKeys, array_keys($coreEnglish)));
$requiredKeys = array_values(array_unique(array_merge($moduleOwnedKeys, collectTagKeys($restFiles))));
sort($requiredKeys);

$failed = $metadata['raw'] !== [];
if ($metadata['raw'] !== []) {
    fwrite(STDERR, 'Raw OpenAPI text must be replaced with translation keys (' . count($metadata['raw']) . "):\n");
    foreach ($metadata['raw'] as $rawText) {
        fwrite(STDERR, "  {$rawText}\n");
    }
}

foreach (['en', 'ru'] as $locale) {
    $catalog = loadCatalog($moduleDir . '/Messages', $locale);
    $missing = [];
    foreach ($requiredKeys as $key) {
        $value = $catalog[$key] ?? null;
        if (!is_string($value) || trim($value) === '' || $value === $key) {
            $missing[] = $key;
        }
    }

    if ($missing !== []) {
        $failed = true;
        fwrite(STDERR, strtoupper($locale) . ': missing or untranslated OpenAPI keys (' . count($missing) . "):\n");
        foreach ($missing as $key) {
            fwrite(STDERR, "  {$key}\n");
        }
    }
}

if ($failed) {
    exit(1);
}

echo 'OpenAPI translations: PASS (' . count($requiredKeys) . " module-owned keys, en/ru)\n";
