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

 namespace MikoPBX\PBXCoreREST\Lib\DialplanApplications;

 use MikoPBX\Common\Models\DialplanApplications;
 use MikoPBX\Common\Models\Extensions;
 use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
 use MikoPBX\PBXCoreREST\Lib\Common\AbstractSaveRecordAction;
 use MikoPBX\PBXCoreREST\Lib\Common\CodeSecurityValidator;
 use MikoPBX\Core\System\SystemMessages;
 
 /**
  * Action for saving dialplan application record
  * 
  * @api {post} /pbxcore/api/v2/dialplan-applications/saveRecord Create dialplan application
  * @api {put} /pbxcore/api/v2/dialplan-applications/saveRecord/:id Update dialplan application
  * @apiVersion 2.0.0
  * @apiName SaveRecord
  * @apiGroup DialplanApplications
  * 
  * @apiParam {String} [id] Record ID (for update)
  * @apiParam {String} name Application name
  * @apiParam {String} extension Extension number (dialplan format)
  * @apiParam {String} [hint] Application hint
  * @apiParam {String} [applicationlogic] Application logic code
  * @apiParam {String} [type] Application type ('php'|'plaintext'), default 'php'
  * @apiParam {String} [description] Application description
  * 
  * @apiSuccess {Boolean} result Operation result
  * @apiSuccess {Object} data Saved dialplan application data
  * @apiSuccess {String} reload URL for page reload
  */
 class SaveRecordAction extends AbstractSaveRecordAction
 {
     /**
      * Save dialplan application record
      * 
      * @param array $data Data to save
      * @return PBXApiResult
      */
     public static function main(array $data): PBXApiResult
     {
         $res = self::createApiResult(__METHOD__);
         
        // Define sanitization rules - use 'sanitize' for text fields to follow "Store Raw, Escape at Edge"
        $sanitizationRules = [
            'id' => 'int',
            'name' => 'string|sanitize|max:50',
            'extension' => 'string|max:64',
            'hint' => 'string|sanitize|max:255|empty_to_null',
            'type' => 'string',
            'description' => 'string|sanitize|max:2000|empty_to_null'
            // applicationlogic is handled separately to preserve syntax
        ];
        
        // Text fields for unified processing (no HTML decoding, just sanitization)
        $textFields = ['name', 'hint', 'description'];

        try {
            // Sanitize only allowed fields, preserve applicationlogic separately
            $allowedData = array_intersect_key($data, $sanitizationRules);
            
            // Unified data sanitization using new approach - no HTML entity decoding
            $sanitizedData = self::sanitizeInputData($allowedData, $sanitizationRules, $textFields);
            
            // Re-add applicationlogic which was not sanitized (preserve code syntax)
            if (isset($data['applicationlogic'])) {
                $sanitizedData['applicationlogic'] = $data['applicationlogic'];
            }
             
            // Validate required fields using unified approach
            $validationRules = [
                'name' => [
                    ['type' => 'required', 'message' => 'da_ValidateNameIsEmpty']
                ],
                'extension' => [
                    ['type' => 'required', 'message' => 'da_ValidateExtensionIsEmpty'],
                    ['type' => 'regex', 'pattern' => '/^[0-9#+\\*|X]{1,64}$/', 'message' => 'da_ValidateExtensionNumber']
                ]
            ];
            $validationErrors = self::validateRequiredFields($sanitizedData, $validationRules);
             if (!empty($validationErrors)) {
                 $res->messages['error'] = $validationErrors;
                 return $res;
             }
             
             // Security validation for application code
             if (!empty($sanitizedData['applicationlogic'])) {
                 $securityIssues = CodeSecurityValidator::validateCodeSecurity(
                     $sanitizedData['applicationlogic'],
                     $sanitizedData['type'] ?? 'php',
                     $sanitizedData['name'] ?? 'Unknown'
                 );
                 
                 // Log security issues but don't block save (configurable behavior)
                 if (!empty($securityIssues)) {
                     SystemMessages::sysLogMsg(
                         __METHOD__,
                         "Dialplan application '{$sanitizedData['name']}' has security concerns: " . implode(', ', $securityIssues),
                         LOG_WARNING
                     );
                 }
             }
             
             // Find or create record
             if (!empty($sanitizedData['id'])) {
                 $app = DialplanApplications::findFirstById($sanitizedData['id']);
                 if (!$app) {
                     $res->messages['error'][] = 'api_DialplanApplicationNotFound';
                     return $res;
                 }
             } else {
                 $app = new DialplanApplications();
                 $app->uniqid = DialplanApplications::generateUniqueID('DIALPLAN-APP-');
             }
             
            // Check extension uniqueness using unified approach
            if (!self::checkExtensionUniqueness($sanitizedData['extension'], $app->extension ?? null)) {
                 $res->messages['error'][] = 'da_ValidateExtensionDouble';
                 return $res;
             }
             
            // Save in transaction using unified approach
            $savedApp = self::executeInTransaction(function() use ($app, $sanitizedData) {
                // Create or update Extension using unified approach
                self::createOrUpdateExtension(
                    $sanitizedData['extension'],
                    $sanitizedData['name'],
                    Extensions::TYPE_DIALPLAN_APPLICATION,
                    $app->extension ?? null
                );
                 
                 // Update DialplanApplication
                 $app->extension = $sanitizedData['extension'];
                 $app->name = $sanitizedData['name'];
                 $app->hint = $sanitizedData['hint'] ?? '';
                 $app->type = $sanitizedData['type'] ?? 'php';
                 $app->description = $sanitizedData['description'] ?? '';
                 
                 // Handle applicationlogic with base64 encoding
                 if (isset($sanitizedData['applicationlogic'])) {
                     // Use model method for proper base64 encoding
                     $app->setApplicationlogic($sanitizedData['applicationlogic']);
                 }
                 
                 if (!$app->save()) {
                     throw new \Exception('Failed to save dialplan application: ' . implode(', ', $app->getMessages()));
                 }
                 
                 return $app;
             });
             
            $res->data = DataStructure::createFromModel($savedApp);
            $res->success = true;
            $res->reload = "dialplan-applications/modify/{$savedApp->uniqid}";
            
            // Handle tab preservation for multi-tab forms
            self::handleTabPreservation($data, $res);
            
            // Log successful operation using unified approach
            self::logSuccessfulSave('Dialplan application', $savedApp->name, $savedApp->extension, __METHOD__);
            
        } catch (\Exception $e) {
            // Handle save error using unified approach
            return self::handleSaveError($e, $res);
        }
         
         return $res;
     }
 }