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

use MikoPBX\AdminCabinet\Forms\TimeFrameEditForm;
use MikoPBX\Common\Models\{Extensions,
    IncomingRoutingTable,
    OutWorkTimes,
    OutWorkTimesRouts,
    Sip,
    SoundFiles};
use MikoPBX\Core\Asterisk\Configs\SIPConf;

class OutOffWorkTimeController extends BaseController
{


    /**
     * This function retrieves OutWorkTimes data and formats it into an array that is used to display on the index page.
     */
    public function indexAction(): void
    {
        // Define query parameters for retrieving OutWorkTimes data from the database.
        $parameters = [
            'order' => 'priority, date_from, weekday_from, time_from',
        ];

        // Initialize an empty array to hold the retrieved OutWorkTimes data.
        $timeframesTable = [];

        // Retrieve OutWorkTimes data from the database using the query parameters defined earlier.
        $timeFrames = OutWorkTimes::find($parameters);

        $calTypeArray = [
            OutWorkTimes::CAL_TYPE_NONE     => '',
            OutWorkTimes::CAL_TYPE_CALDAV   => $this->translation->_('tf_CAL_TYPE_CALDAV'),
            OutWorkTimes::CAL_TYPE_ICAL     => $this->translation->_('tf_CAL_TYPE_ICAL'),
        ];

        // Iterate over each OutWorkTimes record and format it into an array for displaying on the index page.
        foreach ($timeFrames as $timeFrame) {
            // If the description is less than 45 characters, use the entire string.
            // Otherwise, truncate it to 45 characters and add an ellipsis.
            if(mb_strlen($timeFrame->description) < 45){
                $shot_description = $timeFrame->description;
            } else {
                $shot_description = trim(mb_substr($timeFrame->description, 0 , 45)).'...';
            }
            // Add the formatted OutWorkTimes record to the array of records to be displayed on the index page.
            $timeframesTable[] = [
                'id'               => $timeFrame->id,
                'calType'          => $calTypeArray[$timeFrame->calType],
                'date_from'        => ( ! empty($timeFrame->date_from)) > 0 ? date("d.m.Y", $timeFrame->date_from) : '',
                'date_to'          => ( ! empty($timeFrame->date_to)) > 0 ? date("d.m.Y", $timeFrame->date_to) : '',
                'weekday_from'     => ( ! empty($timeFrame->weekday_from)) ? $this->translation->_(date('D',strtotime("Sunday +{$timeFrame->weekday_from} days"))) : '',
                'weekday_to'       => ( ! empty($timeFrame->weekday_to)) ? $this->translation->_(date('D',strtotime("Sunday +{$timeFrame->weekday_to} days"))) : '',
                'time_from'        => $timeFrame->time_from,
                'time_to'          => $timeFrame->time_to,
                'action'           => $timeFrame->action,
                'audio_message_id' => ($timeFrame->SoundFiles) ? $timeFrame->SoundFiles->name : '',
                'extension'        => ($timeFrame->Extensions) ? $timeFrame->Extensions->getRepresent() : '',
                'description'      => $timeFrame->description,
                'allowRestriction' => $timeFrame->allowRestriction,
                'shot_description' => $shot_description,
            ];
        }

        // Assign the formatted OutWorkTimes data to the view variable used for displaying it on the index page.
        $this->view->indexTable = $timeframesTable;
    }

    public function changePriorityAction(): void
    {
        $this->view->disable();
        $result = true;

        if ( ! $this->request->isPost()) {
            return;
        }
        $priorityTable = $this->request->getPost();
        $rules = OutWorkTimes::find();
        foreach ($rules as $rule){
            if (array_key_exists ( $rule->id, $priorityTable)){
                $rule->priority = $priorityTable[$rule->id];
                $result         .= $rule->update();
            }
        }
        echo json_encode($result);
    }

