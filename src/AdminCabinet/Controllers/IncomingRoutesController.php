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

use MikoPBX\AdminCabinet\Forms\DefaultIncomingRouteForm;
use MikoPBX\AdminCabinet\Forms\IncomingRouteEditForm;
use MikoPBX\Common\Models\{Extensions, IncomingRoutingTable, OutWorkTimesRouts, Sip, SoundFiles};


class IncomingRoutesController extends BaseController
{
    /**
     *  Builds the index page for incoming routes.
     *
     * @return void
     */
    public function indexAction(): void
    {
        $parameters = [
            'conditions' => 'id>1',
        ];

        $rules        = IncomingRoutingTable::find($parameters);
        $routingTable = [];
        foreach ($rules as $rule) {
            $provider = $rule->Providers;
            if ($provider) {
                $modelType  = ucfirst($provider->type);
                $provByType = $provider->$modelType;
            } else {
                $provByType = new SIP();
            }
            $extension = $rule->Extensions;

            $values = [
                'id'        => $rule->id,
                'rulename'  => $rule->rulename,
                'priority'  => $rule->priority,
                'number'    => $rule->number,
                'timeout'   => $rule->timeout,
                'provider'  => $rule->Providers ? $rule->Providers->getRepresent() : '',
                'disabled'  => $provByType->disabled,
                'extension' => $rule->extension,
                'callerid'  => $extension ? $extension->getRepresent() : '',
                'note'      => $rule->note,
            ];

            $routingTable[] = $values;
        }
        usort($routingTable, [__CLASS__, 'sortArrayByPriority']);

        // Create incoming rule with default action if it doesn't exist
        $defaultRule = IncomingRoutingTable::findFirstById(1);
        if ($defaultRule === null) {
            $defaultRule = IncomingRoutingTable::resetDefaultRoute();
        }
        // Get a list of all used extensions
        $forwardingExtensions     = [];
        $forwardingExtensions[''] = $this->translation->_('ex_SelectNumber');
        $parameters               = [
            'conditions' => 'number IN ({ids:array})',
            'bind'       => [
                'ids' => [
                    $defaultRule->extension,
                ],
            ],
        ];
        $extensions               = Extensions::find($parameters);
        foreach ($extensions as $record) {
            $forwardingExtensions[$record->number] = $record ? $record->getRepresent() : '';
        }

        $soundFilesList = [];
        // Retrieve custom sound files for default route
        $soundFiles = SoundFiles::find('category="custom"');
        foreach ($soundFiles as $soundFile) {
            $soundFilesList[$soundFile->id] = $soundFile->name;
        }
        unset($soundFiles);

        $form = new DefaultIncomingRouteForm(
            $defaultRule, [
            'extensions' => $forwardingExtensions,
            'soundfiles' => $soundFilesList,
        ]);
        $this->view->form         = $form;
        $this->view->routingTable = $routingTable;
        $this->view->submitMode   = null;
    }


    /**
     * Edit page for incoming route.
     *
     * @param string $ruleId The ID of the routing rule to edit.
     */
    public function modifyAction(string $ruleId = ''): void
    {
        if ((int)$ruleId === 1) {
            $this->forward('incoming-routes/index');
            return;
        } // First row is the default route, don't modify it.

        $idIsEmpty = false;
        if(empty($ruleId)){
            $idIsEmpty = true;
            $ruleId = (string)($_GET['copy-source']??'');
        }
        $rule = IncomingRoutingTable::findFirstByid($ruleId);
        if ($rule === null) {
            $rule = new IncomingRoutingTable();
            $rule->priority = IncomingRoutingTable::getMaxNewPriority();
        }elseif($idIsEmpty) {
            $oldRule = $rule;
            $rule     = new IncomingRoutingTable();
            foreach ($oldRule->toArray() as $key => $value){
                $rule->writeAttribute($key, $value);
            }
            $rule->id   = '';
            $rule->note = "";
            $rule->priority = IncomingRoutingTable::getMaxNewPriority();
        }

        if (empty($rule->provider)){
            $rule->provider = 'none';
        }

        $soundFilesList = [];
        // Retrieve custom sound files for IVR
        $soundFilesList['none'] = '';
        $soundFiles = SoundFiles::find('category="custom"');
        foreach ($soundFiles as $soundFile) {
            $soundFilesList[$soundFile->id] = $soundFile->name;
        }
        unset($soundFiles);
        $this->view->form      = new IncomingRouteEditForm($rule, ['soundfiles' => $soundFilesList]);
        $this->view->represent = $rule->getRepresent();
    }


