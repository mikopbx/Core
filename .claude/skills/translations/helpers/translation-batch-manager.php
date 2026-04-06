#!/usr/bin/env php
<?php
/**
 * Translation Batch Manager
 * Universal helper for processing large translation files in manageable batches
 *
 * Usage:
 *   analyze  <ru_file> <target_lang>           - Analyze file and determine if batching needed
 *   split    <ru_file> <target_lang> [size]    - Split missing translations into batches
 *   merge    <target_file> <batch_json>        - Merge batch data into target file
 *   validate <target_file> <ru_file>           - Validate target against Russian source
 *   status   <ru_file> <target_lang>           - Show translation status
 *
 * Examples:
 *   php translation-batch-manager.php analyze src/Common/Messages/ru/Common.php en
 *   php translation-batch-manager.php split src/Common/Messages/ru/RestApi.php en 100
 *   php translation-batch-manager.php status src/Common/Messages/ru/Common.php de
 */

// Configuration
const DEFAULT_BATCH_SIZE = 100;
const BATCH_THRESHOLD = 300; // Files with > 300 keys should use batching
const PROJECT_ROOT = __DIR__ . '/../../../../';
const TEMP_DIR = PROJECT_ROOT . '.claude/temp/';

// Language names mapping
const LANGUAGE_NAMES = [
    'en' => 'English', 'de' => 'German', 'es' => 'Spanish', 'fr' => 'French',
    'it' => 'Italian', 'nl' => 'Dutch', 'pl' => 'Polish', 'pt' => 'Portuguese',
    'pt_BR' => 'Portuguese (Brazil)', 'ro' => 'Romanian', 'cs' => 'Czech',
    'az' => 'Azerbaijani', 'da' => 'Danish', 'el' => 'Greek', 'fa' => 'Persian',
    'fi' => 'Finnish', 'he' => 'Hebrew', 'hr' => 'Croatian', 'hu' => 'Hungarian',
    'ja' => 'Japanese', 'ka' => 'Georgian', 'sv' => 'Swedish', 'th' => 'Thai',
    'tr' => 'Turkish', 'uk' => 'Ukrainian', 'vi' => 'Vietnamese',
    'zh_Hans' => 'Simplified Chinese', 'ru' => 'Russian'
];

// Main execution
if (php_sapi_name() !== 'cli') {
    die("This script must be run from command line\n");
}

$command = $argv[1] ?? '';
$args = array_slice($argv, 2);

switch ($command) {
    case 'analyze':
        handleAnalyze($args);
        break;
    case 'split':
        handleSplit($args);
        break;
    case 'merge':
        handleMerge($args);
        break;
    case 'validate':
        handleValidate($args);
        break;
    case 'status':
        handleStatus($args);
        break;
    case 'help':
    case '--help':
    case '-h':
    default:
        showHelp();
        exit($command === '' ? 1 : 0);
}

// ============================================================================
// Command Handlers
// ============================================================================

