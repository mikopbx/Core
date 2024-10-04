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
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\Asterisk\Configs\Generators\Extensions\IncomingContexts;
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
     * Generates the configuration for the iax.conf and iaxprov.conf files.
     *
     * @return void
     */
    protected function generateConfigProtected(): void
    {
        $conf = $this->generateGeneral();
        $conf .= $this->generateProviders();

        // Write the configuration content to the file
        Util::fileWriteContent($this->config->path('asterisk.astetcdir') . '/iax.conf', $conf);
        file_put_contents($this->config->path('asterisk.astetcdir') . '/iaxprov.conf', "[default]\ncodec=alaw\n");
    }

    /**
     * Generates the [general] section in iax.conf.
     *
     * @return string The generated [general] section.
     */
    private function generateGeneral(): string
    {
        $iax_port = $this->generalSettings[PbxSettings::IAX_PORT];
        $conf     = '[general]' . PHP_EOL;
        $conf .= "bindport=$iax_port" . PHP_EOL;
        $conf .= "bindaddr=0.0.0.0" . PHP_EOL;
        $conf .= "delayreject=yes" . PHP_EOL;
        $conf .= "iaxthreadcount=100" . PHP_EOL;
        $conf .= "iaxmaxthreadcount=200" . PHP_EOL;
        $conf .= "jitterbuffer=no" . PHP_EOL;
        $conf .= "forcejitterbuffer=no" . PHP_EOL . PHP_EOL;
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

        $lang      = str_replace('_', '-', strtolower($this->generalSettings[PbxSettings::PBX_LANGUAGE]));
        $providers = $this->getProviders();
        foreach ($providers as $provider) {
            $manual_attributes = Util::parseIniSettings(base64_decode($provider['manualattributes']));
            $options = [
                'type' => 'friend',
                'auth' => 'plaintext',
                'context' => "{$provider['uniqid']}-incoming",
                'language' => $lang,
                'qualify' => 2000,
                'transfer' => 'mediaonly',
                'disallow' => 'all',
                'username' => $provider['username'],
                'trunk' => 'yes',
                'secret' => $provider['secret'],
                'host' => 'dynamic'
            ];
            $prov_config .= "[{$provider['uniqid']}];" . PHP_EOL;
            foreach ($provider['codecs'] as $codec) {
                $prov_config .= "allow=$codec" . PHP_EOL;
            }
            $prov_config .= "setvar=contextID={$provider['uniqid']}-incoming" . PHP_EOL;
            $prov_config .= Util::overrideConfigurationArray($options, $manual_attributes, ' ');
            $prov_config .= PHP_EOL;

            // Formulate the registration string
            if ($provider['noregister'] === '0') {
                // Registration is only required if the current host has a dynamic IP
                $user   = $options['username'];
                $secret = (trim($options['secret']) === '') ? '' : ":{$options['secret']}";
                [$host, $port] = explode(':', $provider['host']);
                if (!empty($port)) {
                    $port = ":$port";
                }
                $reg_strings .= "register => $user$secret@$host$port " . PHP_EOL;
            }
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
