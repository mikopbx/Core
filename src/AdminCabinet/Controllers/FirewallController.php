<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

use MikoPBX\AdminCabinet\Forms\FirewallEditForm;
use MikoPBX\Common\Models\NetworkFilters;

class FirewallController extends BaseController
{
    /**
     * Prepares index page
     */
    public function indexAction(): void
    {
        // All data is now loaded via REST API in JavaScript
        // This action only renders the view
    }


    /**
     * Prepares forms to edit firewall rules
     *
     * @param string $networkId
     */
    public function modifyAction(string $networkId = ''): void
    {
        // Create empty form - data will be loaded via REST API
        $emptyFilter = new NetworkFilters();
        $form = new FirewallEditForm(
            $emptyFilter,
            ['network' => '0.0.0.0', 'subnet' => '0']
        );
        
        $this->view->form = $form;
        
        // Get default rules structure for form generation
        $this->view->firewallRules = \MikoPBX\Common\Models\FirewallRules::getDefaultRules();
        $this->view->isDocker = \MikoPBX\Core\System\Util::isDocker();
        $this->view->dockerSupportedServices = ['WEB', 'AMI', 'SIP & RTP', 'IAX'];
        
        // All actual data is loaded via REST API in JavaScript
    }


    /**
     * Save request from the form
     * @deprecated Use REST API v3 instead
     */
    public function saveAction(): void
    {
        // This method is deprecated
        // All save operations are handled via REST API v3
        $this->forward('firewall/index');
    }



    /**
     * Deletes NetworkFilters record
     * @deprecated Use REST API v3 instead
     */
    public function deleteAction(string $networkId = ''): void
    {
        // This method is deprecated
        // All delete operations are handled via REST API v3
        $this->forward('firewall/index');
    }

    /**
     * Enables Fail2Ban and Firewall
     * @deprecated Use REST API v3 instead
     */
    public function enableAction(): void
    {
        // This method is deprecated
        // All enable operations are handled via REST API v3
        $this->view->success = false;
    }

    /**
     * Disables Fail2Ban and Firewall
     * @deprecated Use REST API v3 instead
     */
    public function disableAction(): void
    {
        // This method is deprecated
        // All disable operations are handled via REST API v3
        $this->view->success = false;
    }

}
