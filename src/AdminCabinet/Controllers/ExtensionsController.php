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

use MikoPBX\AdminCabinet\Forms\ExtensionEditForm;
use MikoPBX\Common\Models\{
    ExtensionForwardingRights,
    Extensions,
    ExternalPhones,
    NetworkFilters,
    PbxSettings,
    Sip,
    Users
};

use function MikoPBX\Common\Config\appPath;

class ExtensionsController extends BaseController
{

    /**
     * Build the list of internal numbers and employees.
     */
    public function indexAction(): void
    {
        $extensionTable = []; // Initialize an empty array to store extension data

        $parameters = [
            'models' => [
                'Extensions' => Extensions::class,
            ],
            'conditions' => 'Extensions.is_general_user_number = "1"',
            'columns' => [
                'id' => 'Extensions.id',
                'username' => 'Users.username',
                'number' => 'Extensions.number',
                'userid' => 'Extensions.userid',
                'disabled' => 'Sip.disabled',
                'secret' => 'Sip.secret',
                'email' => 'Users.email',
                'type' => 'Extensions.type',
                'avatar' => 'Users.avatar',

            ],
            'order' => 'number',
            'joins' => [
                'Sip' => [
                    0 => Sip::class,
                    1 => 'Sip.extension=Extensions.number',
                    2 => 'Sip',
                    3 => 'LEFT',
                ],
                'Users' => [
                    0 => Users::class,
                    1 => 'Users.id = Extensions.userid',
                    2 => 'Users',
                    3 => 'INNER',
                ],
            ],
        ];
        $query = $this->di->get('modelsManager')->createBuilder($parameters)->getQuery();
        $extensions = $query->execute(); // Execute the query and retrieve the extensions data

        foreach ($extensions as $extension) {
            switch ($extension->type) {
                case Extensions::TYPE_SIP:
                    // Process SIP extensions
                    $extensionTable[$extension->userid]['userid'] = $extension->userid;
                    $extensionTable[$extension->userid]['number'] = $extension->number;
                    $extensionTable[$extension->userid]['status'] = ($extension->disabled === '1') ? 'disabled' : '';
                    $extensionTable[$extension->userid]['id'] = $extension->id;
                    $extensionTable[$extension->userid]['username'] = $extension->username;
                    $extensionTable[$extension->userid]['email'] = $extension->email;
                    $extensionTable[$extension->userid]['secret'] = $extension->secret;

                    if (!array_key_exists('mobile', $extensionTable[$extension->userid])) {
                        $extensionTable[$extension->userid]['mobile'] = '';
                    }
                    if ($extension->avatar) {
                        $filename = md5($extension->avatar);
                        $imgCacheDir = appPath('sites/admin-cabinet/assets/img/cache');
                        $imgFile = "{$imgCacheDir}/$filename.jpg";
                        if (!file_exists($imgFile)) {
                            $this->base64ToJpeg($extension->avatar, $imgFile);
                        }

                        $extensionTable[$extension->userid]['avatar'] = "{$this->url->get()}assets/img/cache/{$filename}.jpg";
                    } else {
                        $extensionTable[$extension->userid]['avatar'] = "{$this->url->get()}assets/img/unknownPerson.jpg";
                    }

                    break;
                case Extensions::TYPE_EXTERNAL:
                    // Process external extensions
                    $extensionTable[$extension->userid]['mobile'] = $extension->number;
                    break;
                default:
                    // Handle other extension types
            }
        }
        $this->view->extensions = $extensionTable; // Pass the extension data to the view
    }

    /**
     * Creates a JPEG file from the provided image.
     *
     * @param string $base64_string The base64 encoded image string.
     * @param string $output_file The output file path to save the JPEG file.
     *
     * @return void
     */
    private function base64ToJpeg(string $base64_string, string $output_file): void
    {
        // Open the output file for writing
        $ifp = fopen($output_file, 'wb');

        if ($ifp === false) {
            return;
        }
        // Split the string on commas
        // $data[0] == "data:image/png;base64"
        // $data[1] == <actual base64 string>
        $data = explode(',', $base64_string);

        if (count($data) > 1) {
            // Write the base64 decoded data to the file
            fwrite($ifp, base64_decode($data[1]));

            // Close the file resource
            fclose($ifp);
        }
    }

