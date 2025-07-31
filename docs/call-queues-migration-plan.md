 Call Queues REST API Migration Plan v2.1 - Complete Implementation Guide

  Project Overview

  This document outlines the comprehensive migration plan for adapting the MikoPBX call queue management system to use a unified REST API architecture. The
  plan is based on proven patterns from the IVR Menu implementation and incorporates advanced security measures for XSS/CSRF protection, proper logging
  standards, and optimized controller patterns.

  Key Implementation Patterns from IVR Menu Analysis

  1. Hidden Input Pattern for Dropdowns

  IVR Menu uses hidden input fields instead of regular select elements for better Semantic UI integration:

  <!-- HTML Structure -->
  <div class="ui dropdown timeout_extension-select">
      <div class="default text">Select extension...</div>
      <i class="dropdown icon"></i>
      <div class="menu"></div>
  </div>
  <input type="hidden" name="timeout_extension" />

  2. Represent Fields in API Responses

  API returns additional representation fields for proper dropdown display with icons:

  {
      "timeout_extension": "101",
      "timeout_extensionRepresent": "<i class=\"icons\"><i class=\"user outline icon\"></i></i> John Doe <101>"
  }

  3. SecurityUtils.sanitizeExtensionsApiContent()

  Specialized method for sanitizing extension content while preserving safe icons:

  const safeText = SecurityUtils.sanitizeExtensionsApiContent(data.timeout_extensionRepresent);

  4. Extensions API with Exclusions

  Dropdown settings with exclusions to prevent circular references:

  Extensions.getDropdownSettingsForRoutingWithExclusion(cbOnChange, excludeExtensions)

  MikoPBX Development Standards

  1. Logging Standards

  ❌ Never Use error_log()

  // WRONG - Never do this
  error_log("Suspicious content detected: " . $input);

  ✅ Always Use SystemMessages

  use MikoPBX\Core\System\SystemMessages;

  // For general system messages
  SystemMessages::sysLogMsg(__METHOD__,
      "Suspicious content detected from IP: " . ($_SERVER['REMOTE_ADDR'] ?? 'unknown') .
      ", Content: " . substr($input, 0, 100),
      LOG_WARNING
  );

  // For errors
  SystemMessages::sysLogMsg(__METHOD__,
      "Failed to save call queue: " . $error_message,
      LOG_ERR
  );

  // For informational messages
  SystemMessages::sysLogMsg(__METHOD__,
      "Call queue '{$queueName}' saved successfully",
      LOG_INFO
  );

  ✅ Exception Handling with CriticalErrorsHandler

  use MikoPBX\Common\Handlers\CriticalErrorsHandler;

  try {
      // Your code here
      $res->success = true;
  } catch (\Exception $e) {
      $res->messages['error'][] = $e->getMessage();
      CriticalErrorsHandler::handleExceptionWithSyslog($e);
  }

  2. User Interface Standards

  ❌ No Success Messages for Save/Delete Operations

  // WRONG - Don't show success messages
  UserMessage.showSuccess(globalTranslate.cq_QueueSaved);
  UserMessage.showSuccess(globalTranslate.cq_QueueDeleted);

  ✅ Just Update Interface or Navigate

  // For delete operations - reload table only
  if (response.result === true) {
      queueTable.dataTable.ajax.reload();

      // Update related components
      if (typeof Extensions !== 'undefined' && Extensions.cbOnDataChanged) {
          Extensions.cbOnDataChanged();
      }
      // NO success message
  }

  // For save operations - redirect only
  if (response.result) {
      if (response.reload) {
          window.location.href = `${globalRootUrl}${response.reload}`;
      }
      // NO success message
  }

  3. Controller Optimization - Follow IVR Menu Pattern

  ❌ Avoid Unnecessary REST API Calls in Controllers

  // WRONG - Don't make REST API calls in modifyAction
  public function modifyAction(string $uniqid = null): void
  {
      $restAnswer = $this->di->get(PBXCoreRESTClientProvider::SERVICE_NAME, [
          '/pbxcore/api/v2/call-queues/getRecord',
          PBXCoreRESTClientProvider::HTTP_METHOD_GET,
          ['id' => $uniqid]
      ]);
      // Process response...
  }

  ✅ Minimal Controller Logic - Let JavaScript Handle Data Loading

  // CORRECT - Following IVR Menu pattern
  public function modifyAction(string $uniqid = null): void
  {
      // Create minimal empty structure for form field definitions only
      $emptyQueue = new \stdClass();
      $emptyQueue->id = '';
      $emptyQueue->uniqid = $uniqid ?: '';
      $emptyQueue->name = '';
      // ... set other empty properties

      // Form structure only - JavaScript loads actual data
      $this->view->form = new CallQueueEditForm($emptyQueue);
      $this->view->represent = '';
  }

  Current State Analysis

  Existing Architecture

  - Model: src/Common/Models/CallQueues.php and src/Common/Models/CallQueueMembers.php
  - AdminCabinet Controller: src/AdminCabinet/Controllers/CallQueuesController.php
  - Form: src/AdminCabinet/Forms/CallQueueEditForm.php
  - Partial REST API: Only delete action implemented
  - JavaScript: Feature-rich client with 500+ lines, member management, drag-and-drop
  - Views: Complex UI with accordion, tooltips, member tables

  CallQueues Model Fields Analysis

  public $id;                                    // Primary key
  public $uniqid;                               // Unique identifier
  public $name;                                 // Queue name
  public $extension;                            // Extension number
  public $strategy;                             // Call distribution strategy
  public $seconds_to_ring_each_member;          // Ring duration per member
  public $seconds_for_wrapup;                   // Wrap-up time
  public $recive_calls_while_on_a_call;        // Concurrent calls flag
  public $caller_hear;                          // What caller hears
  public $announce_position;                    // Position announcements
  public $announce_hold_time;                   // Hold time announcements
  public $periodic_announce_sound_id;           // Announcement sound
  public $moh_sound_id;                         // Music on hold sound
  public $periodic_announce_frequency;          // Announcement frequency
  public $timeout_to_redirect_to_extension;     // Timeout before redirect
  public $timeout_extension;                    // Timeout redirect extension
  public $redirect_to_extension_if_empty;       // Empty queue redirect
  public $number_unanswered_calls_to_redirect;  // Unanswered calls threshold
  public $redirect_to_extension_if_unanswered;  // Unanswered redirect extension
  public $number_repeat_unanswered_to_redirect; // Repeat threshold
  public $redirect_to_extension_if_repeat_exceeded; // Repeat exceeded redirect
  public $callerid_prefix;                      // Caller ID prefix
  public $description;                          // Queue description

  Implementation Plan

  Stage 1: REST API Backend Implementation

  1.1 Enhanced Action Classes with Represent Fields and Proper Logging

  File: src/PBXCoreREST/Lib/CallQueues/GetRecordAction.php

  <?php
  namespace MikoPBX\PBXCoreREST\Lib\CallQueues;

  use MikoPBX\Common\Models\CallQueues;
  use MikoPBX\Common\Models\CallQueueMembers;
  use MikoPBX\Common\Models\Extensions;
  use MikoPBX\Common\Models\SoundFiles;
  use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
  use MikoPBX\Core\System\SystemMessages;

  /**
   * Action for getting call queue record with extension representations
   *
   * @api {get} /pbxcore/api/v2/call-queues/getRecord/:id Get call queue record
   * @apiVersion 2.0.0
   * @apiName GetRecord
   * @apiGroup CallQueues
   *
   * @apiParam {String} [id] Record ID or "new" for new record structure
   *
   * @apiSuccess {Boolean} result Operation result
   * @apiSuccess {Object} data Call queue data with representation fields
   * @apiSuccess {String} data.timeout_extension Timeout extension number
   * @apiSuccess {String} data.timeout_extensionRepresent Timeout extension representation with icons
   * @apiSuccess {String} data.periodic_announce_sound_idRepresent Sound file representation
   * @apiSuccess {Array} data.members Array of queue members with representations
   * @apiSuccess {String} data.members.represent Member extension representation with icons
   */
  class GetRecordAction
  {
      /**
       * Get call queue record with all representation fields for dropdowns
       *
       * @param string|null $id Record ID or null for new record
       * @return PBXApiResult
       */
      public static function main(?string $id = null): PBXApiResult
      {
          $res = new PBXApiResult();
          $res->processor = __METHOD__;

          if (empty($id) || $id === 'new') {
              // Create structure for new record with default values
              $newQueue = new CallQueues();
              $newQueue->id = '';
              $newQueue->uniqid = CallQueues::generateUniqueID(Extensions::TYPE_QUEUE.'-');
              $newQueue->extension = Extensions::getNextFreeApplicationNumber();
              $newQueue->name = '';
              $newQueue->strategy = 'ringall';
              $newQueue->seconds_to_ring_each_member = '15';
              $newQueue->seconds_for_wrapup = '15';
              $newQueue->recive_calls_while_on_a_call = '1';
              $newQueue->caller_hear = 'ringing';
              $newQueue->announce_position = '1';
              $newQueue->announce_hold_time = '1';
              $newQueue->periodic_announce_frequency = '0';
              $newQueue->timeout_to_redirect_to_extension = '300';
              $newQueue->timeout_extension = '';
              $newQueue->redirect_to_extension_if_empty = '';
              $newQueue->number_unanswered_calls_to_redirect = '3';
              $newQueue->redirect_to_extension_if_unanswered = '';
              $newQueue->number_repeat_unanswered_to_redirect = '3';
              $newQueue->redirect_to_extension_if_repeat_exceeded = '';
              $newQueue->callerid_prefix = '';
              $newQueue->description = '';

              $res->data = DataStructure::createFromModel($newQueue, []);
              $res->success = true;

              SystemMessages::sysLogMsg(__METHOD__,
                  "New call queue structure generated",
                  LOG_DEBUG
              );
          } else {
              // Find existing record
              $queue = CallQueues::findFirst([
                  'conditions' => 'uniqid = :uniqid: OR id = :id:',
                  'bind' => ['uniqid' => $id, 'id' => $id]
              ]);

              if ($queue) {
                  // Get queue members with their representations
                  $members = CallQueueMembers::find([
                      'conditions' => 'queue = :queue:',
                      'bind' => ['queue' => $queue->uniqid],
                      'order' => 'priority ASC'
                  ]);

                  $membersArray = [];
                  foreach ($members as $member) {
                      $memberExt = Extensions::findFirstByNumber($member->extension);
                      $membersArray[] = [
                          'id' => (string)$member->id,
                          'extension' => $member->extension,
                          'priority' => (int)$member->priority,
                          'represent' => $memberExt ? $memberExt->getRepresent() : 'ERROR'
                      ];
                  }

                  $res->data = DataStructure::createFromModel($queue, $membersArray);
                  $res->success = true;

                  SystemMessages::sysLogMsg(__METHOD__,
                      "Call queue '{$queue->name}' ({$queue->extension}) loaded successfully",
                      LOG_DEBUG
                  );
              } else {
                  $res->messages['error'][] = 'Call queue not found';
                  SystemMessages::sysLogMsg(__METHOD__,
                      "Call queue not found: {$id}",
                      LOG_WARNING
                  );
              }
          }

          return $res;
      }
  }

  File: src/PBXCoreREST/Lib/CallQueues/SaveRecordAction.php

  <?php
  namespace MikoPBX\PBXCoreREST\Lib\CallQueues;

  use MikoPBX\Common\Models\CallQueues;
  use MikoPBX\Common\Models\CallQueueMembers;
  use MikoPBX\Common\Models\Extensions;
  use MikoPBX\AdminCabinet\Library\SecurityHelper;
  use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
  use MikoPBX\PBXCoreREST\Lib\Common\BaseActionHelper;
  use MikoPBX\PBXCoreREST\Lib\Common\SystemSanitizer;
  use MikoPBX\Core\System\SystemMessages;
  use MikoPBX\Common\Handlers\CriticalErrorsHandler;

  /**
   * Action for saving call queue record with comprehensive validation
   *
   * @api {post} /pbxcore/api/v2/call-queues/saveRecord Create call queue
   * @api {put} /pbxcore/api/v2/call-queues/saveRecord/:id Update call queue
   * @apiVersion 2.0.0
   * @apiName SaveRecord
   * @apiGroup CallQueues
   *
   * @apiParam {String} [id] Record ID (for update)
   * @apiParam {String} name Queue name
   * @apiParam {String} extension Extension number (2-8 digits)
   * @apiParam {String} [strategy] Call distribution strategy
   * @apiParam {Array} [members] Array of queue members
   * @apiParam {String} [timeout_extension] Timeout redirect extension
   * @apiParam {String} [periodic_announce_sound_id] Announcement sound ID
   *
   * @apiSuccess {Boolean} result Operation result
   * @apiSuccess {Object} data Saved call queue data with representations
   * @apiSuccess {String} reload URL for page reload
   */
  class SaveRecordAction
  {
      /**
       * Save call queue record with comprehensive validation and proper logging
       *
       * @param array $data Data to save
       * @return PBXApiResult
       */
      public static function main(array $data): PBXApiResult
      {
          $res = new PBXApiResult();
          $res->processor = __METHOD__;

          // Data sanitization with XSS protection
          $sanitizationRules = [
              'id' => 'int',
              'name' => 'string|html_escape|max:100',
              'extension' => 'string|regex:/^[0-9]{2,8}$/|max:8',
              'strategy' => 'string|in:ringall,leastrecent,fewestcalls,random,rrmemory,linear',
              'seconds_to_ring_each_member' => 'int|min:1|max:300',
              'seconds_for_wrapup' => 'int|min:0|max:300',
              'recive_calls_while_on_a_call' => 'bool',
              'caller_hear' => 'string|in:ringing,musiconhold',
              'announce_position' => 'bool',
              'announce_hold_time' => 'bool',
              'periodic_announce_sound_id' => 'string|empty_to_null',
              'moh_sound_id' => 'string|empty_to_null',
              'periodic_announce_frequency' => 'int|min:0|max:3600',
              'timeout_to_redirect_to_extension' => 'int|min:0|max:7200',
              'timeout_extension' => 'string|empty_to_null',
              'redirect_to_extension_if_empty' => 'string|empty_to_null',
              'number_unanswered_calls_to_redirect' => 'int|min:1|max:20',
              'redirect_to_extension_if_unanswered' => 'string|empty_to_null',
              'number_repeat_unanswered_to_redirect' => 'int|min:1|max:20',
              'redirect_to_extension_if_repeat_exceeded' => 'string|empty_to_null',
              'callerid_prefix' => 'string|max:20|empty_to_null',
              'description' => 'string|html_escape|max:500|empty_to_null',
              'members' => 'array'
          ];

          // Extract and sanitize main fields
          $fieldsToSanitize = array_intersect_key($data, $sanitizationRules);
          $sanitizedData = BaseActionHelper::sanitizeData($fieldsToSanitize, $sanitizationRules);

          // Custom validation for extension fields using SystemSanitizer
          $extensionFields = [
              'timeout_extension',
              'redirect_to_extension_if_empty',
              'redirect_to_extension_if_unanswered',
              'redirect_to_extension_if_repeat_exceeded'
          ];

          foreach ($extensionFields as $field) {
              if (isset($sanitizedData[$field]) && !empty($sanitizedData[$field])) {
                  if (!SystemSanitizer::isValidRoutingDestination($sanitizedData[$field], 20)) {
                      $sanitizedData[$field] = SystemSanitizer::sanitizeRoutingDestination($sanitizedData[$field], 20);
                      if (!SystemSanitizer::isValidRoutingDestination($sanitizedData[$field], 20)) {
                          $res->messages['error'][] = "Invalid {$field} value";
                          SystemMessages::sysLogMsg(__METHOD__,
                              "Invalid extension field {$field}: " . $sanitizedData[$field],
                              LOG_WARNING
                          );
                          return $res;
                      }
                  }
              }
          }

          // Check for dangerous content in text fields with proper logging
          $textFields = ['name', 'description', 'callerid_prefix'];
          foreach ($textFields as $field) {
              if (isset($sanitizedData[$field]) && SecurityHelper::containsDangerousContent($sanitizedData[$field])) {
                  $res->messages['error'][] = "Dangerous content detected in {$field}";
                  SystemMessages::sysLogMsg(__METHOD__,
                      "Dangerous content detected in {$field} from IP: " . ($_SERVER['REMOTE_ADDR'] ?? 'unknown') .
                      ", Content: " . substr($sanitizedData[$field], 0, 100),
                      LOG_WARNING
                  );
                  return $res;
              }
          }

          // Sanitize members data
          if (isset($data['members'])) {
              $sanitizedData['members'] = self::sanitizeMembersData($data['members']);
          }

          // Validate required fields
          $validationRules = [
              'name' => [
                  ['type' => 'required', 'message' => 'Queue name is required']
              ],
              'extension' => [
                  ['type' => 'required', 'message' => 'Extension number is required'],
                  ['type' => 'regex', 'pattern' => '/^[0-9]{2,8}$/', 'message' => 'Extension must be 2-8 digits']
              ]
          ];

          $validationErrors = BaseActionHelper::validateData($sanitizedData, $validationRules);
          if (!empty($validationErrors)) {
              $res->messages['error'] = $validationErrors;
              return $res;
          }

          // Get or create model
          if (!empty($sanitizedData['id'])) {
              $queue = CallQueues::findFirstById($sanitizedData['id']);
              if (!$queue) {
                  $res->messages['error'][] = 'Call queue not found';
                  SystemMessages::sysLogMsg(__METHOD__,
                      "Queue not found for update: " . $sanitizedData['id'],
                      LOG_WARNING
                  );
                  return $res;
              }
          } else {
              $queue = new CallQueues();
              $queue->uniqid = CallQueues::generateUniqueID(Extensions::TYPE_QUEUE.'-');
          }

          // Check extension uniqueness
          if (!BaseActionHelper::checkUniqueness(
              Extensions::class,
              'number',
              $sanitizedData['extension'],
              $queue->extension
          )) {
              $res->messages['error'][] = 'Extension number already exists';
              return $res;
          }

          try {
              // Save in transaction using BaseActionHelper
              $savedQueue = BaseActionHelper::executeInTransaction(function() use ($queue, $sanitizedData) {
                  // Update/create Extension
                  $extension = Extensions::findFirstByNumber($queue->extension ?? '');
                  if (!$extension) {
                      $extension = new Extensions();
                      $extension->type = Extensions::TYPE_QUEUE;
                      $extension->show_in_phonebook = 1;
                      $extension->public_access = 1;
                  }

                  $extension->number = $sanitizedData['extension'];
                  $extension->callerid = $sanitizedData['name'];

                  if (!$extension->save()) {
                      throw new \Exception('Failed to save extension: ' . implode(', ', $extension->getMessages()));
                  }

                  // Update CallQueue
                  $queue->extension = $sanitizedData['extension'];
                  $queue->name = $sanitizedData['name'];
                  $queue->strategy = $sanitizedData['strategy'] ?? 'ringall';
                  $queue->seconds_to_ring_each_member = $sanitizedData['seconds_to_ring_each_member'] ?? 15;
                  $queue->seconds_for_wrapup = $sanitizedData['seconds_for_wrapup'] ?? 15;
                  $queue->recive_calls_while_on_a_call = $sanitizedData['recive_calls_while_on_a_call'] ?? 1;
                  $queue->caller_hear = $sanitizedData['caller_hear'] ?? 'ringing';
                  $queue->announce_position = $sanitizedData['announce_position'] ?? 1;
                  $queue->announce_hold_time = $sanitizedData['announce_hold_time'] ?? 1;
                  $queue->periodic_announce_sound_id = $sanitizedData['periodic_announce_sound_id'];
                  $queue->moh_sound_id = $sanitizedData['moh_sound_id'];
                  $queue->periodic_announce_frequency = $sanitizedData['periodic_announce_frequency'] ?? 0;
                  $queue->timeout_to_redirect_to_extension = $sanitizedData['timeout_to_redirect_to_extension'] ?? 300;
                  $queue->timeout_extension = $sanitizedData['timeout_extension'];
                  $queue->redirect_to_extension_if_empty = $sanitizedData['redirect_to_extension_if_empty'];
                  $queue->number_unanswered_calls_to_redirect = $sanitizedData['number_unanswered_calls_to_redirect'] ?? 3;
                  $queue->redirect_to_extension_if_unanswered = $sanitizedData['redirect_to_extension_if_unanswered'];
                  $queue->number_repeat_unanswered_to_redirect = $sanitizedData['number_repeat_unanswered_to_redirect'] ?? 3;
                  $queue->redirect_to_extension_if_repeat_exceeded = $sanitizedData['redirect_to_extension_if_repeat_exceeded'];
                  $queue->callerid_prefix = $sanitizedData['callerid_prefix'];
                  $queue->description = $sanitizedData['description'];

                  if (!$queue->save()) {
                      throw new \Exception('Failed to save call queue: ' . implode(', ', $queue->getMessages()));
                  }

                  // Update queue members
                  if (isset($sanitizedData['members']) && is_array($sanitizedData['members'])) {
                      // Delete existing members
                      CallQueueMembers::find([
                          'conditions' => 'queue = :queue:',
                          'bind' => ['queue' => $queue->uniqid]
                      ])->delete();

                      // Add new members
                      foreach ($sanitizedData['members'] as $memberData) {
                          if (!empty($memberData['extension'])) {
                              $member = new CallQueueMembers();
                              $member->queue = $queue->uniqid;
                              $member->extension = $memberData['extension'];
                              $member->priority = $memberData['priority'] ?? 0;

                              if (!$member->save()) {
                                  throw new \Exception('Failed to save queue member: ' . implode(', ', $member->getMessages()));
                              }
                          }
                      }
                  }

                  return $queue;
              });

              // Get updated members for response
              $members = CallQueueMembers::find([
                  'conditions' => 'queue = :queue:',
                  'bind' => ['queue' => $savedQueue->uniqid],
                  'order' => 'priority ASC'
              ]);

              $membersArray = [];
              foreach ($members as $member) {
                  $memberExt = Extensions::findFirstByNumber($member->extension);
                  $membersArray[] = [
                      'id' => (string)$member->id,
                      'extension' => $member->extension,
                      'priority' => (int)$member->priority,
                      'represent' => $memberExt ? $memberExt->getRepresent() : 'ERROR'
                  ];
              }

              $res->data = DataStructure::createFromModel($savedQueue, $membersArray);
              $res->success = true;

              // Add reload path for page refresh after save
              $res->reload = "call-queues/modify/{$savedQueue->uniqid}";

              // Log successful operation (following MikoPBX standards)
              SystemMessages::sysLogMsg(__METHOD__,
                  "Call queue '{$savedQueue->name}' ({$savedQueue->extension}) saved successfully",
                  LOG_INFO
              );

          } catch (\Exception $e) {
              $res->messages['error'][] = $e->getMessage();
              // Use CriticalErrorsHandler for exceptions (following MikoPBX standards)
              CriticalErrorsHandler::handleExceptionWithSyslog($e);
          }

          return $res;
      }

      /**
       * Sanitize members data array
       *
       * @param array $members Raw members data
       * @return array Sanitized members data
       */
      private static function sanitizeMembersData(array $members): array
      {
          $sanitizedMembers = [];
          foreach ($members as $member) {
              if (!empty($member['extension'])) {
                  $extension = SystemSanitizer::sanitizeExtension($member['extension']);
                  if (SystemSanitizer::isValidExtension($extension)) {
                      $sanitizedMembers[] = [
                          'extension' => $extension,
                          'priority' => max(0, min(10, (int)($member['priority'] ?? 0)))
                      ];
                  }
              }
          }
          return $sanitizedMembers;
      }
  }

  File: src/PBXCoreREST/Lib/CallQueues/DeleteRecordAction.php

  <?php
  namespace MikoPBX\PBXCoreREST\Lib\CallQueues;

  use MikoPBX\Common\Models\CallQueues;
  use MikoPBX\Common\Models\CallQueueMembers;
  use MikoPBX\Common\Models\Extensions;
  use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
  use MikoPBX\PBXCoreREST\Lib\Common\BaseActionHelper;
  use MikoPBX\Core\System\SystemMessages;
  use MikoPBX\Common\Handlers\CriticalErrorsHandler;

  /**
   * Action for deleting call queue record
   *
   * @api {delete} /pbxcore/api/v2/call-queues/deleteRecord/:id Delete call queue
   * @apiVersion 2.0.0
   * @apiName DeleteRecord
   * @apiGroup CallQueues
   *
   * @apiParam {String} id Record ID to delete
   *
   * @apiSuccess {Boolean} result Operation result
   * @apiSuccess {Object} data Deletion result
   * @apiSuccess {String} data.deleted_id ID of deleted record
   */
  class DeleteRecordAction
  {
      /**
       * Delete call queue record with proper logging
       *
       * @param string $id Record ID to delete
       * @return PBXApiResult
       */
      public static function main(string $id): PBXApiResult
      {
          $res = new PBXApiResult();
          $res->processor = __METHOD__;

          if (empty($id)) {
              $res->messages['error'][] = 'Record ID is required';
              SystemMessages::sysLogMsg(__METHOD__,
                  'Delete attempt with empty ID',
                  LOG_ERR
              );
              return $res;
          }

          try {
              // Find record by uniqid or id
              $queue = CallQueues::findFirst([
                  'conditions' => 'uniqid = :uniqid: OR id = :id:',
                  'bind' => ['uniqid' => $id, 'id' => $id]
              ]);

              if (!$queue) {
                  $res->messages['error'][] = 'Call queue not found';
                  SystemMessages::sysLogMsg(__METHOD__,
                      "Queue not found for deletion: {$id}",
                      LOG_WARNING
                  );
                  return $res;
              }

              $queueName = $queue->name;
              $queueExtension = $queue->extension;

              // Delete in transaction using BaseActionHelper
              BaseActionHelper::executeInTransaction(function() use ($queue) {
                  // Delete related queue members
                  $members = CallQueueMembers::find([
                      'conditions' => 'queue = :queue:',
                      'bind' => ['queue' => $queue->uniqid]
                  ]);
                  foreach ($members as $member) {
                      if (!$member->delete()) {
                          throw new \Exception('Failed to delete queue member: ' . implode(', ', $member->getMessages()));
                      }
                  }

                  // Delete related extension
                  $extension = Extensions::findFirstByNumber($queue->extension);
                  if ($extension) {
                      if (!$extension->delete()) {
                          throw new \Exception('Failed to delete extension: ' . implode(', ', $extension->getMessages()));
                      }
                  }

                  // Delete call queue itself
                  if (!$queue->delete()) {
                      throw new \Exception('Failed to delete call queue: ' . implode(', ', $queue->getMessages()));
                  }

                  return true;
              });

              $res->success = true;
              $res->data = ['deleted_id' => $id];

              // Log successful deletion (following MikoPBX standards)
              SystemMessages::sysLogMsg(__METHOD__,
                  "Call queue '{$queueName}' ({$queueExtension}) deleted successfully",
                  LOG_INFO
              );

          } catch (\Exception $e) {
              $res->messages['error'][] = $e->getMessage();
              // Use CriticalErrorsHandler for exceptions (following MikoPBX standards)
              CriticalErrorsHandler::handleExceptionWithSyslog($e);
          }

          return $res;
      }
  }

  File: src/PBXCoreREST/Lib/CallQueues/DataStructure.php

  <?php
  namespace MikoPBX\PBXCoreREST\Lib\CallQueues;

  use MikoPBX\Common\Models\Extensions;
  use MikoPBX\Common\Models\SoundFiles;
  use MikoPBX\AdminCabinet\Library\SecurityHelper;

  /**
   * Data structure for call queues with extension representations
   *
   * Creates consistent data format for API responses including representation
   * fields needed for proper dropdown display with icons and security.
   *
   * @package MikoPBX\PBXCoreREST\Lib\CallQueues
   */
  class DataStructure
  {
      /**
       * Create data array from CallQueues model with representation fields
       *
       * This method generates all necessary representation fields for proper
       * dropdown display in the frontend, following the IVR Menu pattern.
       *
       * @param \MikoPBX\Common\Models\CallQueues $model Queue model instance
       * @param array $members Array of queue members with representations
       * @return array Complete data structure with representation fields
       */
      public static function createFromModel($model, array $members = []): array
      {
          // Get timeout extension representation
          $timeoutExtensionRepresent = '';
          if (!empty($model->timeout_extension)) {
              $timeoutExt = Extensions::findFirstByNumber($model->timeout_extension);
              if ($timeoutExt) {
                  $timeoutExtensionRepresent = $timeoutExt->getRepresent();
              }
          }

          // Get redirect extension representations
          $redirectEmptyRepresent = '';
          if (!empty($model->redirect_to_extension_if_empty)) {
              $redirectExt = Extensions::findFirstByNumber($model->redirect_to_extension_if_empty);
              if ($redirectExt) {
                  $redirectEmptyRepresent = $redirectExt->getRepresent();
              }
          }

          $redirectUnansweredRepresent = '';
          if (!empty($model->redirect_to_extension_if_unanswered)) {
              $redirectExt = Extensions::findFirstByNumber($model->redirect_to_extension_if_unanswered);
              if ($redirectExt) {
                  $redirectUnansweredRepresent = $redirectExt->getRepresent();
              }
          }

          $redirectRepeatRepresent = '';
          if (!empty($model->redirect_to_extension_if_repeat_exceeded)) {
              $redirectExt = Extensions::findFirstByNumber($model->redirect_to_extension_if_repeat_exceeded);
              if ($redirectExt) {
                  $redirectRepeatRepresent = $redirectExt->getRepresent();
              }
          }

          // Get sound file representations
          $periodicAnnounceRepresent = '';
          if (!empty($model->periodic_announce_sound_id)) {
              $soundFile = SoundFiles::findFirstById($model->periodic_announce_sound_id);
              if ($soundFile) {
                  $periodicAnnounceRepresent = $soundFile->getRepresent();
              }
          }

          $mohSoundRepresent = '';
          if (!empty($model->moh_sound_id)) {
              $soundFile = SoundFiles::findFirstById($model->moh_sound_id);
              if ($soundFile) {
                  $mohSoundRepresent = $soundFile->getRepresent();
              }
          }

          return [
              'id' => (string)$model->id,
              'uniqid' => $model->uniqid,
              // SECURITY: Sanitize user-provided fields to prevent XSS attacks
              'name' => SecurityHelper::escapeHtml($model->name ?? ''),
              'extension' => $model->extension,
              'strategy' => $model->strategy,
              'seconds_to_ring_each_member' => (string)$model->seconds_to_ring_each_member,
              'seconds_for_wrapup' => (string)$model->seconds_for_wrapup,
              'recive_calls_while_on_a_call' => (bool)$model->recive_calls_while_on_a_call,
              'caller_hear' => $model->caller_hear,
              'announce_position' => (bool)$model->announce_position,
              'announce_hold_time' => (bool)$model->announce_hold_time,
              'periodic_announce_frequency' => (int)$model->periodic_announce_frequency,
              'timeout_to_redirect_to_extension' => (int)$model->timeout_to_redirect_to_extension,
              'number_unanswered_calls_to_redirect' => (int)$model->number_unanswered_calls_to_redirect,
              'number_repeat_unanswered_to_redirect' => (int)$model->number_repeat_unanswered_to_redirect,
              'callerid_prefix' => SecurityHelper::escapeHtml($model->callerid_prefix ?? ''),
              'description' => SecurityHelper::escapeHtml($model->description ?? ''),

              // Extension fields with representations for dropdown display
              'timeout_extension' => $model->timeout_extension ?? '',
              'timeout_extensionRepresent' => $timeoutExtensionRepresent,

              'redirect_to_extension_if_empty' => $model->redirect_to_extension_if_empty ?? '',
              'redirect_to_extension_if_emptyRepresent' => $redirectEmptyRepresent,

              'redirect_to_extension_if_unanswered' => $model->redirect_to_extension_if_unanswered ?? '',
              'redirect_to_extension_if_unansweredRepresent' => $redirectUnansweredRepresent,

              'redirect_to_extension_if_repeat_exceeded' => $model->redirect_to_extension_if_repeat_exceeded ?? '',
              'redirect_to_extension_if_repeat_exceededRepresent' => $redirectRepeatRepresent,

              // Sound file fields with representations
              'periodic_announce_sound_id' => $model->periodic_announce_sound_id ?? '',
              'periodic_announce_sound_idRepresent' => $periodicAnnounceRepresent,

              'moh_sound_id' => $model->moh_sound_id ?? '',
              'moh_sound_idRepresent' => $mohSoundRepresent,

              // Members with representations
              'members' => $members
          ];
      }

      /**
       * Create simplified data structure for list display
       *
       * @param \MikoPBX\Common\Models\CallQueues $model Queue model instance
       * @return array Simplified data structure for table display
       */
      public static function createForList($model): array
      {
          $data = self::createFromModel($model, []);

          // Add members summary for list display
          $members = [];
          foreach ($model->CallQueueMembers as $member) {
              $memberExt = Extensions::findFirstByNumber($member->extension);
              $members[] = [
                  'extension' => $member->extension,
                  'represent' => $memberExt ? $memberExt->getRepresent() : 'ERROR'
              ];
          }

          $data['members'] = $members;
          return $data;
      }
  }

  1.2 Updated Controllers Following IVR Menu Pattern

  File: src/PBXCoreREST/Controllers/CallQueues/GetController.php

  <?php
  namespace MikoPBX\PBXCoreREST\Controllers\CallQueues;

  use MikoPBX\PBXCoreREST\Controllers\BaseController;
  use MikoPBX\PBXCoreREST\Lib\CallQueuesManagementProcessor;

  /**
   * GET controller for call queues management
   *
   * @RoutePrefix("/pbxcore/api/v2/call-queues")
   *
   * @examples
   * curl http://127.0.0.1/pbxcore/api/v2/call-queues/getRecord/QUEUE-123ABC
   * curl http://127.0.0.1/pbxcore/api/v2/call-queues/getRecord/new
   * curl http://127.0.0.1/pbxcore/api/v2/call-queues/getList
   *
   * @package MikoPBX\PBXCoreREST\Controllers\CallQueues
   */
  class GetController extends BaseController
  {
      /**
       * Handle GET requests for call queue operations
       *
       * @param string $actionName The name of the action
       * @param string|null $id Optional ID parameter for record operations
       *
       * Get call queue record by ID, if ID is 'new' or empty returns structure with default data
       * @Get("/getRecord/{id}")
       *
       * Retrieve the list of all call queues with member representations
       * @Get("/getList")
       *
       * @return void
       */
      public function callAction(string $actionName, ?string $id = null): void
      {
          $requestData = $this->request->get();

          if (!empty($id)){
              $requestData['id'] = $id;
          }

          // Send request to Worker following MikoPBX REST API architecture
          $this->sendRequestToBackendWorker(
              CallQueuesManagementProcessor::class,
              $actionName,
              $requestData
          );
      }
  }

  File: src/PBXCoreREST/Controllers/CallQueues/PostController.php

  <?php
  namespace MikoPBX\PBXCoreREST\Controllers\CallQueues;

  use MikoPBX\PBXCoreREST\Controllers\BaseController;
  use MikoPBX\PBXCoreREST\Lib\CallQueuesManagementProcessor;

  /**
   * POST controller for call queues management
   *
   * @RoutePrefix("/pbxcore/api/v2/call-queues")
   *
   * @examples
   * curl -X POST http://127.0.0.1/pbxcore/api/v2/call-queues/saveRecord \
   *   -d "name=Sales Queue&extension=2001&strategy=ringall"
   *
   * @package MikoPBX\PBXCoreREST\Controllers\CallQueues
   */
  class PostController extends BaseController
  {
      /**
       * Handle POST requests for call queue operations
       *
       * @param string $actionName The name of the action
       *
       * Creates new call queue record
       * @Post("/saveRecord")
       *
       * @return void
       */
      public function callAction(string $actionName): void
      {
          $postData = self::sanitizeData($this->request->getPost(), $this->filter);

          $this->sendRequestToBackendWorker(
              CallQueuesManagementProcessor::class,
              $actionName,
              $postData
          );
      }
  }

  File: src/PBXCoreREST/Controllers/CallQueues/PutController.php

  <?php
  namespace MikoPBX\PBXCoreREST\Controllers\CallQueues;

  use MikoPBX\PBXCoreREST\Controllers\BaseController;
  use MikoPBX\PBXCoreREST\Lib\CallQueuesManagementProcessor;

  /**
   * PUT controller for call queues management
   *
   * @RoutePrefix("/pbxcore/api/v2/call-queues")
   *
   * @examples
   * curl -X PUT http://127.0.0.1/pbxcore/api/v2/call-queues/saveRecord/QUEUE-123ABC \
   *   -d "name=Updated Queue&extension=2002&strategy=leastrecent"
   *
   * @package MikoPBX\PBXCoreREST\Controllers\CallQueues
   */
  class PutController extends BaseController
  {
      /**
       * Handle PUT requests for call queue operations
       *
       * @param string $actionName The name of the action
       * @param string|null $id Call queue ID for update operations
       *
       * Updates existing call queue record
       * @Put("/saveRecord/{id}")
       *
       * @return void
       */
      public function callAction(string $actionName, ?string $id = null): void
      {
          if (empty($id)) {
              $this->response->setJsonContent([
                  'result' => false,
                  'messages' => ['error' => ['Empty ID in request data']]
              ]);
              $this->response->send();
              return;
          }

          $putData = self::sanitizeData($this->request->getPut(), $this->filter);
          $putData['id'] = $id;

          $this->sendRequestToBackendWorker(
              CallQueuesManagementProcessor::class,
              $actionName,
              $putData
          );
      }
  }

  File: src/PBXCoreREST/Controllers/CallQueues/DeleteController.php

  <?php
  namespace MikoPBX\PBXCoreREST\Controllers\CallQueues;

  use MikoPBX\PBXCoreREST\Controllers\BaseController;
  use MikoPBX\PBXCoreREST\Lib\CallQueuesManagementProcessor;

  /**
   * DELETE controller for call queues management
   *
   * @RoutePrefix("/pbxcore/api/v2/call-queues")
   *
   * @examples
   * curl -X DELETE http://127.0.0.1/pbxcore/api/v2/call-queues/deleteRecord/QUEUE-123ABC
   *
   * @package MikoPBX\PBXCoreREST\Controllers\CallQueues
   */
  class DeleteController extends BaseController
  {
      /**
       * Handle DELETE requests for call queue operations
       *
       * @param string $actionName The name of the action
       * @param string|null $id Call queue ID to delete
       *
       * Deletes call queue record
       * @Delete("/deleteRecord/{id}")
       *
       * @return void
       */
      public function callAction(string $actionName, ?string $id = null): void
      {
          if (empty($id)) {
              $this->response->setJsonContent([
                  'result' => false,
                  'messages' => ['error' => ['Empty ID in request data']]
              ]);
              $this->response->send();
              return;
          }

          $deleteData = ['id' => $id];

          $this->sendRequestToBackendWorker(
              CallQueuesManagementProcessor::class,
              $actionName,
              $deleteData
          );
      }
  }

  Stage 2: Frontend Implementation with Hidden Input Pattern and No Success Messages

  2.1 Enhanced CallQueues API Client

  File: sites/admin-cabinet/assets/js/src/PbxAPI/callQueuesAPI.js

  /*
   * CallQueuesAPI - REST API client for call queue management
   *
   * Implements unified API approach with centralized endpoint definitions
   * and comprehensive error handling following IVR Menu patterns.
   */

  /* global globalRootUrl, PbxApi, globalTranslate */

  const CallQueuesAPI = {
      /**
       * API endpoints configuration
       */
      apiUrl: `${Config.pbxUrl}/pbxcore/api/v2/call-queues/`,

      // Centralized endpoint definitions for easy maintenance
      endpoints: {
          getList: `${Config.pbxUrl}/pbxcore/api/v2/call-queues/getList`,
          getRecord: `${Config.pbxUrl}/pbxcore/api/v2/call-queues/getRecord`,
          saveRecord: `${Config.pbxUrl}/pbxcore/api/v2/call-queues/saveRecord`,
          deleteRecord: `${Config.pbxUrl}/pbxcore/api/v2/call-queues/deleteRecord`
      },

      /**
       * Get call queue record with all representation fields
       *
       * @param {string} id Record ID or empty string for new record
       * @param {function} callback Callback function to handle response
       */
      getRecord(id, callback) {
          const recordId = (!id || id === '') ? 'new' : id;

          $.api({
              url: `${this.endpoints.getRecord}/${recordId}`,
              method: 'GET',
              on: 'now',
              onSuccess(response) {
                  callback(response);
              },
              onFailure(response) {
                  callback(response);
              },
              onError() {
                  callback({
                      result: false,
                      messages: {error: ['Network error occurred']}
                  });
              }
          });
      },

      /**
       * Get list of all call queues with member representations
       *
       * @param {function} callback Callback function to handle response
       */
      getList(callback) {
          $.api({
              url: this.endpoints.getList,
              method: 'GET',
              on: 'now',
              onSuccess(response) {
                  callback(response);
              },
              onFailure(response) {
                  callback(response);
              },
              onError() {
                  callback({result: false, data: []});
              }
          });
      },

      /**
       * Save call queue record (create or update)
       *
       * @param {object} data Data to save
       * @param {function} callback Callback function to handle response
       */
      saveRecord(data, callback) {
          const method = data.id ? 'PUT' : 'POST';
          const url = data.id ?
              `${this.endpoints.saveRecord}/${data.id}` :
              this.endpoints.saveRecord;

          $.api({
              url: url,
              method: method,
              data: data,
              on: 'now',
              // Session cookies automatically included for CSRF protection
              onSuccess(response) {
                  callback(response);
              },
              onFailure(response) {
                  callback(response);
              },
              onError() {
                  callback({
                      result: false,
                      messages: {error: ['Network error occurred']}
                  });
              }
          });
      },

      /**
       * Delete call queue record
       *
       * @param {string} id Record ID to delete
       * @param {function} callback Callback function to handle response
       */
      deleteRecord(id, callback) {
          $.api({
              url: `${this.endpoints.deleteRecord}/${id}`,
              on: 'now',
              method: 'DELETE',
              successTest: PbxApi.successTest,
              onSuccess(response) {
                  callback(response);
              },
              onFailure(response) {
                  callback(response);
              },
              onError() {
                  callback(false);
              }
          });
      }
  };

  2.2 Enhanced Form Modification Module with No Success Messages

  File: sites/admin-cabinet/assets/js/src/CallQueues/callqueue-modify.js

  /*
   * Call queue edit form management module
   *
   * Implements Hidden Input Pattern from IVR Menu for dropdown fields,
   * comprehensive XSS protection using SecurityUtils, and follows
   * MikoPBX standards for user interface (no success messages).
   */

  /* global globalRootUrl, CallQueuesAPI, Form, globalTranslate, UserMessage, Extensions, SoundFilesSelector, SecurityUtils */

  const callqueueModify = {
      $formObj: $('#call-queue-form'),
      $number: $('#extension'),
      $membersTable: $('#members-table'),
      defaultExtension: '',
      isFormInitializing: false,

      /**
       * Form validation rules
       */
      validateRules: {
          name: {
              identifier: 'name',
              rules: [
                  {
                      type: 'empty',
                      prompt: globalTranslate.cq_ValidateNameIsEmpty,
                  },
              ],
          },
          extension: {
              identifier: 'extension',
              rules: [
                  {
                      type: 'empty',
                      prompt: globalTranslate.cq_ValidateExtensionIsEmpty,
                  },
                  {
                      type: 'regExp[/^[0-9]{2,8}$/]',
                      prompt: globalTranslate.cq_ValidateExtensionFormat
                  },
                  {
                      type: 'existRule[extension-error]',
                      prompt: globalTranslate.cq_ValidateExtensionDouble,
                  },
              ],
          },
      },

      /**
       * Initialize the call queue modification module
       */
      initialize() {
          // Initialize extension availability checking
          let timeoutId;
          callqueueModify.$number.on('input', () => {
              if (timeoutId) {
                  clearTimeout(timeoutId);
              }
              timeoutId = setTimeout(() => {
                  const newNumber = callqueueModify.$formObj.form('get value', 'extension');
                  Extensions.checkAvailability(callqueueModify.defaultExtension, newNumber);
              }, 500);
          });

          // Initialize sound file selectors with icon support (following IVR Menu pattern)
          SoundFilesSelector.initializeWithIcons('periodic_announce_sound_id');
          SoundFilesSelector.initializeWithIcons('moh_sound_id');

          // Initialize extension dropdowns with Hidden Input Pattern
          callqueueModify.initializeTimeoutExtensionDropdown();
          callqueueModify.initializeRedirectExtensionDropdowns();

          // Initialize members table with drag-and-drop functionality
          callqueueModify.initializeMembersTable();

          // Setup auto-resize for description textarea
          $('textarea[name="description"]').on('input paste keyup', function() {
              Form.autoResizeTextArea($(this));
          });

          // Configure Form.js for REST API integration
          Form.$formObj = callqueueModify.$formObj;
          Form.url = '#'; // Not used with REST API
          Form.validateRules = callqueueModify.validateRules;
          Form.cbBeforeSendForm = callqueueModify.cbBeforeSendForm;
          Form.cbAfterSendForm = callqueueModify.cbAfterSendForm;

          // Setup REST API configuration
          Form.apiSettings.enabled = true;
          Form.apiSettings.apiObject = CallQueuesAPI;
          Form.apiSettings.saveMethod = 'saveRecord';

          // Configure post-save navigation (following MikoPBX standards - no success messages)
          Form.afterSubmitIndexUrl = `${globalRootUrl}call-queues/index/`;
          Form.afterSubmitModifyUrl = `${globalRootUrl}call-queues/modify/`;

          // Disable success message display in Form.js (following MikoPBX standards)
          Form.showSuccessMessage = false;

          // Initialize Form with all standard features
          Form.initialize();

          // Load form data via REST API (not from controller - following IVR Menu pattern)
          callqueueModify.initializeForm();
      },

      /**
       * Initialize timeout extension dropdown with current extension exclusion
       *
       * Follows IVR Menu pattern to prevent circular references by excluding
       * the current queue extension from timeout dropdown options.
       */
      initializeTimeoutExtensionDropdown() {
          const getCurrentExtension = () => {
              return callqueueModify.$formObj.form('get value', 'extension') || callqueueModify.defaultExtension;
          };

          const initDropdown = () => {
              const currentExtension = getCurrentExtension();
              const excludeExtensions = currentExtension ? [currentExtension] : [];

              $('.timeout_extension-select').dropdown(Extensions.getDropdownSettingsForRoutingWithExclusion((value) => {
                  // Update hidden input when dropdown changes (Hidden Input Pattern)
                  $('input[name="timeout_extension"]').val(value);

                  // Trigger change event only if not initializing
                  if (!callqueueModify.isFormInitializing) {
                      $('input[name="timeout_extension"]').trigger('change');
                      Form.dataChanged();
                  }
              }, excludeExtensions));
          };

          initDropdown();

          // Reinitialize dropdown when main extension changes
          callqueueModify.$number.on('change', () => {
              setTimeout(initDropdown, 100);
          });
      },

      /**
       * Initialize all redirect extension dropdowns
       *
       * Sets up dropdown behavior for all extension redirect fields
       * using the Hidden Input Pattern for better form integration.
       */
      initializeRedirectExtensionDropdowns() {
          const redirectFields = [
              'redirect_to_extension_if_empty',
              'redirect_to_extension_if_unanswered',
              'redirect_to_extension_if_repeat_exceeded'
          ];

          redirectFields.forEach(fieldName => {
              $(`.${fieldName}-select`).dropdown(Extensions.getDropdownSettingsForRouting((value) => {
                  // Update corresponding hidden input
                  $(`input[name="${fieldName}"]`).val(value);

                  if (!callqueueModify.isFormInitializing) {
                      $(`input[name="${fieldName}"]`).trigger('change');
                      Form.dataChanged();
                  }
              }));
          });
      },

      /**
       * Initialize members table with drag-and-drop functionality
       *
       * Sets up sortable table for queue members with priority management
       * and extension selection dropdowns for each member.
       */
      initializeMembersTable() {
          // Make table sortable for priority management
          callqueueModify.$membersTable.sortable({
              handle: '.sort-handle',
              axis: 'y',
              cursor: 'grabbing',
              update: function() {
                  callqueueModify.updateMembersPriority();
                  Form.dataChanged();
              }
          });

          // Add member button handler
          $('#add-member-button').on('click', () => {
              callqueueModify.addMemberRow();
          });

          // Delete member button handler
          callqueueModify.$membersTable.on('click', '.delete-member', function() {
              $(this).closest('tr').remove();
              callqueueModify.updateMembersPriority();
              Form.dataChanged();
          });
      },

      /**
       * Add new member row to the table
       *
       * @param {object} memberData Optional member data for initialization
       */
      addMemberRow(memberData = {}) {
          const rowIndex = callqueueModify.$membersTable.find('tbody tr').length;
          const $row = $(`
              <tr class="member-row">
                  <td class="center aligned">
                      <i class="sort icon sort-handle" style="cursor: grab;"></i>
                  </td>
                  <td>
                      <div class="ui dropdown member-extension-select">
                          <div class="default text">${globalTranslate.cq_ChooseMemberExtension}</div>
                          <i class="dropdown icon"></i>
                          <div class="menu"></div>
                      </div>
                      <input type="hidden" name="members[${rowIndex}][extension]" />
                  </td>
                  <td class="center aligned">
                      <input type="hidden" name="members[${rowIndex}][priority]" value="${rowIndex}" />
                      <span class="priority-display">${rowIndex + 1}</span>
                  </td>
                  <td class="center aligned">
                      <button type="button" class="ui red mini icon button delete-member">
                          <i class="trash icon"></i>
                      </button>
                  </td>
              </tr>
          `);

          callqueueModify.$membersTable.find('tbody').append($row);

          // Initialize dropdown for new member using Extensions API
          $row.find('.member-extension-select').dropdown(Extensions.getDropdownSettingsWithoutEmpty((value) => {
              $row.find('input[name*="[extension]"]').val(value);
              if (!callqueueModify.isFormInitializing) {
                  Form.dataChanged();
              }
          }));

          // Populate with existing data if provided
          if (memberData.extension && memberData.represent) {
              const $dropdown = $row.find('.member-extension-select');

              // SECURITY: Sanitize member representation with XSS protection while preserving safe icons
              const safeRepresent = SecurityUtils.sanitizeExtensionsApiContent(memberData.represent);

              $dropdown.dropdown('set value', memberData.extension);
              $dropdown.find('.text').removeClass('default').html(safeRepresent);
              $row.find('input[name*="[extension]"]').val(memberData.extension);
          }
      },

      /**
       * Update members priority based on table order
       */
      updateMembersPriority() {
          callqueueModify.$membersTable.find('.member-row').each(function(index) {
              $(this).find('input[name*="[priority]"]').val(index);
              $(this).find('.priority-display').text(index + 1);
          });
      },

      /**
       * Load data into form using REST API (following optimized controller pattern)
       *
       * Always loads data via REST API - controller provides minimal structure only
       */
      initializeForm() {
          const recordId = callqueueModify.getRecordId();
          callqueueModify.isFormInitializing = true;

          // Always load via REST API - controller provides minimal structure only
          CallQueuesAPI.getRecord(recordId, (response) => {
              if (response.result) {
                  // Populate basic form fields
                  callqueueModify.populateForm(response.data);

                  // Restore dropdown values with representations (Hidden Input Pattern)
                  callqueueModify.restoreDropdownValues(response.data);

                  // Set page title and display based on data
                  if (response.data.id) {
                      document.title = `Edit Queue: ${response.data.name}`;
                      $('#queue-extension-number').html(`<i class="users icon"></i> ${response.data.extension}`);
                  } else {
                      document.title = 'New Call Queue';
                  }

                  // Populate members table
                  if (response.data.members && response.data.members.length > 0) {
                      response.data.members.forEach(member => {
                          callqueueModify.addMemberRow(member);
                      });
                  }

                  callqueueModify.defaultExtension = response.data.extension;

                  // Reinitialize timeout dropdown with current extension exclusion
                  callqueueModify.initializeTimeoutExtensionDropdown();

              } else {
                  // Show error without success message context
                  const errorMessage = response.messages?.error || ['Failed to load call queue data'];
                  UserMessage.showMultiString(errorMessage, globalTranslate.cq_ImpossibleToLoadData);
              }

              callqueueModify.isFormInitializing = false;
          });
      },

      /**
       * Restore dropdown values with safe representation display
       *
       * @param {object} data Form data with representation fields
       */
      restoreDropdownValues(data) {
          const dropdownFields = [
              'timeout_extension',
              'redirect_to_extension_if_empty',
              'redirect_to_extension_if_unanswered',
              'redirect_to_extension_if_repeat_exceeded',
              'periodic_announce_sound_id',
              'moh_sound_id'
          ];

          dropdownFields.forEach(fieldName => {
              const value = data[fieldName];
              const represent = data[`${fieldName}Represent`];

              if (value && represent) {
                  const $dropdown = $(`.${fieldName}-select`);

                  // SECURITY: Sanitize representation with XSS protection while preserving safe icons
                  const safeRepresent = SecurityUtils.sanitizeExtensionsApiContent(represent);

                  $dropdown.dropdown('set value', value);
                  $dropdown.find('.text').removeClass('default').html(safeRepresent);

                  // Update hidden input (Hidden Input Pattern)
                  $(`input[name="${fieldName}"]`).val(value);
              }
          });
      },

      /**
       * Get record ID from URL for edit operations
       *
       * @returns {string} Record ID or empty string for new record
       */
      getRecordId() {
          const pathArray = window.location.pathname.split('/');
          const recordId = pathArray[pathArray.length - 1];
          return (recordId === 'modify') ? '' : recordId;
      },

      /**
       * Populate basic form fields
       *
       * @param {object} data Form data
       */
      populateForm(data) {
          Object.keys(data).forEach(key => {
              if (key !== 'members' && !key.includes('Represent')) {
                  callqueueModify.$formObj.form('set value', key, data[key]);
              }
          });
      },

      /**
       * Prepare form data before submission
       *
       * @param {object} settings Form submission settings
       * @returns {object} Modified settings with members data
       */
      cbBeforeSendForm(settings) {
          // Collect members data from table
          const members = [];
          $('.member-row').each(function(index) {
              const extension = $(this).find('input[name*="[extension]"]').val();
              if (extension) {
                  members.push({
                      extension: extension,
                      priority: index
                  });
              }
          });

          settings.data.members = members;
          return settings;
      },

      /**
       * Handle form submission response (following MikoPBX standards - no success messages)
       *
       * @param {object} response API response
       */
      cbAfterSendForm(response) {
          if (response.result) {
              // Just navigate - NO success message (following MikoPBX standards)
              if (response.reload) {
                  window.location.href = `${globalRootUrl}${response.reload}`;
              }
          }
          // Form.js handles error display automatically
      }
  };

  /**
   * Initialize on document ready
   */
  $(document).ready(() => {
      callqueueModify.initialize();
  });

  2.3 Enhanced Index Page with XSS Protection and No Success Messages

  File: sites/admin-cabinet/assets/js/src/CallQueues/callqueues-index.js

  /*
   * Call queues table management module
   *
   * Implements DataTable with Semantic UI following guidelines,
   * comprehensive XSS protection using SecurityUtils, and follows
   * MikoPBX standards for user interface (no success messages).
   */

  /* global globalRootUrl, CallQueuesAPI, Extensions, globalTranslate, UserMessage, SemanticLocalization, SecurityUtils */

  const queueTable = {
      $queuesTable: $('#call-queues-table'),
      dataTable: {},

      /**
       * Initialize the call queues index module
       */
      initialize() {
          // Show placeholder until data loads
          queueTable.toggleEmptyPlaceholder(true);

          queueTable.initializeDataTable();
      },

      /**
       * Initialize DataTable with proper Semantic UI integration
       *
       * Following DataTable Semantic UI Guidelines to prevent sizing issues
       * and ensure proper responsive behavior.
       */
      initializeDataTable() {
          queueTable.dataTable = queueTable.$queuesTable.DataTable({
              ajax: {
                  url: CallQueuesAPI.endpoints.getList,
                  dataSrc: function(json) {
                      // Manage empty state
                      queueTable.toggleEmptyPlaceholder(
                          !json.result || !json.data || json.data.length === 0
                      );
                      return json.result ? json.data : [];
                  }
              },
              columns: [
                  {
                      data: 'name',
                      className: 'collapsing', // Without 'ui' prefix as per guidelines
                      render: function(data) {
                          // SECURITY: Escape HTML to prevent XSS attacks
                          const safeName = SecurityUtils.escapeHtml(data) || '—';
                          return `<strong>${safeName}</strong>`;
                      }
                  },
                  {
                      data: 'extension',
                      className: 'centered collapsing',
                      render: function(data) {
                          // SECURITY: Escape extension numbers
                          return SecurityUtils.escapeHtml(data) || '—';
                      }
                  },
                  {
                      data: 'strategy',
                      className: 'centered collapsing hide-on-mobile',
                      responsivePriority: 3,
                      render: function(data) {
                          return SecurityUtils.escapeHtml(data) || '—';
                      }
                  },
                  {
                      data: 'members',
                      className: 'hide-on-mobile collapsing',
                      responsivePriority: 2,
                      render: function(data) {
                          if (!data || data.length === 0) {
                              return '<small>—</small>';
                          }

                          // SECURITY: Sanitize member representations allowing safe icons
                          const membersList = data.map(member => {
                              return SecurityUtils.sanitizeExtensionsApiContent(member.represent || member.extension);
                          }).join(', ');

                          const safeMembersList = membersList.length > 50 ?
                              membersList.substring(0, 50) + '...' :
                              membersList;
                          return `<small>${safeMembersList}</small>`;
                      }
                  },
                  {
                      data: 'description',
                      className: 'hide-on-mobile',
                      responsivePriority: 4,
                      render: function(data) {
                          if (!data) return '—';

                          // SECURITY: Escape description content
                          const safeDesc = SecurityUtils.escapeHtml(data);
                          return safeDesc.length > 50 ?
                              safeDesc.substring(0, 50) + '...' :
                              safeDesc;
                      }
                  },
                  {
                      data: null,
                      orderable: false,
                      searchable: false,
                      className: 'right aligned collapsing', // Action buttons column
                      responsivePriority: 1,
                      render: function(data, type, row) {
                          return `<div class="ui tiny basic icon buttons action-buttons">
                              <a href="${globalRootUrl}call-queues/modify/${row.uniqid}"
                                 class="ui button popuped"
                                 data-content="${globalTranslate.bt_ToolTipEdit}">
                                  <i class="edit icon"></i>
                              </a>
                              <a href="#"
                                 data-value="${row.uniqid}"
                                 class="ui button delete two-steps-delete popuped"
                                 data-content="${globalTranslate.bt_ToolTipDelete}">
                                  <i class="trash red icon"></i>
                              </a>
                          </div>`;
                      }
                  }
              ],
              order: [[0, 'asc']],
              responsive: true,
              searching: false,
              paging: false,
              info: false,
              language: SemanticLocalization.dataTableLocalisation,
              drawCallback: function() {
                  // Initialize Semantic UI elements after table draw
                  queueTable.$queuesTable.find('.popuped').popup();

                  // Initialize double-click editing
                  queueTable.initializeDoubleClickEdit();
              }
          });

          // Handle deletion using existing DeleteSomething.js integration
          queueTable.$queuesTable.on('click', 'a.delete:not(.two-steps-delete)', function(e) {
              e.preventDefault();
              const $button = $(this);
              const queueId = $button.attr('data-value');

              // Add loading state
              $button.addClass('loading disabled');

              CallQueuesAPI.deleteRecord(queueId, queueTable.cbAfterDeleteRecord);
          });
      },

      /**
       * Handle record deletion response (following MikoPBX standards - no success messages)
       *
       * @param {object|boolean} response API response
       */
      cbAfterDeleteRecord(response) {
          if (response.result === true) {
              // Just reload table data - NO success message (following MikoPBX standards)
              queueTable.dataTable.ajax.reload();

              // Update related components
              if (typeof Extensions !== 'undefined' && Extensions.cbOnDataChanged) {
                  Extensions.cbOnDataChanged();
              }

              // NO UserMessage.showSuccess() call - following MikoPBX standards
          } else {
              // Only show error messages
              const errorMessage = response.messages?.error || [globalTranslate.cq_ImpossibleToDeleteQueue];
              UserMessage.showMultiString(errorMessage, globalTranslate.cq_DeletionError);
          }

          // Remove loading state
          $('a.delete').removeClass('loading disabled');
      },

      /**
       * Toggle empty table placeholder visibility
       *
       * @param {boolean} isEmpty Whether the table is empty
       */
      toggleEmptyPlaceholder(isEmpty) {
          if (isEmpty) {
              $('#queue-table-container').hide();
              $('#add-new-button').hide();
              $('#empty-table-placeholder').show();
          } else {
              $('#empty-table-placeholder').hide();
              $('#add-new-button').show();
              $('#queue-table-container').show();
          }
      },

      /**
       * Initialize double-click editing
       *
       * IMPORTANT: Exclude action buttons cells to avoid conflicts with DeleteSomething.js
       */
      initializeDoubleClickEdit() {
          queueTable.$queuesTable.on('dblclick', 'tbody td:not(.action-buttons)', function() {
              const data = queueTable.dataTable.row(this).data();
              if (data && data.uniqid) {
                  window.location.href = `${globalRootUrl}call-queues/modify/${data.uniqid}`;
              }
          });
      }
  };

  /**
   * Initialize on document ready
   */
  $(document).ready(() => {
      queueTable.initialize();
  });

  Stage 3: Optimized AdminCabinet Controller Following IVR Menu Pattern

  File: src/AdminCabinet/Controllers/CallQueuesController.php

  <?php
  namespace MikoPBX\AdminCabinet\Controllers;

  use MikoPBX\AdminCabinet\Forms\CallQueueEditForm;

  /**
   * CallQueuesController
   *
   * Optimized controller following IVR Menu pattern - minimal server-side logic,
   * JavaScript handles data loading via REST API. No unnecessary REST API calls
   * in controller methods.
   */
  class CallQueuesController extends BaseController
  {
      /**
       * Display the list of call queues
       *
       * DataTable handles all data loading via AJAX to REST API.
       * No server-side data processing required.
       */
      public function indexAction(): void
      {
          // No server-side data loading - JavaScript handles everything via REST API
      }

      /**
       * Edit call queue details
       *
       * Optimized approach following IVR Menu pattern:
       * - No REST API calls in controller (following MikoPBX standards)
       * - JavaScript handles data loading via CallQueuesAPI.getRecord()
       * - Controller only provides form structure for field definitions
       *
       * @param string|null $uniqid The unique identifier of the call queue
       */
      public function modifyAction(string $uniqid = null): void
      {
          // Create minimal empty structure for form field definitions only
          // JavaScript will populate actual data via REST API
          $emptyQueue = new \stdClass();
          $emptyQueue->id = '';
          $emptyQueue->uniqid = $uniqid ?: '';
          $emptyQueue->name = '';
          $emptyQueue->extension = '';
          $emptyQueue->strategy = 'ringall';
          $emptyQueue->seconds_to_ring_each_member = '15';
          $emptyQueue->seconds_for_wrapup = '15';
          $emptyQueue->recive_calls_while_on_a_call = '1';
          $emptyQueue->caller_hear = 'ringing';
          $emptyQueue->announce_position = '1';
          $emptyQueue->announce_hold_time = '1';
          $emptyQueue->periodic_announce_sound_id = '';
          $emptyQueue->moh_sound_id = '';
          $emptyQueue->periodic_announce_frequency = '0';
          $emptyQueue->timeout_to_redirect_to_extension = '300';
          $emptyQueue->timeout_extension = '';
          $emptyQueue->redirect_to_extension_if_empty = '';
          $emptyQueue->number_unanswered_calls_to_redirect = '3';
          $emptyQueue->redirect_to_extension_if_unanswered = '';
          $emptyQueue->number_repeat_unanswered_to_redirect = '3';
          $emptyQueue->redirect_to_extension_if_repeat_exceeded = '';
          $emptyQueue->callerid_prefix = '';
          $emptyQueue->description = '';

          // Create form structure for field rendering only
          $this->view->form = new CallQueueEditForm($emptyQueue);
          $this->view->represent = ''; // Will be set by JavaScript via REST API

          // JavaScript will handle actual data loading via CallQueuesAPI.getRecord()
          // This eliminates unnecessary REST API calls from the controller
      }

      /**
       * Legacy saveAction removed - following MikoPBX migration pattern
       *
       * All CRUD operations now handled by REST API endpoints:
       * - POST /pbxcore/api/v2/call-queues/saveRecord (create)
       * - PUT /pbxcore/api/v2/call-queues/saveRecord/{id} (update)
       * - DELETE /pbxcore/api/v2/call-queues/deleteRecord/{id} (delete)
       *
       * This approach provides:
       * - Better separation of concerns
       * - Improved performance (no server-side data processing in views)
       * - Consistent API interface for all operations
       * - Better error handling and validation
       */
  }

  Stage 4: View Templates with Hidden Input Pattern

  4.1 Enhanced modify.volt Template

  File: src/AdminCabinet/Views/CallQueues/modify.volt

  <form class="ui large form" id="call-queue-form" method="post">
      {{ form.render('id') }}
      {{ form.render('uniqid') }}

      <div class="ui ribbon label">
          <i class="users icon"></i> {{ t._('cq_QueueSettings') }}
      </div>

      <div class="ui segment">
          <div class="two fields">
              <div class="field">
                  {{ form.label('name') }}
                  {{ form.render('name') }}
              </div>
              <div class="field">
                  {{ form.label('extension') }}
                  {{ form.render('extension') }}
              </div>
          </div>

          <div class="field">
              {{ form.label('description') }}
              {{ form.render('description') }}
          </div>
      </div>

      <div class="ui ribbon label">
          <i class="phone icon"></i> {{ t._('cq_CallHandling') }}
      </div>

      <div class="ui segment">
          <div class="three fields">
              <div class="field">
                  {{ form.label('strategy') }}
                  {{ form.render('strategy') }}
              </div>
              <div class="field">
                  {{ form.label('seconds_to_ring_each_member') }}
                  {{ form.render('seconds_to_ring_each_member') }}
              </div>
              <div class="field">
                  {{ form.label('seconds_for_wrapup') }}
                  {{ form.render('seconds_for_wrapup') }}
              </div>
          </div>

          <div class="two fields">
              <div class="field">
                  <div class="ui checkbox">
                      {{ form.render('recive_calls_while_on_a_call') }}
                      {{ form.label('recive_calls_while_on_a_call') }}
                  </div>
              </div>
              <div class="field">
                  {{ form.label('caller_hear') }}
                  {{ form.render('caller_hear') }}
              </div>
          </div>
      </div>

      <div class="ui ribbon label">
          <i class="sound icon"></i> {{ t._('cq_SoundSettings') }}
      </div>

      <div class="ui segment">
          <div class="two fields">
              <!-- Periodic Announce Sound Dropdown with Hidden Input Pattern -->
              <div class="field">
                  {{ form.label('periodic_announce_sound_id') }}
                  <div class="ui dropdown periodic_announce_sound_id-select">
                      <div class="default text">{{ t._('cq_SelectAnnounceSound') }}</div>
                      <i class="dropdown icon"></i>
                      <div class="menu"></div>
                  </div>
                  {{ form.render('periodic_announce_sound_id', ['type': 'hidden']) }}
              </div>

              <!-- Music on Hold Sound Dropdown with Hidden Input Pattern -->
              <div class="field">
                  {{ form.label('moh_sound_id') }}
                  <div class="ui dropdown moh_sound_id-select">
                      <div class="default text">{{ t._('cq_SelectMohSound') }}</div>
                      <i class="dropdown icon"></i>
                      <div class="menu"></div>
                  </div>
                  {{ form.render('moh_sound_id', ['type': 'hidden']) }}
              </div>
          </div>

          <div class="three fields">
              <div class="field">
                  {{ form.label('periodic_announce_frequency') }}
                  {{ form.render('periodic_announce_frequency') }}
              </div>
              <div class="field">
                  <div class="ui checkbox">
                      {{ form.render('announce_position') }}
                      {{ form.label('announce_position') }}
                  </div>
              </div>
              <div class="field">
                  <div class="ui checkbox">
                      {{ form.render('announce_hold_time') }}
                      {{ form.label('announce_hold_time') }}
                  </div>
              </div>
          </div>
      </div>

      <div class="ui ribbon label">
          <i class="share alternate icon"></i> {{ t._('cq_RedirectSettings') }}
      </div>

      <div class="ui segment">
          <div class="two fields">
              <div class="field">
                  {{ form.label('timeout_to_redirect_to_extension') }}
                  {{ form.render('timeout_to_redirect_to_extension') }}
              </div>
              <!-- Timeout Extension Dropdown with Hidden Input Pattern -->
              <div class="field">
                  {{ form.label('timeout_extension') }}
                  <div class="ui dropdown timeout_extension-select">
                      <div class="default text">{{ t._('cq_SelectTimeoutExtension') }}</div>
                      <i class="dropdown icon"></i>
                      <div class="menu"></div>
                  </div>
                  {{ form.render('timeout_extension', ['type': 'hidden']) }}
              </div>
          </div>

          <!-- Empty Queue Redirect Dropdown with Hidden Input Pattern -->
          <div class="field">
              {{ form.label('redirect_to_extension_if_empty') }}
              <div class="ui dropdown redirect_to_extension_if_empty-select">
                  <div class="default text">{{ t._('cq_SelectRedirectExtension') }}</div>
                  <i class="dropdown icon"></i>
                  <div class="menu"></div>
              </div>
              {{ form.render('redirect_to_extension_if_empty', ['type': 'hidden']) }}
          </div>

          <div class="two fields">
              <div class="field">
                  {{ form.label('number_unanswered_calls_to_redirect') }}
                  {{ form.render('number_unanswered_calls_to_redirect') }}
              </div>
              <!-- Unanswered Redirect Dropdown with Hidden Input Pattern -->
              <div class="field">
                  {{ form.label('redirect_to_extension_if_unanswered') }}
                  <div class="ui dropdown redirect_to_extension_if_unanswered-select">
                      <div class="default text">{{ t._('cq_SelectRedirectExtension') }}</div>
                      <i class="dropdown icon"></i>
                      <div class="menu"></div>
                  </div>
                  {{ form.render('redirect_to_extension_if_unanswered', ['type': 'hidden']) }}
              </div>
          </div>

          <div class="two fields">
              <div class="field">
                  {{ form.label('number_repeat_unanswered_to_redirect') }}
                  {{ form.render('number_repeat_unanswered_to_redirect') }}
              </div>
              <!-- Repeat Exceeded Redirect Dropdown with Hidden Input Pattern -->
              <div class="field">
                  {{ form.label('redirect_to_extension_if_repeat_exceeded') }}
                  <div class="ui dropdown redirect_to_extension_if_repeat_exceeded-select">
                      <div class="default text">{{ t._('cq_SelectRedirectExtension') }}</div>
                      <i class="dropdown icon"></i>
                      <div class="menu"></div>
                  </div>
                  {{ form.render('redirect_to_extension_if_repeat_exceeded', ['type': 'hidden']) }}
              </div>
          </div>

          <div class="field">
              {{ form.label('callerid_prefix') }}
              {{ form.render('callerid_prefix') }}
          </div>
      </div>

      <div class="ui ribbon label">
          <i class="users icon"></i> {{ t._('cq_QueueMembers') }}
      </div>

      <div class="ui segment">
          <!-- Members Table with Drag-and-Drop Support -->
          <table class="ui celled table" id="members-table">
              <thead>
                  <tr>
                      <th class="center aligned collapsing">{{ t._('cq_Order') }}</th>
                      <th>{{ t._('cq_Extension') }}</th>
                      <th class="center aligned collapsing">{{ t._('cq_Priority') }}</th>
                      <th class="center aligned collapsing">{{ t._('cq_Actions') }}</th>
                  </tr>
              </thead>
              <tbody>
                  <!-- JavaScript will populate member rows -->
              </tbody>
          </table>

          <button type="button" id="add-member-button" class="ui green mini button">
              <i class="plus icon"></i> {{ t._('cq_AddMember') }}
          </button>
      </div>

      <!-- Form submission dropdown -->
      {{ partial("partials/submitbutton",['indexurl':'call-queues/index/']) }}
  </form>

  4.2 Enhanced index.volt Template

  File: src/AdminCabinet/Views/CallQueues/index.volt

  <!-- Add New Button -->
  <div id="add-new-button" style="display: none;">
      {% if isAllowed('save') %}
          {{ link_to("call-queues/modify", '<i class="add circle icon"></i> '~t._('cq_AddNewQueue'), "class": "ui blue button") }}
      {% endif %}
  </div>

  <!-- DataTable Container -->
  <div id="queue-table-container" style="display: none;">
      <table class="ui selectable compact unstackable table" id="call-queues-table">
          <thead>
              <tr>
                  <th>{{ t._('cq_ColumnName') }}</th>
                  <th class="center aligned">{{ t._('cq_ColumnExtension') }}</th>
                  <th class="center aligned hide-on-mobile">{{ t._('cq_ColumnStrategy') }}</th>
                  <th class="hide-on-mobile">{{ t._('cq_ColumnMembers') }}</th>
                  <th class="hide-on-mobile">{{ t._('cq_ColumnDescription') }}</th>
                  <th class="right aligned"></th>
              </tr>
          </thead>
          <tbody>
              <!-- DataTable will populate this -->
          </tbody>
      </table>
  </div>

  <!-- Empty Table Placeholder -->
  <div id="empty-table-placeholder" style="display: none;">
      {{ partial("partials/emptyTablePlaceholder", [
          'icon': 'users',
          'title': t._('cq_EmptyTableTitle'),
          'description': t._('cq_EmptyTableDescription'),
          'addButtonText': '<i class="add circle icon"></i> '~t._('cq_AddNewQueue'),
          'addButtonLink': 'call-queues/modify',
          'showButton': isAllowed('save'),
          'documentationLink': 'https://wiki.mikopbx.com/call-queues'
      ]) }}
  </div>

  Stage 5: Enhanced Translation and Asset Management

  5.1 Complete Translation Keys (Following MikoPBX Standards)

  File: src/Common/Messages/ru.php

  // Call Queue validation messages
  'cq_ValidateNameIsEmpty' => 'Название очереди обязательно для заполнения',
  'cq_ValidateExtensionIsEmpty' => 'Номер добавочного обязателен для заполнения',
  'cq_ValidateExtensionFormat' => 'Номер добавочного должен содержать от 2 до 8 цифр',
  'cq_ValidateExtensionDouble' => 'Такой номер добавочного уже используется',

  // Call Queue operations (NO success messages - following MikoPBX standards)
  'cq_ImpossibleToDeleteQueue' => 'Невозможно удалить очередь вызовов',
  'cq_ImpossibleToLoadData' => 'Невозможно загрузить данные очереди',
  'cq_DeletionError' => 'Ошибка при удалении',

  // Call Queue interface
  'cq_EmptyTableTitle' => 'Очереди вызовов не созданы',
  'cq_EmptyTableDescription' => 'Создайте первую очередь для организации распределения входящих вызовов',
  'cq_AddNewQueue' => 'Добавить очередь',
  'cq_ChooseMemberExtension' => 'Выберите добавочный...',
  'cq_SelectTimeoutExtension' => 'Выберите добавочный для таймаута...',
  'cq_SelectRedirectExtension' => 'Выберите добавочный для переадресации...',
  'cq_SelectAnnounceSound' => 'Выберите звуковой файл...',
  'cq_SelectMohSound' => 'Выберите музыку ожидания...',

  // Table columns
  'cq_ColumnName' => 'Название',
  'cq_ColumnExtension' => 'Номер',
  'cq_ColumnStrategy' => 'Стратегия',
  'cq_ColumnMembers' => 'Участники',
  'cq_ColumnDescription' => 'Описание',

  // Form sections
  'cq_QueueSettings' => 'Настройки очереди',
  'cq_CallHandling' => 'Обработка вызовов',
  'cq_SoundSettings' => 'Звуковые настройки',
  'cq_RedirectSettings' => 'Настройки переадресации',
  'cq_QueueMembers' => 'Участники очереди',

  // Members table
  'cq_Order' => 'Порядок',
  'cq_Extension' => 'Добавочный',
  'cq_Priority' => 'Приоритет',
  'cq_Actions' => 'Действия',
  'cq_AddMember' => 'Добавить участника',

  5.2 AssetProvider Updates

  File: src/AdminCabinet/Providers/AssetProvider.php

  /**
   * Prepare assets for CallQueues module
   *
   * @param string $action Controller action name
   */
  private function makeCallQueuesAssets(string $action): void
  {
      if ($action === 'index') {
          // DataTables assets for queue list
          $this->headerCollectionCSS
              ->addCss('css/vendor/datatable/dataTables.semanticui.css', true);
          $this->footerCollectionJS
              ->addJs('js/vendor/datatable/dataTables.semanticui.js', true);

          // Main page modules with security utils
          $this->footerCollectionJS
              ->addJs('js/pbx/main/security-utils.js', true)
              ->addJs('js/pbx/PbxAPI/callQueuesAPI.js', true)
              ->addJs('js/pbx/CallQueues/callqueues-index.js', true);

      } elseif ($action === 'modify') {
          // Edit form assets
          $this->footerCollectionJS
              ->addJs('js/pbx/main/form.js', true)
              ->addJs('js/pbx/main/security-utils.js', true)
              ->addJs('js/pbx/PbxAPI/callQueuesAPI.js', true)
              ->addJs('js/pbx/CallQueues/callqueue-modify.js', true);

          // jQuery UI for sortable members table
          $this->headerCollectionCSS
              ->addCss('css/vendor/jquery-ui/jquery-ui.css', true);
          $this->footerCollectionJS
              ->addJs('js/vendor/jquery-ui/jquery-ui.min.js', true);
      }
  }

  Key Differences from Original Plan

  1. Proper Logging Standards

  - ❌ Removed all error_log() usage
  - ✅ Added SystemMessages::sysLogMsg(__METHOD__, $message, LOG_LEVEL)
  - ✅ Added CriticalErrorsHandler::handleExceptionWithSyslog($e) for exceptions

  2. No Success Messages Policy

  - ❌ Removed all UserMessage.showSuccess() calls
  - ✅ Operations show visual feedback through table updates or navigation
  - ✅ Only error messages are displayed to users

  3. Optimized Controller Pattern

  - ❌ Removed unnecessary REST API calls from modifyAction
  - ✅ Controller provides minimal form structure only
  - ✅ JavaScript handles all data loading via REST API
  - ✅ Follows IVR Menu optimization pattern

  4. Enhanced Security Implementation

  - ✅ Comprehensive XSS protection using existing SecurityUtils
  - ✅ Proper CSRF protection through existing MikoPBX architecture
  - ✅ Detailed security logging for suspicious activities
  - ✅ Multi-level data sanitization and validation

  Implementation Testing Strategy

  1. Security Testing

  # XSS payload testing
  curl -X POST "http://127.0.0.1/pbxcore/api/v2/call-queues/saveRecord" \
    -d "name=<script>alert('XSS')</script>&extension=2001"

  # CSRF protection testing
  curl -X POST "http://127.0.0.1/pbxcore/api/v2/call-queues/saveRecord" \
    -H "Origin: http://malicious-site.com" \
    -d "name=TestQueue&extension=2001"

  2. User Interface Testing

  - ✅ Verify no success messages appear after save/delete operations
  - ✅ Confirm table updates automatically after operations
  - ✅ Test navigation after successful saves
  - ✅ Verify error messages display correctly

  3. API Endpoint Testing

  # Get new queue structure
  curl "http://127.0.0.1/pbxcore/api/v2/call-queues/getRecord/new"

  # Get existing queue with representations
  curl "http://127.0.0.1/pbxcore/api/v2/call-queues/getRecord/QUEUE-123ABC"

  # Create queue with members
  curl -X POST "http://127.0.0.1/pbxcore/api/v2/call-queues/saveRecord" \
    -d "name=Sales Queue&extension=2001&members[0][extension]=101&members[0][priority]=0"

  4. Logging Verification

  # Check system logs for proper logging format
  docker exec <containerId> tail -f /storage/usbdisk1/mikopbx/log/system/messages | grep CallQueues

  Benefits of This Enhanced Approach

  ✅ Follows MikoPBX Standards: Proper logging, no success messages, optimized controllers✅ Proven Patterns: Based on working IVR Menu implementation✅
  Security First: Comprehensive XSS/CSRF protection✅ Hidden Input Pattern: Reliable dropdown form integration✅ Represent Fields: Proper display of complex
  dropdown content✅ Performance Optimized: Minimal server-side processing✅ Maintainable Code: Clear separation of concerns✅ Backward Compatible: Preserves
  existing functionality

  Files Structure Summary

  New Files:

  1. src/PBXCoreREST/Lib/CallQueues/GetRecordAction.php
  2. src/PBXCoreREST/Lib/CallQueues/GetListAction.php
  3. src/PBXCoreREST/Lib/CallQueues/SaveRecordAction.php
  4. src/PBXCoreREST/Lib/CallQueues/DataStructure.php
  5. src/PBXCoreREST/Controllers/CallQueues/PostController.php
  6. src/PBXCoreREST/Controllers/CallQueues/PutController.php
  7. src/PBXCoreREST/Controllers/CallQueues/DeleteController.php

  Modified Files:

  1. src/PBXCoreREST/Lib/CallQueuesManagementProcessor.php
  2. src/PBXCoreREST/Controllers/CallQueues/GetController.php
  3. src/PBXCoreREST/Providers/RouterProvider.php
  4. sites/admin-cabinet/assets/js/src/PbxAPI/callQueuesAPI.js
  5. sites/admin-cabinet/assets/js/src/CallQueues/callqueues-index.js
  6. sites/admin-cabinet/assets/js/src/CallQueues/callqueue-modify.js
  7. src/AdminCabinet/Controllers/CallQueuesController.php
  8. src/AdminCabinet/Views/CallQueues/index.volt
  9. src/AdminCabinet/Views/CallQueues/modify.volt
  10. src/Common/Messages/ru.php
  11. src/AdminCabinet/Providers/AssetProvider.php

  This comprehensive migration plan ensures a smooth transition to REST API architecture while maintaining all MikoPBX development standards, security
  requirements, and user experience patterns established in the ecosystem.