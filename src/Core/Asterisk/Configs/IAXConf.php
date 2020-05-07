<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */
namespace MikoPBX\Core\Asterisk\Configs;

use MikoPBX\Core\System\{MikoPBXConfig, Util};
use MikoPBX\Common\Models\{Iax, IaxCodecs};

class IAXConf extends ConfigClass
{
    protected $data_providers;
    protected $description = 'iax.conf';

    /**
     * Перезапуск модуля IAX2;
     */
    static function iaxReload()
    {
        $result = [
            'result' => 'ERROR',
        ];
        $config = new MikoPBXConfig();
        $arr_gs = $config->getGeneralSettings();
        $iax    = new IAXConf();
        $iax->generateConfig($arr_gs);

        Util::mwExec("asterisk -rx 'iax2 reload'");
        $result['result'] = 'Success';

        return $result;
    }

    /**
     * Получение статусов регистраций IAX.
     */
    static function getRegistry()
    {
        $result = [
            'result' => 'ERROR',
        ];
        $am     = Util::getAstManager('off');
        $regs   = $am->IAXregistry();
        $peers  = $am->IAXpeerlist();

        $providers = Iax::find();
        foreach ($providers as $provider) {
            if ($provider->disabled == 1) {
                // Этого пира нет среди $peers.
                $peers[] = [
                    'state'    => 'OFF',
                    'id'       => $provider->uniqid,
                    'username' => trim($provider->username),
                    'host'     => trim($provider->host),
                ];
                continue;
            }

            foreach ($peers as &$peer) {
                if ($peer['ObjectName'] != $provider->uniqid) {
                    continue;
                }
                $peer['id'] = $provider->uniqid;
                if ($provider->noregister == 1) {
                    // Пир без регистрации.
                    $arr_status            = explode(' ', $peer['Status']);
                    $peer['state']         = strtoupper($arr_status[0]);
                    $peer['time-response'] = strtoupper(str_replace(['(', ')'], '', $arr_status[1]));
                } else {
                    $peer['state'] = 'Error register.';
                    // Анализируем активные регистрации.
                    foreach ($regs as $reg) {
                        if ($reg['Addr'] != trim($provider->host) || $reg['Username'] != trim($provider->username)) {
                            continue;
                        }
                        $peer['state'] = $reg['State'];
                        break;
                    }
                }
                unset($peer['ObjectName']);
                unset($peer['Status']);
                unset($peer['Event']);
                unset($peer['Channeltype']);

                if ( ! isset($peer['state'])) {
                    $peer['state'] = '';
                }
            }

        }
        $am->Logoff();
        $result['data']   = $peers;
        $result['result'] = 'Success';

        return $result;
    }

    /**
     * Получение настроек.
     */
    public function getSettings()
    {
        // Настройки для текущего класса.
        $this->getProviders();
    }

    /**
     * Получение данных по IAX2 провайдерам.
     */
    private function getProviders()
    {
        // Получим настройки всех аккаунтов.
        $this->data_providers = [];
        $db_data              = Iax::find("disabled IS NULL OR disabled = '0'");
        foreach ($db_data as $peer) {
            /** @var \MikoPBX\Common\Models\Iax $peer */
            $arr_data = $peer->toArray();

            // $network_filter = NetworkFilters::findFirst($peer->networkfilterid);
            // $arr_data['permit'] = ($network_filter==null)?'':$network_filter->permit;
            // $arr_data['deny']   = ($network_filter==null)?'':$network_filter->deny;

            $arr_data['codecs'] = [];
            $filter             = [
                "iaxuid=:id:",
                'bind'  => ['id' => $peer->uniqid],
                'order' => 'priority',
            ];
            $codecs             = IaxCodecs::find($filter);
            foreach ($codecs as $ob_codec) {
                $arr_data['codecs'][] = $ob_codec->codec;
            }

            $this->data_providers[] = $arr_data;
        }

    }

    /**
     * Описываем контексты.
     *
     * @return string
     */
    public function extensionGenContexts()
    {
        $conf = '';
        foreach ($this->data_providers as $provider) {
            $conf .= Extensions::generateIncomingContextPeers($provider['uniqid']);
        }

        return $conf;
    }

    /**
     * Генератор extension для контекста outgoing.
     *
     * @param string $id
     *
     * @return string|null
     */
    public function getTechByID($id): string
    {
        // Генерация исходящего номерного плана.
        $technology = '';
        foreach ($this->data_providers as $peer) {
            if ($peer['uniqid'] != $id) {
                continue;
            }
            $technology = 'IAX2';
            break;
        }

        return $technology;
    }

    /**
     * Генератор iax.conf
     *
     * @param $general_settings
     *
     * @return bool|void
     */
    protected function generateConfigProtected($general_settings)
    {
        $conf = '';
        $conf .= $this->generateGeneral($general_settings);
        $conf .= $this->generateProviders($general_settings);

        Util::fileWriteContent($this->astConfDir . '/iax.conf', $conf);
        file_put_contents($this->astConfDir . '/iaxprov.conf', "[default]\ncodec=ulaw\n");
    }

    /**
     * Генератора секции general iax.conf
     *
     * @param $general_settings
     *
     * @return string
     */
    private function generateGeneral($general_settings)
    {
        $iax_port = (trim($general_settings['IAXPort']) != '') ? $general_settings['IAXPort'] : '4569';
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
     * @param $general_settings
     *
     * @return string
     */
    private function generateProviders($general_settings)
    {
        $reg_strings = '';
        $prov_config = '';

        $lang = str_replace('_', '-', strtolower($general_settings['PBXLanguage']));
        foreach ($this->data_providers as $provider) {
            $prov_config .= "[{$provider['uniqid']}];\n";
            $prov_config .= "type=friend\n";
            $prov_config .= "auth=plaintext\n";
            $prov_config .= "context={$provider['uniqid']}-incoming \n";
            $prov_config .= "language={$lang}\n";
            $prov_config .= "qualify=2000\n";
            $prov_config .= "transfer=mediaonly\n";
            $prov_config .= "disallow=all\n";
            $prov_config .= ";username={$provider['username']}\n";
            // $prov_config .= "host={$provider['host']}\n";
            $prov_config .= "host=dynamic\n";
            $prov_config .= "trunk=yes\n";

            $prov_config .= "secret={$provider['secret']}\n";
            foreach ($provider['codecs'] as $codec) {
                $prov_config .= "allow={$codec}\n";
            }
            $prov_config .= "\n";

            /*
            $deny         = (trim($provider['deny'])=='')?'':'deny='.$provider['deny']."\n";
            $permit       = (trim($provider['permit'])=='')?'':'permit='.$provider['permit']."\n";
            $prov_config .= "$deny";
            $prov_config .= "$permit";
            // */

            // Формируем строку регистрации.
            if ($provider['noregister'] == 0) {
                // Регистрация нужна только в том случае, если текущий хост имеет динаимческий ip.
                $user   = $provider['username'];
                $secret = (trim($provider['secret']) == '') ? '' : ":{$provider['secret']}";
                $host   = $provider['host'];
                // $port	   = (trim($provider['port']) =='')?'':":{$provider['port']}";
                $port        = '';
                $reg_strings .= "register => {$user}{$secret}@{$host}{$port} \n";
            }

        }

        $conf = $reg_strings . "\n" . $prov_config;

        return $conf;
    }

}
