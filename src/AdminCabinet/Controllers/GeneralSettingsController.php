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

use MikoPBX\AdminCabinet\Forms\GeneralSettingsEditForm;
use MikoPBX\Common\Models\Codecs;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Core\System\Util;

/**
 * Class GeneralSettingsController
 *
 * This class handles general settings for the application.
 */
class GeneralSettingsController extends BaseController
{
    /**
     * Builds the general settings form.
     *
     * This action is responsible for preparing the data required to populate the general settings form.
     * It retrieves the audio and video codecs from the database, sorts them by priority, and assigns them to the view.
     * It also retrieves all PBX settings and creates an instance of the GeneralSettingsEditForm.
     *
     * @return void
     */
    public function modifyAction(): void
    {
        // Retrieve and sort audio codecs from database
        $audioCodecs = Codecs::find(['conditions' => 'type="audio"'])->toArray();
        usort($audioCodecs, [__CLASS__, 'sortArrayByPriority']);
        $this->view->audioCodecs = $audioCodecs;

        // Retrieve and sort video codecs from database
        $videoCodecs = Codecs::find(['conditions' => 'type="video"'])->toArray();
        usort($videoCodecs, [__CLASS__, 'sortArrayByPriority']);
        $this->view->videoCodecs = $videoCodecs;

        // Fetch all PBX settings
        $pbxSettings = PbxSettings::getAllPbxSettings();

        // Fetch and assign simple passwords for the view
        $this->view->simplePasswords = $this->getSimplePasswords($pbxSettings);

        // Create an instance of the GeneralSettingsEditForm and assign it to the view
        $this->view->form = new GeneralSettingsEditForm(null, $pbxSettings);
        $this->view->submitMode = null;

    }

    /**
     * Retrieves a list of simple passwords from the given data.
     *
     * This function checks if the SSHPassword and WebAdminPassword in the data array are simple passwords.
     * It also checks if the CloudInstanceId matches any of these passwords.
     * If a simple password or a matching CloudInstanceId is found, the corresponding password key is added to the list.
     *
     * @param array $data The data array containing the passwords and CloudInstanceId.
     * @return array The list of password keys that failed the simple password check.
     */
    private function getSimplePasswords(array $data): array
    {
        // Initialize an array to keep track of passwords that fail the check
        $passwordCheckFail = [];

        $cloudInstanceId = $data[PbxSettingsConstants::CLOUD_INSTANCE_ID] ?? '';
        $checkPasswordFields = [PbxSettingsConstants::SSH_PASSWORD, PbxSettingsConstants::WEB_ADMIN_PASSWORD];

        // If SSH is disabled, remove the SSH_PASSWORD key
        if ($data[PbxSettingsConstants::SSH_DISABLE_SSH_PASSWORD] === 'on') {
            unset($checkPasswordFields[PbxSettingsConstants::SSH_PASSWORD]);
        }

        // Loop through and check passwords
        foreach ($checkPasswordFields as $value) {
            if (!isset($data[$value]) || $data[$value] === GeneralSettingsEditForm::HIDDEN_PASSWORD) {
                continue;
            }
            if ($cloudInstanceId === $data[$value] || Util::isSimplePassword($data[$value])) {
                $passwordCheckFail[] = $value;
            }
        }
        return $passwordCheckFail;
    }

    /**
     * Saves the general settings form data.
     *
     */
    public function saveAction(): void
    {
        if (!$this->request->isPost()) {
            return;
        }
        $data = $this->request->getPost();

        $passwordCheckFail = $this->getSimplePasswords($data);
        if (!empty($passwordCheckFail)) {
            foreach ($passwordCheckFail as $settingsKey) {
                $this->flash->error($this->translation->_('gs_SetPasswordError', ['password' => $data[$settingsKey]]));
            }
            $this->view->success = false;
            $this->view->passwordCheckFail = $passwordCheckFail;
            return;
        }

        $this->db->begin();

        list($result, $messages) = $this->updatePBXSettings($data);
        if (!$result) {
            $this->view->success = false;
            $this->view->messages = $messages;
            $this->db->rollback();
            return;
        }

        list($result, $messages) = $this->updateCodecs($data['codecs']);
        if (!$result) {
            $this->view->success = false;
            $this->view->messages = $messages;
            $this->db->rollback();
            return;
        }

        list($result, $messages) = $this->createParkingExtensions(
            $data[PbxSettingsConstants::PBX_CALL_PARKING_START_SLOT],
            $data[PbxSettingsConstants::PBX_CALL_PARKING_END_SLOT],
            $data[PbxSettingsConstants::PBX_CALL_PARKING_EXT],
        );

        if (!$result) {
            $this->view->success = false;
            $this->view->messages = $messages;
            $this->db->rollback();
            return;
        }

        $this->flash->success($this->translation->_('ms_SuccessfulSaved'));
        $this->view->success = true;
        $this->db->commit();

    }


