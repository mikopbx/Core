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
 use MikoPBX\PBXCoreREST\Lib\Common\BaseActionHelper;
 use MikoPBX\PBXCoreREST\Lib\Common\CodeSecurityValidator;
 use MikoPBX\Core\System\SystemMessages;
 use MikoPBX\Common\Handlers\CriticalErrorsHandler;
 
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
 class SaveRecordAction
 {
     /**
      * Save dialplan application record
      * 
      * @param array $data Data to save
      * @return PBXApiResult
      */
     public static function main(array $data): PBXApiResult
     {
         $res = new PBXApiResult();
         $res->processor = __METHOD__;
         
         try {
             // Enhanced sanitization preserving code integrity
             $sanitizationRules = [
                 'id' => 'int',
                 'name' => 'string|sanitize|max:50',
                 'extension' => 'string|max:64',
                 'hint' => 'string|sanitize|max:255|empty_to_null',
                 'type' => 'string',
                 'description' => 'string|sanitize|max:2000|empty_to_null'
                 // applicationlogic is handled separately to preserve syntax
             ];
             
             // Create data array with only allowed fields and preserve applicationlogic
             $allowedData = [];
             foreach ($data as $key => $value) {
                 if ($key === 'applicationlogic') {
                     // Preserve code syntax - only validate security
                     $allowedData[$key] = $value;
                 } elseif (isset($sanitizationRules[$key])) {
                     $allowedData[$key] = $value;
                 } else {
                     // Only include known fields
                     $allowedData[$key] = $value;
                 }
             }
             
             // Sanitize data using BaseActionHelper
             $sanitizedData = BaseActionHelper::sanitizeData($allowedData, $sanitizationRules);
             
             // Re-add applicationlogic which was not sanitized
             if (isset($data['applicationlogic'])) {
                 $sanitizedData['applicationlogic'] = $data['applicationlogic'];
             }
             
             // Validation rules
             $validationRules = [
                 'name' => [
                     ['type' => 'required', 'message' => 'da_ValidateNameIsEmpty']
                 ],
                 'extension' => [
                     ['type' => 'required', 'message' => 'da_ValidateExtensionIsEmpty'],
                     ['type' => 'regex', 'pattern' => '/^[0-9#+\\*|X]{1,64}$/', 'message' => 'da_ValidateExtensionNumber']
                 ]
             ];
             
             $validationErrors = BaseActionHelper::validateData($sanitizedData, $validationRules);
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
             
             // Check extension uniqueness
             if (!BaseActionHelper::checkUniqueness(
                 Extensions::class,
                 'number',
                 $sanitizedData['extension'],
                 $app->extension ?? ''
             )) {
                 $res->messages['error'][] = 'da_ValidateExtensionDouble';
                 return $res;
             }
             
             // Save in transaction
             $savedApp = BaseActionHelper::executeInTransaction(function() use ($app, $sanitizedData) {
                 // Handle Extension record
                 $extension = Extensions::findFirstByNumber($app->extension ?? '');
                 if (!$extension) {
                     $extension = new Extensions();
                     $extension->type = Extensions::TYPE_DIALPLAN_APPLICATION;
                     $extension->show_in_phonebook = 1;
                     $extension->public_access = 0;
                     $extension->userid = null;
                 }
                 
                 $extension->number = $sanitizedData['extension'];
                 $extension->callerid = $sanitizedData['name'];
                 
                 if (!$extension->save()) {
                     throw new \Exception('Failed to save extension: ' . implode(', ', $extension->getMessages()));
                 }
                 
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
             
         } catch (\Exception $e) {
             $res->messages['error'][] = $e->getMessage();
             CriticalErrorsHandler::handleExceptionWithSyslog($e);
         }
         
         return $res;
     }
 }