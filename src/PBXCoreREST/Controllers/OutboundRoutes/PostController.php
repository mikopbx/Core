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
        $postData = [];
        
        if ($this->request->getContentType() === 'application/json') {
            // Handle JSON requests
            $rawBody = $this->request->getRawBody();
            if (!empty($rawBody)) {
                $jsonData = json_decode($rawBody, true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($jsonData)) {
                    $postData = $jsonData;
                }
            }
        } else {
            // Handle form data
            $postData = $this->request->getPost();
        }
        
        // Sanitize the data
        $postData = self::sanitizeData($postData, $this->filter);
        
        $this->sendRequestToBackendWorker(
            OutboundRoutesManagementProcessor::class,
            $actionName,
            $postData
        );
    }
}