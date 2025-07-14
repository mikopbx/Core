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

namespace MikoPBX\Core\Asterisk\Configs;

use MikoPBX\Common\Models\Codecs;
use MikoPBX\Common\Models\Iax;
use MikoPBX\Common\Models\NetworkFilters;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\Asterisk\Configs\Generators\Extensions\IncomingContexts;
use MikoPBX\Core\System\Directories;
use MikoPBX\Core\System\Util;

/**
 * Class IAXConf
 *
 * Represents a configuration class for IAX.
 *
 * @package MikoPBX\Core\Asterisk\Configs
 */
class IAXConf extends AsteriskConfigClass
{
    // The module hook applying priority
    public int $priority = 600;
    public const string TYPE_IAX2 = 'IAX2';
    protected string $description = 'iax.conf';

    /**
     * Generates the contexts for extensions.
     *
     * @return string The generated contexts.
     */
    public function extensionGenContexts(): string
    {
        $conf      = '';
        $providers = $this->getProviders();
        foreach ($providers as $provider) {
            $conf .= IncomingContexts::generate($provider['uniqid']);
        }

        return $conf;
    }

    /**
     * Generates the configuration for the iax.conf file.
     *
     * @return void
     */
    protected function generateConfigProtected(): void
    {
        $conf = $this->generateGeneral();
        $conf .= $this->generateProviders();

        // Write the configuration content to the file
        $this->saveConfig($conf, $this->description);
    }

    /**
     * Generates the [general] section in iax.conf.
     *
     * @return string The generated [general] section.
     */
    private function generateGeneral(): string
    {
        $iax_port = PbxSettings::getValueByKey(PbxSettings::IAX_PORT);
        $conf     = '[general]' . PHP_EOL;
        $conf .= "bindport=$iax_port" . PHP_EOL;
        $conf .= "bindaddr=0.0.0.0" . PHP_EOL;
        $conf .= "delayreject=yes" . PHP_EOL;
        $conf .= "iaxthreadcount=100" . PHP_EOL;
        $conf .= "iaxmaxthreadcount=200" . PHP_EOL;
        $conf .= "jitterbuffer=no" . PHP_EOL;
        $conf .= "forcejitterbuffer=no" . PHP_EOL;
        
        // In Docker environment, include dynamic fail2ban ACL and network filters
        if (Util::isDocker()) {
            $asteriskEtcDir = Directories::getDir(Directories::AST_ETC_DIR);
            $conf .= PHP_EOL . "; Fail2ban dynamic ACL for Docker" . PHP_EOL;
            $conf .= "#tryinclude $asteriskEtcDir/fail2ban_iax_deny.conf" . PHP_EOL;
            $conf .= PHP_EOL . "; NetworkFilters deny ACL for Docker" . PHP_EOL;
            $conf .= "#tryinclude $asteriskEtcDir/network_filters_deny_iax_acl.conf" . PHP_EOL;
        }
        
        $conf .= PHP_EOL;
        return $conf;
    }

