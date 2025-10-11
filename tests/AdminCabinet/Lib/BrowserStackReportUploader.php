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

namespace MikoPBX\Tests\AdminCabinet\Lib;

use GuzzleHttp\Client as GuzzleHttpClient;
use GuzzleHttp\Exception\GuzzleException;
use RuntimeException;

/**
 * Class BrowserStackReportUploader
 *
 * Uploads JUnit XML test reports to BrowserStack Test Observability API
 *
 * @package MikoPBX\Tests\AdminCabinet\Lib
 */
class BrowserStackReportUploader
{
    /**
     * BrowserStack API endpoint for uploading JUnit reports
     */
    private const API_ENDPOINT = 'https://upload-automation.browserstack.com/upload';

    /**
     * Maximum allowed file size (100MB)
     */
    private const MAX_FILE_SIZE = 104857600;

    /**
     * Default project name
     */
    private const DEFAULT_PROJECT_NAME = 'MikoPBX AdminCabinet Tests';

    /**
     * Default framework version
     */
    private const DEFAULT_FRAMEWORK_VERSION = 'phpunit, 9.6.22';

    /**
     * Default tags
     */
    private const DEFAULT_TAGS = 'phpunit,selenium,admin-cabinet,automated';

    /**
     * @var GuzzleHttpClient
     */
    private GuzzleHttpClient $httpClient;

    /**
     * @var string|null
     */
    private ?string $username;

    /**
     * @var string|null
     */
    private ?string $accessKey;

    /**
     * @var bool
     */
    private bool $enabled;

    /**
     * BrowserStackReportUploader constructor.
     *
     * @param string|null $username BrowserStack username (optional, reads from env)
     * @param string|null $accessKey BrowserStack access key (optional, reads from env)
     */
    public function __construct(?string $username = null, ?string $accessKey = null)
    {
        $this->username = $username ?? getenv('BROWSERSTACK_USERNAME') ?: null;
        $this->accessKey = $accessKey ?? getenv('BROWSERSTACK_ACCESS_KEY') ?: null;

        // Disable if credentials not available
        $this->enabled = !empty($this->username) && !empty($this->accessKey);

        $this->httpClient = new GuzzleHttpClient([
            'timeout' => 60,
            'connect_timeout' => 10,
        ]);
    }

    /**
     * Check if uploader is enabled (credentials available)
     *
     * @return bool
     */
    public function isEnabled(): bool
    {
        return $this->enabled;
    }

    /**
     * Upload JUnit XML report to BrowserStack
     *
     * @param string $reportPath Path to JUnit XML file
     * @param array $options Additional options:
     *                       - projectName: Project name (default: from env or constant)
     *                       - buildName: Build name (default: "Build <timestamp>")
     *                       - buildIdentifier: Unique build ID (default: timestamp)
     *                       - tags: Comma-separated tags (default: from env or constant)
     *                       - ciLink: CI job URL (optional)
     *                       - frameworkVersion: Framework version (default: constant)
     *
     * @return array Response from BrowserStack API
     * @throws RuntimeException If upload fails
     */
    public function upload(string $reportPath, array $options = []): array
    {
        if (!$this->enabled) {
            throw new RuntimeException(
                'BrowserStack report upload is disabled. ' .
                'Set BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY environment variables.'
            );
        }

        // Validate report file
        $this->validateReportFile($reportPath);

        // Prepare upload parameters
        $params = $this->prepareUploadParams($reportPath, $options);

        try {
            // Perform upload
            $response = $this->httpClient->post(self::API_ENDPOINT, [
                'auth' => [$this->username, $this->accessKey],
                'multipart' => $params,
            ]);

            // Parse response
            $statusCode = $response->getStatusCode();
            $body = json_decode($response->getBody()->getContents(), true);

            if ($statusCode !== 200) {
                throw new RuntimeException(
                    "Upload failed with HTTP status $statusCode: " .
                    ($body['message'] ?? 'Unknown error')
                );
            }

            return [
                'success' => true,
                'status_code' => $statusCode,
                'response' => $body,
                'message' => $body['message'] ?? 'Report uploaded successfully',
                'dashboard_url' => 'https://observability.browserstack.com/',
            ];

        } catch (GuzzleException $e) {
            throw new RuntimeException(
                "Failed to upload report to BrowserStack: " . $e->getMessage(),
                $e->getCode(),
                $e
            );
        }
    }

