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
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\Core\System\System;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\Utilities\IpAddressHelper;
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
     * @param array<string, mixed> $data Configuration data
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $di = Di::getDefault();
        if ($di === null) {
            $res->messages['error'] = ['Dependency injection container not initialized'];
            $res->success = false;
            return $res;
        }

        // Get translation service
        $t = $di->get(TranslationProvider::SERVICE_NAME);

        // Validate input data
        [$isValid, $validationMessages] = self::validateInputData($data);
        if (!$isValid) {
            // Translate validation messages
            $res->messages['error'] = array_map(
                static fn(string $key): string => $t->_($key),
                $validationMessages
            );
            $res->success = false;
            return $res;
        }
        $db = $di->get('db');

        $db->begin();

        try {
            // Save LAN interfaces
            [$result, $messages] = self::saveLanInterfaces($data);
            if (!$result) {
                $res->messages['error'] = $messages;
                $db->rollback();
                return $res;
            }

            // Save NAT settings
            [$result, $messages] = self::saveNatSettings($data);
            if (!$result) {
                $res->messages['error'] = $messages;
                $db->rollback();
                return $res;
            }

            // Save static routes
            [$result, $messages] = self::saveStaticRoutes($data);
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
     * @param array<string, mixed> $data Configuration data to validate
     * @return array{0: bool, 1: array<int, string>} Returns [bool $isValid, array $messages]
     */
    private static function validateInputData(array $data): array
    {
        $messages = [];

        // Validate external IP address if provided
        if (!empty($data['extipaddr'])) {
            $parsed = IpAddressHelper::parseIpWithOptionalPort($data['extipaddr']);
            if ($parsed === false) {
                $messages[] = 'nw_ValidateExtIppaddrNotRight';
            } else {
                // Validate port if present
                [$ip, $port] = $parsed;
                if ($port !== null && ((int)$port < 1 || (int)$port > 65535)) {
                    $messages[] = 'nw_ValidateExtIppaddrNotRight';
                }
            }
        }

        // Validate external hostname if provided
        if (!empty($data['exthostname'])) {
            if (!IpAddressHelper::validateHostname($data['exthostname'])) {
                $messages[] = 'nw_ValidateHostnameInvalid';
            }
        }

        // Check that at least one of extipaddr or exthostname is provided when NAT is enabled
        if (($data['usenat'] ?? false) && empty($data['extipaddr']) && empty($data['exthostname'])) {
            $messages[] = 'nw_ValidateExtIppaddrOrHostIsEmpty';
        }

        // Check Dual-Stack mode: exthostname is REQUIRED when any interface has IPv4 + public IPv6
        // Dual-Stack = IPv4 (any mode) + IPv6 global unicast (2000::/3)
        if ($data['usenat'] ?? false) {
            $hasDualStack = false;

            // Check all interfaces for dual-stack configuration
            foreach ($data as $key => $value) {
                if (preg_match('/^ipv6addr_(\d+)$/', $key, $matches) && !empty($value)) {
                    $interfaceId = $matches[1];

                    // Check if interface has IPv4 (either static or DHCP)
                    $hasIpv4 = !empty($data["ipaddr_{$interfaceId}"]) ||
                               (bool)($data["dhcp_{$interfaceId}"] ?? false);

                    // Check if IPv6 is enabled (Auto or Manual)
                    $ipv6Mode = $data["ipv6_mode_{$interfaceId}"] ?? '0';
                    $hasIpv6 = ($ipv6Mode === '1' || $ipv6Mode === '2');

                    // Check if IPv6 address is global unicast (public)
                    $isGlobalUnicast = IpAddressHelper::isGlobalUnicast($value);

                    if ($hasIpv4 && $hasIpv6 && $isGlobalUnicast) {
                        $hasDualStack = true;
                        break;
                    }
                }
            }

            // In Dual-Stack mode, exthostname is REQUIRED
            if ($hasDualStack && empty($data['exthostname'])) {
                $messages[] = 'nw_ValidateExternalHostnameEmpty';
            }
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

        // Validate IPv6 fields (Phase 3)
        foreach ($data as $key => $value) {
            // IPv6 mode validation (ipv6_mode_{id})
            if (preg_match('/^ipv6_mode_(\d+)$/', $key, $matches)) {
                if (!in_array($value, ['0', '1', '2'], true)) {
                    $messages[] = 'nw_ValidateIPv6ModeInvalid';
                }

                // Check required fields for Manual mode
                if ($value === '2') {
                    $interfaceId = $matches[1];
                    $addr = $data["ipv6addr_{$interfaceId}"] ?? '';
                    $subnet = $data["ipv6_subnet_{$interfaceId}"] ?? '';

                    if (empty($addr)) {
                        $messages[] = 'nw_ValidateIPv6AddressRequired';
                    }
                    if (empty($subnet)) {
                        $messages[] = 'nw_ValidateIPv6SubnetRequired';
                    }
                }
            }

            // IPv6 address validation (ipv6addr_{id})
            if (preg_match('/^ipv6addr_(\d+)$/', $key, $matches) && !empty($value)) {
                $interfaceId = $matches[1];
                $mode = $data["ipv6_mode_{$interfaceId}"] ?? '0';

                // Validate only if mode is Manual ('2')
                if ($mode === '2') {
                    if (!filter_var($value, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
                        $messages[] = 'nw_ValidateIPv6AddressInvalid';
                    }
                }
            }

            // IPv6 subnet validation (ipv6_subnet_{id})
            if (preg_match('/^ipv6_subnet_(\d+)$/', $key, $matches)) {
                $interfaceId = $matches[1];
                $mode = $data["ipv6_mode_{$interfaceId}"] ?? '0';

                // Validate only if mode is Manual ('2') AND value is not empty
                if ($mode === '2' && !empty($value)) {
                    $subnetInt = (int)$value;
                    if ($subnetInt < 1 || $subnetInt > 128) {
                        $messages[] = 'nw_ValidateIPv6SubnetInvalid';
                    }
                }
                // For Auto ('1') and Off ('0') modes, subnet validation is skipped
            }

            // IPv6 gateway validation (ipv6_gateway_{id}) - optional
            if (preg_match('/^ipv6_gateway_(\d+)$/', $key, $matches) && !empty($value)) {
                if (!filter_var($value, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
                    $messages[] = 'nw_ValidateIPv6GatewayInvalid';
                }
            }

            // IPv6 Primary DNS validation (primarydns6_{id}) - optional
            if (preg_match('/^primarydns6_(\d+)$/', $key, $matches) && !empty($value)) {
                if (!filter_var($value, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
                    $messages[] = 'nw_ValidateIPv6PrimaryDnsInvalid';
                }
            }

            // IPv6 Secondary DNS validation (secondarydns6_{id}) - optional
            if (preg_match('/^secondarydns6_(\d+)$/', $key, $matches) && !empty($value)) {
                if (!filter_var($value, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
                    $messages[] = 'nw_ValidateIPv6SecondaryDnsInvalid';
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
     * Saves the LAN interface configurations
     *
     * @param array<string, mixed> $data Array containing the interface configurations
     * @return array{0: bool, 1: array<int, string>} Returns an array with a boolean success flag and an array of error messages if applicable
     */
    private static function saveLanInterfaces(array $data): array
    {
        $networkInterfaces = LanInterfaces::find();
        $messages = [];
        $isDocker = System::isDocker();

        // WHY: In Docker mode, auto-detect internet interface if not provided
        // Docker has single managed interface, so we use the first/only interface as internet interface
        if ($isDocker && !isset($data['internet_interface'])) {
            $internetInterface = LanInterfaces::findFirst(['conditions' => 'internet = 1']);
            if ($internetInterface) {
                $data['internet_interface'] = (string)$internetInterface->id;
            } else {
                // Fallback: use first interface if no internet interface marked
                $firstInterface = $networkInterfaces->getFirst();
                if ($firstInterface !== false) {
                    $data['internet_interface'] = (string)$firstInterface->id;
                }
            }
        }

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
                SystemMessages::sysLogMsg(
                    'SaveConfigAction',
                    "DELETE interface: id={$eth->id}, name={$eth->name}, interface={$eth->interface}, vlanid={$eth->vlanid}",
                    LOG_WARNING
                );
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

            SystemMessages::sysLogMsg(
                'SaveConfigAction',
                "UPDATE interface: id={$eth->id}, name={$eth->name}, interface={$eth->interface}, vlanid={$eth->vlanid}, dhcp={$eth->dhcp}",
                LOG_INFO
            );

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

            SystemMessages::sysLogMsg(
                'SaveConfigAction',
                "CREATE interface: name={$eth->name}, interface={$eth->interface}, vlanid={$eth->vlanid}, dhcp={$eth->dhcp}, ipaddr={$eth->ipaddr}",
                LOG_WARNING
            );

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
     * @param array<string, mixed> $data post data
     * @param bool $isDocker
     */
    private static function fillEthStructure(LanInterfaces $eth, array $data, bool $isDocker): void
    {
        // Get model column names
        $metaData = $eth->getModelsMetaData();
        $attributes = $metaData->getAttributes($eth);

        foreach ($attributes as $name) {
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
                    // WHY: Save gateway/DNS for ALL interfaces, not just internet interface
                    // Multi-homed servers need gateway on each interface for proper routing
                    // Static IP interfaces (dhcp=0) require gateway for any outbound traffic
                    $fieldKey = $name . '_' . $eth->id;
                    if (array_key_exists($fieldKey, $data)) {
                        $eth->$name = $data[$fieldKey];
                    }
                    break;

                case 'hostname':
                case 'domain':
                    // WHY: Global hostname/domain now stored in internet interface only
                    // These are system-wide settings that define how the system identifies itself
                    if ($itIsInternetInterface) {
                        $fieldKey = $name . '_' . $eth->id;
                        $eth->$name = array_key_exists($fieldKey, $data) ? $data[$fieldKey] : '';
                    } else {
                        $eth->$name = '';
                    }
                    break;

                // IPv6 fields (Phase 3)
                case 'ipv6_mode':
                    // Save IPv6 mode
                    $fieldKey = $name . '_' . $eth->id;
                    if (array_key_exists($fieldKey, $data)) {
                        $eth->$name = $data[$fieldKey] ?? '0';
                    }
                    break;

                case 'ipv6addr':
                case 'ipv6_gateway':
                    // Save IPv6 address fields (optional for Auto mode)
                    // WHY: Clear IPv6 fields when IPv6 is disabled to prevent stale data
                    $fieldKey = $name . '_' . $eth->id;
                    $modeKey = 'ipv6_mode_' . $eth->id;
                    $mode = $data[$modeKey] ?? '0';

                    // Clear IPv6 fields when IPv6 is disabled (mode='0')
                    if ($mode === '0') {
                        $eth->$name = '';
                    } elseif (array_key_exists($fieldKey, $data)) {
                        $eth->$name = $data[$fieldKey] ?? '';
                    }
                    break;

                case 'ipv6_subnet':
                    // Save IPv6 subnet with default for Auto mode
                    // WHY: Clear subnet when IPv6 is disabled to ensure complete IPv6 cleanup
                    $fieldKey = $name . '_' . $eth->id;
                    $modeKey = 'ipv6_mode_' . $eth->id;
                    $mode = $data[$modeKey] ?? '0';

                    // Clear IPv6 subnet when IPv6 is disabled (mode='0')
                    if ($mode === '0') {
                        $eth->$name = '';
                    } elseif (array_key_exists($fieldKey, $data)) {
                        $value = $data[$fieldKey] ?? '';

                        // For Auto mode (SLAAC/DHCPv6), set default subnet if empty
                        if ($mode === '1' && empty($value)) {
                            $eth->$name = '64';
                        } else {
                            $eth->$name = $value;
                        }
                    }
                    break;

                // IPv6 DNS fields (Phase 6)
                case 'primarydns6':
                case 'secondarydns6':
                    // Save IPv6 DNS configuration for internet interface only
                    // WHY: Clear IPv6 DNS when IPv6 is disabled to prevent stale data
                    $modeKey = 'ipv6_mode_' . $eth->id;
                    // WHY: Use current DB value if ipv6_mode not provided (PATCH support)
                    $mode = $data[$modeKey] ?? $eth->ipv6_mode ?? '0';

                    if ($itIsInternetInterface) {
                        // Clear IPv6 DNS when IPv6 is disabled (mode='0')
                        if ($mode === '0') {
                            $eth->$name = '';
                        } else {
                            $fieldKey = $name . '_' . $eth->id;
                            $eth->$name = array_key_exists($fieldKey, $data) ? $data[$fieldKey] : '';
                        }
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
     * @param array<string, mixed> $data Associative array where keys are setting names and values are the new settings to be saved
     * @return array{0: bool, 1: array<int, string>} Returns an array with a boolean success flag and, if unsuccessful, an array of error messages
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
                    PbxSettings::setValueByKey(PbxSettings::EXTERNAL_SIP_PORT, trim($value), $messages);
                    break;

                case PbxSettings::EXTERNAL_TLS_PORT:
                    if (empty($value)) {
                        $value = PbxSettings::getValueByKey(PbxSettings::TLS_PORT);
                    }
                    PbxSettings::setValueByKey(PbxSettings::EXTERNAL_TLS_PORT, trim($value), $messages);
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
     * @param array<string, mixed> $data Configuration data containing staticRoutes array
     * @return array{0: bool, 1: array<int, string>} Returns [bool $success, array $messages]
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