    /**
     * Save action for incoming route.
     *
     * This method is responsible for saving the incoming route data.
     *
     * @return void
     */
    public function saveAction(): void
    {
        if ( ! $this->request->isPost()) {
            return;
        }
        $this->db->begin();
        $data = $this->request->getPost();
        $rule = IncomingRoutingTable::findFirstByid($data['id']);
        if ($rule === null) {
            $rule = new IncomingRoutingTable();
        }

        foreach ($rule as $name => $value) {
            switch ($name) {
                case 'audio_message_id':
                case 'provider':
                    if ($data[$name] === 'none') {
                        $rule->$name = null;
                    } else {
                        $rule->$name = $data[$name];
                    }
                    break;
                case 'priority':
                    if (empty($data[$name])) {
                        // Find the row with the highest priority, excluding 9999
                        $params      = [
                            'column'     => 'priority',
                            'conditions' => 'priority != 9999',
                        ];
                        $request     = IncomingRoutingTable::maximum($params);
                        $rule->$name = $request + 1;
                    } else {
                        $rule->$name = $data[$name];
                    }

                    break;
                default:
                    if (array_key_exists($name, $data)) {
                        $rule->$name = $data[$name];
                    }
            }
        }

        if ($rule->save() === false) {
            $errors = $rule->getMessages();
            $this->flash->warning(implode('<br>', $errors));
            $this->view->success = false;
            $this->db->rollback();

            return;
        }

        // Retrieve time conditions associated with the rule's number and provider
        $manager = $this->di->get('modelsManager');
        $providerCondition = empty($rule->provider)? 'provider IS NULL':'provider = "'.$rule->provider.'"';
        $options     = [
            'models'     => [
                'IncomingRoutingTable' => IncomingRoutingTable::class,
            ],
            'columns' => [
                'timeConditionId' => 'OutWorkTimesRouts.timeConditionId',
            ],
            'conditions' => 'number = :did: AND '.$providerCondition,
            'bind'       => [
                'did' => $rule->number,
            ],
            'joins'      => [
                'OutWorkTimesRouts' => [
                    0 => OutWorkTimesRouts::class,
                    1 => 'IncomingRoutingTable.id = OutWorkTimesRouts.routId',
                    2 => 'OutWorkTimesRouts',
                    3 => 'INNER',
                ],
            ],
            'group' => ['timeConditionId']
        ];
        $query  = $manager->createBuilder($options)->getQuery();
        $result = array_merge(...$query->execute()->toArray());

        // Create or update OutWorkTimesRouts records based on time conditions
        foreach ($result as $conditionId){
            $filter = [
                'conditions' => 'timeConditionId=:timeConditionId: AND routId=:routId:',
                'bind'       => [
                    'timeConditionId' => $conditionId,
                    'routId' => $rule->id,
                ],
            ];
            $outTime = OutWorkTimesRouts::findFirst($filter);
            if(!$outTime){
                $outTime = new OutWorkTimesRouts();
                $outTime->routId = $rule->id;
                $outTime->timeConditionId = $conditionId;
                $outTime->save();
            }
        }

        $this->flash->success($this->translation->_('ms_SuccessfulSaved'));
        $this->view->success = true;
        $this->db->commit();

        // If this was the creation of a new rule, reload the page with the newly created rule's ID
        if (empty($data['id'])) {
            $this->view->reload = "incoming-routes/modify/{$rule->id}";
        }
    }

    /**
     * Delete an incoming routing rule.
     *
     * @param string $ruleId The identifier of the routing rule to delete.
     * @return void
     */
    public function deleteAction(string $ruleId)
    {
        if ((int)$ruleId === 1) {
            $this->forward('incoming-routes/index'); // The first rule is the default route, do not delete it.
        }

        $rule = IncomingRoutingTable::findFirstByid($ruleId);
        if ($rule !== null) {
            $rule->delete();
        }

        $this->forward('incoming-routes/index');
    }

    /**
     * Changes the priority of routing rules.
     *
     * @return void
     */
    public function changePriorityAction(): void
    {
        $this->view->disable();
        $result = true;

        if ( ! $this->request->isPost()) {
            return;
        }
        $priorityTable = $this->request->getPost();
        $rules = IncomingRoutingTable::find();
        foreach ($rules as $rule){
            if (array_key_exists ( $rule->id, $priorityTable)){
                $rule->priority = $priorityTable[$rule->id];
                $result         .= $rule->update();
            }
        }
        echo json_encode($result);
    }
}