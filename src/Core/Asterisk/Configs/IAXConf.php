<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2023 Alexey Portnov and Nikolay Beketov
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
use MikoPBX\Core\Asterisk\Configs\Generators\Extensions\IncomingContexts;
use MikoPBX\Core\System\Util;

class IAXConf extends AsteriskConfigClass
{
    // The module hook applying priority
    public int $priority = 600;

    public const TYPE_IAX2 = 'IAX2';

    protected string $description = 'iax.conf';

    /**
     * Описываем контексты.
     *
     * @return string
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
     * Генератор iax.conf
     *
     *
     * @return void
     */
    protected function generateConfigProtected(): void
    {
        $conf = '';
        $conf .= $this->generateGeneral();
        $conf .= $this->generateProviders();

        Util::fileWriteContent($this->config->path('asterisk.astetcdir') . '/iax.conf', $conf);
        file_put_contents($this->config->path('asterisk.astetcdir') . '/iaxprov.conf', "[default]\ncodec=alaw\n");
    }

    /**
     * Генератора секции general iax.conf
     *
     *
     * @return string
     */
    private function generateGeneral(): string
    {
        $iax_port = (trim($this->generalSettings['IAXPort']) !== '') ? $this->generalSettings['IAXPort'] : '4569';
        $conf     = '[general]' . "\n";
        // $conf .= "context=public-direct-dial \n";
        $conf .= "bindport={$iax_port}\n";
        $conf .= "bindaddr=0.0.0.0\n";
        $conf .= "delayreject=yes\n";
        $conf .= "iaxthreadcount=100\n";
        $conf .= "iaxmaxthreadcount=200\n";
        $conf .= "jitterbuffer=no\n";
        $conf .= "forcejitterbuffer=no\n\n";

        return $conf;
    }

    /**
     * Генератор секции провайдеров в iax.conf
     *
     *
     * @return string
     */
    private function generateProviders(): string
    {
        $reg_strings = '';
        $prov_config = '';

        $lang      = str_replace('_', '-', strtolower($this->generalSettings['PBXLanguage']));
        $providers = $this->getProviders();
        foreach ($providers as $provider) {
            $prov_config .= "[{$provider['uniqid']}];\n";
            $prov_config .= "type=friend\n";
            $prov_config .= "auth=md5\n";
            $prov_config .= "context={$provider['uniqid']}-incoming \n";
            $prov_config .= "language={$lang}\n";
            $prov_config .= "qualify=2000\n";
            $prov_config .= "transfer=mediaonly\n";
            $prov_config .= "disallow=all\n";
            $prov_config .= ";username={$provider['username']}\n";
            $prov_config .= "host=dynamic\n";
            $prov_config .= "trunk=yes\n";

            $prov_config .= "secret={$provider['secret']}\n";
            foreach ($provider['codecs'] as $codec) {
                $prov_config .= "allow={$codec}\n";
            }
            $prov_config .= "setvar=contextID={$provider['uniqid']}-incoming".PHP_EOL;
            $prov_config .= "\n";

            // Формируем строку регистрации.
            if ($provider['noregister'] == 0) {
                // Регистрация нужна только в том случае, если текущий хост имеет динаимческий ip.
                $user   = $provider['username'];
                $secret = (trim($provider['secret']) == '') ? '' : ":{$provider['secret']}";
                $host   = $provider['host'];
                $port        = '';
                $reg_strings .= "register => {$user}{$secret}@{$host}{$port} \n";
            }
        }

        return $reg_strings . "\n" . $prov_config;
    }

    /**
     * Получение данных по IAX2 провайдерам.
     */
    private function getProviders(): array
    {
        $data_providers = [];
        // Получим настройки всех аккаунтов.
        $arrIaxProviders = Iax::find("disabled IS NULL OR disabled = '0'");
        foreach ($arrIaxProviders as $peer) {
            /** @var \MikoPBX\Common\Models\Iax $peer */
            $arr_data = $peer->toArray();

            // $network_filter = NetworkFilters::findFirst($peer->networkfilterid);
            // $arr_data['permit'] = ($network_filter==null)?'':$network_filter->permit;
            // $arr_data['deny']   = ($network_filter==null)?'':$network_filter->deny;

            $arr_data['codecs'] = [];
            $filter             = [
                'conditions' => 'disabled="0"',
                'order'      => 'type, priority',
            ];
            $codecs             = Codecs::find($filter);
            foreach ($codecs as $ob_codec) {
                $arr_data['codecs'][] = $ob_codec->name;
            }
            $data_providers[] = $arr_data;
        }

        return $data_providers;
    }

}
