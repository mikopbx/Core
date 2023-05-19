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
    PbxExtensionModules,
    PbxSettings,
    Sip,
    Users
};
use Phalcon\Text;

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
    private function base64ToJpeg($base64_string, $output_file): void
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

        // We could add validation here to ensure count($data) > 1

        // Write the base64 decoded data to the file
        fwrite($ifp, base64_decode($data[1]));

        // Close the file resource
        fclose($ifp);
    }

    /**
     * Modify extension settings.
     *
     * @param string|null $id The ID of the extension being modified.
     *
     * @return void
     */
    public function modifyAction(string $id = null): void
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
            $extension->Users->role = 'user';

            $extension->ExtensionForwardingRights = new ExtensionForwardingRights();

            $this->view->avatar = '';
        } else {
            $this->view->avatar = $extension->Users->avatar;
        }

        // Get network filters for SIP type
        $arrNetworkFilters = [];
        $networkFilters = NetworkFilters::getAllowedFiltersForType(['SIP']);
        $arrNetworkFilters['none'] = $this->translation->_('ex_NoNetworkFilter');
        foreach ($networkFilters as $filter) {
            $arrNetworkFilters[$filter->id] = $filter->getRepresent();
        }

        // Get the external extension for the current user
        $parameters = [
            'conditions' => 'type = "' . Extensions::TYPE_EXTERNAL . '" AND is_general_user_number = "1" AND userid=:userid:',
            'bind' => [
                'userid' => $extension->userid,
            ],
        ];
        $externalExtension = Extensions::findFirst($parameters);
        if ($externalExtension === null) {
            // Create a new external extension for the user
            $externalExtension = new Extensions();
            $externalExtension->userid = $extension->userid;
            $externalExtension->type = Extensions::TYPE_EXTERNAL;
            $externalExtension->is_general_user_number = '1';
            $externalExtension->ExternalPhones = new ExternalPhones();
            $externalExtension->ExternalPhones->uniqid = Extensions::TYPE_EXTERNAL . strtoupper('-' . md5(time()));
            $externalExtension->ExternalPhones->disabled = '0';
        }

        // Get the forwarding extensions for the extension
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

        // Limit the length of internal extension based on settings
        $extensionsLength = PbxSettings::getValueByKey('PBXInternalExtensionLength');
        $internalExtensionMask = "9{2,{$extensionsLength}}";

        // Create the form for editing the extension
        $form = new ExtensionEditForm(
            $extension, [
                'network_filters' => $arrNetworkFilters,
                'external_extension' => $externalExtension,
                'forwarding_extensions' => $forwardingExtensions,
                'internalextension_mask' => $internalExtensionMask,
            ]
        );

        // Pass the form and extension details to the view
        $this->view->form = $form;
        $this->view->represent = $extension->getRepresent();

    }

    /**
     * Get the next internal number from the database following the last entered internal number.
     *
     * @return string The next internal number.
     */
    private function getNextInternalNumber()
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
            if ($deletedMobileNumber !== null
                && $deletedMobileNumber->delete() === false) {
                $errors = $deletedMobileNumber->getMessages();
                $this->flash->error(implode('<br>', $errors));
                $this->view->success = false;
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
    private function saveUser(Users $userEntity, array $data)
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

        if ($userEntity->save() === false) {
            $errors = $userEntity->getMessages();
            $this->flash->error(implode('<br>', $errors));

            return false;
        }

        return true;
    }

    /**
     * Save parameters to the Extensions table
     *
     * @param Extensions $extension
     * @param Users $userEntity
     * @param array $data - POST data
     * @param bool $isMobile - is it a mobile phone
     *
     * @return bool save result
     */
    private function saveExtension(Extensions $extension, Users $userEntity, array $data, $isMobile = false): bool
    {
        foreach ($extension as $name => $value) {
            switch ($name) {
                case 'id':
                    break;
                case 'show_in_phonebook':
                case 'is_general_user_number':
                    $extension->$name = '1';
                    break;
                case 'type':
                    $extension->$name = $isMobile ? Extensions::TYPE_EXTERNAL : Extensions::TYPE_SIP;
                    break;
                case 'public_access':
                    if (array_key_exists($name, $data)) {
                        $extension->$name = ($data[$name] === 'on') ? '1' : '0';
                    } else {
                        $extension->$name = '0';
                    }
                    break;
                case 'callerid':
                    $extension->$name = $this->sanitizeCallerId($data['user_username']);
                    break;
                case 'userid':
                    $extension->$name = $userEntity->id;
                    break;
                case 'number':
                    $extension->$name = $isMobile ? $data['mobile_number'] : $data['number'];
                    break;
                default:
                    if (array_key_exists($name, $data)) {
                        $extension->$name = $data[$name];
                    }
            }
        }

        if ($extension->save() === false) {
            $errors = $extension->getMessages();
            $this->flash->error(implode('<br>', $errors));

            return false;
        }

        return true;
    }

    /**
     * Сохранение параметров в таблицу SIP
     *
     * @param Sip $sipEntity
     * @param array $data - POST дата
     *
     * @return bool результат сохранения
     */
    private function saveSip(Sip $sipEntity, array $data): bool
    {
        foreach ($sipEntity as $name => $value) {
            switch ($name) {
                case 'qualify':
                    if (array_key_exists($name, $data)) {
                        $sipEntity->$name = ($data[$name] === 'on') ? '1' : '0';
                    } else {
                        $sipEntity->$name = "0";
                    }
                    break;
                case 'disabled':
                case 'enableRecording':
                case 'disablefromuser':
                    if (array_key_exists('sip_' . $name, $data)) {
                        $sipEntity->$name = ($data['sip_' . $name] === 'on') ? '1' : '0';
                    } else {
                        $sipEntity->$name = "0";
                    }
                    break;
                case 'networkfilterid':
                    if (!array_key_exists('sip_' . $name, $data)) {
                        continue 2;
                    }
                    if ($data['sip_' . $name] === 'none') {
                        $sipEntity->$name = null;
                    } else {
                        $sipEntity->$name = $data['sip_' . $name];
                    }
                    break;
                case 'extension':
                    $sipEntity->$name = $data['number'];
                    break;
                case 'description':
                    $sipEntity->$name = $data['user_username'];
                    break;
                case 'manualattributes':
                    $sipEntity->setManualAttributes($data['sip_manualattributes']);
                    break;
                default:
                    if (array_key_exists('sip_' . $name, $data)) {
                        $sipEntity->$name = $data['sip_' . $name];
                    }
            }
        }
        if ($sipEntity->save() === false) {
            $errors = $sipEntity->getMessages();
            $this->flash->error(implode('<br>', $errors));

            return false;
        }

        return true;
    }

    /**
     * Save forwarding rights parameters
     *
     * @param ExtensionForwardingRights $forwardingRight
     * @param array $data - POST data
     *
     * @return bool save result
     */
    private function saveForwardingRights(ExtensionForwardingRights $forwardingRight, $data): bool
    {
        foreach ($forwardingRight as $name => $value) {
            switch ($name) {
                case 'extension':
                    $forwardingRight->$name = $data['number'];
                    break;
                default:
                    if (array_key_exists('fwd_' . $name, $data)) {
                        $forwardingRight->$name = ($data['fwd_' . $name] === -1) ? '' : $data['fwd_' . $name];
                    }
            }
        }
        if (empty($forwardingRight->forwarding)) {
            $forwardingRight->ringlength = null;
        }

        if ($forwardingRight->save() === false) {
            $errors = $forwardingRight->getMessages();
            $this->flash->error(implode('<br>', $errors));

            return false;
        }

        return true;
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
        if ($externalPhone->save() === false) {
            $errors = $externalPhone->getMessages();
            $this->flash->error(implode('<br>', $errors));

            return false;
        }

        return true;
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
     * Check the availability of a number in the extensions.js JavaScript script.
     *
     * @param string $number - The internal number of the user
     *
     * @return void - The parameters are stored in the view and processed through ControllerBase::afterExecuteRoute()
     */
    public function availableAction(string $number = ''): void
    {
        $result = true;
        // Check for overlap with internal number plan
        $extension = Extensions::findFirstByNumber($number);
        if ($extension !== null) {
            $result = false;
            $this->view->userId = $extension->userid;
        }
        // Check for overlap with parking slots
        if ($result) {
            $parkExt = PbxSettings::getValueByKey('PBXCallParkingExt');
            $parkStartSlot = PbxSettings::getValueByKey('PBXCallParkingStartSlot');
            $parkEndSlot = PbxSettings::getValueByKey('PBXCallParkingEndSlot');
            if ($number === $parkExt || ($number >= $parkStartSlot && $number <= $parkEndSlot)) {
                $result = false;
                $this->view->userId = 0;
            }
        }

        $this->view->numberAvailable = $result;
    }

    /**
     * Disable all numbers of a user.
     *
     * @param string $number - The internal number of the user
     *
     * @return void
     */
    public function disableAction(string $number = ''): void
    {
        $extension = Extensions::findFirstByNumber($number);
        if ($extension !== null) {
            $extensions = Extensions::findByUserid($extension->userid);
            foreach ($extensions as $extension) {
                switch ($extension->type) {
                    case Extensions::TYPE_SIP:
                        $extension->Sip->disabled = '1';
                        break;
                    case Extensions::TYPE_EXTERNAL:
                        $extension->ExternalPhones->disabled = '1';
                        break;
                }
                if ($extension->save() === true) {
                    $this->view->success = true;
                } else {
                    $this->view->success = false;
                    $errors = $extension->getMessages();
                    $this->flash->error(implode('<br>', $errors));

                    return;
                }
            }
        }
    }

    /**
     * Enable all numbers of a user.
     *
     * @param string $number - The internal number of the user
     *
     * @return void
     */
    public function enableAction(string $number = ''): void
    {
        $extension = Extensions::findFirstByNumber($number);
        if ($extension !== null) {
            $extensions = Extensions::findByUserid($extension->userid);
            foreach ($extensions as $extension) {
                switch ($extension->type) {
                    case Extensions::TYPE_SIP:
                        $extension->Sip->disabled = '0';
                        break;
                    case Extensions::TYPE_EXTERNAL:
                        $extension->ExternalPhones->disabled = '1';
                        break;
                }
                if ($extension->save() === true) {
                    $this->view->success = true;
                } else {
                    $this->view->success = false;
                    $errors = $extension->getMessages();
                    $this->flash->error(implode('<br>', $errors));

                    return;
                }
            }
        }
    }

    /**
     * Возвращает представление для списка нормеров телефонов по AJAX запросу
     *
     * @return void
     */
    public function GetPhonesRepresentAction(): void
    {
        if (!$this->request->isPost()) {
            return;
        }
        $numbers = $this->request->getPost('numbers');
        $result = [];
        foreach ($numbers as $number) {
            $result[$number] = [
                'number' => $number,
                'represent' => $this->GetPhoneRepresentAction($number),
            ];
        }
        $this->view->success = true;
        $this->view->message = $result;
    }

    /**
     * Retrieves the view for the phone numbers list via AJAX request.
     *
     * @return void
     */
    public function GetPhoneRepresentAction($phoneNumber): string
    {
        $response = $phoneNumber;

        if (strlen($phoneNumber) > 10) {
            $seekNumber = substr($phoneNumber, -9);
            $parameters = [
                'conditions' => 'number LIKE :SearchPhrase1:',
                'bind' => [
                    'SearchPhrase1' => "%{$seekNumber}",
                ],
            ];
        } else {
            $parameters = [
                'conditions' => 'number = :SearchPhrase1:',
                'bind' => [
                    'SearchPhrase1' => $phoneNumber,
                ],
            ];
        }
        $result = Extensions::findFirst($parameters);
        if ($result !== null) {
            $response = $result->getRepresent();
        }

        return $response;
    }

    /**
     * Used to generate a select list of users from the JavaScript script extensions.js.
     *
     * @param string $type {all, phones, internal} - Display only phones or all possible numbers.
     *
     * @return void
     */
    public function getForSelectAction(string $type = 'all'): void
    {
        $results = [];
        switch ($type) {
            case 'all':
            {
                // Query conditions to fetch all extensions except 'did2user'
                $parameters = [
                    'conditions' => 'show_in_phonebook="1" AND number NOT IN ({exclude:array})',
                    'bind' => [
                        'exclude' => ['did2user']
                    ]
                ];
                break;
            }
            case 'routing':
            {
                // Query conditions to fetch all extensions
                $parameters = [
                    'conditions' => 'show_in_phonebook="1"',
                ];
                break;
            }
            case 'phones':
            {
                // Query conditions to fetch phone extensions (SIP and external)
                $parameters = [
                    'conditions' => 'type IN ({ids:array}) AND show_in_phonebook="1"',
                    'bind' => [
                        'ids' => [Extensions::TYPE_SIP, Extensions::TYPE_EXTERNAL],
                    ],
                ];
                break;
            }
            case 'internal':
            {
                // Query conditions to fetch only internal extensions (SIP)
                $parameters = [
                    'conditions' => 'type IN ({ids:array}) AND show_in_phonebook="1"',
                    'bind' => [
                        'ids' => [Extensions::TYPE_SIP],
                    ],
                ];
                break;
            }
            default:
            {
                // Default query conditions to fetch all extensions
                $parameters = [
                    'conditions' => 'show_in_phonebook="1"',
                ];
            }
        }

        // Fetch extensions based on the query parameters
        $extensions = Extensions::find($parameters);
        foreach ($extensions as $record) {
            $type = ($record->userid > 0) ? ' USER'
                : $record->type; // Пользователи будут самыми первыми в списке
            $type = Text::underscore(strtoupper($type));

            if ($type === Extensions::TYPE_MODULES) {
                // Check if the extension belongs to a module and if the module is disabled
                $module = $this->findModuleByExtensionNumber($record->number);
                if ($module === null || $module->disabled === '1') {
                    continue; // Skip disabled modules
                }
            }
            $represent = $record->getRepresent();
            $clearedRepresent = strip_tags($represent);
            // Create a result entry with user's name, number, type, localized type, and sorter value
            $results[] = [
                'name' => $represent,
                'value' => $record->number,
                'type' => $type,
                'typeLocalized' => $this->translation->_("ex_dropdownCategory_{$type}"),
                'sorter' => ($record->userid > 0) ? "{$type}{$clearedRepresent}{$record->number}" : "{$type}{$clearedRepresent}"
            ];
        }

        // Sort the results based on the sorter value
        usort(
            $results,
            [__CLASS__, 'sortExtensionsArray']
        );

        $this->view->success = true;
        $this->view->results = $results;
    }

    /**
     * Tries to find a module by extension number.
     *
     * @param string $number - The extension number.
     *
     * @return mixed|null The module object if found, null otherwise.
     */
    private function findModuleByExtensionNumber(string $number)
    {
        $result = null;
        $extension = Extensions::findFirst("number ='{$number}'");
        $relatedLinks = $extension->getRelatedLinks();
        $moduleUniqueID = false;

        // Iterate through the related links to find the module
        foreach ($relatedLinks as $relation) {
            $obj = $relation['object'];

            // Check if the related object belongs to a module
            if (strpos(get_class($obj), 'Modules\\') === 0) {
                $moduleUniqueID = explode('Models\\', get_class($obj))[1];
            }
        }

        // If a module unique ID is found, retrieve the corresponding module object
        if ($moduleUniqueID) {
            $result = PbxExtensionModules::findFirstByUniqid($moduleUniqueID);
        }

        return $result;
    }

    /**
     * Sorts the extensions array.
     *
     * @param array $a - The first element to compare.
     * @param array $b - The second element to compare.
     *
     * @return int - Returns a negative, zero, or positive integer based on the comparison result.
     */
    private function sortExtensionsArray($a, $b): int
    {
        return strcmp($a['sorter'], $b['sorter']);
    }

}