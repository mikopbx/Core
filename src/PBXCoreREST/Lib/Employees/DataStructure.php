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

namespace MikoPBX\PBXCoreREST\Lib\Employees;

use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\Sip;
use MikoPBX\Common\Models\Users;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;
use MikoPBX\PBXCoreREST\Lib\Common\AvatarHelper;
use MikoPBX\PBXCoreREST\Lib\Common\OpenApiSchemaProvider;
use MikoPBX\PBXCoreREST\Lib\Common\SearchIndexTrait;

/**
 * Data structure for employees with extension and forwarding representations
 *
 * Creates consistent data format for API responses including representation
 * fields needed for proper dropdown display with icons and security.
 *
 * Implements OpenApiSchemaProvider to provide typed schemas for OpenAPI specification.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Employees
 */
class DataStructure extends AbstractDataStructure implements OpenApiSchemaProvider
{
    use SearchIndexTrait;

    /**
     * Create complete data array from Users model with representation fields
     *
     * This method generates all necessary representation fields for proper
     * dropdown display in the frontend.
     *
     * Following "Store Clean, Escape at Edge" principle:
     * Returns raw data that was sanitized on input. HTML escaping
     * is the responsibility of the presentation layer.
     *
     * @param \MikoPBX\Common\Models\Users $user
     * @return array<string, mixed> Complete data structure with representation fields
     */
    public static function createFromModel(Users $user): array
    {

        $data = self::createForNewEmployee();

        $data['id'] = $user->id;
        $data['user_username'] = $user->username ?? '';
        $data['user_email'] = $user->email ?? '';
        $data['user_avatar'] = AvatarHelper::getAvatarUrl($user->avatar ?? '');

        // Add extension length setting for form field validation
        $data['extensions_length'] = (int)PbxSettings::getValueByKey(PbxSettings::PBX_INTERNAL_EXTENSION_LENGTH);

        $sipExtension = Extensions::findFirst([
            'conditions' => 'type = :type: AND is_general_user_number = "1" AND userid = :userid:',
            'bind' => 
            [
                'type' => Extensions::TYPE_SIP,
                'userid' => $user->id
            ]
        ]);

        if ($sipExtension) {
            $data['number'] = $sipExtension->number;
            
            $sipRecord = $sipExtension?->Sip??null;
            if ($sipRecord!==null) {
                $data['sip_secret'] = $sipRecord->secret;
                $data['sip_dtmfmode'] = $sipRecord->dtmfmode;
                $data['sip_transport'] = $sipRecord->transport ?: Sip::TRANSPORT_AUTO;
                $data['sip_manualattributes'] = $sipRecord->getManualAttributes();
                $data['sip_enableRecording'] = $sipRecord->enableRecording === '1';
                
                // Add network filter field with representation
                $data = parent::addNetworkFilterField($data, 'sip_networkfilterid', $sipRecord->networkfilterid ?? 'none');
            }
        
            $extensionForwardingRights = $sipExtension?->ExtensionForwardingRights??null;
            if ($extensionForwardingRights) {
                $data['fwd_ringlength'] = (int)$extensionForwardingRights->ringlength;
            
                // Add forwarding fields with their represent counterparts
                $data = parent::addExtensionField($data, 'fwd_forwarding', $extensionForwardingRights->forwarding);
                $data = parent::addExtensionField($data, 'fwd_forwardingonbusy', $extensionForwardingRights->forwardingonbusy);
                $data = parent::addExtensionField($data, 'fwd_forwardingonunavailable', $extensionForwardingRights->forwardingonunavailable);
            }
        }

        $mobileExtension =  Extensions::findFirst([
            'conditions' => 'type = :type: AND is_general_user_number = "1" AND userid = :userid:',
            'bind' => 
            [
                'type' => Extensions::TYPE_EXTERNAL,
                'userid' => $user->id
            ]
        ]);
    
        if ($mobileExtension) {
            $data['mobile_number'] = $mobileExtension->number;
            $externalPhone = $mobileExtension?->ExternalPhones??null;
            if ($externalPhone!==null) {
                $data['mobile_dialstring'] = $externalPhone->dialstring;
            }
        }

        // Apply OpenAPI schema formatting to convert types automatically
        $data = self::formatBySchema($data, 'detail');

        return $data;
    }

