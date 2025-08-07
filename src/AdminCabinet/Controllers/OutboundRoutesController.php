<?php
declare(strict_types=1);

namespace MikoPBX\AdminCabinet\Controllers;

use MikoPBX\AdminCabinet\Forms\OutgoingRouteEditForm;
use MikoPBX\Common\Models\OutgoingRoutingTable;

class OutboundRoutesController extends BaseController
{
    /**
     * Builds the index page for outbound routes.
     * Data is loaded via REST API.
     */
    public function indexAction(): void
    {
        $this->view->routingTable = [];
    }


    /**
     * Shows the edit form for an outbound route.
     * Creates empty form structure, data is loaded via REST API.
     *
     * @param string $ruleId The ID of the routing rule to edit
     */
    public function modifyAction(string $ruleId = ''): void
    {
        $emptyRoute = new OutgoingRoutingTable();
        $form = new OutgoingRouteEditForm($emptyRoute, []);
        
        $this->view->form = $form;
        $this->view->uniqid = $ruleId;
        $this->view->represent = '';
    }

}
