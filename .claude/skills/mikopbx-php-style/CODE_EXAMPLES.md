# PHP Code Examples for MikoPBX

This document provides comprehensive, real-world code examples following PSR standards and MikoPBX conventions.

## Table of Contents

1. [Complete Class Examples](#complete-class-examples)
2. [Phalcon Models](#phalcon-models)
3. [Controllers](#controllers)
4. [Background Workers](#background-workers)
5. [Service Providers](#service-providers)
6. [REST API Controllers](#rest-api-controllers)
7. [Exception Classes](#exception-classes)
8. [Enums](#enums)
9. [Traits](#traits)
10. [Modern PHP Features](#modern-php-features)

---

## Complete Class Examples

### Example 1: Service Class with Full Type Safety

```php
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

namespace MikoPBX\Core\Services;

use MikoPBX\Common\Models\Extensions;
use MikoPBX\Core\Exceptions\ValidationException;
use Psr\Log\LoggerInterface;

/**
 * Service for managing PBX extensions
 *
 * This service handles CRUD operations for extensions,
 * including validation, password strength checking, and
 * codec configuration.
 *
 * @package MikoPBX\Core\Services
 */
class ExtensionService
{
    // Constants
    private const int MIN_EXTENSION_LENGTH = 2;
    private const int MAX_EXTENSION_LENGTH = 10;
    private const int PASSWORD_MIN_STRENGTH = 3;

    // Properties
    private array $allowedCodecs = [];
    private ?array $cache = null;

    /**
     * Constructor with dependency injection
     *
     * @param LoggerInterface $logger PSR-3 logger
     * @param ConfigManager $config Configuration manager
     */
    public function __construct(
        private readonly LoggerInterface $logger,
        private readonly ConfigManager $config
    ) {
        $this->allowedCodecs = $this->config->getArray('allowed_codecs', ['ulaw', 'alaw']);
    }

    /**
     * Create new extension with validation
     *
     * @param array<string, mixed> $data Extension data
     * @return Extensions Created extension model
     *
     * @throws ValidationException If validation fails
     */
    public function createExtension(array $data): Extensions
    {
        $this->logger->info('Creating new extension', ['number' => $data['number'] ?? 'unknown']);

        // Validate input data
        $this->validateExtensionData($data);

        // Create model
        $extension = new Extensions();
        $extension->number = $data['number'];
        $extension->callerid = $data['callerid'] ?? '';
        $extension->type = $data['type'] ?? 'SIP';

        if (!$extension->save()) {
            $errors = $extension->getMessages();
            $this->logger->error('Failed to create extension', [
                'number' => $data['number'],
                'errors' => $errors
            ]);

            throw new ValidationException(
                'Extension creation failed: ' . implode(', ', $errors)
            );
        }

        $this->logger->info('Extension created successfully', [
            'id' => $extension->id,
            'number' => $extension->number
        ]);

        return $extension;
    }

    /**
     * Get extensions with weak passwords
     *
     * @return array<int, array{id: string, number: string, strength: int}>
     */
    public function getExtensionsWithWeakPasswords(): array
    {
        $weakExtensions = [];

        $extensions = Extensions::find([
            'conditions' => 'type = :type:',
            'bind' => ['type' => 'SIP']
        ]);

        foreach ($extensions as $extension) {
            $strength = $this->calculatePasswordStrength($extension->secret ?? '');

            if ($strength < self::PASSWORD_MIN_STRENGTH) {
                $weakExtensions[] = [
                    'id' => $extension->id,
                    'number' => $extension->number,
                    'strength' => $strength
                ];
            }
        }

        return $weakExtensions;
    }

    /**
     * Update extension codecs
     *
     * @param string $extensionId Extension ID
     * @param array<int, string> $codecs List of codec names
     * @return bool Success status
     */
    public function updateCodecs(string $extensionId, array $codecs): bool
    {
        // Validate codecs
        foreach ($codecs as $codec) {
            if (!in_array($codec, $this->allowedCodecs, true)) {
                $this->logger->warning('Invalid codec specified', [
                    'codec' => $codec,
                    'allowed' => $this->allowedCodecs
                ]);
                return false;
            }
        }

        $extension = Extensions::findFirst($extensionId);
        if ($extension === null) {
            $this->logger->error('Extension not found', ['id' => $extensionId]);
            return false;
        }

        $extension->codecs = json_encode($codecs);

        return $extension->save();
    }

    /**
     * Validate extension data
     *
     * @param array<string, mixed> $data Extension data
     *
     * @throws ValidationException If validation fails
     */
    protected function validateExtensionData(array $data): void
    {
        // Check required fields
        if (empty($data['number'])) {
            throw new ValidationException('Extension number is required');
        }

        // Validate number format
        $number = (string) $data['number'];
        $length = strlen($number);

        if ($length < self::MIN_EXTENSION_LENGTH || $length > self::MAX_EXTENSION_LENGTH) {
            throw new ValidationException(
                sprintf(
                    'Extension number must be between %d and %d characters',
                    self::MIN_EXTENSION_LENGTH,
                    self::MAX_EXTENSION_LENGTH
                )
            );
        }

        if (!preg_match('/^[0-9]+$/', $number)) {
            throw new ValidationException('Extension number must contain only digits');
        }

        // Check for duplicates
        if ($this->extensionExists($number)) {
            throw new ValidationException("Extension {$number} already exists");
        }
    }

    /**
     * Check if extension number exists
     *
     * @param string $number Extension number
     * @return bool True if exists
     */
    private function extensionExists(string $number): bool
    {
        $existing = Extensions::findFirstByNumber($number);
        return $existing !== null;
    }

    /**
     * Calculate password strength score
     *
     * @param string $password Password to check
     * @return int Strength score (0-5)
     */
    private function calculatePasswordStrength(string $password): int
    {
        $strength = 0;
        $length = strlen($password);

        if ($length >= 8) {
            $strength++;
        }
        if ($length >= 12) {
            $strength++;
        }
        if (preg_match('/[a-z]/', $password)) {
            $strength++;
        }
        if (preg_match('/[A-Z]/', $password)) {
            $strength++;
        }
        if (preg_match('/[0-9]/', $password)) {
            $strength++;
        }
        if (preg_match('/[^a-zA-Z0-9]/', $password)) {
            $strength++;
        }

        return min($strength, 5);
    }

    /**
     * Clear internal cache
     */
    public function clearCache(): void
    {
        $this->cache = null;
        $this->logger->debug('Extension service cache cleared');
    }
}
```

---

## Phalcon Models

### Example: Complete Model with Relationships

```php
<?php

declare(strict_types=1);

namespace MikoPBX\Common\Models;

use Phalcon\Mvc\Model\Relation;
use Phalcon\Validation;
use Phalcon\Validation\Validator\Uniqueness;

/**
 * PBX Extensions Model
 *
 * Represents a phone extension in the system.
 *
 * @property string $id Primary key
 * @property string $number Extension number
 * @property string $callerid Caller ID name
 * @property string $type Extension type (SIP, PJSIP, IAX)
 * @property string $userid Associated user ID
 * @property string $disabled Disabled flag ('0' or '1')
 *
 * @property Sip|null $sip SIP configuration
 * @property Users|null $user Associated user
 *
 * @method static Extensions|null findFirst(mixed $parameters = null)
 * @method static Extensions|null findFirstByNumber(string $number)
 * @method static Extensions[] find(mixed $parameters = null)
 */
class Extensions extends ModelsBase
{
    // Table constants
    public const TYPE_SIP = 'SIP';
    public const TYPE_PJSIP = 'PJSIP';
    public const TYPE_IAX = 'IAX';
    public const TYPE_EXTERNAL = 'EXTERNAL';

    // Properties
    public string $id = '';
    public string $number = '';
    public string $callerid = '';
    public string $type = self::TYPE_SIP;
    public string $userid = '';
    public string $disabled = '0';

    /**
     * Initialize model
     */
    public function initialize(): void
    {
        $this->setSource('m_Extensions');

        parent::initialize();

        // Define relationships
        $this->hasOne(
            'number',
            Sip::class,
            'extension',
            [
                'alias' => 'sip',
                'foreignKey' => [
                    'allowNulls' => true,
                    'action' => Relation::ACTION_CASCADE
                ]
            ]
        );

        $this->belongsTo(
            'userid',
            Users::class,
            'id',
            [
                'alias' => 'user',
                'foreignKey' => [
                    'allowNulls' => false,
                    'message' => 'User must exist'
                ]
            ]
        );
    }

    /**
     * Validation rules
     */
    public function validation(): bool
    {
        $validation = new Validation();

        // Unique number validation
        $validation->add(
            'number',
            new Uniqueness([
                'message' => 'Extension number must be unique',
                'field' => 'number'
            ])
        );

        return $this->validate($validation);
    }

    /**
     * Before save hook
     */
    public function beforeSave(): void
    {
        // Normalize caller ID
        $this->callerid = trim($this->callerid);

        // Ensure type is valid
        if (!in_array($this->type, [self::TYPE_SIP, self::TYPE_PJSIP, self::TYPE_IAX, self::TYPE_EXTERNAL], true)) {
            $this->type = self::TYPE_SIP;
        }
    }

    /**
     * After save hook
     */
    public function afterSave(): void
    {
        // Clear cache
        $this->clearModelCache();

        // Trigger configuration regeneration
        $this->triggerConfigRegeneration();
    }

    /**
     * Check if extension is enabled
     */
    public function isEnabled(): bool
    {
        return $this->disabled === '0';
    }

    /**
     * Check if extension is internal
     */
    public function isInternal(): bool
    {
        return $this->type !== self::TYPE_EXTERNAL;
    }

    /**
     * Get display name
     */
    public function getDisplayName(): string
    {
        return !empty($this->callerid)
            ? "{$this->callerid} <{$this->number}>"
            : $this->number;
    }

    /**
     * Clear model cache
     */
    private function clearModelCache(): void
    {
        // Implementation
    }

    /**
     * Trigger Asterisk configuration regeneration
     */
    private function triggerConfigRegeneration(): void
    {
        // Implementation
    }
}
```

---

## Controllers

### Example: Admin Cabinet Controller

```php
<?php

declare(strict_types=1);

namespace MikoPBX\AdminCabinet\Controllers;

use MikoPBX\AdminCabinet\Forms\ExtensionEditForm;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Providers\PBXCoreRESTClientProvider;
use Phalcon\Http\ResponseInterface;
use Psr\Log\LoggerInterface;

/**
 * Extensions management controller
 *
 * Handles web interface for managing PBX extensions
 */
class ExtensionsController extends BaseController
{
    private LoggerInterface $logger;
    private PBXCoreRESTClientProvider $restClient;

    /**
     * Initialize controller
     */
    public function onConstruct(): void
    {
        parent::onConstruct();

        $this->logger = $this->di->get(LoggerInterface::class);
        $this->restClient = $this->di->get(PBXCoreRESTClientProvider::SERVICE_NAME);
    }

    /**
     * Index action - list all extensions
     */
    public function indexAction(): void
    {
        try {
            $extensions = Extensions::find([
                'order' => 'CAST(number AS INTEGER) ASC'
            ]);

            $this->view->extensions = $extensions;
            $this->view->totalCount = $extensions->count();

        } catch (\Throwable $e) {
            $this->logger->error('Failed to load extensions', [
                'exception' => $e
            ]);

            $this->flash->error('Failed to load extensions list');
            $this->view->extensions = [];
            $this->view->totalCount = 0;
        }
    }

    /**
     * Modify action - edit/create extension
     *
     * @param string|null $id Extension ID (null for new)
     */
    public function modifyAction(?string $id = null): void
    {
        $extension = null;
        $isNew = true;

        if ($id !== null) {
            $extension = Extensions::findFirst($id);

            if ($extension === null) {
                $this->flash->error("Extension with ID {$id} not found");
                $this->response->redirect('extensions/index');
                return;
            }

            $isNew = false;
        } else {
            $extension = new Extensions();
        }

        // Create form
        $form = new ExtensionEditForm($extension);

        // Handle form submission
        if ($this->request->isPost()) {
            $this->handleFormSubmission($form, $extension, $isNew);
            return;
        }

        // Pass data to view
        $this->view->form = $form;
        $this->view->extension = $extension;
        $this->view->isNew = $isNew;
    }

    /**
     * Delete action - remove extension
     *
     * @param string $id Extension ID
     */
    public function deleteAction(string $id): ResponseInterface
    {
        $this->view->disable();

        try {
            $extension = Extensions::findFirst($id);

            if ($extension === null) {
                return $this->response->setJsonContent([
                    'success' => false,
                    'message' => 'Extension not found'
                ]);
            }

            if ($extension->delete()) {
                $this->logger->info('Extension deleted', [
                    'id' => $id,
                    'number' => $extension->number
                ]);

                return $this->response->setJsonContent([
                    'success' => true,
                    'message' => 'Extension deleted successfully'
                ]);
            }

            $errors = $extension->getMessages();
            $this->logger->error('Failed to delete extension', [
                'id' => $id,
                'errors' => $errors
            ]);

            return $this->response->setJsonContent([
                'success' => false,
                'message' => implode(', ', $errors)
            ]);

        } catch (\Throwable $e) {
            $this->logger->error('Exception during extension deletion', [
                'id' => $id,
                'exception' => $e
            ]);

            return $this->response->setJsonContent([
                'success' => false,
                'message' => 'Deletion failed: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Handle form submission
     *
     * @param ExtensionEditForm $form Form instance
     * @param Extensions $extension Extension model
     * @param bool $isNew Whether this is a new extension
     */
    private function handleFormSubmission(
        ExtensionEditForm $form,
        Extensions $extension,
        bool $isNew
    ): void {
        if (!$form->isValid($this->request->getPost())) {
            $this->flash->error('Please correct form errors');
            return;
        }

        // Bind form data to model
        $data = $this->request->getPost();
        $extension->assign($data);

        try {
            if ($extension->save()) {
                $action = $isNew ? 'created' : 'updated';

                $this->logger->info("Extension {$action}", [
                    'id' => $extension->id,
                    'number' => $extension->number
                ]);

                $this->flash->success("Extension {$action} successfully");
                $this->response->redirect('extensions/index');

            } else {
                $errors = $extension->getMessages();

                foreach ($errors as $error) {
                    $this->flash->error($error->getMessage());
                }
            }

        } catch (\Throwable $e) {
            $this->logger->error('Exception during extension save', [
                'exception' => $e
            ]);

            $this->flash->error('Save failed: ' . $e->getMessage());
        }
    }
}
```

---

## Background Workers

### Example: System Monitoring Worker

```php
<?php

declare(strict_types=1);

namespace MikoPBX\Core\Workers;

use MikoPBX\Core\System\SystemMessages;
use Psr\Log\LoggerInterface;

/**
 * Background worker for system monitoring
 *
 * Monitors system resources, checks for issues, and
 * publishes advice notifications.
 */
class WorkerSystemMonitor extends WorkerBase
{
    private const int CHECK_INTERVAL = 60;
    private const int HIGH_CPU_THRESHOLD = 80;
    private const int HIGH_MEMORY_THRESHOLD = 90;
    private const int LOW_DISK_THRESHOLD = 10;

    private LoggerInterface $logger;
    private array $metrics = [];

    /**
     * Initialize worker
     */
    public function __construct()
    {
        parent::__construct();
        $this->logger = $this->di->get(LoggerInterface::class);
    }

    /**
     * Start worker process
     *
     * @param array<string, mixed> $params Worker parameters
     */
    public function start(array $params = []): void
    {
        $this->logger->info('Starting system monitor worker', ['params' => $params]);

        SystemMessages::echoGreenToTeletype('System monitor worker started');

        $this->monitorLoop();
    }

    /**
     * Main monitoring loop
     */
    private function monitorLoop(): void
    {
        while (!$this->needRestart) {
            try {
                $startTime = microtime(true);

                // Collect metrics
                $this->collectMetrics();

                // Analyze and publish issues
                $this->analyzeMetrics();

                $executionTime = microtime(true) - $startTime;

                $this->logger->debug('Monitor cycle completed', [
                    'execution_time' => round($executionTime, 3),
                    'metrics' => $this->metrics
                ]);

                // Sleep before next check
                $this->sleepWorker(self::CHECK_INTERVAL);

            } catch (\Throwable $e) {
                $this->logger->error('Monitor worker error', [
                    'exception' => $e,
                    'trace' => $e->getTraceAsString()
                ]);

                // Brief pause on error
                sleep(5);
            }
        }

        $this->logger->info('System monitor worker stopped');
    }

    /**
     * Collect system metrics
     */
    private function collectMetrics(): void
    {
        $this->metrics = [
            'cpu_usage' => $this->getCpuUsage(),
            'memory_usage' => $this->getMemoryUsage(),
            'disk_space' => $this->getDiskSpace(),
            'load_average' => $this->getLoadAverage(),
            'timestamp' => time()
        ];
    }

    /**
     * Analyze metrics and publish warnings
     */
    private function analyzeMetrics(): void
    {
        $advice = [
            'error' => [],
            'warning' => [],
            'info' => []
        ];

        // Check CPU
        if ($this->metrics['cpu_usage'] > self::HIGH_CPU_THRESHOLD) {
            $advice['warning'][] = [
                'messageTpl' => 'adv_HighCpuUsage',
                'messageParams' => [
                    'usage' => $this->metrics['cpu_usage']
                ]
            ];
        }

        // Check memory
        if ($this->metrics['memory_usage'] > self::HIGH_MEMORY_THRESHOLD) {
            $advice['error'][] = [
                'messageTpl' => 'adv_HighMemoryUsage',
                'messageParams' => [
                    'usage' => $this->metrics['memory_usage']
                ]
            ];
        }

        // Check disk space
        if ($this->metrics['disk_space'] < self::LOW_DISK_THRESHOLD) {
            $advice['error'][] = [
                'messageTpl' => 'adv_LowDiskSpace',
                'messageParams' => [
                    'available' => $this->metrics['disk_space']
                ]
            ];
        }

        // Publish advice if any issues found
        if (!empty($advice['error']) || !empty($advice['warning'])) {
            $this->publishAdvice($advice);
        }
    }

    /**
     * Get CPU usage percentage
     */
    private function getCpuUsage(): float
    {
        // Implementation
        return 0.0;
    }

    /**
     * Get memory usage percentage
     */
    private function getMemoryUsage(): float
    {
        // Implementation
        return 0.0;
    }

    /**
     * Get available disk space percentage
     */
    private function getDiskSpace(): float
    {
        // Implementation
        return 100.0;
    }

    /**
     * Get system load average
     *
     * @return array{0: float, 1: float, 2: float} 1, 5, 15 minute averages
     */
    private function getLoadAverage(): array
    {
        $load = sys_getloadavg();
        return [
            round($load[0], 2),
            round($load[1], 2),
            round($load[2], 2)
        ];
    }

    /**
     * Publish advice notifications
     *
     * @param array<string, array> $advice Advice messages
     */
    private function publishAdvice(array $advice): void
    {
        // Implementation
        $this->logger->info('Publishing system advice', ['advice' => $advice]);
    }
}
```

---

## Service Providers

### Example: Logger Provider

```php
<?php

declare(strict_types=1);

namespace MikoPBX\Common\Providers;

use Monolog\Handler\RotatingFileHandler;
use Monolog\Handler\StreamHandler;
use Monolog\Logger;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;
use Psr\Log\LoggerInterface;

/**
 * PSR-3 Logger service provider
 *
 * Registers Monolog logger as PSR-3 compatible service
 */
class LoggerProvider implements ServiceProviderInterface
{
    public const string SERVICE_NAME = 'logger';

    private const int LOG_RETENTION_DAYS = 7;

    /**
     * Register logger service
     */
    public function register(DiInterface $di): void
    {
        // Register PSR-3 logger
        $di->setShared(LoggerInterface::class, function () use ($di) {
            return $this->createLogger($di);
        });

        // Alias for backward compatibility
        $di->setShared(self::SERVICE_NAME, function () use ($di) {
            return $di->get(LoggerInterface::class);
        });
    }

    /**
     * Create configured logger instance
     */
    private function createLogger(DiInterface $di): Logger
    {
        $config = $di->get('config');
        $logger = new Logger('mikopbx');

        // Add rotating file handler for general logs
        $logPath = $config->path('core.logsDir') . '/application.log';
        $logger->pushHandler(
            new RotatingFileHandler(
                $logPath,
                self::LOG_RETENTION_DAYS,
                Logger::INFO
            )
        );

        // Add dedicated error log handler
        $errorPath = $config->path('core.logsDir') . '/error.log';
        $logger->pushHandler(
            new StreamHandler($errorPath, Logger::ERROR)
        );

        // Add debug handler in development
        if ($this->isDevelopmentMode($config)) {
            $debugPath = $config->path('core.logsDir') . '/debug.log';
            $logger->pushHandler(
                new StreamHandler($debugPath, Logger::DEBUG)
            );
        }

        return $logger;
    }

    /**
     * Check if running in development mode
     */
    private function isDevelopmentMode(mixed $config): bool
    {
        return $config->path('application.env') === 'development';
    }
}
```

---

## REST API Controllers

### Example: REST API Controller with Full CRUD

```php
<?php

declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Controllers\Extensions;

use MikoPBX\Common\Models\Extensions;
use MikoPBX\PBXCoreREST\Controllers\BaseController;
use Phalcon\Http\ResponseInterface;

/**
 * REST API controller for extensions management
 */
class RestController extends BaseController
{
    /**
     * Get all extensions
     *
     * GET /extensions
     */
    public function indexAction(): ResponseInterface
    {
        try {
            $extensions = Extensions::find([
                'order' => 'CAST(number AS INTEGER) ASC'
            ]);

            $data = array_map(
                fn(Extensions $ext) => $this->formatExtension($ext),
                $extensions->toArray()
            );

            return $this->sendSuccessResponse($data);

        } catch (\Throwable $e) {
            $this->logger->error('Failed to get extensions', [
                'exception' => $e
            ]);

            return $this->sendErrorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Get single extension
     *
     * GET /extensions/{id}
     */
    public function getAction(string $id): ResponseInterface
    {
        try {
            $extension = Extensions::findFirst($id);

            if ($extension === null) {
                return $this->sendNotFoundResponse("Extension {$id} not found");
            }

            return $this->sendSuccessResponse($this->formatExtension($extension));

        } catch (\Throwable $e) {
            $this->logger->error('Failed to get extension', [
                'id' => $id,
                'exception' => $e
            ]);

            return $this->sendErrorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Create new extension
     *
     * POST /extensions
     */
    public function postAction(): ResponseInterface
    {
        try {
            $data = $this->request->getJsonRawBody(true);

            // Validate required fields
            if (!$this->validateCreateData($data)) {
                return $this->sendErrorResponse('Invalid request data', 400);
            }

            // Create extension
            $extension = new Extensions();
            $extension->number = $data['number'];
            $extension->callerid = $data['callerid'] ?? '';
            $extension->type = $data['type'] ?? Extensions::TYPE_SIP;

            if (!$extension->save()) {
                $errors = $extension->getMessages();
                return $this->sendErrorResponse(implode(', ', $errors), 400);
            }

            $this->logger->info('Extension created via API', [
                'id' => $extension->id,
                'number' => $extension->number
            ]);

            return $this->sendSuccessResponse(
                $this->formatExtension($extension),
                201
            );

        } catch (\Throwable $e) {
            $this->logger->error('Failed to create extension', [
                'exception' => $e
            ]);

            return $this->sendErrorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Update extension
     *
     * PUT /extensions/{id}
     */
    public function putAction(string $id): ResponseInterface
    {
        try {
            $extension = Extensions::findFirst($id);

            if ($extension === null) {
                return $this->sendNotFoundResponse("Extension {$id} not found");
            }

            $data = $this->request->getJsonRawBody(true);

            // Update allowed fields
            if (isset($data['callerid'])) {
                $extension->callerid = $data['callerid'];
            }
            if (isset($data['type'])) {
                $extension->type = $data['type'];
            }

            if (!$extension->save()) {
                $errors = $extension->getMessages();
                return $this->sendErrorResponse(implode(', ', $errors), 400);
            }

            $this->logger->info('Extension updated via API', [
                'id' => $id,
                'number' => $extension->number
            ]);

            return $this->sendSuccessResponse($this->formatExtension($extension));

        } catch (\Throwable $e) {
            $this->logger->error('Failed to update extension', [
                'id' => $id,
                'exception' => $e
            ]);

            return $this->sendErrorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Delete extension
     *
     * DELETE /extensions/{id}
     */
    public function deleteAction(string $id): ResponseInterface
    {
        try {
            $extension = Extensions::findFirst($id);

            if ($extension === null) {
                return $this->sendNotFoundResponse("Extension {$id} not found");
            }

            $number = $extension->number;

            if (!$extension->delete()) {
                $errors = $extension->getMessages();
                return $this->sendErrorResponse(implode(', ', $errors), 400);
            }

            $this->logger->info('Extension deleted via API', [
                'id' => $id,
                'number' => $number
            ]);

            return $this->sendSuccessResponse([
                'message' => 'Extension deleted successfully'
            ]);

        } catch (\Throwable $e) {
            $this->logger->error('Failed to delete extension', [
                'id' => $id,
                'exception' => $e
            ]);

            return $this->sendErrorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Format extension for API response
     *
     * @param Extensions $extension Extension model
     * @return array<string, mixed> Formatted data
     */
    private function formatExtension(Extensions $extension): array
    {
        return [
            'id' => $extension->id,
            'number' => $extension->number,
            'callerid' => $extension->callerid,
            'type' => $extension->type,
            'disabled' => $extension->disabled === '1',
            'display_name' => $extension->getDisplayName()
        ];
    }

    /**
     * Validate creation data
     *
     * @param array<string, mixed>|null $data Request data
     * @return bool True if valid
     */
    private function validateCreateData(?array $data): bool
    {
        if ($data === null) {
            return false;
        }

        return isset($data['number']) && !empty($data['number']);
    }
}
```

See SKILL.md for more examples and usage patterns.