    /**
     * Modify extension settings.
     *
     * @param string $id The ID of the extension being modified.
     *
     * @return void
     */
    public function modifyAction(string $id=''): void
    {
        // Prepare or get current extension data
        $extension = $this->prepareExtension($id);

        // Limit the length of internal extension based on settings
        $extensionsLength = PbxSettings::getValueByKey('PBXInternalExtensionLength');
        $internalExtensionMask = "9{2,{$extensionsLength}}";

        // Create the form for editing the extension
        $form = new ExtensionEditForm(
            $extension, [
                'network_filters' => $this->prepareNetworkFilters(),
                'external_extension' => $this->prepareExternalExtension($extension->userid),
                'forwarding_extensions' => $this->prepareForwardingExtensions($extension),
                'internalextension_mask' => $internalExtensionMask,
            ]
        );

        // Pass the form and extension details to the view
        $this->view->form = $form;
        $this->view->represent = $extension->getRepresent();
        $this->view->avatar = $extension->Users->avatar;
    }

    /**
     * Get the next internal number from the database following the last entered internal number.
     *
     * @return string The next internal number.
     */
    private function getNextInternalNumber():string
    {
        $parameters = [
            'conditions' => 'type = "' . Extensions::TYPE_SIP . '"',
            'column' => 'number',
        ];
        // Get the maximum internal number from the database
        $query = Extensions::maximum($parameters);
        if ($query === null) {
            // If there are no existing internal numbers, start from 200
            $query = 200;
        }
        $result = (int)$query + 1;
        $extensionsLength = PbxSettings::getValueByKey('PBXInternalExtensionLength');
        $maxExtension = (10 ** $extensionsLength) - 1;

        // Check if the next internal number exceeds the maximum allowed length
        return ($result <= $maxExtension) ? $result : '';
    }

    /**
     * Save user card with their numbers
     *
     * @return void Parameters are placed in the view and processed through ControllerBase::afterExecuteRoute()
     */
    public function saveAction(): void
    {
        if (!$this->request->isPost()) {
            return;
        }

        $this->db->begin();

        $data = $this->request->getPost();

        $sipEntity = null;

        if (array_key_exists('sip_uniqid', $data)) {
            $sipEntity = SIP::findFirstByUniqid($data['sip_uniqid']);
        }

        if ($sipEntity === null) {
            $sipEntity = new SIP();
            $extension = new Extensions();
            $userEntity = new Users();
            $fwdEntity = new ExtensionForwardingRights();
            $fwdEntity->ringlength = 45;
        } else {
            $extension = $sipEntity->Extensions;
            if (!$extension) {
                $extension = new Extensions();
            }
            $userEntity = $extension->Users;
            if (!$userEntity) {
                $userEntity = new Users();
            }
            $fwdEntity = $extension->ExtensionForwardingRights;
            if (!$fwdEntity) {
                $fwdEntity = new ExtensionForwardingRights();
            }
        }

        // Fill in user parameters
        if (!$this->saveUser($userEntity, $data)) {
            $this->view->success = false;
            $this->db->rollback();

            return;
        }

        // Fill in extension parameters
        if (!$this->saveExtension($extension, $userEntity, $data, false)) {
            $this->view->success = false;
            $this->db->rollback();

            return;
        }

        // Fill in SIP account parameters
        if (!$this->saveSip($sipEntity, $data)) {
            $this->view->success = false;
            $this->db->rollback();

            return;
        }

        // Fill in forwarding rights parameters
        if (!$this->saveForwardingRights($fwdEntity, $data)) {
            $this->view->success = false;
            $this->db->rollback();

            return;
        }

        // If mobile number is not specified, do not add it to the database
        if (!empty($data['mobile_number'])) {
            $externalPhone = ExternalPhones::findFirstByUniqid($data['mobile_uniqid']);
            if ($externalPhone === null) {
                $externalPhone = new ExternalPhones();
                $mobileExtension = new Extensions();
            } else {
                $mobileExtension = $externalPhone->Extensions;
            }

            // Fill in Extension parameters for mobile number
            if (!$this->saveExtension($mobileExtension, $userEntity, $data, true)) {
                $this->view->success = false;
                $this->db->rollback();

                return;
            }

            // Fill in ExternalPhones parameters for mobile number
            if (!$this->saveExternalPhones($externalPhone, $data)) {
                $this->view->success = false;
                $this->db->rollback();

                return;
            }
        } else {
            // Delete mobile number if it was associated with the user
            $parameters = [
                'conditions' => 'type="' . Extensions::TYPE_EXTERNAL . '" AND is_general_user_number = "1" AND userid=:userid:',
                'bind' => [
                    'userid' => $userEntity->id,
                ],
            ];
            $deletedMobileNumber = Extensions::findFirst($parameters);
            if ($deletedMobileNumber !== null && $this->deleteEntity($deletedMobileNumber)=== false) {
                $this->db->rollback();
                return;
            }
        }

        $this->flash->success($this->translation->_('ms_SuccessfulSaved'));
        $this->view->success = true;
        $this->db->commit();

        // If it was creating a new card, reload the page with the specified ID
        if (empty($data['id'])) {
            $this->view->reload = "extensions/modify/{$extension->id}";
        }
    }

