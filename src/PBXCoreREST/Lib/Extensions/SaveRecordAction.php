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

namespace MikoPBX\PBXCoreREST\Lib\Extensions;

use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use MikoPBX\Common\Models\ExtensionForwardingRights;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\ExternalPhones;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Common\Models\Sip;
use MikoPBX\Common\Models\Users;
use MikoPBX\Common\Providers\MainDatabaseProvider;
use MikoPBX\Common\Providers\ModelsMetadataProvider;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di;
use Phalcon\Di\Injectable;
use Phalcon\Security\Random;

/**
 * Class SaveRecord
 * Provides methods to save extension records with associated entities.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Extensions
 */
class SaveRecordAction extends Injectable
{
    /**
     * Saves a record with associated entities.
     *
     * @param array $data Data to be saved.
     * @return PBXApiResult Result of the save operation.
     */
    public static function main(array $data): PBXApiResult
    {
        // Initialize the result object
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $res->success = true;

        $di = Di::getDefault();
        $db = $di->get(MainDatabaseProvider::SERVICE_NAME);
        $db->begin();

        $dataStructure = new DataStructure($data);

        // Save user entity
        list($userEntity, $res->success) = self::saveUser($dataStructure);
        if (!$res->success) {
            // Handle errors and rollback
            $res->messages['error'][] = $userEntity->getMessages();
            $db->rollback();
            return $res;
        } else {
            $dataStructure->user_id = $userEntity->id;
        }

        // Save extension entity
        list($extension, $res->success) = self::saveExtension($dataStructure, false);
        if (!$res->success) {
            // Handle errors and rollback
            $res->messages['error'][] = implode($extension->getMessages());
            $db->rollback();
            return $res;
        }

        // Save SIP entity
        list($sipEntity, $res->success) = self::saveSip($dataStructure);
        if (!$res->success) {
            // Handle errors and rollback
            $res->messages['error'][] = implode($sipEntity->getMessages());
            $db->rollback();
            return $res;
        }

        // Save forwarding rights entity
        list($fwdEntity, $res->success) = self::saveForwardingRights($dataStructure);
        if (!$res->success) {
            // Handle errors and rollback
            $res->messages['error'][] = implode($fwdEntity->getMessages());
            $db->rollback();
            return $res;
        }

        // Check mobile number presence and save related entities
        if (!empty($dataStructure->mobile_number)) {

            // Save mobile extension
            list($mobileExtension, $res->success) = self::saveExtension($dataStructure, true);
            if (!$res->success) {
                // Handle errors and rollback
                $res->messages['error'][] = implode($mobileExtension->getMessages());
                $db->rollback();
                return $res;
            }

            // Save ExternalPhones for mobile number
            list($externalPhone, $res->success) = self::saveExternalPhones($dataStructure);
            if (!$res->success) {
                // Handle errors and rollback
                $res->messages['error'][] = implode($externalPhone->getMessages());
                $db->rollback();
                return $res;
            }
        } else {
            // Delete mobile number if it was associated with the user
            list($deletedMobileNumber, $res->success) = self::deleteMobileNumber($userEntity);
            if (!$res->success) {
                $res->messages['error'][] = implode($deletedMobileNumber->getMessages());
                $db->rollback();
                return $res;
            }
        }
        $db->commit();

        $res = GetRecordAction::main($extension->id);
        $res->processor = __METHOD__;
        return $res;
    }

    /**
     * Save parameters to the Users table
     *
     * @param DataStructure $dataStructure The data structure containing the input data.
     * @return array An array containing the saved Users entity and the save result.
     */
    private static function saveUser(DataStructure $dataStructure): array
    {
        $userEntity = Users::findFirstById($dataStructure->user_id);
        if ($userEntity === null) {
            $userEntity = new Users();
        }

        // Fill in user parameters
        $metaData = Di::getDefault()->get(ModelsMetadataProvider::SERVICE_NAME);
        foreach ($metaData->getAttributes($userEntity) as $name) {
            switch ($name) {
                case 'language':
                    $userEntity->$name = PbxSettings::getValueByKey(PbxSettingsConstants::PBX_LANGUAGE);
                    break;
                default:
                    $propertyKey = 'user_' . $name;
                    if (property_exists($dataStructure, $propertyKey)) {
                        $userEntity->$name = $dataStructure->$propertyKey;
                    }
            }
        }

        $result = $userEntity->save();
        return [$userEntity, $result];
    }