function handleAnalyze(array $args): void
{
    if (count($args) < 2) {
        die("Usage: analyze <ru_file> <target_lang>\n");
    }

    [$ruFile, $targetLang] = $args;
    $ruFile = resolveFilePath($ruFile);

    if (!file_exists($ruFile)) {
        die("ERROR: Russian source file not found: $ruFile\n");
    }

    $ruData = include $ruFile;
    $ruCount = count($ruData);

    // Determine target file path
    $targetFile = str_replace('/ru/', "/$targetLang/", $ruFile);
    $targetData = file_exists($targetFile) ? include $targetFile : [];
    $targetCount = count($targetData);

    // Calculate missing and extra keys
    $missing = array_diff_key($ruData, $targetData);
    $extra = array_diff_key($targetData, $ruData);
    $missingCount = count($missing);
    $extraCount = count($extra);

    // Determine if batching is needed
    $needsBatching = $missingCount > BATCH_THRESHOLD;
    $batchSize = DEFAULT_BATCH_SIZE;
    $totalBatches = $needsBatching ? (int)ceil($missingCount / $batchSize) : 0;

    // Calculate average value length for context estimation
    $avgLength = 0;
    if ($missingCount > 0) {
        $totalLength = array_sum(array_map('strlen', $missing));
        $avgLength = (int)($totalLength / $missingCount);
    }

    // Output analysis in JSON format for easy parsing
    $analysis = [
        'file' => basename($ruFile),
        'language' => $targetLang,
        'language_name' => LANGUAGE_NAMES[$targetLang] ?? $targetLang,
        'source_keys' => $ruCount,
        'target_keys' => $targetCount,
        'missing_keys' => $missingCount,
        'extra_keys' => $extraCount,
        'avg_value_length' => $avgLength,
        'needs_batching' => $needsBatching,
        'batch_size' => $batchSize,
        'total_batches' => $totalBatches,
        'status' => $missingCount === 0 ? 'complete' : ($needsBatching ? 'batch_mode' : 'direct_mode')
    ];

    echo json_encode($analysis, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
}

function handleSplit(array $args): void
{
    if (count($args) < 2) {
        die("Usage: split <ru_file> <target_lang> [batch_size]\n");
    }

    $ruFile = resolveFilePath($args[0]);
    $targetLang = $args[1];
    $batchSize = isset($args[2]) ? (int)$args[2] : DEFAULT_BATCH_SIZE;

    if (!file_exists($ruFile)) {
        die("ERROR: Russian source file not found: $ruFile\n");
    }

    $ruData = include $ruFile;
    $targetFile = str_replace('/ru/', "/$targetLang/", $ruFile);
    $targetData = file_exists($targetFile) ? include $targetFile : [];

    // Find missing keys
    $missing = array_diff_key($ruData, $targetData);
    $missingCount = count($missing);

    if ($missingCount === 0) {
        echo json_encode(['status' => 'complete', 'message' => 'No missing keys']) . "\n";
        return;
    }

    // Split into batches
    $batches = array_chunk($missing, $batchSize, true);
    $totalBatches = count($batches);

    // Save batches to temp directory
    $fileName = basename($ruFile, '.php');
    $batchDir = TEMP_DIR . "batches/{$targetLang}_{$fileName}/";

    if (!is_dir($batchDir)) {
        mkdir($batchDir, 0755, true);
    }

    $batchFiles = [];
    foreach ($batches as $index => $batch) {
        $batchNum = $index + 1;
        $batchFile = $batchDir . "batch_{$batchNum}.json";

        $batchData = [
            'batch_num' => $batchNum,
            'total_batches' => $totalBatches,
            'keys' => $batch
        ];

        file_put_contents($batchFile, json_encode($batchData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        $batchFiles[] = $batchFile;
    }

    $result = [
        'status' => 'batches_created',
        'total_batches' => $totalBatches,
        'batch_size' => $batchSize,
        'missing_keys' => $missingCount,
        'batch_dir' => $batchDir,
        'batch_files' => $batchFiles
    ];

    echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
}

function handleMerge(array $args): void
{
    if (count($args) < 2) {
        die("Usage: merge <target_file> <batch_json>\n");
    }

    $targetFile = resolveFilePath($args[0]);
    $batchJson = $args[1];

    if (!file_exists($batchJson)) {
        die("ERROR: Batch JSON file not found: $batchJson\n");
    }

    // Load batch data
    $batchData = json_decode(file_get_contents($batchJson), true);
    if (!isset($batchData['keys'])) {
        die("ERROR: Invalid batch JSON format\n");
    }

    // Load existing target data
    $targetData = file_exists($targetFile) ? include $targetFile : [];

    // Merge batch translations
    $mergedData = array_merge($targetData, $batchData['keys']);

    // Get Russian source to maintain key order
    $ruFile = str_replace('/' . basename(dirname($targetFile)) . '/', '/ru/', $targetFile);
    if (!file_exists($ruFile)) {
        die("ERROR: Russian source file not found: $ruFile\n");
    }

    $ruData = include $ruFile;

    // Rebuild in Russian key order
    $orderedData = [];
    foreach ($ruData as $key => $ruValue) {
        if (isset($mergedData[$key])) {
            $orderedData[$key] = $mergedData[$key];
        }
    }

    // Generate PHP file
    $phpCode = generatePhpFile($orderedData, basename($targetFile));

    // Save to target file
    $backupFile = $targetFile . '.backup';
    if (file_exists($targetFile)) {
        copy($targetFile, $backupFile);
    }

    file_put_contents($targetFile, $phpCode);

    // Validate syntax
    $syntaxCheck = shell_exec('php -l ' . escapeshellarg($targetFile) . ' 2>&1');
    $syntaxValid = strpos($syntaxCheck, 'No syntax errors') !== false;

    $result = [
        'status' => $syntaxValid ? 'merged' : 'error',
        'target_file' => $targetFile,
        'keys_merged' => count($batchData['keys']),
        'total_keys' => count($orderedData),
        'expected_keys' => count($ruData),
        'syntax_valid' => $syntaxValid,
        'backup_file' => file_exists($backupFile) ? $backupFile : null
    ];

    echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
}

function handleValidate(array $args): void
{
    if (count($args) < 2) {
        die("Usage: validate <target_file> <ru_file>\n");
    }

    $targetFile = resolveFilePath($args[0]);
    $ruFile = resolveFilePath($args[1]);

    if (!file_exists($targetFile)) {
        die("ERROR: Target file not found: $targetFile\n");
    }
    if (!file_exists($ruFile)) {
        die("ERROR: Russian file not found: $ruFile\n");
    }

    // Load files
    $targetData = include $targetFile;
    $ruData = include $ruFile;

    // Validate PHP syntax
    $syntaxCheck = shell_exec('php -l ' . escapeshellarg($targetFile) . ' 2>&1');
    $syntaxValid = strpos($syntaxCheck, 'No syntax errors') !== false;

    // Compare keys
    $targetCount = count($targetData);
    $ruCount = count($ruData);
    $missing = array_keys(array_diff_key($ruData, $targetData));
    $extra = array_keys(array_diff_key($targetData, $ruData));

    // Check placeholder consistency
    $placeholderErrors = [];
    foreach ($targetData as $key => $value) {
        if (isset($ruData[$key])) {
            $ruPlaceholders = extractPlaceholders($ruData[$key]);
            $targetPlaceholders = extractPlaceholders($value);
            if ($ruPlaceholders !== $targetPlaceholders) {
                $placeholderErrors[] = [
                    'key' => $key,
                    'expected' => $ruPlaceholders,
                    'found' => $targetPlaceholders
                ];
            }
        }
    }

    $isValid = $syntaxValid && $targetCount === $ruCount && empty($missing) && empty($extra) && empty($placeholderErrors);

    $result = [
        'valid' => $isValid,
        'syntax_valid' => $syntaxValid,
        'target_keys' => $targetCount,
        'expected_keys' => $ruCount,
        'keys_match' => $targetCount === $ruCount,
        'missing_keys' => $missing,
        'extra_keys' => $extra,
        'placeholder_errors' => $placeholderErrors
    ];

    echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
}

function handleStatus(array $args): void
{
    if (count($args) < 2) {
        die("Usage: status <ru_file> <target_lang>\n");
    }

    $ruFile = resolveFilePath($args[0]);
    $targetLang = $args[1];

    handleAnalyze([$ruFile, $targetLang]); // Reuse analyze command
}

// ============================================================================
// Helper Functions
// ============================================================================

function resolveFilePath(string $path): string
{
    if (file_exists($path)) {
        return $path;
    }

    // Try resolving relative to project root
    $resolved = PROJECT_ROOT . ltrim($path, '/');
    if (file_exists($resolved)) {
        return $resolved;
    }

    return $path; // Return as-is, will fail in caller
}

function generatePhpFile(array $data, string $fileName): string
{
    $moduleName = ucfirst(str_replace('.php', '', $fileName));

    $phpCode = <<<'PHP'
<?php
/**
 * Translation file - %MODULE%
 * Generated/updated by Translation Batch Manager
 */

return [

PHP;

    $phpCode = str_replace('%MODULE%', $moduleName, $phpCode);
    $phpCode .= "\n";

    foreach ($data as $key => $value) {
        $escapedKey = addcslashes($key, "'\\");
        $escapedValue = addcslashes($value, "'\\");
        $phpCode .= "    '{$escapedKey}' => '{$escapedValue}',\n";
    }

    $phpCode .= "];\n";

    return $phpCode;
}

function extractPlaceholders(string $text): array
{
    preg_match_all('/%([a-zA-Z0-9_]+)%/', $text, $matches);
    return $matches[1] ?? [];
}

function showHelp(): void
{
    echo <<<'HELP'
Translation Batch Manager - Universal helper for large translation files

COMMANDS:
  analyze  <ru_file> <target_lang>        Analyze file and determine batching strategy
  split    <ru_file> <target_lang> [size] Split missing translations into batches
  merge    <target_file> <batch_json>     Merge batch translations into target file
  validate <target_file> <ru_file>        Validate target file against Russian source
  status   <ru_file> <target_lang>        Show current translation status

EXAMPLES:
  # Analyze Common.php for German translation
  php translation-batch-manager.php analyze src/Common/Messages/ru/Common.php de

  # Split RestApi.php into 100-key batches for English
  php translation-batch-manager.php split src/Common/Messages/ru/RestApi.php en 100

  # Merge batch translations into target file
  php translation-batch-manager.php merge src/Common/Messages/en/Common.php batch_1.json

  # Validate French translation of Extensions.php
  php translation-batch-manager.php validate src/Common/Messages/fr/Extensions.php src/Common/Messages/ru/Extensions.php

  # Check translation status
  php translation-batch-manager.php status src/Common/Messages/ru/GeneralSettings.php es

OUTPUT FORMAT:
  All commands output JSON for easy parsing by agents and scripts

THRESHOLDS:
  Batch mode threshold: 300 keys
  Default batch size: 100 keys

HELP;
}
