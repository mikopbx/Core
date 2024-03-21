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

use MikoPBX\AdminCabinet\Forms\OutgoingRouteEditForm;
use MikoPBX\Common\Models\{OutgoingRoutingTable, Providers};


class OutboundRoutesController extends BaseController
{

    /**
     * Builds the list outgoing routes
     */
    public function indexAction(): void
    {
        $rules        = OutgoingRoutingTable::find();
        $routingTable = [];
        foreach ($rules as $rule) {
            $provider = $rule->Providers;
            if ($provider) {
                $modelType      = ucfirst($provider->type);
                $provByType     = $provider->$modelType;
                $routingTable[] = [
                    'id'               => $rule->id,
                    'priority'         => $rule->priority,
                    'provider'         => $provider->getRepresent(),
                    'numberbeginswith' => $rule->numberbeginswith,
                    'restnumbers'      => $rule->restnumbers,
                    'trimfrombegin'    => $rule->trimfrombegin,
                    'prepend'          => $rule->prepend,
                    'note'             => $rule->note,
                    'rulename'         => $rule->getRepresent(),
                    'disabled'         => $provByType->disabled,
                ];
            } else {
                $routingTable[] = [
                    'id'               => $rule->id,
                    'priority'         => $rule->priority,
                    'provider'         => null,
                    'numberbeginswith' => $rule->numberbeginswith,
                    'restnumbers'      => $rule->restnumbers,
                    'trimfrombegin'    => $rule->trimfrombegin,
                    'prepend'          => $rule->prepend,
                    'note'             => $rule->note,
                    'rulename'         => '<i class="icon attention"></i> ' . $rule->getRepresent(),
                    'disabled'         => false,
                ];
            }
        }
        usort($routingTable, [__CLASS__, 'sortArrayByPriority']);
        $this->view->routingTable = $routingTable;
    }


    /**
     * Shows the edit form for an outbound route
     *
     * @param string $id
     */
    public function modifyAction(string $id = ''): void
    {
        $idIsEmpty = false;
        if(empty($id)){
            $idIsEmpty = true;
            $id = (string)($_GET['copy-source']??'');
        }

        $rule = OutgoingRoutingTable::findFirstByid($id);
        if ($rule === null) {
            $rule = new OutgoingRoutingTable();
            $rule->priority = (int)OutgoingRoutingTable::maximum(['column' => 'priority'])+1;
        }elseif($idIsEmpty){
            $oldRule = $rule;
            $rule = new OutgoingRoutingTable();
            $rule->priority = (int)OutgoingRoutingTable::maximum(['column' => 'priority'])+1;
            foreach ($oldRule->toArray() as $key => $value){
                $rule->writeAttribute($key, $value);
            }
            $rule->rulename = '';
            $rule->id = '';
        }

        $providers     = Providers::find();
        $providersList = [];
        foreach ($providers as $provider) {
            $providersList[$provider->uniqid] = $provider->getRepresent();
        }

        uasort($providersList, [__CLASS__, "sortArrayByNameAndState"]);

        if ($rule->restnumbers === '-1') {
            $rule->restnumbers = '';
        }
        $this->view->form      = new OutgoingRouteEditForm($rule, $providersList);
        $this->view->represent = $rule->getRepresent();
    }

    /**
     * Saves the outgoing routing table data based on the POST data.
     */
    public function saveAction(): void
    {
        $this->db->begin();

        $data = $this->request->getPost();

        $rule = OutgoingRoutingTable::findFirstByid($data['id']);
        if ($rule === null) {
            $rule = new OutgoingRoutingTable();
        }

        foreach ($rule as $name => $value) {
            switch ($name) {
                case 'restnumbers':
                {
                    if ( ! array_key_exists($name, $data)) {
                        continue 2;
                    }
                    $rule->$name = $data[$name] === '' ? '-1' : $data[$name];
                    break;
                }
                default:
                    if ( ! array_key_exists($name, $data)) {
                        continue 2;
                    }
                    $rule->$name = $data[$name];
            }
        }

        if ($rule->save() === false) {
            $errors = $rule->getMessages();
            $this->flash->warning(implode('<br>', $errors));
            $this->view->success = false;
            $this->db->rollback();

            return;
        }

        $this->flash->success($this->translation->_('ms_SuccessfulSaved'));
        $this->view->success = true;
        $this->db->commit();

        // If it was the creation of a new record, reload the page with the specified ID
        if (empty($data['id'])) {
            $this->view->reload = "outbound-routes/modify/{$rule->id}";
        }
    }


    /**
     * Deletes an outgoing route from the database.
     *
     * @param string $id The ID of the outgoing route to delete.
     */
    public function deleteAction(string $id = ''): void
    {
        $rule = OutgoingRoutingTable::findFirstByid($id);
        if ($rule !== null) {
            $rule->delete();
        }

        $this->forward('outbound-routes/index');
    }

    /**
     * Changes the priority of outgoing routes.
     *
     * This action is typically called asynchronously via a POST request.
     */
    public function changePriorityAction(): void
    {
        $this->view->disable();
        $result = true;

        if ( ! $this->request->isPost()) {
            return;
        }
        $priorityTable = $this->request->getPost();
        $rules = OutgoingRoutingTable::find();
        foreach ($rules as $rule){
            if (array_key_exists ( $rule->id, $priorityTable)){
                $rule->priority = $priorityTable[$rule->id];
                $result         .= $rule->update();
            }
        }
        echo json_encode($result);
    }

    /**
     * Sorts an array by name and state.
     *
     * @param $a
     * @param $b
     *
     * @return int|null
     */
    private function sortArrayByNameAndState($a, $b): ?int
    {
        $sDisabled = $this->translation->_('mo_Disabled');
        if ($a == $b) {
            return 0;
        } elseif (strpos($a, $sDisabled) !== false && strpos($b, $sDisabled) === false) {
            return 1;
        } else {
            return ($a < $b) ? -1 : 1;
        }
    }
}