    /**
     * Create simplified data structure for list display
     *
     * @param \MikoPBX\Common\Models\Users $model User model instance
     * @return array<string, mixed> Simplified data structure for table display
     */
    public static function createForList($model): array
    {
        // Use unified base method for list creation
        $data = parent::createForList($model);

        // Type cast to Users for IDE support
        if (!$model instanceof Users) {
            return $data;
        }
        $user = $model;

        // Add employee specific fields for list display
        $data['id'] = $user->id;
        $data['user_username'] = $user->username ?? '';
        $data['user_email'] = $user->email ?? '';
        $data['user_avatar'] = AvatarHelper::getAvatarUrl($user->avatar ?? '');

        // Get extension number
        $sipExtension = Extensions::findFirst([
            'conditions' => 'type = :type: AND is_general_user_number = "1" AND userid = :userid:',
            'bind' => [
                'type' => Extensions::TYPE_SIP,
                'userid' => $user->id
            ]
        ]);

        $data['number'] = $sipExtension?->number ?? '';

        // Create custom represent field for employee display
        $data['represent'] = '<i class="user outline icon"></i> ' . ($user->username ?? '') . " <{$data['number']}>";

        // Generate search index automatically from all fields
        $data['search_index'] = self::generateAutoSearchIndex($data);

        // Apply OpenAPI list schema formatting to ensure proper types
        $data = self::formatBySchema($data, 'list');

        return $data;
    }

    /**
     * Create structure for new employee
     *
     * @return array<string, mixed> Default employee data structure
     */
    public static function createForNewEmployee(): array
    {
        $defaultAvatar = '/admin-cabinet/assets/img/unknownPerson.jpg';

        $data = [
            'id' => '',  // Empty for new employee
            'user_username' => '',
            'user_email' => '',
            'user_avatar' => $defaultAvatar,
            'number' => Extensions::getNextInternalNumber(),
            'extensions_length' => (int)PbxSettings::getValueByKey(PbxSettings::PBX_INTERNAL_EXTENSION_LENGTH),
            'sip_secret' => Sip::generateSipPassword(),
            'sip_enableRecording' => true,
            'sip_dtmfmode' => 'auto',
            'sip_transport' => Sip::TRANSPORT_AUTO,
            'sip_manualattributes' => '',
            'fwd_ringlength' => 45,
            'mobile_number' => '',
            'mobile_dialstring' => '',
        ];
        $data = parent::addNetworkFilterField($data, 'sip_networkfilterid', 'none');
        $data = parent::addExtensionField($data, 'fwd_forwarding', '');
        $data = parent::addExtensionField($data, 'fwd_forwardingonbusy', '');
        $data = parent::addExtensionField($data, 'fwd_forwardingonunavailable', '');

        return $data;
    }