    /**
     * Generates the provider sections in iax.conf.
     *
     * @return string The generated provider sections.
     */
    private function generateProviders(): string
    {
        $reg_strings = '';
        $prov_config = '';

        $lang      = str_replace('_', '-', strtolower(PbxSettings::getValueByKey(PbxSettings::PBX_LANGUAGE)));
        $providers = $this->getProviders();
        foreach ($providers as $provider) {
            $manual_attributes = Util::parseIniSettings($provider['manualattributes']);
            
            // Set registration type from DB or use legacy noregister field
            $registrationType = $provider['registration_type'] ?? '';
            if (empty($registrationType)) {
                // Legacy support: if registration_type is not set, use noregister field
                $registrationType = ($provider['noregister'] === '0') ? Iax::REGISTRATION_TYPE_OUTBOUND : Iax::REGISTRATION_TYPE_NONE;
            }
            
            // Base options for all types
            $options = [
                'type' => 'friend',
                'auth' => 'plaintext',
                'context' => "{$provider['uniqid']}-incoming",
                'language' => $lang,
                'qualify' => 2000,
                'transfer' => 'mediaonly',
                'disallow' => 'all',
                'username' => $provider['username'],
                'trunk' => 'yes'
            ];
            
            // Add secret only if authentication is required
            if ($provider['receive_calls_without_auth'] !== '1') {
                $options['secret'] = $provider['secret'];
            }
            
            // Configure based on registration type
            switch ($registrationType) {
                case Iax::REGISTRATION_TYPE_INBOUND:
                    // For incoming connections, set host to the provider's IP
                    [$host, ] = explode(':', $provider['host'] . ':');
                    $options['host'] = $host;
                    // Port is not used for inbound connections
                    
                    // In Docker environment, add fail2ban ACL reference
                    if (Util::isDocker()) {
                        // IAX doesn't support multiple ACLs like PJSIP, so we need to use permit/deny
                        // The fail2ban_iax_dynamic_acl.conf will be included in the general section
                    }
                    
                    // Override username to use uniqid for incoming auth
                    $options['username'] = $provider['uniqid'];
                    break;
                    
                case Iax::REGISTRATION_TYPE_NONE:
                    // No registration, static host
                    [$host, $port] = explode(':', $provider['host'] . ':');
                    $options['host'] = $host;
                    if (!empty($port)) {
                        $options['port'] = $port;
                    }
                    break;
                    
                case Iax::REGISTRATION_TYPE_OUTBOUND:
                default:
                    // For outbound registration, keep dynamic host
                    $options['host'] = 'dynamic';
                    
                    // Formulate the registration string
                    $user   = $provider['username'];
                    $secret = (trim($provider['secret']) === '') ? '' : ":{$provider['secret']}";
                    [$host, $port] = explode(':', $provider['host'] . ':');
                    if (!empty($port)) {
                        $port = ":$port";
                    } else {
                        $port = '';
                    }
                    $reg_strings .= "register => $user$secret@$host$port " . PHP_EOL;
                    break;
            }
            
            // Add network filter permits to options
            if (!empty($provider['networkfilterid'])) {
                $networkFilter = NetworkFilters::findFirstById($provider['networkfilterid']);
                if ($networkFilter) {
                    $permit = trim($networkFilter->permit);
                    if (!empty($permit)) {
                        $permits = array_map('trim', explode(',', $permit));
                        // Add deny all first, then specific permits
                        $options['deny'] = '0.0.0.0/0.0.0.0';
                        $options['permit'] = implode('&', $permits);
                    }
                    
                    // In Docker environment, NetworkFilters deny rules are handled globally
                    // via included ACL files, so we don't need to add deny rules here
                }
            }
            
            // Generate provider configuration
            $prov_config .= "[{$provider['uniqid']}];" . PHP_EOL;
            foreach ($provider['codecs'] as $codec) {
                $prov_config .= "allow=$codec" . PHP_EOL;
            }
            $prov_config .= "setvar=contextID={$provider['uniqid']}-incoming" . PHP_EOL;
            
            // Apply manual attributes override
            $prov_config .= Util::overrideConfigurationArray($options, $manual_attributes, ' ');
            $prov_config .= PHP_EOL;
        }

        return $reg_strings . PHP_EOL . $prov_config;
    }

    /**
     * Retrieves data for IAX2 providers.
     *
     * @return array The provider data.
     */
    private function getProviders(): array
    {
        $data_providers = [];
        // Получим настройки всех аккаунтов.
        $arrIaxProviders = Iax::find("disabled IS NULL OR disabled = '0'");
        foreach ($arrIaxProviders as $peer) {
            /** @var Iax $peer */
            $arr_data = $peer->toArray();
            
            // Add related network filter data if exists
            if (!empty($peer->networkfilterid) && $peer->NetworkFilters) {
                $arr_data['networkfilter'] = $peer->NetworkFilters->toArray();
            }
            
            $arr_data['codecs'] = [];
            $filter             = [
                'conditions' => 'disabled="0"',
                'order'      => 'type, priority',
            ];
            $codecs  = Codecs::find($filter);
            foreach ($codecs as $ob_codec) {
                $arr_data['codecs'][] = $ob_codec->name;
            }
            $data_providers[] = $arr_data;
        }
        return $data_providers;
    }
}
