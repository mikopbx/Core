<?php
declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Controllers\OutboundRoutes;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\OutboundRoutesManagementProcessor;

/**
 * POST controller for outbound routes management
 * 
 * @RoutePrefix("/pbxcore/api/v2/outbound-routes")
 */
class PostController extends BaseController
{
    /**
     * Enable CSRF protection for this controller
     */
    public const bool REQUIRES_CSRF_PROTECTION = true;
    
    /**
     * Handle the call to different actions based on the action name
     * 
     * @param string $actionName The name of the action
     * 
     * Creates or updates outbound route record
     * @Post("/saveRecord")
     * 
     * Deletes the outbound route record
     * @Post("/deleteRecord")
     * 
     * Changes priority of outbound routes
     * @Post("/changePriority")
     * 
     * @return void
     */
    public function callAction(string $actionName): void
    {
        // Handle both form data and JSON data
        $requestData = self::sanitizeData($this->request->getData(), $this->filter);
        
        $this->sendRequestToBackendWorker(
            OutboundRoutesManagementProcessor::class,
            $actionName,
            $requestData
        );
    }
}