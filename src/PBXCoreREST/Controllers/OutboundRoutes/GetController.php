<?php
declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Controllers\OutboundRoutes;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\OutboundRoutesManagementProcessor;

/**
 * GET controller for outbound routes management.
 * 
 * @RoutePrefix("/pbxcore/api/v2/outbound-routes")
 */
class GetController extends BaseController
{
    
    /**
     * Handle the call to different actions based on the action name.
     *
     * @param string $actionName The name of the action
     * @param string|null $id Optional ID parameter for record operations
     * 
     * Get outbound route record by ID, if ID is 'new' or empty returns structure with default data.
     * @Get("/getRecord/{id}")
     * 
     * Retrieves the list of all outbound routes with provider data.
     * @Get("/getList")
     * 
     * @return void
     */
    public function callAction(string $actionName, ?string $id = null): void
    {
        $requestData = self::sanitizeData($this->request->getData(), $this->filter);
        
        if (!empty($id)) {
            $requestData['id'] = $id;
        }
        
        $this->sendRequestToBackendWorker(
            OutboundRoutesManagementProcessor::class, 
            $actionName, 
            $requestData
        );
    }
}