    /**
     * Upload report with automatic retry on failure
     *
     * @param string $reportPath Path to JUnit XML file
     * @param array $options Upload options
     * @param int $maxRetries Maximum number of retry attempts (default: 3)
     * @param int $retryDelay Delay between retries in seconds (default: 2)
     *
     * @return array Response from BrowserStack API
     * @throws RuntimeException If all retry attempts fail
     */
    public function uploadWithRetry(
        string $reportPath,
        array $options = [],
        int $maxRetries = 3,
        int $retryDelay = 2
    ): array {
        $lastException = null;

        for ($attempt = 1; $attempt <= $maxRetries; $attempt++) {
            try {
                return $this->upload($reportPath, $options);
            } catch (RuntimeException $e) {
                $lastException = $e;

                if ($attempt < $maxRetries) {
                    // Wait before retry
                    sleep($retryDelay);
                    error_log(
                        "BrowserStack upload attempt $attempt failed, retrying... " .
                        "Error: " . $e->getMessage()
                    );
                }
            }
        }

        throw new RuntimeException(
            "Failed to upload report after $maxRetries attempts. " .
            "Last error: " . $lastException->getMessage(),
            0,
            $lastException
        );
    }

    /**
     * Validate JUnit XML report file
     *
     * @param string $reportPath Path to report file
     * @throws RuntimeException If validation fails
     */
    private function validateReportFile(string $reportPath): void
    {
        // Check file exists
        if (!file_exists($reportPath)) {
            throw new RuntimeException("Report file not found: $reportPath");
        }

        // Check file is readable
        if (!is_readable($reportPath)) {
            throw new RuntimeException("Report file is not readable: $reportPath");
        }

        // Check file size
        $fileSize = filesize($reportPath);
        if ($fileSize === false) {
            throw new RuntimeException("Cannot determine file size: $reportPath");
        }

        if ($fileSize > self::MAX_FILE_SIZE) {
            $sizeMB = round($fileSize / 1048576, 2);
            $maxMB = round(self::MAX_FILE_SIZE / 1048576);
            throw new RuntimeException(
                "Report file is too large ({$sizeMB}MB). Maximum allowed size is {$maxMB}MB."
            );
        }

        if ($fileSize === 0) {
            throw new RuntimeException("Report file is empty: $reportPath");
        }

        // Validate XML structure (basic check)
        $content = file_get_contents($reportPath);
        if ($content === false) {
            throw new RuntimeException("Cannot read report file: $reportPath");
        }

        if (strpos($content, '<?xml') !== 0) {
            throw new RuntimeException("Report file does not appear to be valid XML: $reportPath");
        }

        if (strpos($content, '<testsuites') === false) {
            throw new RuntimeException(
                "Report file does not contain JUnit XML structure: $reportPath"
            );
        }
    }

    /**
     * Prepare upload parameters
     *
     * @param string $reportPath Path to JUnit XML file
     * @param array $options User-provided options
     * @return array Multipart form data array for Guzzle
     */
    private function prepareUploadParams(string $reportPath, array $options): array
    {
        // Generate default values
        $timestamp = date('Y-m-d H:i:s');
        $buildNumber = getenv('BUILD_NUMBER') ?: getenv('CI_PIPELINE_ID') ?: 'local-' . time();

        // Prepare parameters
        $params = [
            [
                'name' => 'data',
                'contents' => fopen($reportPath, 'r'),
                'filename' => basename($reportPath),
            ],
            [
                'name' => 'projectName',
                'contents' => $options['projectName']
                    ?? getenv('BROWSERSTACK_PROJECT_NAME')
                    ?: self::DEFAULT_PROJECT_NAME,
            ],
            [
                'name' => 'buildName',
                'contents' => $options['buildName']
                    ?? getenv('BROWSERSTACK_BUILD_NAME')
                    ?: "Build $timestamp",
            ],
            [
                'name' => 'buildIdentifier',
                'contents' => $options['buildIdentifier'] ?? $buildNumber,
            ],
            [
                'name' => 'tags',
                'contents' => $options['tags']
                    ?? getenv('BROWSERSTACK_TAGS')
                    ?: self::DEFAULT_TAGS,
            ],
            [
                'name' => 'frameworkVersion',
                'contents' => $options['frameworkVersion'] ?? self::DEFAULT_FRAMEWORK_VERSION,
            ],
        ];

        // Add optional CI link if provided
        $ciLink = $options['ciLink'] ?? getenv('CI_JOB_URL') ?? null;
        if (!empty($ciLink)) {
            $params[] = [
                'name' => 'ci',
                'contents' => $ciLink,
            ];
        }

        return $params;
    }

    /**
     * Get configuration summary
     *
     * @return array Configuration details
     */
    public function getConfig(): array
    {
        return [
            'enabled' => $this->enabled,
            'username' => $this->username ? substr($this->username, 0, 3) . '***' : null,
            'api_endpoint' => self::API_ENDPOINT,
            'max_file_size_mb' => round(self::MAX_FILE_SIZE / 1048576),
            'default_project' => self::DEFAULT_PROJECT_NAME,
            'default_tags' => self::DEFAULT_TAGS,
            'framework_version' => self::DEFAULT_FRAMEWORK_VERSION,
        ];
    }
}
