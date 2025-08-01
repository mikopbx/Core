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

namespace MikoPBX\PBXCoreREST\Lib\Common;

use MikoPBX\Common\Models\Extensions;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Common\Handlers\CriticalErrorsHandler;

/**
 * Abstract base class for REST API record save actions
 * 
 * Provides unified patterns for:
 * - Data sanitization using TextFieldProcessor (no HTML entity decoding)
 * - Field validation with consistent error messages
 * - Extension uniqueness checking
 * - Transaction-based saving with proper error handling
 * - Security validation for dangerous content
 * - Tab preservation for multi-tab forms
 * 
 * ## Tab Preservation Usage
 * 
 * For forms with multiple tabs, the client can send 'currentTab' parameter
 * in request data. If present, the response will include 'redirectTab' field
 * that Form.js can use to preserve the active tab after save:
 * 
 * ```javascript
 * // Client sends:
 * result.data.currentTab = dialplanApplicationModify.currentActiveTab;
 * 
 * // Server responds with:
 * response.data.redirectTab = "code" // (sanitized tab name)
 * 
 * // Form.js uses redirectTab to construct proper redirect URL:
 * Form.afterSubmitModifyUrl = globalRootUrl + 'module/modify/' + id + '#/' + response.data.redirectTab;
 * ```
 * 
 * To use tab preservation in your save action:
 * ```php
 * $res->data = DataStructure::createFromModel($savedModel);
 * $res->success = true;
 * 
 * // Add tab preservation support
 * self::handleTabPreservation($data, $res);
 * ```
 * 
 * Eliminates code duplication between CallQueues, IVR Menu, and other modules.
 */
abstract class AbstractSaveRecordAction
{
    /**
     * Sanitize data fields using unified text processing
     * 
     * Applies consistent sanitization rules:
     * - Text fields: sanitized using TextFieldProcessor::sanitizeInput()
     * - No HTML entity decoding (prevents double-escaping)
     * - Dangerous content detection and rejection
     *
     * @param array $data Raw input data
     * @param array $sanitizationRules Rules for BaseActionHelper::sanitizeData()
     * @param array $textFields List of text field names to process
     * @return array Sanitized data array
     * @throws \Exception If dangerous content is detected
     */
    protected static function sanitizeInputData(
        array $data, 
        array $sanitizationRules, 
        array $textFields = []
    ): array {
        // Extract only fields that have sanitization rules
        $fieldsToSanitize = array_intersect_key($data, $sanitizationRules);
        
        // Apply base sanitization rules
        $sanitizedData = BaseActionHelper::sanitizeData($fieldsToSanitize, $sanitizationRules);
        
        // Process text fields with unified processor (no HTML decoding)
        if (!empty($textFields)) {
            $sanitizedData = TextFieldProcessor::sanitizeTextFields($sanitizedData, $textFields);
            
            // Check for dangerous content in text fields
            $securityErrors = TextFieldProcessor::validateTextFieldsSecurity($sanitizedData, $textFields);
            if (!empty($securityErrors)) {
                $errorMessage = 'Dangerous content detected in fields: ' . implode(', ', array_keys($securityErrors));
                SystemMessages::sysLogMsg(__METHOD__, $errorMessage, LOG_WARNING);
                throw new \Exception($errorMessage);
            }
        }
        
        return $sanitizedData;
    }

    /**
     * Validate required fields with consistent error messages
     *
     * @param array $data Data to validate
     * @param array $validationRules Validation rules in format:
     *   ['field' => [['type' => 'required', 'message' => 'Error message']]]
     * @return array Array of validation errors (empty if valid)
     */
    protected static function validateRequiredFields(array $data, array $validationRules): array
    {
        return BaseActionHelper::validateData($data, $validationRules);
    }

    /**
     * Check extension number uniqueness across the system
     * 
     * Verifies that extension number is not already in use by another entity.
     * Allows the current entity to keep its existing extension.
     *
     * @param string $newExtension New extension number to check
     * @param string|null $currentExtension Current extension (for updates)
     * @return bool True if extension is unique/available
     */
    protected static function checkExtensionUniqueness(string $newExtension, ?string $currentExtension = null): bool
    {
        return BaseActionHelper::checkUniqueness(
            Extensions::class,
            'number',
            $newExtension,
            $currentExtension
        );
    }

    /**
     * Execute database operations within a transaction
     * 
     * Provides consistent transaction handling with proper error logging.
     * Automatically rolls back on exceptions and logs errors.
     *
     * @param callable $callback Function to execute within transaction
     * @return mixed Result from callback function
     * @throws \Exception If transaction fails
     */
    protected static function executeInTransaction(callable $callback)
    {
        try {
            return BaseActionHelper::executeInTransaction($callback);
        } catch (\Exception $e) {
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
            throw $e;
        }
    }

    /**
     * Create or update Extension record for entities that have extensions
     * 
     * Handles the common pattern of creating/updating Extensions table entries
     * for entities like CallQueues, IVR Menus, etc.
     *
     * @param string $extension Extension number
     * @param string $callerid Display name for extension
     * @param string $type Extension type (Extensions::TYPE_*)
     * @param string|null $currentExtension Current extension for updates
     * @return Extensions Created or updated Extension model
     * @throws \Exception If extension save fails
     */
    protected static function createOrUpdateExtension(
        string $extension,
        string $callerid,
        string $type,
        ?string $currentExtension = null
    ): Extensions {
        // Find existing extension or create new one
        $extensionModel = Extensions::findFirstByNumber($currentExtension ?? '');
        if (!$extensionModel) {
            $extensionModel = new Extensions();
            $extensionModel->type = $type;
            $extensionModel->show_in_phonebook = '1';
            $extensionModel->public_access = '1';
        }

        // Update extension data
        $extensionModel->number = $extension;
        $extensionModel->callerid = $callerid;

        if (!$extensionModel->save()) {
            $errors = implode(', ', $extensionModel->getMessages());
            throw new \Exception("Failed to save extension: {$errors}");
        }

        return $extensionModel;
    }