    /**
     * Create or update parking extensions by ensuring only necessary slots are modified.
     * This method first fetches the existing parking slots and determines which slots
     * need to be created or deleted based on the desired range and reserved slot.
     * It aims to minimize database operations by only deleting slots that are no longer needed
     * and creating new slots that do not exist yet, preserving all others.
     *
     * @param int $startSlot The starting number of the parking slot range.
     * @param int $endSlot The ending number of the parking slot range.
     * @param int $reservedSlot The number of the reserved slot to be included outside the range.
     *
     * @return array Returns an array with two elements:
     *               - bool: true if the operation was successful without any errors, false otherwise.
     *               - array: an array of messages, primarily errors encountered during operations.
     */
    private function createParkingExtensions(int $startSlot, int $endSlot, int $reservedSlot): array
    {
        $messages = [];

        // Retrieve all current parking slots.
        $currentSlots = Extensions::findByType(Extensions::TYPE_PARKING);

        // Create an array of desired numbers.
        $desiredNumbers = range($startSlot, $endSlot);
        $desiredNumbers[] = $reservedSlot;

        // Determine slots to delete.
        $currentNumbers = [];
        foreach ($currentSlots as $slot) {
            if (!in_array($slot->number, $desiredNumbers)) {
                if (!$slot->delete()) {
                    $messages['error'][] = $slot->getMessages();
                }
            } else {
                $currentNumbers[] = $slot->number;
            }
        }

        // Determine slots to create.
        $numbersToCreate = array_diff($desiredNumbers, $currentNumbers);
        foreach ($numbersToCreate as $number) {
            $record = new Extensions();
            $record->type = Extensions::TYPE_PARKING;
            $record->number = $number;
            $record->show_in_phonebook = '0';
            if (!$record->create()) {
                $messages['error'][] = $record->getMessages();
            }
        }

        // Determine the overall result.
        $result = count($messages['error'] ?? []) === 0;
        return [$result, $messages];
    }

    /**
     * Update codecs based on the provided data.
     *
     * @param string $codecsData The JSON-encoded data for codecs.
     *
     * @return array
     */
    private function updateCodecs(string $codecsData): array
    {
        $messages = [];
        $codecs = json_decode($codecsData, true);
        foreach ($codecs as $codec) {
            $record = Codecs::findFirstById($codec['codecId']);
            $record->priority = $codec['priority'];
            $record->disabled = $codec['disabled'] === true ? '1' : '0';
            if (!$record->update()) {
                $messages['error'][] = $record->getMessages();
            }
        }
        $result = count($messages) === 0;
        return [$result, $messages];
    }

    /**
     * Update PBX settings based on the provided data.
     *
     * @param array $data The data containing PBX settings.
     *
     * @return array
     */
    private function updatePBXSettings(array $data):array
    {
        $messages = ['error'=>[]];
        $pbxSettings = PbxSettings::getDefaultArrayValues();

        // Process SSHPassword and set SSHPasswordHash accordingly
        if (isset($data[PbxSettingsConstants::SSH_PASSWORD])) {
            if ($data[PbxSettingsConstants::SSH_PASSWORD] === $pbxSettings[PbxSettingsConstants::SSH_PASSWORD]
                || $data[PbxSettingsConstants::SSH_PASSWORD] === GeneralSettingsEditForm::HIDDEN_PASSWORD) {
                $data[PbxSettingsConstants::SSH_PASSWORD_HASH_STRING] = md5($data[PbxSettingsConstants::WEB_ADMIN_PASSWORD]);
            } else {
                $data[PbxSettingsConstants::SSH_PASSWORD_HASH_STRING] = md5($data[PbxSettingsConstants::SSH_PASSWORD]);
            }
        }

        // Update PBX settings
        foreach ($pbxSettings as $key => $value) {
            switch ($key) {
                case PbxSettingsConstants::PBX_RECORD_CALLS:
                case PbxSettingsConstants::PBX_RECORD_CALLS_INNER:
                case PbxSettingsConstants::AJAM_ENABLED:
                case PbxSettingsConstants::AMI_ENABLED:
                case PbxSettingsConstants::RESTART_EVERY_NIGHT:
                case PbxSettingsConstants::REDIRECT_TO_HTTPS:
                case PbxSettingsConstants::PBX_SPLIT_AUDIO_THREAD:
                case PbxSettingsConstants::USE_WEB_RTC:
                case PbxSettingsConstants::SSH_DISABLE_SSH_PASSWORD:
                case PbxSettingsConstants::PBX_ALLOW_GUEST_CALLS:
                case PbxSettingsConstants::DISABLE_ALL_MODULES:
                case '***ALL CHECK BOXES ABOVE***':
                    $newValue = ($data[$key] === 'on') ? '1' : '0';
                    break;
                case PbxSettingsConstants::SSH_PASSWORD:
                    // Set newValue as WebAdminPassword if SSHPassword is the same as the default value
                    if ($data[$key] === $value) {
                        $newValue = $data[PbxSettingsConstants::WEB_ADMIN_PASSWORD];
                    } elseif ($data[$key] !== GeneralSettingsEditForm::HIDDEN_PASSWORD) {
                        $newValue = $data[$key];
                    } else {
                        continue 2;
                    }
                    break;
                case PbxSettingsConstants::SEND_METRICS:
                    $newValue = ($data[$key] === 'on') ? '1' : '0';
                    $this->session->set(PbxSettingsConstants::SEND_METRICS, $newValue);
                    break;
                case PbxSettingsConstants::PBX_FEATURE_TRANSFER_DIGIT_TIMEOUT:
                    $newValue = ceil((int)$data[PbxSettingsConstants::PBX_FEATURE_DIGIT_TIMEOUT] / 1000);
                    break;
                case PbxSettingsConstants::WEB_ADMIN_PASSWORD:
                    if ($data[$key] !== GeneralSettingsEditForm::HIDDEN_PASSWORD) {
                        $newValue = $this->security->hash($data[$key]);
                    } else {
                        continue 2;
                    }
                    break;
                default:
                    $newValue = $data[$key];
            }

            if (array_key_exists($key, $data)) {
                PbxSettings::setValue($key, $newValue, $messages['error']);
            }
        }

        // Reset a cloud provision flag
        PbxSettings::setValue(PbxSettingsConstants::CLOUD_PROVISIONING, '1', $messages['error']);

        $result = count($messages['error']) === 0;
        return [$result, $messages];
    }

}