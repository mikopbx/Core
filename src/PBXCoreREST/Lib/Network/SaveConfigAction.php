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
use MikoPBX\Common\Models\NetworkStaticRoutes;
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

        // Validate input data
        list($isValid, $validationMessages) = self::validateInputData($data);
        if (!$isValid) {
            $res->messages['error'] = $validationMessages;
            $res->success = false;
            return $res;
        }

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

            // Save static routes
            list($result, $messages) = self::saveStaticRoutes($data);
            if (!$result) {
                $res->messages['error'] = $messages;
                $db->rollback();
                return $res;
            }

            $db->commit();

            // Return updated configuration
            $res = GetConfigAction::main();
            $res->messages['success'][] = 'Network configuration saved successfully';
            $res->reload = 'network/modify';

        } catch (\Exception $e) {
            $db->rollback();
            $res->messages['error'][] = $e->getMessage();
        }

        return $res;
    }

    /**
     * Validates input data for network configuration
     *
     * @param array $data Configuration data to validate
     * @return array Returns [bool $isValid, array $messages]
     */
    private static function validateInputData(array $data): array
    {
        $messages = [];

        // Validate external IP address if provided
        if (!empty($data['extipaddr'])) {
            if (!self::validateIpAddressWithOptionalPort($data['extipaddr'])) {
                $messages[] = 'nw_ValidateExtIppaddrNotRight';
            }
        }

        // Validate external hostname if provided
        if (!empty($data['exthostname'])) {
            if (!self::validateHostname($data['exthostname'])) {
                $messages[] = 'nw_ValidateHostnameInvalid';
            }
        }

        // Check that at least one of extipaddr or exthostname is provided when NAT is enabled
        if (($data['usenat'] ?? false) && empty($data['extipaddr']) && empty($data['exthostname'])) {
            $messages[] = 'nw_ValidateExtIppaddrOrHostIsEmpty';
        }

        // Validate interface IP addresses
        foreach ($data as $key => $value) {
            if (preg_match('/^ipaddr_(\d+)$/', $key, $matches) && !empty($value)) {
                $interfaceId = $matches[1];
                // Skip validation if DHCP is enabled for this interface
                if (!($data["dhcp_{$interfaceId}"] ?? false)) {
                    if (!self::validateIpAddress($value)) {
                        $messages[] = 'nw_ValidateIppaddrNotRight';
                    }
                }
            }
        }

        // Validate gateway, DNS, and hostname (interface-specific format with _{id})
        foreach ($data as $key => $value) {
            if (empty($value)) {
                continue;
            }

            // Check gateway fields (gateway_{id})
            if (preg_match('/^gateway_\d+$/', $key)) {
                if (!self::validateIpAddress($value)) {
                    $messages[] = 'nw_ValidateGatewayNotRight';
                }
            }

            // Check primary DNS fields (primarydns_{id})
            if (preg_match('/^primarydns_\d+$/', $key)) {
                if (!self::validateIpAddress($value)) {
                    $messages[] = 'nw_ValidatePrimaryDNSNotRight';
                }
            }

            // Check secondary DNS fields (secondarydns_{id})
            if (preg_match('/^secondarydns_\d+$/', $key)) {
                if (!self::validateIpAddress($value)) {
                    $messages[] = 'nw_ValidateSecondaryDNSNotRight';
                }
            }
        }

        return [empty($messages), $messages];
    }

    /**
     * Validates IP address format
     *
     * @param string $ip IP address to validate
     * @return bool True if valid, false otherwise
     */
    private static function validateIpAddress(string $ip): bool
    {
        return filter_var($ip, FILTER_VALIDATE_IP) !== false;
    }

    /**
     * Validates IP address with optional port
     *
     * @param string $ipWithPort IP address with optional port (e.g., "192.168.1.1:5060")
     * @return bool True if valid, false otherwise
     */
    private static function validateIpAddressWithOptionalPort(string $ipWithPort): bool
    {
        // Check if there's a port
        if (strpos($ipWithPort, ':') !== false) {
            $parts = explode(':', $ipWithPort);
            if (count($parts) !== 2) {
                return false;
            }

            [$ip, $port] = $parts;

            // Validate IP
            if (!self::validateIpAddress($ip)) {
                return false;
            }

            // Validate port (1-65535)
            if (!ctype_digit($port) || (int)$port < 1 || (int)$port > 65535) {
                return false;
            }

            return true;
        }

        // No port, just validate IP
        return self::validateIpAddress($ipWithPort);
    }

    /**
     * Validates hostname according to RFC 952 and RFC 1123
     *
     * @param string $hostname Hostname to validate
     * @return bool True if valid, false otherwise
     */
    private static function validateHostname(string $hostname): bool
    {
        // Check length (max 253 characters total)
        if (strlen($hostname) > 253) {
            return false;
        }

        // Split into labels
        $labels = explode('.', $hostname);

        foreach ($labels as $label) {
            // Check label length (1-63 characters)
            $labelLength = strlen($label);
            if ($labelLength < 1 || $labelLength > 63) {
                return false;
            }

            // Check label format: only alphanumeric and hyphens, cannot start/end with hyphen
            if (!preg_match('/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/', $label)) {
                return false;
            }
        }

        return true;
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

        // Collect interfaces to delete from form
        $interfacesToDelete = [];
        foreach ($data as $key => $value) {
            if (preg_match('/^disabled_(\d+)$/', $key, $matches) && $value) {
                $interfacesToDelete[] = (int)$matches[1];
            }
        }

        // Update existing interface settings
        foreach ($networkInterfaces as $eth) {
            // Check if this interface should be deleted
            if (in_array((int)$eth->id, $interfacesToDelete, true)) {
                if ($eth->delete() === false) {
                    foreach ($eth->getMessages() as $message) {
                        $messages[] = $message->getMessage();
                    }
                    return [false, $messages];
                }
                continue; // Skip to next interface
            }

            // Update interface settings
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
            // Check if this interface is selected as internet interface
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

                        // Synchronize external hostname to EXTERNAL_SIP_HOST_NAME
                        // This ensures SSL certificates are regenerated with the new hostname
                        if (!empty($eth->$name)) {
                            $messages = [];
                            PbxSettings::setValueByKey(PbxSettings::EXTERNAL_SIP_HOST_NAME, trim($eth->$name), $messages);
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
                    // Save IP/subnet values even when DHCP is enabled (like gateway/DNS)
                    // This stores the current DHCP-provided values for display
                    $eth->$name = '';
                    if (array_key_exists($name . '_' . $eth->id, $data)) {
                        $eth->$name = $data[$name . '_' . $eth->id] ?? '';
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

                case 'gateway':
                case 'primarydns':
                case 'secondarydns':
                    // Use only new interface-specific format (field_name_{id})
                    if ($itIsInternetInterface) {
                        $fieldKey = $name . '_' . $eth->id;
                        $eth->$name = array_key_exists($fieldKey, $data) ? $data[$fieldKey] : '';
                    } else {
                        $eth->$name = '';
                    }
                    break;

                case 'hostname':
                    // Hostname is not used in new UI, always empty
                    $eth->$name = '';
                    break;

                case 'domain':
                    // Domain field is not used in new UI, always empty
                    $eth->$name = '';
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

    /**
     * Saves static route configurations
     *
     * @param array $data Configuration data containing staticRoutes array
     * @return array Returns [bool $success, array $messages]
     */
    private static function saveStaticRoutes(array $data): array
    {
        $messages = [];

        // Check if staticRoutes data is provided
        if (!isset($data['staticRoutes']) || !is_array($data['staticRoutes'])) {
            // No routes to save, skip
            return [true, []];
        }

        try {
            // Collect IDs of routes that should be kept
            $routeIdsToKeep = [];
            foreach ($data['staticRoutes'] as $routeData) {
                if (isset($routeData['id']) && !empty($routeData['id']) && !str_starts_with($routeData['id'], 'new_')) {
                    $routeIdsToKeep[] = $routeData['id'];
                }
            }

            // Delete routes that are not in the list
            $existingRoutes = NetworkStaticRoutes::find();
            foreach ($existingRoutes as $route) {
                if (!in_array($route->id, $routeIdsToKeep, false)) {
                    if ($route->delete() === false) {
                        foreach ($route->getMessages() as $message) {
                            $messages[] = $message->getMessage();
                        }
                        return [false, $messages];
                    }
                }
            }

            // Create or update routes
            foreach ($data['staticRoutes'] as $index => $routeData) {
                // Find existing route or create new one
                $route = null;
                if (isset($routeData['id']) && !empty($routeData['id']) && !str_starts_with($routeData['id'], 'new_')) {
                    $route = NetworkStaticRoutes::findFirstById($routeData['id']);
                }

                if (!$route) {
                    $route = new NetworkStaticRoutes();
                }

                // Set route data
                $route->network = $routeData['network'] ?? '';
                $route->subnet = $routeData['subnet'] ?? '24';
                $route->gateway = $routeData['gateway'] ?? '';
                $route->interface = $routeData['interface'] ?? '';
                $route->description = $routeData['description'] ?? '';
                $route->priority = $routeData['priority'] ?? ($index + 1);

                // Save route
                if (!$route->save()) {
                    foreach ($route->getMessages() as $message) {
                        $messages[] = $message->getMessage();
                    }
                    return [false, $messages];
                }
            }

            return [true, []];

        } catch (\Exception $e) {
            $messages[] = $e->getMessage();
            return [false, $messages];
        }
    }
}