    /**
     * This function modifies the OutWorkTimes data based on the provided ID.
     *
     * @param string $id - The ID of the OutWorkTimes data to modify. (Optional)
     *
     * @return void
     */
    public function modifyAction(string $id = ''): void
    {
        // Find the OutWorkTimes data based on the provided ID or create a new one if the ID is not provided or not found.
        $timeFrame = OutWorkTimes::findFirstById($id);
        if ($timeFrame === null) {
            $timeFrame = new OutWorkTimes();
        }

        // Create an array to store the extensions to forward calls to and populate it with the default value.
        $forwardingExtensions = [];
        $forwardingExtensions[""] = $this->translation->_("ex_SelectNumber");

        // Set the parameters to find extensions matching the extension in the OutWorkTimes data.
        $parameters = [
            'conditions' => 'number = :extension:',
            'bind' => [
                'extension' => $timeFrame->extension,
            ],
        ];

        // Find the extensions matching the specified parameters and add them to the $forwardingExtensions array.
        $extensions = Extensions::find($parameters);
        foreach ($extensions as $record) {
            $forwardingExtensions[$record->number] = $record->getRepresent();
        }

        // Create an array to store the available audio messages and populate it with the default value.
        $audioMessages = [];
        $audioMessages[""] = $this->translation->_("sf_SelectAudioFile");

        // Find the sound files with the "custom" category and add them to the $audioMessages array.
        $soundFiles = SoundFiles::find('category="custom"');
        foreach ($soundFiles as $record) {
            $audioMessages[$record->id] = $record->name;
        }

        // Create an array to store the available actions and populate it with the default values.
        $availableActions = [
            'playmessage' => $this->translation->_('tf_SelectActionPlayMessage'),
            'extension' => $this->translation->_('tf_SelectActionRedirectToExtension'),
        ];

        // Create an array to store the available week days and populate it with the default values.
        $weekDays = ['-1' => '-'];
        for ($i = "1"; $i <= 7; $i++) {
            $weekDays[$i] = $this->translation->_(date('D', strtotime("Sunday +{$i} days")));
        }

        // Create a new TimeFrameEditForm object with the $timeFrame and arrays for the forwarding extensions, audio messages, available actions, and week days.
        $form = new TimeFrameEditForm(
            $timeFrame, [
                'extensions' => $forwardingExtensions,
                'audio-message' => $audioMessages,
                'available-actions' => $availableActions,
                'week-days' => $weekDays,
            ]
        );

        // Set the form and the represent value of the $timeFrame object to the view.
        $this->view->form = $form;
        $this->view->represent = $timeFrame->getRepresent();

        // Get the list of allowed routing rules for the specified time condition ID.
        $parameters = [
            'columns' => 'routId AS rule_id',
            'conditions' => 'timeConditionId=:timeConditionId:',
            'bind' => [
                'timeConditionId' => $id,
            ],
        ];
        $allowedRules    = OutWorkTimesRouts::find($parameters)->toArray();
        $allowedRulesIds = array_column($allowedRules, 'rule_id');


        $filter = [
            'conditions' => 'type="friend"',
            'columns' => 'host,port,uniqid,registration_type',
        ];
        $data = Sip::find($filter)->toArray();
        $providersId = [];
        foreach ($data as $providerData){
            if($providerData['registration_type'] === Sip::REG_TYPE_INBOUND || empty($providerData['host'])){
                $providersId[$providerData['uniqid']] = $providerData['uniqid'];
            }else{
                $providersId[$providerData['uniqid']] = SIPConf::getContextId($providerData['host'] , $providerData['port']);
            }
        }
        unset($data);

        // Get the list of allowed routing rules
        $rules        = IncomingRoutingTable::find(['order' => 'priority', 'conditions' => 'id>1']);
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
                'provider-uniqid'  => $rule->Providers ? $rule->Providers->uniqid : 'none',
                'context-id'  => $rule->Providers ? $providersId[$rule->Providers->uniqid] : 'none',
                'disabled'  => $provByType->disabled,
                'extension' => $rule->extension,
                'callerid'  => $extension ? $extension->getRepresent() : '',
                'note'      => $rule->note,
                'status'    => in_array($rule->id, $allowedRulesIds, true) ? '' : 'disabled',
            ];

