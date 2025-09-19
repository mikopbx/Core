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

namespace MikoPBX\AdminCabinet\Controllers;

use MikoPBX\AdminCabinet\Forms\DefaultIncomingRouteForm;
use MikoPBX\AdminCabinet\Forms\IncomingRouteEditForm;
use MikoPBX\Common\Models\IncomingRoutingTable;

class IncomingRoutesController extends BaseController
{
    /**
     * Builds the index page for incoming routes.
     * Only creates empty form, data loaded via REST API
     *
     * @return void
     */
    public function indexAction(): void
    {
        // Create empty form for default rule (will be populated by JS via REST API)
        $emptyDefaultRule = new IncomingRoutingTable();
        $emptyDefaultRule->id = 1;  // Default route ID

        $form = new DefaultIncomingRouteForm(
            $emptyDefaultRule,
            [
                'extensions' => [],  // Will be loaded by JS
                'soundfiles' => [],  // Will be loaded by JS
            ]
        );

        $this->view->form = $form;
        $this->view->submitMode = null;
        $this->view->routingTable = [];  // Empty array - data will be loaded via REST API
    }

    /**
     * Edit page for incoming route.
     * Only creates empty form, data loaded via REST API
     *
     * @param string $ruleId The ID of the routing rule to edit.
     */
    public function modifyAction(string $ruleId = ''): void
    {
        // Redirect to index if trying to modify default route
        if ((int)$ruleId === 1) {
            $this->forward('incoming-routes/index');
            return;
        }

        $emptyRoute = new IncomingRoutingTable();
        $form = new IncomingRouteEditForm($emptyRoute, ['soundfiles' => []]);
        
        $this->view->form = $form;
        $this->view->uniqid = $ruleId;
        $this->view->represent = '';
    }

}