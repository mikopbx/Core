<?php
declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Controllers\OutboundRoutes;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\OutboundRoutesManagementProcessor;

/**
 * PUT controller for outbound routes management
 * 
 * @RoutePrefix("/pbxcore/api/v2/outbound-routes")
 */
class PutController extends BaseController
{
    
    /**
     * Handle the call to different actions based on the action name
     * 
     * @param string $actionName The name of the action
     * @param string|null $id Outbound route ID for update operations
     * 
     * Updates existing outbound route record
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

        $requestData = self::sanitizeData($this->request->getData(), $this->filter);
        $requestData['id'] = $id;
        
        $this->sendRequestToBackendWorker(
            OutboundRoutesManagementProcessor::class,
            $actionName,
            $requestData
        );
    }
}