    /**
     * Sanitize routing destination fields
     * 
     * Validates and sanitizes extension/routing destination fields using SystemSanitizer.
     * Common pattern for timeout_extension, redirect_extension, etc.
     *
     * @param array $data Data array containing routing fields
     * @param array $routingFields List of routing field names to process
     * @param int $maxLength Maximum length for routing destinations
     * @return array Data array with sanitized routing fields
     * @throws \Exception If routing destination is invalid after sanitization
     */
    protected static function sanitizeRoutingDestinations(
        array $data, 
        array $routingFields, 
        int $maxLength = 20
    ): array {
        $result = $data;

        foreach ($routingFields as $field) {
            if (isset($result[$field]) && !empty($result[$field])) {
                if (!SystemSanitizer::isValidRoutingDestination($result[$field], $maxLength)) {
                    $result[$field] = SystemSanitizer::sanitizeRoutingDestination($result[$field], $maxLength);
                    
                    // If still invalid after sanitization, reject it
                    if (!SystemSanitizer::isValidRoutingDestination($result[$field], $maxLength)) {
                        throw new \Exception("Invalid {$field} value after sanitization");
                    }
                }
            }
        }

        return $result;
    }

    /**
     * Create standardized API result with processor info
     *
     * @param string $processorMethod Method name (__METHOD__)
     * @return PBXApiResult Initialized result object
     */
    protected static function createApiResult(string $processorMethod): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = $processorMethod;
        return $res;
    }

    /**
     * Log successful save operation
     *
     * @param string $entityType Type of entity (e.g., 'Call queue', 'IVR menu')
     * @param string $entityName Name/identifier of saved entity
     * @param string $extension Extension number of entity
     * @param string $method Method that performed the save
     */
    protected static function logSuccessfulSave(
        string $entityType,
        string $entityName,
        string $extension,
        string $method
    ): void {
        SystemMessages::sysLogMsg(
            $method,
            "{$entityType} '{$entityName}' ({$extension}) saved successfully",
            LOG_INFO
        );
    }

    /**
     * Handle save operation errors consistently
     *
     * @param \Exception $exception Exception that occurred during save
     * @param PBXApiResult $result Result object to populate with error
     * @return PBXApiResult Result with error information
     */
    protected static function handleSaveError(\Exception $exception, PBXApiResult $result): PBXApiResult
    {
        $result->messages['error'][] = $exception->getMessage();
        CriticalErrorsHandler::handleExceptionWithSyslog($exception);
        return $result;
    }

    /**
     * Handle tab preservation for forms with multiple tabs
     * 
     * If client sends 'currentTab' parameter, adds 'redirectTab' to response data
     * and modifies the 'reload' URL to include the tab hash. This allows forms
     * to stay on the same tab after save/update operations.
     * 
     * Security features:
     * - Sanitizes tab names to prevent XSS (alphanumeric + hyphen/underscore only)
     * - Ignores invalid or empty tab names
     * - Safe for all types of client input
     * 
     * Examples:
     * - "code" → "code" (valid) + adds "#/code" to reload URL
     * - "main-settings" → "main-settings" (valid) + adds "#/main-settings" to reload URL
     * - "code_editor" → "code_editor" (valid) + adds "#/code_editor" to reload URL
     * - "<script>alert('xss')</script>" → "scriptalertxssscript" (sanitized)
     * - "" → ignored (no changes)
     * - "main" → ignored (default tab, no hash needed)
     *
     * @param array $requestData Original request data (may contain currentTab)
     * @param PBXApiResult $result Result object to modify
     * @return void
     */
    protected static function handleTabPreservation(array $requestData, PBXApiResult $result): void
    {
        if (!empty($requestData['currentTab']) && is_string($requestData['currentTab'])) {
            // Sanitize tab name (alphanumeric + hyphen/underscore only)
            $tabName = preg_replace('/[^a-zA-Z0-9\-_]/', '', $requestData['currentTab']);
            
            if (!empty($tabName) && $tabName !== 'main') {
                // Ensure result->data is an array
                if (!is_array($result->data)) {
                    $result->data = [];
                }
                
                // Add redirectTab to response for client-side redirect handling
                $result->data['redirectTab'] = $tabName;
                
                // Modify reload URL to include tab hash
                if (!empty($result->reload)) {
                    $result->reload .= '#/' . $tabName;
                }
            }
        }
    }

    /**
     * Convert boolean form data to database format
     * 
     * Handles the common pattern where checkboxes send '1'/'0' strings
     * that need to be converted to proper boolean database values.
     *
     * @param array $data Input data array
     * @param array $booleanFields List of boolean field names
     * @return array Data with converted boolean fields
     */
    protected static function convertBooleanFields(array $data, array $booleanFields): array
    {
        $result = $data;
        
        foreach ($booleanFields as $field) {
            if (isset($result[$field])) {
                $result[$field] = ($result[$field] ?? false) ? '1' : '0';
            }
        }
        
        return $result;
    }

    /**
     * Apply default values to data array
     *
     * @param array $data Input data array
     * @param array $defaults Default values keyed by field name
     * @return array Data with defaults applied for missing fields
     */
    protected static function applyDefaults(array $data, array $defaults): array
    {
        foreach ($defaults as $field => $defaultValue) {
            if (!isset($data[$field])) {
                $data[$field] = $defaultValue;
            }
        }
        
        return $data;
    }
}