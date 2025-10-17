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
use MikoPBX\PBXCoreREST\Lib\Common\CommonDataStructure;
use MikoPBX\PBXCoreREST\Attributes\{
    ApiResource,
    ApiOperation,
    ApiParameterRef,
    ApiResponse,
    ApiDataSchema,
    SecurityType,
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
        'GET' => ['getList', 'getRecord', 'getDefault', 'getAvailableModules', 'getModuleInfo', 'getModuleLink', 'getDownloadStatus', 'getInstallationStatus'],
        'POST' => ['create', 'installFromRepo', 'installFromPackage', 'enable', 'disable', 'uninstall', 'updateAll', 'startDownload', 'getMetadataFromPackage'],
        'PUT' => ['update'],
        'PATCH' => ['patch'],
        'DELETE' => ['delete']
    ],
    resourceLevelMethods: ['getRecord', 'update', 'patch', 'delete', 'getModuleInfo', 'getModuleLink', 'installFromRepo', 'enable', 'disable', 'uninstall', 'startDownload', 'getDownloadStatus'],
    collectionLevelMethods: ['getList', 'create', 'getDefault', 'getAvailableModules', 'installFromPackage', 'updateAll', 'getMetadataFromPackage', 'getInstallationStatus'],
    customMethods: ['getDefault', 'getAvailableModules', 'getModuleInfo', 'getModuleLink', 'installFromRepo', 'installFromPackage', 'enable', 'disable', 'uninstall', 'updateAll', 'startDownload', 'getDownloadStatus', 'getMetadataFromPackage', 'getInstallationStatus'],
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
    #[ApiParameterRef('limit', dataStructure: CommonDataStructure::class)]
    #[ApiParameterRef('offset', dataStructure: CommonDataStructure::class)]
    #[ApiParameterRef('search', dataStructure: CommonDataStructure::class, example: 'template')]
    #[ApiParameterRef('order', dataStructure: CommonDataStructure::class, enum: ['name', 'version', 'developer'])]
    #[ApiParameterRef('orderWay', dataStructure: CommonDataStructure::class)]
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
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^[A-Za-z][A-Za-z0-9]*$', example: 'ModuleTemplate')]
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
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^[A-Za-z][A-Za-z0-9]*$', example: 'ModuleTemplate')]
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
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^[A-Za-z][A-Za-z0-9]*$', example: 'ModuleTemplate')]
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
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^[A-Za-z][A-Za-z0-9]*$', example: 'ModuleTemplate')]
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
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^[A-Za-z][A-Za-z0-9]*$', example: 'ModuleTemplate')]
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
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^[0-9]+$', example: '123')]
    #[ApiParameterRef('releaseId', required: true)]
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
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^[A-Za-z][A-Za-z0-9]*$', example: 'ModuleTemplate')]
    #[ApiParameterRef('releaseId')]
    #[ApiParameterRef('asyncChannelId')]
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
    #[ApiParameterRef('filePath', required: true)]
    #[ApiParameterRef('fileId', required: true)]
    #[ApiParameterRef('asyncChannelId')]
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
        operationId: 'enable'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^[A-Za-z][A-Za-z0-9]*$', example: 'ModuleTemplate')]
    #[ApiParameterRef('asyncChannelId')]
    #[ApiResponse(200, 'rest_response_200_enabled')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function enable(string $id): void
    {
        // Implementation handled by BaseRestController via handleCustomRequest
    }

    /**
     * Disable a module
     *
     * @route POST /pbxcore/api/v3/modules/{id}:disable
     */
    #[ApiOperation(
        summary: 'rest_mod_Disable',
        description: 'rest_mod_DisableDesc',
        operationId: 'disable'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^[A-Za-z][A-Za-z0-9]*$', example: 'ModuleTemplate')]
    #[ApiParameterRef('reason')]
    #[ApiParameterRef('reasonText')]
    #[ApiParameterRef('asyncChannelId')]
    #[ApiResponse(200, 'rest_response_200_disabled')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function disable(string $id): void
    {
        // Implementation handled by BaseRestController via handleCustomRequest
    }

    /**
     * Uninstall a module
     *
     * @route POST /pbxcore/api/v3/modules/{id}:uninstall
     */
    #[ApiOperation(
        summary: 'rest_mod_Uninstall',
        description: 'rest_mod_UninstallDesc',
        operationId: 'uninstall'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^[A-Za-z][A-Za-z0-9]*$', example: 'ModuleTemplate')]
    #[ApiParameterRef('keepSettings')]
    #[ApiParameterRef('asyncChannelId')]
    #[ApiResponse(200, 'rest_response_200_uninstalled')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function uninstall(string $id): void
    {
        // Implementation handled by BaseRestController via handleCustomRequest
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
    #[ApiParameterRef('modulesForUpdate', required: true)]
    #[ApiParameterRef('asyncChannelId')]
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
        operationId: 'startDownload'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^[A-Za-z][A-Za-z0-9]*$', example: 'ModuleTemplate')]
    #[ApiParameterRef('url', required: true)]
    #[ApiParameterRef('md5', required: true)]
    #[ApiResponse(200, 'rest_response_200_async_started')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function startDownload(string $id): void
    {
        // Implementation handled by BaseRestController via handleCustomRequest
    }

    /**
     * Get module download status
     *
     * @route GET /pbxcore/api/v3/modules/{id}:getDownloadStatus
     */
    #[ApiOperation(
        summary: 'rest_mod_DownloadStatus',
        description: 'rest_mod_DownloadStatusDesc',
        operationId: 'getDownloadStatus'
    )]
    #[ApiParameterRef('id', dataStructure: CommonDataStructure::class, pattern: '^[A-Za-z][A-Za-z0-9]*$', example: 'ModuleTemplate')]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    #[ApiResponse(404, 'rest_response_404_not_found', 'PBXApiResult')]
    public function getDownloadStatus(string $id): void
    {
        // Implementation handled by BaseRestController via handleCustomRequest
    }

    /**
     * Get metadata from module package
     *
     * @route POST /pbxcore/api/v3/modules:getMetadataFromPackage
     */
    #[ApiDataSchema(
        schemaClass: DataStructure::class,
        type: 'detail'
    )]
    #[ApiOperation(
        summary: 'rest_mod_GetMetadataFromPackage',
        description: 'rest_mod_GetMetadataFromPackageDesc',
        operationId: 'getMetadataFromPackage'
    )]
    #[ApiParameterRef('filePath', required: true)]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(400, 'rest_response_400_bad_request', 'PBXApiResult')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getMetadataFromPackage(): void
    {
        // Implementation handled by BaseRestController via handleCustomRequest
    }

    /**
     * Get module installation status
     *
     * @route GET /pbxcore/api/v3/modules:getInstallationStatus
     */
    #[ApiOperation(
        summary: 'rest_mod_InstallationStatus',
        description: 'rest_mod_InstallationStatusDesc',
        operationId: 'getInstallationStatus'
    )]
    #[ApiParameterRef('filePath', required: true)]
    #[ApiResponse(200, 'rest_response_200_get')]
    #[ApiResponse(401, 'rest_response_401_unauthorized', 'PBXApiResult')]
    #[ApiResponse(403, 'rest_response_403_forbidden', 'PBXApiResult')]
    public function getInstallationStatus(): void
    {
        // Implementation handled by BaseRestController via handleCustomRequest
    }
}