    /**
     * Save the extension for a user.
     * @param DataStructure $dataStructure The data structure containing the input data.
     * @param bool $isMobile Flag indicating if it's a mobile extension.
     *
     * @return array An array containing the saved Extensions entity and the save result.
     */
    private static function saveExtension(DataStructure $dataStructure, bool $isMobile = false): array
    {
        $parameters = [];
        $parameters['conditions'] = 'type=:type: AND is_general_user_number = "1" AND userid=:userid:';
        $parameters['bind']['type'] = $isMobile ? Extensions::TYPE_EXTERNAL : Extensions::TYPE_SIP;
        $parameters['bind']['userid'] = $dataStructure->user_id ;

        $extension = Extensions::findFirst($parameters);
        if ($extension === null) {
            $extension = new Extensions();
        }
        $metaData = Di::getDefault()->get(ModelsMetadataProvider::SERVICE_NAME);
        foreach ($metaData->getAttributes($extension) as $name) {
            switch ($name) {
                case 'id':
                    // Skip saving the 'id' field
                    break;
                case 'type':
                    // Set the 'type' based on the value of $isMobile
                    $extension->$name = $isMobile ? Extensions::TYPE_EXTERNAL : Extensions::TYPE_SIP;
                    break;
                case 'callerid':
                    // Sanitize the caller ID based on 'user_username' on model before save function
                    $extension->$name = $dataStructure->user_username;
                    break;
                case 'userid':
                    // Set 'userid' to the ID of the user entity
                    $extension->$name = $dataStructure->user_id;
                    break;
                case 'number':
                    // Set 'number' based on the value of mobile_number or number
                    $extension->$name = $isMobile ? $dataStructure->mobile_number : $dataStructure->number;
                    break;
                default:
                    if (property_exists($dataStructure, $name)) {
                        // Set other fields based on the values in $data
                        $extension->$name = $dataStructure->$name;
                    }
            }
        }
        $result = $extension->save();
        return [$extension, $result];
    }

    /**
     * Save the SIP entity with the provided data.
     *
     * @param DataStructure $dataStructure The data structure containing the input data.
     * @return array An array containing the saved SIP entity and the save result.
     */
    private static function saveSip(DataStructure $dataStructure): array
    {
        $sipEntity = SIP::findFirstByUniqid($dataStructure->sip_uniqid);
        if ($sipEntity === null) {
            $sipEntity = new SIP();
        }

        $metaData = Di::getDefault()->get(ModelsMetadataProvider::SERVICE_NAME);
        foreach ($metaData->getAttributes($sipEntity) as $name) {
            switch ($name) {
                case 'weakSecret':
                    $sipEntity->$name = '0';
                    break;
                case 'networkfilterid':
                    if ($dataStructure->sip_networkfilterid === 'none') {
                        $sipEntity->$name = null;
                    } else {
                        $sipEntity->$name = $dataStructure->sip_networkfilterid;
                    }
                    break;
                case 'extension':
                    // Set 'extension' based on the value of number
                    $sipEntity->$name = $dataStructure->number;
                    break;
                case 'description':
                    // Set 'description' based on the value of user_username
                    $sipEntity->$name = $dataStructure->user_username;
                    break;
                case 'manualattributes':
                    // Set 'manualattributes' using the value of sip_manualattributes
                    $sipEntity->setManualAttributes($dataStructure->sip_manualattributes);
                    break;
                default:
                    $propertyKey = 'sip_' . $name;
                    if (property_exists($dataStructure, $propertyKey)) {
                        // Set other fields based on the other fields in $dataStructure
                        $sipEntity->$name = $dataStructure->$propertyKey;
                    }
            }
        }

        $result = $sipEntity->save();
        return [$sipEntity, $result];
    }

