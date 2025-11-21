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

use MikoPBX\Core\Utilities\IpAddressHelper;
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
    public int|string|null $id;

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
     * IPv6 configuration mode
     * 0 = Off, 1 = Auto (SLAAC/DHCPv6), 2 = Manual (static)
     *
     * @Column(type="string", length=1, nullable=false)
     */
    public ?string $ipv6_mode = '0';

    /**
     * IPv6 address
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $ipv6addr = '';

    /**
     * IPv6 subnet prefix length (1-128)
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $ipv6_subnet = '';

    /**
     * IPv6 gateway
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $ipv6_gateway = '';

    /**
     * Primary IPv6 DNS server
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $primarydns6 = '';

    /**
     * Secondary IPv6 DNS server
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $secondarydns6 = '';

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

        $validation->add(
            'primarydns6',
            new CallbackValidator(
                [
                    'callback' => function () {
                        return $this->validateIpv6DnsField($this->primarydns6);
                    },
                    'message' => $this->t('mo_InvalidPrimaryDnsIpv6Address'),
                ]
            )
        );

        $validation->add(
            'secondarydns6',
            new CallbackValidator(
                [
                    'callback' => function () {
                        return $this->validateIpv6DnsField($this->secondarydns6);
                    },
                    'message' => $this->t('mo_InvalidSecondaryDnsIpv6Address'),
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

        // Validate IPv6 mode
        $validation->add(
            'ipv6_mode',
            new CallbackValidator(
                [
                    'callback' => function () {
                        return $this->validateIpv6Mode($this->ipv6_mode);
                    },
                    'message' => $this->t('mo_InvalidIpv6Mode'),
                ]
            )
        );

        // Validate IPv6 address (required when mode is manual)
        $validation->add(
            'ipv6addr',
            new CallbackValidator(
                [
                    'callback' => function () {
                        return $this->validateIpv6Address($this->ipv6addr, $this->ipv6_mode);
                    },
                    'message' => $this->t('mo_InvalidIpv6Address'),
                ]
            )
        );

        // Validate IPv6 subnet (required when mode is manual)
        $validation->add(
            'ipv6_subnet',
            new CallbackValidator(
                [
                    'callback' => function () {
                        return $this->validateIpv6Subnet($this->ipv6_subnet, $this->ipv6_mode, $this->ipv6addr);
                    },
                    'message' => $this->t('mo_InvalidIpv6Subnet'),
                ]
            )
        );

        // Validate IPv6 gateway (optional)
        $validation->add(
            'ipv6_gateway',
            new CallbackValidator(
                [
                    'callback' => function () {
                        return $this->validateIpv6Gateway($this->ipv6_gateway);
                    },
                    'message' => $this->t('mo_InvalidIpv6Gateway'),
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
     * Supports both IPv4 (ip:port) and IPv6 ([ip]:port) formats
     *
     * @param string|null $value IP address with optional port (e.g., "192.168.1.1:5060" or "[2001:db8::1]:5060")
     * @return bool True if valid or empty, false otherwise
     */
    private function validateIpWithOptionalPort(?string $value): bool
    {
        // Empty values are allowed
        if (empty($value)) {
            return true;
        }

        // Parse IP and port using helper method
        $parsed = $this->parseIpWithOptionalPort($value);

        if ($parsed === false) {
            return false;
        }

        [$ip, $port] = $parsed;

        // Validate IP
        if (filter_var($ip, FILTER_VALIDATE_IP) === false) {
            return false;
        }

        // Validate port if present (1-65535)
        if ($port !== null) {
            if (!ctype_digit($port) || (int)$port < 1 || (int)$port > 65535) {
                return false;
            }
        }

        return true;
    }

    /**
     * Parses IP address with optional port from string
     * Handles IPv4 (ip:port) and IPv6 ([ip]:port) formats
     *
     * @param string $value IP address with optional port
     * @return array{0: string, 1: string|null}|false Array [ip, port] where port is null if not present, or false on parse error
     */
    private function parseIpWithOptionalPort(string $value): array|false
    {
        return IpAddressHelper::parseIpWithOptionalPort($value);
    }

    /**
     * Validates a hostname field (allows empty)
     *
     * @param string|null $value Hostname to validate
     * @return bool True if valid or empty, false otherwise
     */
    private function validateHostnameField(?string $value): bool
    {
        return IpAddressHelper::validateHostname($value ?? '');
    }

    /**
     * Validates IPv6 mode field
     *
     * @param string|null $value IPv6 mode: '0' (Off), '1' (Auto), '2' (Manual)
     * @return bool True if valid, false otherwise
     */
    private function validateIpv6Mode(?string $value): bool
    {
        return in_array($value, ['0', '1', '2'], true);
    }

    /**
     * Validates IPv6 address field
     * Required when mode is '2' (Manual), optional otherwise
     *
     * @param string|null $value IPv6 address
     * @param string|null $mode IPv6 mode
     * @return bool True if valid, false otherwise
     */
    private function validateIpv6Address(?string $value, ?string $mode): bool
    {
        // If mode is Manual ('2'), address is required
        if ($mode === '2') {
            if (empty($value)) {
                return false;
            }
            return filter_var($value, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) !== false;
        }

        // For other modes (Off or Auto), address is optional
        if (empty($value)) {
            return true;
        }

        // If provided, must be valid IPv6
        return filter_var($value, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) !== false;
    }

    /**
     * Validates IPv6 subnet prefix length
     * Required when mode is '2' (Manual) and address is provided
     *
     * @param string|null $value Subnet prefix length (1-128)
     * @param string|null $mode IPv6 mode
     * @param string|null $address IPv6 address
     * @return bool True if valid, false otherwise
     */
    private function validateIpv6Subnet(?string $value, ?string $mode, ?string $address): bool
    {
        // For Off ('0') and Auto ('1') modes, subnet validation is skipped
        // Auto mode gets subnet from SLAAC/DHCPv6, Off mode doesn't use IPv6
        if ($mode === '0' || $mode === '1') {
            return true;
        }

        // For Manual mode ('2'), validate subnet
        if ($mode === '2') {
            // If address is provided, subnet is required
            if (!empty($address)) {
                if (empty($value)) {
                    return false;
                }

                // Use IpAddressHelper for IPv6 subnet validation
                return IpAddressHelper::isValidSubnet($address, (int)$value);
            }

            // If no address, subnet is optional but must be valid if provided
            if (!empty($value)) {
                $intValue = (int)$value;
                return ($intValue >= 1 && $intValue <= 128);
            }
        }

        return true;
    }

    /**
     * Validates IPv6 gateway field (optional)
     *
     * @param string|null $value IPv6 gateway address
     * @return bool True if valid or empty, false otherwise
     */
    private function validateIpv6Gateway(?string $value): bool
    {
        // Empty values are allowed
        if (empty($value)) {
            return true;
        }

        // Must be valid IPv6 address
        return filter_var($value, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) !== false;
    }

    /**
     * Validates IPv6 DNS server address
     *
     * @param string|null $value IPv6 DNS server address
     * @return bool True if valid IPv6 address or empty, false otherwise
     */
    private function validateIpv6DnsField(?string $value): bool
    {
        // Empty values are allowed (DNS is optional)
        if (empty($value)) {
            return true;
        }

        // Must be valid IPv6 address
        return filter_var($value, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) !== false;
    }

}