    /**
     * Get OpenAPI schema for employee list item
     *
     * This schema matches the structure returned by createForList() method.
     * Used for GET /api/v3/employees endpoint (list of employees).
     *
     * Inherits ALL fields from getParameterDefinitions() (NO duplication!)
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getListItemSchema(): array
    {
        $definitions = self::getParameterDefinitions();
        $requestParams = $definitions['request'];
        $responseFields = $definitions['response'];

        $properties = [];

        // ✨ Inherit request parameters used in list view
        $listFields = ['user_username', 'user_email', 'user_avatar', 'number'];
        foreach ($listFields as $field) {
            if (isset($requestParams[$field])) {
                $properties[$field] = $requestParams[$field];
                // Transform description key: rest_param_* → rest_schema_*
                $properties[$field]['description'] = str_replace('rest_param_', 'rest_schema_', $properties[$field]['description']);
            }
        }

        // ✨ Inherit response-only fields for list (NO duplication!)
        $listResponseFields = ['id', 'represent', 'search_index'];
        foreach ($listResponseFields as $field) {
            if (isset($responseFields[$field])) {
                $properties[$field] = $responseFields[$field];
            }
        }

        return [
            'type' => 'object',
            'required' => ['id', 'user_username', 'number', 'represent'],
            'properties' => $properties
        ];
    }

    /**
     * Get OpenAPI schema for detailed employee record
     *
     * This schema matches the structure returned by createFromModel() method.
     * Used for GET /api/v3/employees/{id}, POST, PUT, PATCH endpoints.
     *
     * Inherits ALL fields from getParameterDefinitions() (NO duplication!)
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getDetailSchema(): array
    {
        $definitions = self::getParameterDefinitions();
        $requestParams = $definitions['request'];
        $responseFields = $definitions['response'];

        $properties = [];

        // ✨ Inherit ALL request parameters for detail view (NO duplication!)
        foreach ($requestParams as $field => $definition) {
            // Skip writeOnly fields if any exist
            if (isset($definition['writeOnly']) && $definition['writeOnly']) {
                continue;
            }

            $properties[$field] = $definition;
            // Transform description key: rest_param_* → rest_schema_*
            $properties[$field]['description'] = str_replace('rest_param_', 'rest_schema_', $properties[$field]['description']);
        }

        // ✨ Inherit response-only fields for detail (NO duplication!)
        $detailResponseFields = [
            'id',
            'extensions_length',
            'sip_networkfilterid_represent',
            'fwd_forwarding_represent',
            'fwd_forwardingonbusy_represent',
            'fwd_forwardingonunavailable_represent'
        ];

        foreach ($detailResponseFields as $field) {
            if (isset($responseFields[$field])) {
                $properties[$field] = $responseFields[$field];
            }
        }

        return [
            'type' => 'object',
            'required' => ['id', 'user_username', 'number'],
            'properties' => $properties
        ];
    }

    /**
     * ✨ SINGLE SOURCE OF TRUTH - all fields defined once
     *
     * Centralizes ALL field definitions with their constraints, validation rules,
     * and sanitization. Eliminates duplication between request/response schemas.
     *
     * @return array<string, mixed>
     */
    private static function getAllFieldDefinitions(): array
    {
        return [
            // Writable fields - accepted in POST/PUT/PATCH requests
            'user_username' => [
                'type' => 'string',
                'description' => 'rest_schema_emp_username',
                'minLength' => 1,
                'maxLength' => 100,
                'sanitize' => 'text',
                'required' => true,
                'example' => 'john.doe'
            ],
            'user_email' => [
                'type' => 'string',
                'description' => 'rest_schema_emp_email',
                'format' => 'email',
                'maxLength' => 255,
                'sanitize' => 'string',
                'example' => 'john.doe@company.com'
            ],
            'user_avatar' => [
                'type' => 'string',
                'description' => 'rest_schema_emp_avatar',
                'format' => 'uri',
                'sanitize' => 'string',
                'example' => '/admin-cabinet/assets/img/avatars/user1.jpg'
            ],
            'number' => [
                'type' => 'string',
                'description' => 'rest_schema_emp_number',
                'pattern' => '^[0-9]{2,8}$',
                'minLength' => 2,
                'maxLength' => 8,
                'sanitize' => 'string',
                'required' => true,
                'example' => '200'
            ],
            'sip_secret' => [
                'type' => 'string',
                'description' => 'rest_schema_emp_sip_secret',
                'minLength' => 5,
                'maxLength' => 100,
                'sanitize' => 'string',
                'required' => true,
                'example' => 'StrongP@ssw0rd123'
            ],
            'sip_dtmfmode' => [
                'type' => 'string',
                'description' => 'rest_schema_emp_sip_dtmfmode',
                'enum' => ['auto', 'auto_info', 'inband', 'rfc4733', 'info'],
                'sanitize' => 'string',
                'default' => 'auto',
                'example' => 'rfc4733'
            ],
            'sip_transport' => [
                'type' => 'string',
                'description' => 'rest_schema_emp_sip_transport',
                'enum' => ['udp', 'tcp', 'tls', 'udp,tcp'],
                'sanitize' => 'string',
                'default' => 'udp',
                'example' => 'udp,tcp'
            ],
            'sip_manualattributes' => [
                'type' => 'string',
                'description' => 'rest_schema_emp_sip_manualattributes',
                'maxLength' => 1024,
                'sanitize' => 'string',
                'default' => '',
                'example' => '[endpoint]\ndevice_state_busy_at=2\n[aor]\nmax_contacts=3'
            ],
            'sip_enableRecording' => [
                'type' => 'boolean',
                'description' => 'rest_schema_emp_sip_enableRecording',
                'sanitize' => 'bool',
                'default' => true,
                'example' => true
            ],
            'sip_networkfilterid' => [
                'type' => 'string',
                'description' => 'rest_schema_emp_sip_networkfilterid',
                'pattern' => '^([0-9]+|none)$',
                'sanitize' => 'string',
                'default' => 'none',
                'example' => '1'
            ],
            'fwd_ringlength' => [
                'type' => 'integer',
                'description' => 'rest_schema_emp_fwd_ringlength',
                'maximum' => 180,
                'sanitize' => 'int',
                'default' => 45,
                'example' => 30,
                // WHY NO minimum constraint here:
                // Conditional validation in SaveRecordAction.validateEmployeeData():
                // - When fwd_forwarding is EMPTY: fwd_ringlength can be 0 (not used)
                // - When fwd_forwarding is SET: must be 3-180
                // Cannot express conditional logic in OpenAPI schema, so validated in business layer
            ],
            'fwd_forwarding' => [
                'type' => 'string',
                'description' => 'rest_schema_emp_fwd_forwarding',
                'pattern' => self::PATTERN_EXTENSION_WITH_SYSTEM_LONG,  // Allow system extensions (hangup, busy, did2user, voicemail)
                'maxLength' => 64,
                'sanitize' => 'routing',  // Changed from 'string' to handle system extensions
                'default' => '',
                'example' => '201'
            ],
            'fwd_forwardingonbusy' => [
                'type' => 'string',
                'description' => 'rest_schema_emp_fwd_forwardingonbusy',
                'pattern' => self::PATTERN_EXTENSION_WITH_SYSTEM_LONG,  // Allow system extensions (hangup, busy, did2user, voicemail)
                'maxLength' => 64,
                'sanitize' => 'routing',  // Changed from 'string' to handle system extensions
                'default' => '',
                'example' => '202'
            ],
            'fwd_forwardingonunavailable' => [
                'type' => 'string',
                'description' => 'rest_schema_emp_fwd_forwardingonunavailable',
                'pattern' => self::PATTERN_EXTENSION_WITH_SYSTEM_LONG,  // Allow system extensions (hangup, busy, did2user, voicemail)
                'maxLength' => 64,
                'sanitize' => 'routing',  // Changed from 'string' to handle system extensions
                'default' => '',
                'example' => '203'
            ],
            'mobile_number' => [
                'type' => 'string',
                'description' => 'rest_schema_emp_mobile_number',
                'pattern' => '^\+?[1-9]\d{1,14}$',
                'maxLength' => 50,
                'sanitize' => 'string',
                'default' => '',
                'example' => '79991234567'
            ],
            'mobile_dialstring' => [
                'type' => 'string',
                'description' => 'rest_schema_emp_mobile_dialstring',
                'maxLength' => 255,
                'sanitize' => 'string',
                'default' => '',
                'example' => '79991234567'
            ],

            // Read-only fields - only in responses, never accepted in requests
            'id' => [
                'type' => 'string',
                'description' => 'rest_schema_emp_id',
                'readOnly' => true,
                'example' => '1'
            ],
            'extensions_length' => [
                'type' => 'integer',
                'description' => 'rest_schema_emp_extensions_length',
                'minimum' => 2,
                'maximum' => 8,
                'readOnly' => true,
                'example' => 3
            ],
            'sip_networkfilterid_represent' => [
                'type' => 'string',
                'description' => 'rest_schema_emp_sip_networkfilterid_represent',
                'readOnly' => true
            ],
            'fwd_forwarding_represent' => [
                'type' => 'string',
                'description' => 'rest_schema_emp_fwd_forwarding_represent',
                'readOnly' => true
            ],
            'fwd_forwardingonbusy_represent' => [
                'type' => 'string',
                'description' => 'rest_schema_emp_fwd_forwardingonbusy_represent',
                'readOnly' => true
            ],
            'fwd_forwardingonunavailable_represent' => [
                'type' => 'string',
                'description' => 'rest_schema_emp_fwd_forwardingonunavailable_represent',
                'readOnly' => true
            ],
            'represent' => [
                'type' => 'string',
                'description' => 'rest_schema_emp_represent',
                'readOnly' => true,
                'example' => '<i class="user outline icon"></i> john.doe <200>'
            ],
            'search_index' => [
                'type' => 'string',
                'description' => 'rest_schema_emp_search_index',
                'readOnly' => true,
                'example' => 'john.doe 200 john.doe@company.com'
            ]
        ];
    }