    /**
     * Save parameters to the Users table
     *
     * @param Users $userEntity
     * @param array $data - POST data
     *
     * @return bool save result
     */
    private function saveUser(Users $userEntity, array $data): bool
    {
        // Fill in user parameters
        foreach ($userEntity as $name => $value) {
            switch ($name) {
                case 'role':
                    if (array_key_exists('user_' . $name, $data)) {
                        $userEntity->$name = ($userEntity->$name === 'user') ? 'user' : $data['user_' . $name]; // не повышаем роль
                    }
                    break;
                case 'language':
                    $userEntity->$name = PbxSettings::getValueByKey('PBXLanguage');
                    break;
                default:
                    if (array_key_exists('user_' . $name, $data)) {
                        $userEntity->$name = $data['user_' . $name];
                    }
            }
        }

        return $this->saveEntity($userEntity);
    }

    /**
     * Save the extension for a user.
     *
     * @param Extensions $extension The extension model.
     * @param Users $userEntity The user entity.
     * @param array $data The data to be saved.
     * @param bool $isMobile Flag indicating if it's a mobile extension.
     * @return bool True if the extension is saved successfully, false otherwise.
     */
    private function saveExtension(Extensions $extension, Users $userEntity, array $data, bool $isMobile = false): bool
    {
        foreach ($extension as $name => $value) {
            switch ($name) {
                case 'id':
                    // Skip saving the 'id' field
                    break;
                case 'show_in_phonebook':
                case 'is_general_user_number':
                    // Set 'show_in_phonebook' and 'is_general_user_number' to '1'
                    $extension->$name = '1';
                    break;
                case 'type':
                    // Set the 'type' based on the value of $isMobile
                    $extension->$name = $isMobile ? Extensions::TYPE_EXTERNAL : Extensions::TYPE_SIP;
                    break;
                case 'public_access':
                    // Set 'public_access' based on the value of $data[$name]
                    if (array_key_exists($name, $data)) {
                        $extension->$name = ($data[$name] === 'on') ? '1' : '0';
                    } else {
                        $extension->$name = '0';
                    }
                    break;
                case 'callerid':
                    // Sanitize the caller ID based on 'user_username'
                    $extension->$name = $this->sanitizeCallerId($data['user_username']);
                    break;
                case 'userid':
                    // Set 'userid' to the ID of the user entity
                    $extension->$name = $userEntity->id;
                    break;
                case 'number':
                    // Set 'number' based on the value of $data['mobile_number'] or $data['number']
                    $extension->$name = $isMobile ? $data['mobile_number'] : $data['number'];
                    break;
                default:
                    if (array_key_exists($name, $data)) {
                        // Set other fields based on the values in $data
                        $extension->$name = $data[$name];
                    }
            }
        }

        return $this->saveEntity($extension);
    }