    /**
     * Save the ExtensionForwardingRights entity with the provided data.
     *
     * @param DataStructure $dataStructure The data structure containing the input data.
     * @return array An array containing the saved ExtensionForwardingRights entity and the save result.
     */
    private static function saveForwardingRights(DataStructure $dataStructure): array
    {
        $forwardingRight = ExtensionForwardingRights::findFirstByExtension($dataStructure->number);
        if ($forwardingRight === null) {
            $forwardingRight = new ExtensionForwardingRights();
        }
        $metaData = Di::getDefault()->get(ModelsMetadataProvider::SERVICE_NAME);
        foreach ($metaData->getAttributes($forwardingRight) as $name) {
            switch ($name) {
                case 'extension':
                    // Set 'extension' based on the value of number
                    $forwardingRight->$name = $dataStructure->number;
                    break;
                case 'ringlength':
                    $forwardingRight->ringlength = 0;
                    if (!empty($dataStructure->fwd_ringlength)) {
                        $forwardingRight->ringlength = $dataStructure->fwd_ringlength;
                    } elseif (!empty($dataStructure->fwd_forwarding)) {
                        $forwardingRight->ringlength = 45;
                    }
                    break;
                default:
                    $propertyKey = 'fwd_' . $name;
                    if (property_exists($dataStructure, $propertyKey)) {
                        // Set other fields based on the other fields in $dataStructure
                        $forwardingRight->$name = $dataStructure->$propertyKey === -1 ? '' : $dataStructure->$propertyKey;
                    }
            }
        }
        $result = $forwardingRight->save();
        return [$forwardingRight, $result];
    }

    /**
     * Save parameters to the ExternalPhones table for a mobile number.
     *
     * @param DataStructure $dataStructure The data structure containing the input data.
     * @return array An array containing the saved ExternalPhones entity and the save result.
     */
    private static function saveExternalPhones(DataStructure $dataStructure): array
    {
        $externalPhone = ExternalPhones::findFirstByUniqid($dataStructure->mobile_uniqid);
        if ($externalPhone === null) {
            $externalPhone = new ExternalPhones();
        }
        $metaData = Di::getDefault()->get(ModelsMetadataProvider::SERVICE_NAME);
        foreach ($metaData->getAttributes($externalPhone) as $name) {
            switch ($name) {
                case 'extension':
                    $externalPhone->$name = $dataStructure->mobile_number;
                    break;
                case 'description':
                    $externalPhone->$name = $dataStructure->user_username;
                    break;
                default:
                    $propertyKey = 'mobile_' . $name;
                    if (property_exists($dataStructure, $propertyKey)) {
                        // Set other fields based on the other fields in $dataStructure
                        $externalPhone->$name = $dataStructure->$propertyKey;
                    }
            }
        }

        $result = $externalPhone->save();
        return [$externalPhone, $result];
    }

    /**
     * Delete a mobile number associated with a user.
     *
     * @param Users $userEntity The user entity.
     * @return array An array containing the deleted mobile number entity and the deletion result.
     */
    private static function deleteMobileNumber(Users $userEntity): array
    {
        $parameters = [
            'conditions' => 'type="' . Extensions::TYPE_EXTERNAL . '" AND is_general_user_number = "1" AND userid=:userid:',
            'bind' => [
                'userid' => $userEntity->id,
            ],
        ];
        $deletedMobileNumber = Extensions::findFirst($parameters);
        $result = true;
        if ($deletedMobileNumber !== null) {
            // Delete the mobile number entity if found
            $result = $deletedMobileNumber->delete();
        }
        return [$deletedMobileNumber, $result];
    }
}