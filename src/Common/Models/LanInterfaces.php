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

namespace MikoPBX\Common\Models;

use Phalcon\Filter\Validation;
use Phalcon\Filter\Validation\Validator\Uniqueness as UniquenessValidator;
use Phalcon\Filter\Validation\Validator\Callback as CallbackValidator;

/**
 * Class LanInterfaces
 *
 * @package MikoPBX\Common\Models
 */
class LanInterfaces extends ModelsBase
{
    public const string TOPOLOGY_PUBLIC = 'public';
    public const string TOPOLOGY_PRIVATE = 'private';

    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * Name of the LAN interface
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $name = '';

    /**
     * Interface system name
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $interface = '';

    /**
     * VLAN ID
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $vlanid = '0';

    /**
     * Subnet
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $subnet = '';

    /**
     * IP address
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $ipaddr = '';

    /**
     * Gateway
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $gateway = '';

    /**
     * Topology
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $topology = '';

    /**
     * External IP address
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $extipaddr = '';

    /**
     * External hostname
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $exthostname = '';

    /**
     * Hostname
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $hostname = '';

    /**
     * Domain name
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $domain = '';

    /**
     * Primary DNS server
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $primarydns = '';

    /**
     * Secondary DNS server
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $secondarydns = '';

    /**
     * DHCP enabled flag
     *
     * @Column(type="string", length=1, nullable=false)
     */
    public ?string $dhcp = '1';

    /**
     * The interface has the Internet connection flag
     *
     * @Column(type="string", length=1, nullable=false)
     */
    public ?string $internet = '0';

    /**
     * Disabled flag
     *
     * @Column(type="string", length=1, nullable=false)
     */
    public ?string $disabled = '0';

    /**
     * Initialize the model.
     */
    public function initialize(): void
    {
        $this->setSource('m_LanInterfaces');
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

        // Unique interface+vlanid combination
        $validation->add(
            ['interface', 'vlanid'],
            new UniquenessValidator(
                [
                    'message' => $this->t('mo_ThisVlanIdNotUniqueForLanInterfacesModels'),
                ]
            )
        );

        // Validate IP address fields
        $validation->add(
            'ipaddr',
            new CallbackValidator(
                [
                    'callback' => function () {
                        return $this->validateIpField($this->ipaddr);
                    },
                    'message' => $this->t('mo_InvalidIpAddress'),
                ]
            )
        );

        $validation->add(
            'extipaddr',
            new CallbackValidator(
                [
                    'callback' => function () {
                        return $this->validateIpWithOptionalPort($this->extipaddr);
                    },
                    'message' => $this->t('mo_InvalidExternalIpAddress'),
                ]
            )
        );

        $validation->add(
            'gateway',
            new CallbackValidator(
                [
                    'callback' => function () {
                        return $this->validateIpField($this->gateway);
                    },
                    'message' => $this->t('mo_InvalidGatewayIpAddress'),
                ]
            )
        );

        $validation->add(
            'primarydns',
            new CallbackValidator(
                [
                    'callback' => function () {
                        return $this->validateIpField($this->primarydns);
                    },
                    'message' => $this->t('mo_InvalidPrimaryDnsIpAddress'),
                ]
            )
        );

        $validation->add(
            'secondarydns',
            new CallbackValidator(
                [
                    'callback' => function () {
                        return $this->validateIpField($this->secondarydns);
                    },
                    'message' => $this->t('mo_InvalidSecondaryDnsIpAddress'),
                ]
            )
        );

        // Validate hostname fields
        $validation->add(
            'hostname',
            new CallbackValidator(
                [
                    'callback' => function () {
                        return $this->validateHostnameField($this->hostname);
                    },
                    'message' => $this->t('mo_InvalidHostname'),
                ]
            )
        );

        $validation->add(
            'exthostname',
            new CallbackValidator(
                [
                    'callback' => function () {
                        return $this->validateHostnameField($this->exthostname);
                    },
                    'message' => $this->t('mo_InvalidExternalHostname'),
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
        // Empty values are allowed
        if (empty($value)) {
            return true;
        }

        return filter_var($value, FILTER_VALIDATE_IP) !== false;
    }

    /**
     * Validates an IP address with optional port
     *
     * @param string|null $value IP address with optional port (e.g., "192.168.1.1:5060")
     * @return bool True if valid or empty, false otherwise
     */
    private function validateIpWithOptionalPort(?string $value): bool
    {
        // Empty values are allowed
        if (empty($value)) {
            return true;
        }

        // Check if there's a port
        if (strpos($value, ':') !== false) {
            $parts = explode(':', $value);
            if (count($parts) !== 2) {
                return false;
            }

            [$ip, $port] = $parts;

            // Validate IP
            if (filter_var($ip, FILTER_VALIDATE_IP) === false) {
                return false;
            }

            // Validate port (1-65535)
            if (!ctype_digit($port) || (int)$port < 1 || (int)$port > 65535) {
                return false;
            }

            return true;
        }

        // No port, just validate IP
        return filter_var($value, FILTER_VALIDATE_IP) !== false;
    }

    /**
     * Validates a hostname field (allows empty)
     *
     * @param string|null $value Hostname to validate
     * @return bool True if valid or empty, false otherwise
     */
    private function validateHostnameField(?string $value): bool
    {
        // Empty values are allowed
        if (empty($value)) {
            return true;
        }

        // Check length (max 253 characters total)
        if (strlen($value) > 253) {
            return false;
        }

        // Split into labels
        $labels = explode('.', $value);

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
}