    /**
     * Save the SIP entity with the provided data.
     *
     * @param Sip $sipEntity The SIP entity to be saved.
     * @param array $data The data to be saved.
     * @return bool True if the SIP entity is saved successfully, false otherwise.
     */
    private function saveSip(Sip $sipEntity, array $data): bool
    {
        foreach ($sipEntity as $name => $value) {
            switch ($name) {
                case 'qualify':
                    if (array_key_exists($name, $data)) {
                        // Set 'qualify' based on the value of $data[$name]
                        $sipEntity->$name = ($data[$name] === 'on') ? '1' : '0';
                    } else {
                        $sipEntity->$name = "0";
                    }
                    break;
                case 'disabled':
                case 'enableRecording':
                case 'disablefromuser':
                    if (array_key_exists('sip_' . $name, $data)) {
                        // Set 'disabled', 'enableRecording', and 'disablefromuser' based on the value of $data['sip_' . $name]
                        $sipEntity->$name = ($data['sip_' . $name] === 'on') ? '1' : '0';
                    } else {
                        $sipEntity->$name = "0";
                    }
                    break;
                case 'networkfilterid':
                    if (!array_key_exists('sip_' . $name, $data)) {
                        // Skip saving 'networkfilterid' if it doesn't exist in $data
                        continue 2;
                    }
                    if ($data['sip_' . $name] === 'none') {
                        $sipEntity->$name = null;
                    } else {
                        $sipEntity->$name = $data['sip_' . $name];
                    }
                    break;
                case 'extension':
                    // Set 'extension' based on the value of $data['number']
                    $sipEntity->$name = $data['number'];
                    break;
                case 'description':
                    // Set 'description' based on the value of $data['user_username']
                    $sipEntity->$name = $data['user_username'];
                    break;
                case 'manualattributes':
                    // Set 'manualattributes' using the value of $data['sip_manualattributes']
                    $sipEntity->setManualAttributes($data['sip_manualattributes']);
                    break;
                default:
                    if (array_key_exists('sip_' . $name, $data)) {
                        // Set other fields based on the values in $data
                        $sipEntity->$name = $data['sip_' . $name];
                    }
            }
        }

        return $this->saveEntity($sipEntity);
    }

    /**
     * Save the ExtensionForwardingRights entity with the provided data.
     *
     * @param ExtensionForwardingRights $forwardingRight The ExtensionForwardingRights entity to be saved.
     * @param mixed $data The data to be saved.
     * @return bool True if the ExtensionForwardingRights entity is saved successfully, false otherwise.
     */
    private function saveForwardingRights(ExtensionForwardingRights $forwardingRight, $data): bool
    {
        foreach ($forwardingRight as $name => $value) {
            switch ($name) {
                case 'extension':
                    // Set 'extension' based on the value of $data['number']
                    $forwardingRight->$name = $data['number'];
                    break;
                default:
                    if (array_key_exists('fwd_' . $name, $data)) {
                        // Set other fields based on the values in $data
                        // Use an empty string if the value is -1
                        $forwardingRight->$name = ($data['fwd_' . $name] === -1) ? '' : $data['fwd_' . $name];
                    }
            }
        }
        // Set 'ringlength' to null if 'forwarding' is empty
        if (empty($forwardingRight->forwarding)) {
            $forwardingRight->ringlength = null;
        }

        return $this->saveEntity($forwardingRight);
    }

    /**
     * Save parameters to the ExternalPhones table for a mobile number
     *
     * @param ExternalPhones $externalPhone
     * @param array $data - POST data
     *
     * @return bool save result
     */
    private function saveExternalPhones(ExternalPhones $externalPhone, array $data): bool
    {
        foreach ($externalPhone as $name => $value) {
            switch ($name) {
                case 'extension':
                    $externalPhone->$name = $data['mobile_number'];
                    break;
                case 'description':
                    $externalPhone->$name = $data['user_username'];
                    break;
                case 'disabled':
                    if (array_key_exists('mobile_' . $name, $data)) {
                        $externalPhone->$name = ($data['mobile_' . $name] === 'on') ? '1' : '0';
                    } else {
                        $externalPhone->$name = '0';
                    }
                    break;
                default:
                    if (array_key_exists('mobile_' . $name, $data)) {
                        $externalPhone->$name = $data['mobile_' . $name];
                    }
            }
        }

        return $this->saveEntity($externalPhone);
    }

