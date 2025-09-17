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

namespace MikoPBX\PBXCoreREST\Lib\Network;

use MikoPBX\Common\Models\LanInterfaces;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;

/**
 * Action for saving complete network configuration
 *
 * Saves all network interfaces and NAT settings in a single transaction
 *
 * @api {post} /pbxcore/api/v3/network:saveConfig Save network configuration
 * @apiVersion 3.0.0
 * @apiName SaveNetworkConfig
 * @apiGroup Network
 *
 * @apiParam {Object} data Configuration data from form
 *
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Updated configuration
 */
class SaveConfigAction
{
    /**
     * Save complete network configuration
     *
     * @param array $data Configuration data
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $di = Di::getDefault();
        $db = $di->get('db');

        $db->begin();

        try {
            // Save LAN interfaces
            list($result, $messages) = self::saveLanInterfaces($data);
            if (!$result) {
                $res->messages['error'] = $messages;
                $db->rollback();
                return $res;
            }

            // Save NAT settings
            list($result, $messages) = self::saveNatSettings($data);
            if (!$result) {
                $res->messages['error'] = $messages;
                $db->rollback();
                return $res;
            }

            $db->commit();

            // Return updated configuration
            $res = GetConfigAction::main();
            $res->messages['success'][] = 'Network configuration saved successfully';

        } catch (\Exception $e) {
            $db->rollback();
            $res->messages['error'][] = $e->getMessage();
        }

        return $res;
    }

    /**
     * Saves the LAN interface configurations
     *
     * @param array $data Array containing the interface configurations
     * @return array Returns an array with a boolean success flag and an array of error messages if applicable
     */
    private static function saveLanInterfaces(array $data): array
    {
        $networkInterfaces = LanInterfaces::find();
        $messages = [];
        $isDocker = Util::isDocker();

        // Update existing interface settings
        foreach ($networkInterfaces as $eth) {
            self::fillEthStructure($eth, $data, $isDocker);
            if ($eth->save() === false) {
                foreach ($eth->getMessages() as $message) {
                    $messages[] = $message->getMessage();
                }
                return [false, $messages];
            }
        }

        // Save additional interface settings if it exists
        if (isset($data['interface_0']) && $data['interface_0'] !== '') {
            $eth = new LanInterfaces();
            $eth->id = 0;
            self::fillEthStructure($eth, $data, $isDocker);
            $eth->id = null;
            $eth->disabled = '0';
            if ($eth->create() === false) {
                foreach ($eth->getMessages() as $message) {
                    $messages[] = $message->getMessage();
                }
                return [false, $messages];
            }
        }

        return [true, []];
    }

    /**
     * Fills network interface settings
     *
     * @param LanInterfaces $eth
     * @param array $data post data
     * @param bool $isDocker
     */
    private static function fillEthStructure(LanInterfaces $eth, array $data, bool $isDocker): void
    {
        foreach ($eth as $name => $value) {
            $itIsInternetInterface = isset($data['internet_interface']) && intval($eth->id) === intval($data['internet_interface']);

            switch ($name) {
                case 'topology':
                    if ($itIsInternetInterface) {
                        $eth->$name = ($data['usenat'] ?? false)
                            ? LanInterfaces::TOPOLOGY_PRIVATE
                            : LanInterfaces::TOPOLOGY_PUBLIC;
                    } else {
                        $eth->$name = '';
                    }
                    break;

                case 'extipaddr':
                    if ($itIsInternetInterface) {
                        if (array_key_exists($name, $data)) {
                            $eth->$name = ($data['usenat'] ?? false)
                                ? $data[$name]
                                : ($data['ipaddr_' . $eth->id] ?? '');
                        } else {
                            $eth->$name = $data['ipaddr_' . $eth->id] ?? '';
                        }
                    } else {
                        $eth->$name = '';
                    }
                    break;

                case 'exthostname':
                    if ($itIsInternetInterface) {
                        if (array_key_exists($name, $data)) {
                            $eth->$name = ($data['usenat'] ?? false)
                                ? $data[$name]
                                : ($data['hostname'] ?? '');
                        } else {
                            $eth->$name = $data['hostname'] ?? '';
                        }
                    } else {
                        $eth->$name = '';
                    }
                    break;

                case 'dhcp':
                    if (array_key_exists($name . '_' . $eth->id, $data)) {
                        $eth->$name = $data['dhcp_' . $eth->id] ? '1' : '0';
                    }
                    if ($isDocker) {
                        $eth->dhcp = '1';
                    }
                    break;

                case 'internet':
                    $eth->$name = $itIsInternetInterface ? '1' : '0';
                    break;

                case 'ipaddr':
                case 'subnet':
                    $eth->$name = '';
                    if (array_key_exists($name . '_' . $eth->id, $data)) {
                        $eth->$name = ($data['dhcp_' . $eth->id] ?? false)
                            ? ''
                            : ($data[$name . '_' . $eth->id] ?? '');
                    }
                    break;

                case 'interface':
                    if ($eth->id === 0 && isset($data[$name . '_' . $eth->id])) {
                        $parentInterface = LanInterfaces::findFirstById($data[$name . '_' . $eth->id]);
                        if ($parentInterface) {
                            $eth->$name = $parentInterface->interface;
                        }
                    }
                    break;

                case 'domain':
                case 'hostname':
                case 'gateway':
                case 'primarydns':
                case 'secondarydns':
                    if (array_key_exists($name, $data) && $itIsInternetInterface) {
                        $eth->$name = $data[$name];
                    } else {
                        $eth->$name = '';
                    }
                    break;

                default:
                    if (array_key_exists($name . '_' . $eth->id, $data)) {
                        $eth->$name = $data[$name . '_' . $eth->id];
                    }
            }
        }
    }

    /**
     * Saves the NAT-related settings for external access
     *
     * @param array $data Associative array where keys are setting names and values are the new settings to be saved
     * @return array Returns an array with a boolean success flag and, if unsuccessful, an array of error messages
     */
    private static function saveNatSettings(array $data): array
    {
        $messages = [];

        foreach ($data as $key => $value) {
            switch ($key) {
                case PbxSettings::AUTO_UPDATE_EXTERNAL_IP:
                    PbxSettings::setValueByKey($key, $value ? '1' : '0', $messages);
                    break;

                case PbxSettings::EXTERNAL_SIP_PORT:
                    if (empty($value)) {
                        $value = PbxSettings::getValueByKey(PbxSettings::SIP_PORT);
                    }
                    PbxSettings::setValueByKey($key, trim($value), $messages);
                    break;

                case PbxSettings::EXTERNAL_TLS_PORT:
                    if (empty($value)) {
                        $value = PbxSettings::getValueByKey(PbxSettings::TLS_PORT);
                    }
                    PbxSettings::setValueByKey($key, trim($value), $messages);
                    break;

                default:
                    // Ignore other fields
            }
        }

        $result = count($messages) === 0;
        return [$result, $messages];
    }
}