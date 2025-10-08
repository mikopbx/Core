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

namespace MikoPBX\PBXCoreREST\Controllers\Modules;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\ModulesManagementProcessor;
use MikoPBX\PBXCoreREST\Lib\Modules\DataStructure;
use MikoPBX\PBXCoreREST\Attributes\{
    ApiResource,
    ApiOperation,
    ApiParameter,
    ApiResponse,
    ApiDataSchema,
    SecurityType,
    ParameterLocation,
    HttpMapping,
    ResourceSecurity
};

/**
 * RESTful controller for extension modules management (v3 API)
 *
 * Comprehensive module management following Google API Design Guide patterns.
 * Implements full CRUD operations plus custom methods for module lifecycle:
 * installation, updates, enable/disable, and repository interaction.
 *
 * @package MikoPBX\PBXCoreREST\Controllers\Modules
 *
 * @see https://cloud.google.com/apis/design - Google API Design Guide
 * @see https://spec.openapis.org/oas/v3.1.0 - OpenAPI 3.1 Specification
 */
#[ApiResource(
    path: '/pbxcore/api/v3/modules',
    tags: ['Modules'],
    description: 'Comprehensive extension modules management for PBX functionality extension. ' .
                'Features include module installation from repository or package, updates, ' .
                'enable/disable operations, metadata retrieval, and automatic dependency handling.',
    processor: ModulesManagementProcessor::class
)]
#[ResourceSecurity('modules', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
#[HttpMapping(
    mapping: [
        'GET' => ['getList', 'getRecord', 'getDefault', 'getAvailableModules', 'getModuleInfo', 'getModuleLink', 'downloadStatus', 'installationStatus'],
        'POST' => ['create', 'installFromRepo', 'installFromPackage', 'enable', 'disable', 'uninstall', 'updateAll', 'startDownload', 'getMetadataFromModulePackage'],
        'PUT' => ['update'],
        'PATCH' => ['patch'],
        'DELETE' => ['delete']
    ],
    resourceLevelMethods: ['getRecord', 'update', 'patch', 'delete', 'getModuleInfo', 'getModuleLink', 'installFromRepo', 'enable', 'disable', 'uninstall', 'startDownload', 'downloadStatus'],
    collectionLevelMethods: ['getList', 'create', 'getDefault', 'getAvailableModules', 'installFromPackage', 'updateAll', 'getMetadataFromModulePackage', 'installationStatus'],
    customMethods: ['getDefault', 'getAvailableModules', 'getModuleInfo', 'getModuleLink', 'installFromRepo', 'installFromPackage', 'enable', 'disable', 'uninstall', 'updateAll', 'startDownload', 'downloadStatus', 'getMetadataFromModulePackage', 'installationStatus'],
    idPattern: '[A-Za-z][A-Za-z0-9]*'
)]
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = ModulesManagementProcessor::class;

    /**
     * Get list of all installed modules with pagination and filtering
     *
     * @route GET /pbxcore/api/v3/modules
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'list',
        isArray: true
    )]
    #[ApiOperation(
        summary: 'rest_mod_GetList',
        description: 'rest_mod_GetListDesc',
        operationId: 'getModulesList'
    )]
    #[ApiParameter(
        name: 'limit',
        type: 'integer',
        description: 'rest_param_limit',
        in: ParameterLocation::QUERY,
        minimum: 1,
        maximum: 100,
        default: 20,
        example: 20
    )]
    #[ApiParameter(
        name: 'offset',
        type: 'integer',
        description: 'rest_param_offset',
        in: ParameterLocation::QUERY,
        minimum: 0,
        default: 0,
        example: 0
    )]
    #[ApiParameter(
        name: 'search',
        type: 'string',
        description: 'rest_param_search',
        in: ParameterLocation::QUERY,
        maxLength: 255,
        example: 'template'
    )]
    #[ApiParameter(
        name: 'order',
        type: 'string',
        description: 'rest_param_order',
        in: ParameterLocation::QUERY,
        enum: ['name', 'version', 'developer'],
        default: 'name',
        example: 'name'
    )]
    #[ApiParameter(
        name: 'orderWay',
        type: 'string',
        description: 'rest_param_orderWay',
        in: ParameterLocation::QUERY,
        enum: ['ASC', 'DESC'],
        default: 'ASC',
        example: 'ASC'
    )]
    #[ApiResponse(200, 'rest_response_200_list')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getList(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get a specific module by ID
     *
     * @route GET /pbxcore/api/v3/modules/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_mod_GetRecord',
        description: 'rest_mod_GetRecordDesc',
        operationId: 'getModuleById'
    )]
    #[ApiParameter('id', 'string', 'rest_param_module_id', ParameterLocation::PATH, required: true, pattern: '^[A-Za-z][A-Za-z0-9]*$', example: 'ModuleTemplate')]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function getRecord(string $id): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Create/Install a new module (placeholder for future use)
     *
     * @route POST /pbxcore/api/v3/modules
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_mod_Create',
        description: 'rest_mod_CreateDesc',
        operationId: 'createModule'
    )]
    #[ApiResponse(201, 'rest_response_201_created')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function create(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Update module settings (full replacement)
     *
     * @route PUT /pbxcore/api/v3/modules/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_mod_Update',
        description: 'rest_mod_UpdateDesc',
        operationId: 'updateModule'
    )]
    #[ApiParameter('id', 'string', 'rest_param_module_id', ParameterLocation::PATH, required: true, example: 'ModuleTemplate')]
    #[ApiResponse(200, 'rest_response_200_updated')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function update(string $id): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Partially update module settings
     *
     * @route PATCH /pbxcore/api/v3/modules/{id}
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_mod_Patch',
        description: 'rest_mod_PatchDesc',
        operationId: 'patchModule'
    )]
    #[ApiParameter('id', 'string', 'rest_param_module_id', ParameterLocation::PATH, required: true, example: 'ModuleTemplate')]
    #[ApiResponse(200, 'rest_response_200_patched')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function patch(string $id): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Delete/Uninstall a module (use uninstall custom method instead)
     *
     * @route DELETE /pbxcore/api/v3/modules/{id}
     */
    #[ApiOperation(
        summary: 'rest_mod_Delete',
        description: 'rest_mod_DeleteDesc',
        operationId: 'deleteModule'
    )]
    #[ApiParameter('id', 'string', 'rest_param_module_id', ParameterLocation::PATH, required: true, example: 'ModuleTemplate')]
    #[ApiResponse(200, 'rest_response_200_deleted')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function delete(string $id): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get default template for new module
     *
     * @route GET /pbxcore/api/v3/modules:getDefault
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'default'
    )]
    #[ApiOperation(
        summary: 'rest_mod_GetDefault',
        description: 'rest_mod_GetDefaultDesc',
        operationId: 'getModuleDefault'
    )]
    #[ApiResponse(200, 'rest_response_200_default')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getDefault(): void
    {
        // Implementation handled by BaseRestController
    }

    /**
     * Get available modules from MIKO repository
     *
     * @route GET /pbxcore/api/v3/modules:getAvailableModules
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'list',
        isArray: true
    )]
    #[ApiOperation(
        summary: 'rest_mod_GetAvailableModules',
        description: 'rest_mod_GetAvailableModulesDesc',
        operationId: 'getAvailableModules'
    )]
    #[ApiResponse(200, 'rest_response_200_list')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getAvailableModules(): void
    {
        $requestData = self::sanitizeData($this->request->getData(), $this->filter);
        $this->sendRequestToBackendWorker(
            $this->processorClass,
            'getAvailableModules',
            $requestData
        );
    }

    /**
     * Get module description from repository
     *
     * @route GET /pbxcore/api/v3/modules/{id}:getModuleInfo
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_mod_GetModuleInfo',
        description: 'rest_mod_GetModuleInfoDesc',
        operationId: 'getModuleInfo'
    )]
    #[ApiParameter('id', 'string', 'rest_param_module_id', ParameterLocation::PATH, required: true, example: 'ModuleTemplate')]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function getModuleInfo(string $id): void
    {
        $requestData = self::sanitizeData($this->request->getData(), $this->filter);
        $requestData['uniqid'] = $id;
        $this->sendRequestToBackendWorker(
            $this->processorClass,
            'getModuleInfo',
            $requestData
        );
    }

    /**
     * Get installation link for a module release
     *
     * @route GET /pbxcore/api/v3/modules/{id}:getModuleLink
     */
    #[ApiOperation(
        summary: 'rest_mod_GetModuleLink',
        description: 'rest_mod_GetModuleLinkDesc',
        operationId: 'getModuleLink'
    )]
    #[ApiParameter('id', 'string', 'rest_param_module_release_id', ParameterLocation::PATH, required: true, example: '123')]
    #[ApiParameter('releaseId', 'integer', 'rest_param_module_release_id', ParameterLocation::QUERY, required: true, example: 123)]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function getModuleLink(string $id): void
    {
        $requestData = self::sanitizeData($this->request->getData(), $this->filter);
        $this->sendRequestToBackendWorker(
            $this->processorClass,
            'getModuleLink',
            $requestData
        );
    }

    /**
     * Install module from MIKO repository
     *
     * @route POST /pbxcore/api/v3/modules/{id}:installFromRepo
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_mod_InstallFromRepo',
        description: 'rest_mod_InstallFromRepoDesc',
        operationId: 'installFromRepo'
    )]
    #[ApiParameter('id', 'string', 'rest_param_module_id', ParameterLocation::PATH, required: true, example: 'ModuleTemplate')]
    #[ApiParameter('releaseId', 'integer', 'rest_param_module_release_id', ParameterLocation::QUERY, required: false, default: 0, example: 0)]
    #[ApiParameter('asyncChannelId', 'string', 'rest_param_async_channel_id', ParameterLocation::QUERY, required: false, example: 'install-123')]
    #[ApiResponse(200, 'rest_response_200_async_started')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function installFromRepo(string $id): void
    {
        $requestData = self::sanitizeData($this->request->getData(), $this->filter);
        $requestData['uniqid'] = $id;
        $this->sendRequestToBackendWorker(
            $this->processorClass,
            'installFromRepo',
            $requestData,
            '',
            600
        );
    }

    /**
     * Install module from uploaded package
     *
     * @route POST /pbxcore/api/v3/modules:installFromPackage
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_mod_InstallFromPackage',
        description: 'rest_mod_InstallFromPackageDesc',
        operationId: 'installFromPackage'
    )]
    #[ApiParameter('filePath', 'string', 'rest_param_module_file_path', ParameterLocation::QUERY, required: true, example: '/tmp/module.zip')]
    #[ApiParameter('fileId', 'string', 'rest_param_module_file_id', ParameterLocation::QUERY, required: true, example: 'upload-123')]
    #[ApiParameter('asyncChannelId', 'string', 'rest_param_async_channel_id', ParameterLocation::QUERY, required: false, example: 'install-123')]
    #[ApiResponse(200, 'rest_response_200_async_started')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function installFromPackage(): void
    {
        $requestData = self::sanitizeData($this->request->getData(), $this->filter);
        $this->sendRequestToBackendWorker(
            $this->processorClass,
            'installFromPackage',
            $requestData
        );
    }

    /**
     * Enable a module
     *
     * @route POST /pbxcore/api/v3/modules/{id}:enable
     */
    #[ApiOperation(
        summary: 'rest_mod_Enable',
        description: 'rest_mod_EnableDesc',
        operationId: 'enableModule'
    )]
    #[ApiParameter('id', 'string', 'rest_param_module_id', ParameterLocation::PATH, required: true, example: 'ModuleTemplate')]
    #[ApiParameter('asyncChannelId', 'string', 'rest_param_async_channel_id', ParameterLocation::QUERY, required: false, example: 'enable-123')]
    #[ApiResponse(200, 'rest_response_200_enabled')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function enable(string $id): void
    {
        $requestData = self::sanitizeData($this->request->getData(), $this->filter);
        $requestData['uniqid'] = $id;
        $this->sendRequestToBackendWorker(
            $this->processorClass,
            'enableModule',
            $requestData
        );
    }

    /**
     * Disable a module
     *
     * @route POST /pbxcore/api/v3/modules/{id}:disable
     */
    #[ApiOperation(
        summary: 'rest_mod_Disable',
        description: 'rest_mod_DisableDesc',
        operationId: 'disableModule'
    )]
    #[ApiParameter('id', 'string', 'rest_param_module_id', ParameterLocation::PATH, required: true, example: 'ModuleTemplate')]
    #[ApiParameter('reason', 'string', 'rest_param_module_disable_reason', ParameterLocation::QUERY, required: false, example: 'manual')]
    #[ApiParameter('reasonText', 'string', 'rest_param_module_disable_reason_text', ParameterLocation::QUERY, required: false, example: 'Disabled by admin')]
    #[ApiParameter('asyncChannelId', 'string', 'rest_param_async_channel_id', ParameterLocation::QUERY, required: false, example: 'disable-123')]
    #[ApiResponse(200, 'rest_response_200_disabled')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function disable(string $id): void
    {
        $requestData = self::sanitizeData($this->request->getData(), $this->filter);
        $requestData['uniqid'] = $id;
        $this->sendRequestToBackendWorker(
            $this->processorClass,
            'disableModule',
            $requestData
        );
    }

    /**
     * Uninstall a module
     *
     * @route POST /pbxcore/api/v3/modules/{id}:uninstall
     */
    #[ApiOperation(
        summary: 'rest_mod_Uninstall',
        description: 'rest_mod_UninstallDesc',
        operationId: 'uninstallModule'
    )]
    #[ApiParameter('id', 'string', 'rest_param_module_id', ParameterLocation::PATH, required: true, example: 'ModuleTemplate')]
    #[ApiParameter('keepSettings', 'boolean', 'rest_param_module_keep_settings', ParameterLocation::QUERY, required: false, default: false, example: false)]
    #[ApiParameter('asyncChannelId', 'string', 'rest_param_async_channel_id', ParameterLocation::QUERY, required: false, example: 'uninstall-123')]
    #[ApiResponse(200, 'rest_response_200_uninstalled')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function uninstall(string $id): void
    {
        $requestData = self::sanitizeData($this->request->getData(), $this->filter);
        $requestData['uniqid'] = $id;
        $this->sendRequestToBackendWorker(
            $this->processorClass,
            'uninstallModule',
            $requestData
        );
    }

    /**
     * Update all installed modules
     *
     * @route POST /pbxcore/api/v3/modules:updateAll
     */
    #[ApiOperation(
        summary: 'rest_mod_UpdateAll',
        description: 'rest_mod_UpdateAllDesc',
        operationId: 'updateAllModules'
    )]
    #[ApiParameter('modulesForUpdate', 'array', 'rest_param_modules_for_update', ParameterLocation::QUERY, required: true, example: '["ModuleTemplate","ModuleUsersUI"]')]
    #[ApiParameter('asyncChannelId', 'string', 'rest_param_async_channel_id', ParameterLocation::QUERY, required: false, example: 'update-123')]
    #[ApiResponse(200, 'rest_response_200_async_started')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function updateAll(): void
    {
        $requestData = self::sanitizeData($this->request->getData(), $this->filter);

        // Handle legacy logic from CorePostController
        $asyncChannelId = $requestData['asyncChannelId'] ?? '';
        $modulesForUpdate = $requestData['modulesForUpdate'] ?? [];

        if (!is_array($modulesForUpdate)) {
            $this->sendError(400, 'Invalid modulesForUpdate parameter');
            return;
        }

        // Get installed modules
        $parameters = [
            'columns' => ['uniqid'],
            'conditions' => 'uniqid IN ({uniqid:array})',
            'bind' => ['uniqid' => $modulesForUpdate]
        ];

        $installedModules = \MikoPBX\Common\Models\PbxExtensionModules::find($parameters)->toArray();

        // Install each module
        foreach ($installedModules as $module) {
            $data = [
                'asyncChannelId' => $asyncChannelId,
                'uniqid' => $module['uniqid'],
                'releaseId' => 0
            ];
            $this->sendRequestToBackendWorker(
                $this->processorClass,
                'installFromRepo',
                $data
            );
        }
    }

    /**
     * Start module download
     *
     * @route POST /pbxcore/api/v3/modules/{id}:startDownload
     */
    #[ApiOperation(
        summary: 'rest_mod_StartDownload',
        description: 'rest_mod_StartDownloadDesc',
        operationId: 'moduleStartDownload'
    )]
    #[ApiParameter('id', 'string', 'rest_param_module_id', ParameterLocation::PATH, required: true, example: 'ModuleTemplate')]
    #[ApiParameter('url', 'string', 'rest_param_module_download_url', ParameterLocation::QUERY, required: true, example: 'https://releases.mikopbx.com/modules/ModuleTemplate-1.0.0.zip')]
    #[ApiParameter('md5', 'string', 'rest_param_module_download_md5', ParameterLocation::QUERY, required: true, example: 'd41d8cd98f00b204e9800998ecf8427e')]
    #[ApiResponse(200, 'rest_response_200_async_started')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function startDownload(string $id): void
    {
        $requestData = self::sanitizeData($this->request->getData(), $this->filter);
        $requestData['uniqid'] = $id;
        $this->sendRequestToBackendWorker(
            $this->processorClass,
            'moduleStartDownload',
            $requestData
        );
    }

    /**
     * Get module download status
     *
     * @route GET /pbxcore/api/v3/modules/{id}:downloadStatus
     */
    #[ApiOperation(
        summary: 'rest_mod_DownloadStatus',
        description: 'rest_mod_DownloadStatusDesc',
        operationId: 'moduleDownloadStatus'
    )]
    #[ApiParameter('id', 'string', 'rest_param_module_id', ParameterLocation::PATH, required: true, example: 'ModuleTemplate')]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function downloadStatus(string $id): void
    {
        $requestData = self::sanitizeData($this->request->getData(), $this->filter);
        $requestData['uniqid'] = $id;
        $this->sendRequestToBackendWorker(
            $this->processorClass,
            'moduleDownloadStatus',
            $requestData
        );
    }

    /**
     * Get metadata from module package
     *
     * @route POST /pbxcore/api/v3/modules:getMetadataFromModulePackage
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_mod_GetMetadataFromPackage',
        description: 'rest_mod_GetMetadataFromPackageDesc',
        operationId: 'getMetadataFromModulePackage'
    )]
    #[ApiParameter('filePath', 'string', 'rest_param_module_file_path', ParameterLocation::QUERY, required: true, example: '/tmp/module.zip')]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getMetadataFromModulePackage(): void
    {
        $requestData = self::sanitizeData($this->request->getData(), $this->filter);
        $this->sendRequestToBackendWorker(
            $this->processorClass,
            'getMetadataFromModulePackage',
            $requestData
        );
    }

    /**
     * Get module installation status
     *
     * @route GET /pbxcore/api/v3/modules:installationStatus
     */
    #[ApiOperation(
        summary: 'rest_mod_InstallationStatus',
        description: 'rest_mod_InstallationStatusDesc',
        operationId: 'statusOfModuleInstallation'
    )]
    #[ApiParameter('filePath', 'string', 'rest_param_module_file_path', ParameterLocation::QUERY, required: true, example: '/tmp/module.zip')]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function installationStatus(): void
    {
        $requestData = self::sanitizeData($this->request->getData(), $this->filter);
        $this->sendRequestToBackendWorker(
            $this->processorClass,
            'statusOfModuleInstallation',
            $requestData
        );
    }
}
