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

namespace MikoPBX\Common\Models;

use MikoPBX\Core\Utilities\IpAddressHelper;
use Phalcon\Filter\Validation;
use Phalcon\Filter\Validation\Validator\Uniqueness as UniquenessValidator;
use Phalcon\Filter\Validation\Validator\Callback as CallbackValidator;

/**
 * Class NetworkStaticRoutes
 *
 * Model for storing static network routes configuration.
 * Routes are applied when there are multiple network interfaces.
 *
 * @package MikoPBX\Common\Models
 */
class NetworkStaticRoutes extends ModelsBase
{
    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public int|string|null $id;

    /**
     * Network address (e.g., 192.168.10.0)
     *
     * @Column(type="string", nullable=false)
     */
    public ?string $network = '';

    /**
     * Subnet mask in CIDR notation (0-32 for IPv4, 0-128 for IPv6)
     *
     * @Column(type="string", nullable=false)
     */
    public ?string $subnet = '24';

    /**
     * Gateway IP address (e.g., 192.168.1.1)
     *
     * @Column(type="string", nullable=false)
     */
    public ?string $gateway = '';

    /**
     * Network interface name (e.g., eth0, vlan100)
     * Empty string means automatic selection by kernel
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $interface = '';

    /**
     * Route description/comment
     * User-provided explanation for this route
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $description = '';

    /**
     * Priority (used for ordering)
     *
     * @Column(type="integer", nullable=false)
     */
    public ?int $priority = 0;

    /**
     * Initialize the model.
     */
    public function initialize(): void
    {
        $this->setSource('m_NetworkStaticRoutes');
        parent::initialize();
    }

    /**
     * Perform validation on the model.
     *
     * @return bool Whether the validation was successful or not.
     */
    public function validation(): bool
    {
        $validation = new Validation();

        // Unique network+subnet combination
        $validation->add(
            ['network', 'subnet'],
            new UniquenessValidator(
                [
                    'message' => $this->t('mo_ThisNetworkRouteAlreadyExists'),
                ]
            )
        );

        // Validate network address
        $validation->add(
            'network',
            new CallbackValidator(
                [
                    'callback' => function () {
                        return $this->validateIpField($this->network);
                    },
                    'message' => $this->t('mo_InvalidNetworkAddress'),
                ]
            )
        );

        // Validate gateway address
        $validation->add(
            'gateway',
            new CallbackValidator(
                [
                    'callback' => function () {
                        return $this->validateIpField($this->gateway);
                    },
                    'message' => $this->t('mo_InvalidGatewayAddress'),
                ]
            )
        );

        // Validate that gateway and network have matching IP versions
        $validation->add(
            'gateway',
            new CallbackValidator(
                [
                    'callback' => function () {
                        return $this->validateGatewayMatchesNetwork($this->network, $this->gateway);
                    },
                    'message' => $this->t('mo_GatewayIpVersionMismatch'),
                ]
            )
        );

        // Validate subnet mask (CIDR notation: 0-32)
        $validation->add(
            'subnet',
            new CallbackValidator(
                [
                    'callback' => function () {
                        return $this->validateSubnetField($this->subnet);
                    },
                    'message' => $this->t('mo_InvalidSubnetMask'),
                ]
            )
        );

        return $this->validate($validation);
    }

    /**
     * Validates an IP address field (allows empty)
     *
     * @param string|null $value IP address to validate
     * @return bool True if valid or empty, false otherwise
     */
    private function validateIpField(?string $value): bool
    {
        // Empty values are not allowed for static routes
        if (empty($value)) {
            return false;
        }

        return filter_var($value, FILTER_VALIDATE_IP) !== false;
    }

    /**
     * Validates a subnet mask field in CIDR notation (0-32 for IPv4, 0-128 for IPv6)
     *
     * @param string|null $value Subnet mask to validate
     * @return bool True if valid, false otherwise
     */
    private function validateSubnetField(?string $value): bool
    {
        // Empty values are not allowed
        if (empty($value) && $value !== '0') {
            return false;
        }

        // Check if it's a number
        if (!ctype_digit($value)) {
            return false;
        }

        $intValue = (int)$value;

        // Network address is required for CIDR validation
        if (empty($this->network)) {
            // Cannot validate CIDR without knowing IP version
            // Reject to prevent inconsistent data
            return false;
        }

        // Use IpAddressHelper to validate subnet for the specific IP version
        return IpAddressHelper::isValidSubnet($this->network, $intValue);
    }

    /**
     * Validates that gateway and network have matching IP versions
     *
     * @param string|null $network Network address
     * @param string|null $gateway Gateway address
     * @return bool True if IP versions match or either is empty, false otherwise
     */
    private function validateGatewayMatchesNetwork(?string $network, ?string $gateway): bool
    {
        // Empty values are allowed (validation happens elsewhere)
        if (empty($network) || empty($gateway)) {
            return true;
        }

        $networkVersion = IpAddressHelper::getIpVersion($network);
        $gatewayVersion = IpAddressHelper::getIpVersion($gateway);

        // Both must be valid IPs
        if ($networkVersion === false || $gatewayVersion === false) {
            return true; // Let other validators handle invalid IPs
        }

        // Versions must match
        return $networkVersion === $gatewayVersion;
    }
}
