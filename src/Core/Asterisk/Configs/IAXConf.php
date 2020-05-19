<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

namespace MikoPBX\Core\Asterisk\Configs;

use MikoPBX\Common\Models\{Iax, IaxCodecs};
use MikoPBX\Modules\Config\ConfigClass;
use MikoPBX\Core\System\{MikoPBXConfig, Util};

class IAXConf extends ConfigClass
{
    public const TYPE_IAX2 = 'IAX2';
    protected $data_providers;
    protected $description = 'iax.conf';

    /**
     * Перезапуск модуля IAX2;
     */
    public static function iaxReload(): array
    {
        $result = [
            'result' => 'ERROR',
        ];
        $iax    = new self();
        $iax->generateConfig();
        Util::mwExec("asterisk -rx 'iax2 reload'");
        $result['result'] = 'Success';

        return $result;
    }

    /**
     * Получение статусов регистраций IAX.
     */
    public static function getRegistry(): array
    {
        $result = [
            'result' => 'ERROR',
        ];
        $peers  = [];
        // First select disabled providers
        $disabledProviders = Iax::find();
        foreach ($disabledProviders as $provider) {
            $peers[] = [
                'state'      => 'OFF',
                'id'         => $provider->uniqid,
                'username'   => trim($provider->username),
                'host'       => trim($provider->host),
                'noregister' => $provider->noregister,
            ];
        }

        if (Iax::findFirst("disabled = '0'") !== null) {
            // Find them over AMI
            $am       = Util::getAstManager('off');
            $amiRegs  = $am->IAXregistry(); // Registrations
            $amiPeers = $am->IAXpeerlist(); // Peers
            $am->Logoff();
            foreach ($amiPeers as $amiPeer) {
                $key = array_search($amiPeer['ObjectName'], array_column($peers, 'id'), true);
                if ($key !== false) {
                    $currentPeer = &$peers[$key];
                    if ($currentPeer['noregister'] === '1') {
                        // Пир без регистрации.
                        $arr_status                   = explode(' ', $amiPeer['Status']);
                        $currentPeer['state']         = strtoupper($arr_status[0]);
                        $currentPeer['time-response'] = strtoupper(str_replace(['(', ')'], '', $arr_status[1]));
                    } else {
                        $currentPeer['state'] = 'Error register.';
                        // Parse active registrations
                        foreach ($amiRegs as $reg) {
                            if (
                                strcasecmp($reg['Addr'], $currentPeer['host']) === 0
                                && strcasecmp($reg['Username'], $currentPeer['username']) === 0
                            ) {
                                $currentPeer['state'] = $reg['State'];
                                break;
                            }
                        }
                    }
                }
            }
        }

        $result['data']   = $peers;
        $result['result'] = 'Success';

        return $result;
    }

    /**
     * Получение настроек.
     */
    public function getSettings(): void
    {
        // Настройки для текущего класса.
        $this->getProviders();
    }

    /**
     * Получение данных по IAX2 провайдерам.
     */
    private function getProviders(): void
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
    public function extensionGenContexts(): string
    {
        $conf = '';
        foreach ($this->data_providers as $provider) {
            $conf .= ExtensionsConf::generateIncomingContextPeers($provider['uniqid']);
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
     *
     * @return void
     */
    protected function generateConfigProtected():void
    {
        $conf = '';
        $conf .= $this->generateGeneral();
        $conf .= $this->generateProviders();

        Util::fileWriteContent($this->astConfDir . '/iax.conf', $conf);
        file_put_contents($this->astConfDir . '/iaxprov.conf', "[default]\ncodec=alaw\n");
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

        $lang = str_replace('_', '-', strtolower($this->generalSettings['PBXLanguage']));
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

        return $reg_strings . "\n" . $prov_config;
    }

}