    /**
     * Get parameter definitions (Single Source of Truth)
     *
     * Defines all field schemas, validation rules, defaults, and sanitization rules in one place.
     *
     * ✨ Uses getAllFieldDefinitions() to eliminate duplication.
     *
     * @return array<string, array<string, mixed>> Parameter definitions
     */
    public static function getParameterDefinitions(): array
    {
        $allFields = self::getAllFieldDefinitions();

        // Filter out read-only fields for request schema
        $writableFields = array_filter($allFields, fn($f) => empty($f['readOnly']));

        // Transform description keys for request parameters: rest_schema_* → rest_param_*
        $requestFields = [];
        foreach ($writableFields as $field => $definition) {
            $requestFields[$field] = $definition;
            $requestFields[$field]['description'] = str_replace('rest_schema_', 'rest_param_', $definition['description']);
        }

        return [
            'request' => $requestFields,
            'response' => $allFields,  // ALL fields including read-only
            'related' => [
                // Custom method: export, exportTemplate
                // Export/template format: defines which fields to include in CSV
                'format' => [
                    'type' => 'string',
                    'description' => 'rest_param_emp_export_format',
                    'enum' => ['minimal', 'standard', 'full'],
                    'required' => true,
                    'sanitize' => 'string',
                    'default' => 'standard',
                    'example' => 'standard'
                ],

                // Custom method: export
                // Filter options for export (number range)
                'filter' => [
                    'type' => 'object',
                    'description' => 'rest_param_emp_export_filter',
                    'properties' => [
                        'number_from' => [
                            'type' => 'string',
                            'description' => 'rest_param_emp_export_number_from',
                            'pattern' => '^[0-9]+$',
                            'example' => '100'
                        ],
                        'number_to' => [
                            'type' => 'string',
                            'description' => 'rest_param_emp_export_number_to',
                            'pattern' => '^[0-9]+$',
                            'example' => '999'
                        ]
                    ],
                    'sanitize' => 'array',
                    'example' => ['number_from' => '100', 'number_to' => '999']
                ],

                // Custom method: import
                // Upload ID from file upload
                'upload_id' => [
                    'type' => 'string',
                    'description' => 'rest_param_emp_upload_id',
                    'required' => true,
                    'sanitize' => 'string',
                    'example' => 'upload_abc123'
                ],

                // Custom method: import
                // Import action: preview or execute
                'action' => [
                    'type' => 'string',
                    'description' => 'rest_param_emp_import_action',
                    'enum' => ['preview', 'import'],
                    'required' => true,
                    'sanitize' => 'string',
                    'example' => 'preview'
                ],

                // Custom method: import, confirmImport
                // Import strategy for handling duplicates
                'strategy' => [
                    'type' => 'string',
                    'description' => 'rest_param_emp_import_strategy',
                    'enum' => ['skip_duplicates', 'update_existing', 'fail_on_duplicate'],
                    'sanitize' => 'string',
                    'default' => 'skip_duplicates',
                    'example' => 'skip_duplicates'
                ],

                // Custom method: batchCreate
                // Array of employee records to create (max 20)
                'employees' => [
                    'type' => 'array',
                    'description' => 'rest_param_emp_batch_employees',
                    'items' => ['type' => 'object'],
                    'required' => true,
                    'sanitize' => 'array',
                    'example' => [['number' => '101', 'user_username' => 'John Doe'], ['number' => '102', 'user_username' => 'Jane Smith']]
                ],

                // Custom method: batchCreate
                // Batch operation mode: validate only or create
                'mode' => [
                    'type' => 'string',
                    'description' => 'rest_param_emp_batch_mode',
                    'enum' => ['validate', 'create'],
                    'sanitize' => 'string',
                    'default' => 'create',
                    'example' => 'create'
                ],

                // Custom method: batchCreate
                // Continue processing on errors or stop at first error
                'skip_errors' => [
                    'type' => 'boolean',
                    'description' => 'rest_param_emp_batch_skip_errors',
                    'sanitize' => 'bool',
                    'default' => false,
                    'example' => false
                ],

                // Custom method: batchDelete
                'ids' => [
                    'type' => 'array',
                    'description' => 'rest_param_emp_batch_ids',
                    'items' => ['type' => 'string'],
                    'required' => true,
                    'sanitize' => 'array',
                    'example' => ['1', '2', '3']
                ]
            ]
        ];
    }

    // getSanitizationRules() inherited from AbstractDataStructure
    // Auto-generated from getParameterDefinitions() - Single Source of Truth

}