            $routingTable[] = $values;
        }

        $this->view->rules = $routingTable;

        // Prepare time zone offset
        $dateTime = new \DateTime();
        $this->view->setVar('serverOffset', $dateTime->getOffset() / 60);
    }

    /**
     * Saves out of work time for a user
     */
    public function saveAction(): void
    {
        // Check if the request method is POST
        if ( ! $this->request->isPost()) {
            return;
        }

        // Get the data from the POST request
        $data = $this->request->getPost();

        // Begin a database transaction
        $this->db->begin();

        // Find the out-of-work time record by ID, or create a new record if it doesn't exist
        $timeFrame = OutWorkTimes::findFirstByid($data['id']);
        if ($timeFrame === null) {
            $timeFrame = new OutWorkTimes();
        }

        // Set the user parameters based on the data in the POST request
        foreach ($timeFrame as $name => $value) {
            switch ($name) {
                case 'weekday_from':
                case 'weekday_to':
                    if ( ! array_key_exists($name, $data)) {
                        $timeFrame->$name = '';
                    } else {
                        $timeFrame->$name = ($data[$name] < 1) ? null : $data[$name];
                    }
                    break;
                case 'allowRestriction':
                    if(isset($data[$name])){
                        $timeFrame->$name = ($data[$name] === 'on') ? '1' : '0';
                    }else{
                        $timeFrame->$name = '0';
                    }
                    break;
                case 'calType':
                    $timeFrame->$name = ($data[$name] === 'none') ? '' : $data[$name];
                    break;
                case 'date_from':
                case 'date_to':
                case 'time_from':
                case 'time_to':
                    if ( ! array_key_exists($name, $data)) {
                        $timeFrame->$name = '';
                    } else {
                        $timeFrame->$name = $data[$name];
                    }
                    break;
                default:
                    if ( ! array_key_exists($name, $data)) {
                        continue 2;
                    }
                    $timeFrame->$name = $data[$name];
            }
        }

        // If the action is 'playmessage', set the extension to an empty string
        if('playmessage' === $timeFrame->action){
            $timeFrame->extension = '';
        }

        // Save the out-of-work time record to the database
        $error = !$timeFrame->save();

        // If there was an error saving the record, display the error message
        if ($error === false) {
            $errors = $timeFrame->getMessages();
            $this->flash->warning(implode('<br>', $errors));
        }

        // If the ID is empty, set the reload parameter to the modified record's ID
        if (empty($data['id'])) {
            $this->view->reload = "out-off-work-time/modify/{$timeFrame->id}";
        }

        // If there was no error saving the record, save the allowed outbound rules
        if (!$error) {
            $data['id'] = $timeFrame->id;
            $error = ! $this->saveAllowedOutboundRules($data);
        }

        // If there was an error, rollback the database transaction and set the success parameter to false
        if ($error) {
            $this->view->success = false;
            $this->db->rollback();
        } else { // Otherwise, commit the transaction, display a success message, and set the success parameter to true
            $this->flash->success($this->translation->_('ms_SuccessfulSaved'));
            $this->view->success = true;
            $this->db->commit();
        }
    }

    /**
     * Saves allowed outbound rules for a given time condition
     *
     * @param $data
     *
     * @return bool
     */
    private function saveAllowedOutboundRules($data): bool
    {
        // Step 1: Delete old links to rules associated with the time condition.
        $parameters = [
            'conditions' => 'timeConditionId=:timeConditionId:',
            'bind'       => [
                'timeConditionId' => $data['id'],
            ],
        ];
        $oldRules   = OutWorkTimesRouts::find($parameters);
        if ($oldRules->delete() === false) {
            $errors = $oldRules->getMessages();
            $this->flash->error(implode('<br>', $errors));

            return false;
        }

        // 2. Writes the allowed outbound rules to the database for the time condition.
        foreach ($data as $key => $value) {
            if (substr_count($key, 'rule-') > 0) {
                $rule_id = explode('rule-', $key)[1];
                if ($value === 'on') {
                    $newRule = new OutWorkTimesRouts();
                    $newRule->timeConditionId = $data['id'];
                    $newRule->routId          = $rule_id;
                    if ($newRule->save() === false) {
                        $errors = $newRule->getMessages();
                        $this->flash->error(implode('<br>', $errors));
                        return false;
                    }
                }
            }
        }

        return true;
    }

    /**
     * Deletes the OutWorkTimes record with the specified id.
     *
     * @param string $id The id of the OutWorkTimes record to delete.
     * @return void
     */
    public function deleteAction(string $id = ''): void
    {
        // Find the OutWorkTimes record with the specified id
        $timeFrame = OutWorkTimes::findFirstByid($id);
        // If the record exists, delete it
        if ($timeFrame !== null) {
            $timeFrame->delete();
        }
        // Redirect to the OutOffWorkTime index page
        $this->forward('OutOffWorkTime/index');
    }

}