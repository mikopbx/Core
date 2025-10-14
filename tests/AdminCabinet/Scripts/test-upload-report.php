#!/usr/bin/env php
<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * Test script for BrowserStack JUnit report upload
 *
 * Usage:
 *   php test-upload-report.php /path/to/junit.xml
 *
 * Environment variables:
 *   BROWSERSTACK_USERNAME - BrowserStack username (required)
 *   BROWSERSTACK_ACCESS_KEY - BrowserStack access key (required)
 *   BROWSERSTACK_PROJECT_NAME - Project name (optional)
 *   BROWSERSTACK_BUILD_NAME - Build name (optional)
 *   BROWSERSTACK_TAGS - Comma-separated tags (optional)
 */

require_once __DIR__ . '/../../../vendor/autoload.php';

use MikoPBX\Tests\AdminCabinet\Lib\BrowserStackReportUploader;

// ANSI color codes
const COLOR_GREEN = "\033[0;32m";
const COLOR_RED = "\033[0;31m";
const COLOR_YELLOW = "\033[1;33m";
const COLOR_BLUE = "\033[0;34m";
const COLOR_RESET = "\033[0m";

/**
 * Print colored message
 */
function printMessage(string $message, string $color = COLOR_RESET): void
{
    echo $color . $message . COLOR_RESET . PHP_EOL;
}

/**
 * Print section header
 */
function printHeader(string $title): void
{
    echo PHP_EOL;
    printMessage("==> $title", COLOR_BLUE);
    echo PHP_EOL;
}

/**
 * Main execution
 */
function main(array $argv): int
{
    printHeader("BrowserStack JUnit Report Upload Test");

    // Check arguments
    if (count($argv) < 2) {
        printMessage("Usage: {$argv[0]} /path/to/junit.xml", COLOR_YELLOW);
        printMessage("", COLOR_RESET);
        printMessage("Example:", COLOR_RESET);
        printMessage("  docker exec mikopbx_php83 php {$argv[0]} /tmp/junit.xml", COLOR_RESET);
        return 1;
    }

    $reportPath = $argv[1];

    // Create uploader
    printMessage("[INFO] Initializing uploader...", COLOR_GREEN);
    $uploader = new BrowserStackReportUploader();

    // Show configuration
    printMessage("[INFO] Configuration:", COLOR_GREEN);
    $config = $uploader->getConfig();
    foreach ($config as $key => $value) {
        $displayValue = is_bool($value) ? ($value ? 'true' : 'false') : $value;
        echo "  " . str_pad($key, 20) . ": $displayValue" . PHP_EOL;
    }
    echo PHP_EOL;

    // Check if enabled
    if (!$uploader->isEnabled()) {
        printMessage("[ERROR] BrowserStack upload is disabled!", COLOR_RED);
        printMessage("", COLOR_RESET);
        printMessage("Please set environment variables:", COLOR_RESET);
        printMessage("  export BROWSERSTACK_USERNAME='your_username'", COLOR_RESET);
        printMessage("  export BROWSERSTACK_ACCESS_KEY='your_access_key'", COLOR_RESET);
        return 1;
    }

    // Check report file
    printMessage("[INFO] Checking report file: $reportPath", COLOR_GREEN);
    if (!file_exists($reportPath)) {
        printMessage("[ERROR] Report file not found: $reportPath", COLOR_RED);
        return 1;
    }

    $fileSize = filesize($reportPath);
    $fileSizeKB = round($fileSize / 1024, 2);
    printMessage("[INFO] File size: {$fileSizeKB} KB", COLOR_GREEN);

    // Show file preview
    $content = file_get_contents($reportPath);
    if (preg_match('/<testsuites>.*?<testsuite[^>]*tests="(\d+)"[^>]*failures="(\d+)"[^>]*errors="(\d+)"/', $content, $matches)) {
        printMessage("[INFO] Test Summary:", COLOR_GREEN);
        echo "  Total tests: {$matches[1]}" . PHP_EOL;
        echo "  Failures:    {$matches[2]}" . PHP_EOL;
        echo "  Errors:      {$matches[3]}" . PHP_EOL;
        echo PHP_EOL;
    }

    // Upload report
    printHeader("Uploading Report to BrowserStack");
    printMessage("[INFO] Starting upload...", COLOR_GREEN);

    try {
        $result = $uploader->uploadWithRetry($reportPath);

        printMessage("[SUCCESS] Upload completed!", COLOR_GREEN);
        echo PHP_EOL;
        printMessage("Response:", COLOR_RESET);
        echo json_encode($result, JSON_PRETTY_PRINT) . PHP_EOL;
        echo PHP_EOL;

        if (isset($result['dashboard_url'])) {
            printMessage("View results at:", COLOR_GREEN);
            printMessage("  " . $result['dashboard_url'], COLOR_BLUE);
        }

        return 0;

    } catch (Exception $e) {
        printMessage("[ERROR] Upload failed!", COLOR_RED);
        printMessage("Error: " . $e->getMessage(), COLOR_RED);
        return 1;
    }
}

// Execute
exit(main($argv));