    /**
     * Delete an internal number and all its dependencies including mobile and forwarding settings.
     *
     * @param string $id - ID of the internal number record
     */
    public function deleteAction(string $id = '')
    {
        $this->db->begin();
        $extension = Extensions::findFirstById($id);

        // To avoid circular references, we first delete the forwarding settings
        // for this account, as it may refer to itself.

        $errors = null;
        if ($extension !== null && $extension->ExtensionForwardingRights
            && !$extension->ExtensionForwardingRights->delete()) {
            $errors = $extension->ExtensionForwardingRights->getMessages();
        }

        if (!$errors && $extension) {
            $user = $extension->Users;
            if (!$user->delete()) {
                $errors = $user->getMessages();
            }
        }

        if ($errors) {
            $this->flash->error(implode('<br>', $errors));
            $this->view->success = false;
            $this->db->rollback();
        } else {
            $this->db->commit();
            $this->view->success = true;
        }
    }


    /**
     * Prepare an extension with the specified ID or create a new one if not found.
     *
     * @param string $id The ID of the extension to prepare.
     * @return Extensions The prepared or newly created extension.
     */
    public function prepareExtension(string $id):Extensions
    {
        $extension = Extensions::findFirstById($id);

        if ($extension === null) {
            // Create a new extension with default settings
            $extension = new Extensions();
            $extension->show_in_phonebook = '1';
            $extension->public_access = '0';
            $extension->is_general_user_number = '1';
            $extension->type = Extensions::TYPE_SIP;
            $extension->Sip = new Sip();
            $extension->Sip->disabled = 0;
            $extension->Sip->type = 'peer';
            $extension->Sip->uniqid = Extensions::TYPE_SIP . strtoupper('-PHONE-' . md5(time()));
            $extension->Sip->qualify = '1';
            $extension->Sip->qualifyfreq = 60;
            $extension->number = $this->getNextInternalNumber();

            $extension->Users = new Users();

            $extension->ExtensionForwardingRights = new ExtensionForwardingRights();
        }

        return $extension;
    }

    /**
     * Prepare an external extension for the specified user or create a new one if not found.
     *
     * @param int|null $userId The user ID for whom the external extension needs to be prepared.
     * @return Extensions The prepared or newly created external extension.
     */
    public function prepareExternalExtension(int $userId=null):Extensions
    {
        // Get the external extension for the current user
        $parameters = [
            'conditions' => 'type = "' . Extensions::TYPE_EXTERNAL . '" AND is_general_user_number = "1" AND userid=:userid:',
            'bind' => [
                'userid' => $userId,
            ],
        ];
        $externalExtension = Extensions::findFirst($parameters);
        if ($externalExtension === null) {
            // Create a new external extension for the user
            $externalExtension = new Extensions();
            $externalExtension->userid = $userId;
            $externalExtension->type = Extensions::TYPE_EXTERNAL;
            $externalExtension->is_general_user_number = '1';
            $externalExtension->ExternalPhones = new ExternalPhones();
            $externalExtension->ExternalPhones->uniqid = Extensions::TYPE_EXTERNAL . strtoupper('-' . md5(time()));
            $externalExtension->ExternalPhones->disabled = '0';
        }
        return $externalExtension;
    }

    /**
     * Prepare an array of forwarding extensions based on the provided extension.
     *
     * @param Extensions $extension The extension for which forwarding extensions need to be prepared.
     * @return array An array of forwarding extensions with their numbers and representations.
     */
    public function prepareForwardingExtensions(Extensions $extension):array
    {
        $forwardingExtensions = [];
        $forwardingExtensions[''] = $this->translation->_('ex_SelectNumber');

        $parameters = [
            'conditions' => 'number IN ({ids:array})',
            'bind' => [
                'ids' => [
                    $extension->ExtensionForwardingRights->forwarding,
                    $extension->ExtensionForwardingRights->forwardingonbusy,
                    $extension->ExtensionForwardingRights->forwardingonunavailable,
                ],
            ],
        ];
        $extensions = Extensions::find($parameters);
        foreach ($extensions as $record) {
            $forwardingExtensions[$record->number] = $record->getRepresent();
        }
        return $forwardingExtensions;
    }

    /**
     * Get an array of prepared network filters for SIP type.
     *
     * @return array An array of network filters with their IDs and representations.
     */
    public function prepareNetworkFilters():array
    {
        $arrNetworkFilters = [];
        $networkFilters = NetworkFilters::getAllowedFiltersForType(['SIP']);
        $arrNetworkFilters['none'] = $this->translation->_('ex_NoNetworkFilter');
        foreach ($networkFilters as $filter) {
            $arrNetworkFilters[$filter->id] = $filter->getRepresent();
        }
        return $arrNetworkFilters;
    }
}