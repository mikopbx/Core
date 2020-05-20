<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 4 2020
 */

namespace MikoPBX\Core\Asterisk\Configs;

use MikoPBX\Common\Models\{ExtensionForwardingRights,
    Extensions as ExtensionsModel,
    NetworkFilters,
    OutgoingRoutingTable,
    Sip,
    SipCodecs,
    Users};
use MikoPBX\Core\Asterisk\AstDB;
use MikoPBX\Modules\Config\ConfigClass;
use MikoPBX\Core\System\{Network, Util};
use MikoPBX\Core\Utilities\SubnetCalculator;
use Phalcon\Di;

class SIPConf extends ConfigClass
{
    public const TYPE_SIP = 'SIP';
    public const TYPE_PJSIP = 'PJSIP';

    protected $data_peers;
    protected $data_providers;
    protected $data_rout;
    protected $technology;
    protected $contexts_data = [];

    protected $description = 'pjsip.conf';

    /**
     * Генератор sip.conf
     *
     * @return bool|void
     */
    protected function generateConfigProtected(): void
    {
        $conf = '';
        if ($this->technology === 'SIP') {
            $conf .= $this->generateGeneral();
            $conf .= $this->generateProviders();
            $conf .= $this->generatePeers();

            Util::fileWriteContent($this->config->path('asterisk.confDir') . '/sip.conf', $conf);
        } else {
            $conf .= $this->generateGeneralPj();
            $conf .= $this->generateProvidersPj();
            $conf .= $this->generatePeersPj();

            Util::fileWriteContent($this->config->path('asterisk.confDir') . '/pjsip.conf', $conf);
        }

        $db = new AstDB();
        foreach ($this->data_peers as $peer) {
            // Помещаем в AstDB сведения по маршуртизации.
            $ringlength = ($peer['ringlength'] == 0) ? '' : trim($peer['ringlength']);
            $db->databasePut('FW_TIME', "{$peer['extension']}", $ringlength);
            $db->databasePut('FW', "{$peer['extension']}", trim($peer['forwarding']));
            $db->databasePut('FW_BUSY', "{$peer['extension']}", trim($peer['forwardingonbusy']));
            $db->databasePut('FW_UNAV', "{$peer['extension']}", trim($peer['forwardingonunavailable']));
        }
    }



    /**
     * Получение статусов SIP пиров.
     *
     * @return array
     */
    public static function getPeersStatuses(): array
    {
        $result = [
            'result' => 'ERROR',
        ];

        $am = Util::getAstManager('off');
        if (self::getTechnology() === self::TYPE_SIP) {
            $peers = $am->getSipPeers();
        } else {
            $peers = $am->getPjSipPeers();
        }
        $am->Logoff();

        $result['data']   = $peers;
        $result['result'] = 'Success';

        return $result;
    }

    /**
     * Returns PJSIP ot SIP uses at PBX
     *
     * @return string
     */
    public static function getTechnology(): string
    {
        if (file_exists('/offload/asterisk/modules/res_pjproject.so')) {
            $technology = self::TYPE_PJSIP;
        } else {
            $technology = self::TYPE_SIP;
        }

        return $technology;
    }

    /**
     * Gets peer status
     *
     * @param $peer
     *
     * @return array
     */
    public static function getPeerStatus($peer): array
    {
        $result = [
            'result' => 'ERROR',
        ];

        $am = Util::getAstManager('off');
        if (self::getTechnology() === self::TYPE_SIP) {
            $peers = $am->getSipPeer($peer);
        } else {
            $peers = $am->getPjSipPeer($peer);
        }
        $am->Logoff();

        $result['data']   = $peers;
        $result['result'] = 'Success';

        return $result;
    }

    /**
     * Ger SIP Registry status
     */
    public static function getRegistry(): array
    {
        $result = [
            'result' => 'ERROR',
        ];
        $am     = Util::getAstManager('off');
        if (self::getTechnology() === self::TYPE_SIP) {
            $peers = $am->getSipRegistry();
        } else {
            $peers = $am->getPjSipRegistry();
        }

        $providers = Sip::find("type = 'friend'");
        foreach ($providers as $provider) {
            if ($provider->disabled === '1') {
                $peers[] = [
                    'state'    => 'OFF',
                    'id'       => $provider->uniqid,
                    'username' => $provider->username,
                    'host'     => $provider->host,
                ];
                continue;
            }
            if ($provider->noregister === '1') {
                if (self::getTechnology() === self::TYPE_SIP) {
                    $peers_status = $am->getSipPeer($provider->uniqid);
                } else {
                    $peers_status = $am->getPjSipPeer($provider->uniqid);
                }
                $peers[] = [
                    'state'    => $peers_status['state'],
                    'id'       => $provider->uniqid,
                    'username' => $provider->username,
                    'host'     => $provider->host,
                ];
                continue;
            }

            foreach ($peers as &$peer) {
                if ($peer['host'] !== $provider->host || $peer['username'] !== $provider->username) {
                    continue;
                }
                $peer['id'] = $provider->uniqid;
            }
            unset($peer);
        }
        $am->Logoff();
        $result['data']   = $peers;
        $result['result'] = 'Success';

        return $result;
    }

    /**
     * Generate [general] section in sip.conf
     *
     *
     * @return string
     */
    private function generateGeneral(): string
    {
        $conf    = "[general] \n" .
            "context=public-direct-dial \n" .
            "transport=udp \n" .
            "allowoverlap=no \n" .
            "udpbindaddr=0.0.0.0:{$this->generalSettings['SIPPort']} \n" .
            "srvlookup=yes \n" .
            "useragent=MikoPBX \n" .
            "sdpsession=MikoPBX \n" .
            "relaxdtmf=yes \n" .
            "alwaysauthreject=yes \n" .
            "videosupport=yes \n" .
            "minexpiry={$this->generalSettings['SIPMinExpiry']} \n" .
            "defaultexpiry={$this->generalSettings['SIPDefaultExpiry']} \n" .
            "maxexpiry={$this->generalSettings['SIPMaxExpiry']} \n" .
            "nat=force_rport,comedia; \n" .
            "notifyhold=yes \n" .
            "notifycid=ignore-context \n" .
            "notifyringing=yes \n" .
            "pedantic=yes \n" .
            "callcounter=yes \n" .
            "regcontext=sipregistrations \n" .
            "regextenonqualify=yes \n" .
            // SIP/SIMPLE
            "accept_outofcall_message=yes \n" .
            "outofcall_message_context=messages \n" .
            "subscribecontext=internal-hints \n" .
            "auth_message_requests=yes \n" .
            // Support for ITU-T T.140 realtime text.
            "textsupport=yes \n" .
            "websocket_enabled=false \n" . // Реализуем средствами PJSIP
            "register_retry_403=yes\n\n";
        $network = new Network();

        $topology    = 'public';
        $extipaddr   = '';
        $exthostname = '';
        $networks    = $network->getEnabledLanInterfaces();
        $subnets     = [];
        foreach ($networks as $if_data) {
            $lan_config = $network->getInterface($if_data['interface']);
            if (null == $lan_config["ipaddr"] || null == $lan_config["subnet"]) {
                continue;
            }
            $sub = new SubnetCalculator($lan_config["ipaddr"], $lan_config["subnet"]);
            $net = $sub->getNetworkPortion() . "/" . $lan_config["subnet"];
            if ($if_data["topology"] == 'private' && array_search($net, $subnets) === false) {
                $subnets[] = $net;
            }
            if (trim($if_data["internet"]) == 1) {
                $topology    = trim($if_data["topology"]);
                $extipaddr   = trim($if_data["extipaddr"]);
                $exthostname = trim($if_data["exthostname"]);
            }
        }

        $networks = NetworkFilters::find('local_network=1');
        foreach ($networks as $net) {
            if ( ! in_array($net->permit, $subnets, true)) {
                $subnets[] = $net->permit;
            }
        }

        foreach ($subnets as $net) {
            $conf .= "localnet={$net}\n";
        }

        if ($topology == 'private') {
            if ( ! empty($exthostname)) {
                $conf .= "externhost={$exthostname}\n";
                $conf .= "externrefresh=10";
            } elseif ( ! empty($extipaddr)) {
                $conf .= "externaddr={$extipaddr}";
            }
        }

        $conf .= "\n\n";

        return $conf;
    }

    /**
     * Генератор секции провайдеров в sip.conf
     *
     * @return string
     */
    private function generateProviders(): string
    {
        $conf        = '';
        $reg_strings = '';
        $prov_config = '';

        foreach ($this->data_providers as $provider) {
            // Формируем строку регистрации.
            $manualregister = trim(str_replace(['register', '=>'], '', $provider['manualregister']));
            $port           = (trim($provider['port']) === '') ? '5060' : $provider['port'];

            $noregister = $provider['noregister'] !== '1';
            if ($noregister && ! empty($provider['manualregister'])) {
                // Строка регистрация определена вручную.
                $reg_strings .= "register => {$manualregister} \n";
            } elseif ($noregister) {
                // Строка регистрации генерируется автоматически.
                $sip_user  = '"' . $provider['username'] . '"';
                $secret    = (trim($provider['secret']) === '') ? '' : ":\"{$provider['secret']}\"";
                $host      = '' . $provider['host'] . '';
                $extension = $sip_user;

                $reg_strings .= "register => {$sip_user}{$secret}@{$host}:{$port}/{$extension} \n";
            }
            // Формируем секцию / раздел sip.conf
            // Различные доп. атрибуты.
            $fromdomain  = (trim($provider['fromdomain']) === '') ? $provider['host'] : $provider['fromdomain'];
            $defaultuser = (trim($provider['defaultuser']) === '') ? $provider['username'] : $provider['defaultuser'];
            $qualify     = ($provider['qualify'] === '1' || $provider['qualify'] === 'yes') ? 'yes' : 'no';

            $from     = (trim(
                    $provider['fromuser']
                ) === '') ? "{$provider['username']}; username" : "{$provider['fromuser']}; fromuser";
            $fromuser = ($provider['disablefromuser'] === '1') ? '' : "fromuser={$from}; \n";

            // Ручные настройки.
            $manualattributes = '';
            if (trim($provider['manualattributes']) !== '') {
                $manualattributes = "; manual attributes \n" .
                    base64_decode($provider['manualattributes']) . " \n" .
                    "; manual attributes\n";
            }
            $type = 'friend';
            if ('1' === $provider['receive_calls_without_auth']) {
                // Звонки без авторизации.
                $type               = 'peer';
                $defaultuser        = ';';
                $provider['secret'] = ';';
            }
            $lang = $this->generalSettings['PBXLanguage'];

            $codecs = '';
            foreach ($provider['codecs'] as $codec) {
                $codecs .= "allow={$codec} \n";
            }

            // Формирование секции.
            $prov_config .= "[{$provider['uniqid']}] \n" .
                "type={$type} \n" .
                "context={$provider['uniqid']}-incoming \n" .
                "host={$provider['host']} \n" .
                "port={$port} \n" .
                "language={$lang}\n" .
                "nat={$provider['nat']} \n" .
                "dtmfmode={$provider['dtmfmode']} \n" .
                "qualifyfreq={$provider['qualifyfreq']} \n" .
                "qualify={$qualify} \n" .
                "directmedia=no \n" .
                "secret={$provider['secret']} \n" .
                "icesupport=yes \n" .
                "insecure=port,invite \n" .
                "disallow=all \n" .
                $codecs .
                "defaultuser=$defaultuser\n" .
                "fromdomain=$fromdomain\n" .
                $fromuser .
                $manualattributes .
                "\n";
        }

        $conf .= "$reg_strings \n";
        $conf .= $prov_config;

        return $conf;
    }

    /**
     * Генератор сеции пиров для sip.conf
     *
     * @return string
     */
    public function generatePeers(): string
    {
        $lang = $this->generalSettings['PBXLanguage'];
        $conf = '';
        foreach ($this->data_peers as $peer) {
            $language = str_replace('_', '-', strtolower($lang));
            $language = (trim($language) == '') ? 'en-en' : $language;

            $calleridname = (trim($peer['calleridname']) == '') ? $peer['extension'] : $peer['calleridname'];
            $deny         = (trim($peer['deny']) == '') ? '' : 'deny=' . $peer['deny'] . "\n";
            $busylevel    = (trim($peer['busylevel']) == '') ? '' : 'busylevel=' . $peer['busylevel'] . "\n";
            $permit       = (trim($peer['permit']) == '') ? '' : 'permit=' . $peer['permit'] . "\n";

            // Установим значением по умолчанию.
            $qualify     = 'yes'; // ($peer['qualify'] == 1 || $peer['qualify'] == 'yes')?'yes':'no';
            $qualifyfreq = '60';  // $peer['qualifyfreq'];

            // Ручные настройки.
            $manualattributes = '';
            if (trim($peer['manualattributes']) != '') {
                $tmp_data = base64_decode($peer['manualattributes']);
                if (base64_encode($tmp_data) == $peer['manualattributes']) {
                    $manualattributes = "; manual attributes \n{$tmp_data} \n; manual attributes\n";
                } else {
                    // TODO Данные НЕ закодированы в base64
                    $manualattributes = "; manual attributes \n{$peer['manualattributes']} \n; manual attributes\n";
                }
            }

            $codecs = "";
            foreach ($peer['codecs'] as $codec) {
                $codecs .= "allow={$codec} \n";
            }

            // ---------------- //
            $conf .= "[{$peer['extension']}] \n" .
                "type=friend \n" .
                "context=all_peers \n" .
                "host=dynamic \n" .
                "language=$language \n" .
                "nat=force_rport,comedia; \n" .
                // "nat={$peer['nat']} \n".
                "dtmfmode={$peer['dtmfmode']} \n" .
                "qualifyfreq={$qualifyfreq} \n" .
                "qualify={$qualify} \n" .
                "directmedia=no \n" .
                "callerid={$calleridname} <{$peer['extension']}> \n" .
                "secret={$peer['secret']} \n" .
                "icesupport=yes \n" .
                "disallow=all \n" .
                "$codecs" .
                "pickupgroup=1 \n" .
                "callgroup=1 \n" .
                "sendrpid=pai\n" .
                // "mailbox={$peer['extension']}@voicemailcontext \n".
                "mailbox=admin@voicemailcontext \n" .

                "$busylevel" .
                "$deny" .
                "$permit" .
                "$manualattributes" .
                "\n";
            // ---------------- //
        }
        $additionalModules = $this->di->getShared('pbxConfModules');
        foreach ($additionalModules as $Object) {
            $conf .= $Object->generatePeers();
        }

        return $conf;
    }

    /**
     * Генератора секции general pjsip.conf
     *
     *
     * @return string
     */
    private function generateGeneralPj(): string
    {
        $network = new Network();

        $topology    = 'public';
        $extipaddr   = '';
        $exthostname = '';
        $networks    = $network->getEnabledLanInterfaces();
        $subnets     = [];
        foreach ($networks as $if_data) {
            $lan_config = $network->getInterface($if_data['interface']);
            if (empty($lan_config['ipaddr']) || empty($lan_config['subnet'])) {
                continue;
            }
            $sub = new SubnetCalculator($lan_config['ipaddr'], $lan_config['subnet']);
            $net = $sub->getNetworkPortion() . '/' . $lan_config['subnet'];
            if ($if_data['topology'] === 'private' && in_array($net, $subnets, true) === false) {
                $subnets[] = $net;
            }
            if (trim($if_data['internet']) === '1') {
                $topology    = trim($if_data['topology']);
                $extipaddr   = trim($if_data['extipaddr']);
                $exthostname = trim($if_data['exthostname']);
            }
        }

        $networks = NetworkFilters::find('local_network=1');
        foreach ($networks as $net) {
            if (in_array($net->permit, $subnets, true) === false) {
                $subnets[] = $net->permit;
            }
        }

        $conf = "[general] \n" .
            "disable_multi_domain=on\n" .
            "transport = udp \n\n" .

            "[global] \n" .
            "type = global\n" .
            "user_agent = mikopbx\n\n" .

            "[anonymous]\n" .
            "type = endpoint\n" .
            "allow = alaw\n" .
            "allow = ulaw\n" .
            "allow = g722\n" .
            "allow = gsm\n" .
            "allow = g726\n" .
            "timers = no\n" .
            "context = public-direct-dial\n\n" .

            "[transport-udp]\n" .
            "type = transport\n" .
            "protocol = udp\n" .
            "bind=0.0.0.0:{$this->generalSettings['SIPPort']}\n";

        if ($topology === 'private') {
            foreach ($subnets as $net) {
                $conf .= "local_net={$net}\n";
            }

            if ( ! empty($exthostname)) {
                $parts = explode(':', $exthostname);
                $conf  .= 'external_media_address=' . $parts[0] . "\n";
                $conf  .= 'external_signaling_address=' . $parts[0] . "\n";
                $conf  .= 'external_signaling_port=' . ($parts[1] ?? '5060');
            } elseif ( ! empty($extipaddr)) {
                $parts = explode(':', $extipaddr);
                $conf  .= 'external_media_address=' . $parts[0] . "\n";
                $conf  .= 'external_signaling_address=' . $parts[0] . "\n";
                $conf  .= 'external_signaling_port=' . ($parts[1] ?? '5060');
            }
        }

        $varEtcPath = $this->config->path('core.varEtcPath');
        file_put_contents($varEtcPath . '/topology_hash', md5($topology . $exthostname . $extipaddr));
        $conf .= "\n";

        return $conf;
    }

    /**
     * Генератор секции провайдеров в sip.conf
     *
     *
     * @return string
     */
    private function generateProvidersPj(): string
    {
        $conf        = '';
        $reg_strings = '';
        $prov_config = '';

        foreach ($this->data_providers as $provider) {
            $manual_attributes = Util::parseIniSettings(base64_decode($provider['manualattributes'] ?? ''));
            $port              = (trim($provider['port']) === '') ? '5060' : $provider['port'];

            $need_register = $provider['noregister'] !== '1';
            if ($need_register) {
                $options     = [
                    'type'     => 'auth',
                    'username' => $provider['username'],
                    'password' => $provider['secret'],
                ];
                $reg_strings .= "[REG-AUTH-{$provider['uniqid']}]\n";
                $reg_strings .= Util::overrideConfigurationArray($options, $manual_attributes, 'registration-auth');

                $options     = [
                    'type'           => 'registration',
                    'transport'      => 'transport-udp',
                    'outbound_auth'  => "REG-AUTH-{$provider['uniqid']}",
                    'contact_user'   => $provider['username'],
                    'retry_interval' => '20',
                    'max_retries'    => '10',
                    'expiration'     => $this->generalSettings['SIPDefaultExpiry'],
                    'server_uri'     => "sip:{$provider['host']}:{$port}",
                    'client_uri'     => "sip:{$provider['username']}@{$provider['host']}:{$port}",
                ];
                $reg_strings .= "[REG-{$provider['uniqid']}] \n";
                $reg_strings .= Util::overrideConfigurationArray($options, $manual_attributes, 'registration');
            }

            if ('1' !== $provider['receive_calls_without_auth']) {
                $options     = [
                    'type'     => 'auth',
                    'username' => $provider['username'],
                    'password' => $provider['secret'],
                ];
                $prov_config .= "[{$provider['uniqid']}-OUT]\n";
                $prov_config .= Util::overrideConfigurationArray($options, $manual_attributes, 'endpoint-auth');
            }

            $defaultuser = (trim($provider['defaultuser']) === '') ? $provider['username'] : $provider['defaultuser'];
            if ( ! empty($defaultuser) && '1' !== $provider['receive_calls_without_auth']) {
                $contact = "sip:$defaultuser@{$provider['host']}:{$port}";
            } else {
                $contact = "sip:{$provider['host']}:{$port}";
            }
            $options     = [
                'type'               => 'aor',
                'max_contacts'       => '1',
                'contact'            => $contact,
                'maximum_expiration' => $this->generalSettings['SIPMaxExpiry'],
                'minimum_expiration' => $this->generalSettings['SIPMinExpiry'],
                'default_expiration' => $this->generalSettings['SIPDefaultExpiry'],
            ];
            $prov_config .= "[{$provider['uniqid']}]\n";
            $prov_config .= Util::overrideConfigurationArray($options, $manual_attributes, 'aor');

            $options     = [
                'type'     => 'identify',
                'endpoint' => $provider['uniqid'],
                'match'    => $provider['host'],
            ];
            $prov_config .= "[{$provider['uniqid']}]\n";
            $prov_config .= Util::overrideConfigurationArray($options, $manual_attributes, 'identify');

            $fromdomain = (trim($provider['fromdomain']) === '') ? $provider['host'] : $provider['fromdomain'];
            $from       = (trim(
                    $provider['fromuser']
                ) === '') ? "{$provider['username']}; username" : "{$provider['fromuser']}; fromuser";
            $from_user  = ($provider['disablefromuser'] === '1') ? null : $from;
            $lang       = $this->generalSettings['PBXLanguage'];

            if (count($this->contexts_data[$provider['context_id']]) === 1) {
                $context_id = $provider['uniqid'];
            } else {
                $context_id = $provider['context_id'];
            }
            $dtmfmode = ($provider['dtmfmode'] === 'rfc2833') ? 'rfc4733' : $provider['dtmfmode'];
            $options  = [
                'type'            => 'endpoint',
                '100rel'          => "no",
                'context'         => "{$context_id}-incoming",
                'dtmf_mode'       => $dtmfmode,
                'disallow'        => 'all',
                'allow'           => $provider['codecs'],
                'rtp_symmetric'   => 'yes',
                'force_rport'     => 'yes',
                'rewrite_contact' => 'yes',
                'ice_support'     => 'no',
                'direct_media'    => 'no',
                'from_user'       => $from_user,
                'from_domain'     => $fromdomain,
                'sdp_session'     => 'mikopbx',
                'language'        => $lang,
                'aors'            => $provider['uniqid'],
                'timers'          => ' no',
            ];
            if ('1' !== $provider['receive_calls_without_auth']) {
                $options['outbound_auth'] = "{$provider['uniqid']}-OUT";
            }
            $prov_config .= "[{$provider['uniqid']}]\n";
            $prov_config .= Util::overrideConfigurationArray($options, $manual_attributes, 'endpoint');
        }

        $conf .= $reg_strings;
        $conf .= $prov_config;

        return $conf;
    }



    /**
     * Генератор сеции пиров для sip.conf
     *
     *
     * @return string
     */
    public function generatePeersPj(): string
    {
        $lang              = $this->generalSettings['PBXLanguage'];
        $additionalModules = $this->di->getShared('pbxConfModules');
        $conf              = '';

        foreach ($this->data_peers as $peer) {
            $manual_attributes = Util::parseIniSettings($peer['manualattributes'] ?? '');

            $language = str_replace('_', '-', strtolower($lang));
            $language = (trim($language) === '') ? 'en-en' : $language;

            $calleridname = (trim($peer['calleridname']) === '') ? $peer['extension'] : $peer['calleridname'];
            $busylevel    = (trim($peer['busylevel']) === '') ? '1' : '' . $peer['busylevel'];

            $options = [
                'type'     => 'auth',
                'username' => $peer['extension'],
                'password' => $peer['secret'],
            ];
            $conf    .= "[{$peer['extension']}] \n";
            $conf    .= Util::overrideConfigurationArray($options, $manual_attributes, 'auth');

            $options = [
                'type'              => 'aor',
                'qualify_frequency' => '60',
                'qualify_timeout'   => '5',
                'max_contacts'      => '5',
            ];
            $conf    .= "[{$peer['extension']}] \n";
            $conf    .= Util::overrideConfigurationArray($options, $manual_attributes, 'aor');

            $dtmfmode = ($peer['dtmfmode'] === 'rfc2833') ? 'rfc4733' : $peer['dtmfmode'];
            $options  = [
                'type'                 => 'endpoint',
                'transport'            => 'transport-udp',
                'context'              => 'all_peers',
                'dtmf_mode'            => $dtmfmode,
                'disallow'             => 'all',
                'allow'                => $peer['codecs'],
                'rtp_symmetric'        => 'yes',
                'force_rport'          => 'yes',
                'rewrite_contact'      => 'yes',
                'ice_support'          => 'no',
                'direct_media'         => 'no',
                'callerid'             => "{$calleridname} <{$peer['extension']}>",
                // 'webrtc'   => 'yes',
                'send_pai'             => 'yes',
                'call_group'           => '1',
                'pickup_group'         => '1',
                'sdp_session'          => 'mikopbx',
                'language'             => $language,
                'mailboxes'            => 'admin@voicemailcontext',
                'device_state_busy_at' => $busylevel,
                'aors'                 => $peer['extension'],
                'auth'                 => $peer['extension'],
                'outbound_auth'        => $peer['extension'],
                'acl'                  => "acl_{$peer['extension']}",
                'timers'               => ' no',
            ];
            // ---------------- //
            $conf .= "[{$peer['extension']}] \n";
            $conf .= Util::overrideConfigurationArray($options, $manual_attributes, 'endpoint');

            foreach ($additionalModules as $Object) {
                $conf .= $Object->generatePeerPjAdditionalOptions($peer);
            }
        }

        foreach ($additionalModules as $Object) {
            // Prevent cycling, skip current class
            if (is_a($Object, __CLASS__)) {
                continue;
            }
            $conf .= $Object->generatePeersPj();
        }

        return $conf;
    }

    /**
     * Получение настроек.
     */
    public function getSettings(): void
    {
        // Настройки для текущего класса.
        $this->data_peers     = $this->getPeers();
        $this->data_providers = $this->getProviders();
        $this->data_rout      = $this->getOutRoutes();
        $this->technology     = self::getTechnology();
    }

    /**
     * Получение данных по SIP пирам.
     *
     * @return array
     */
    private function getPeers(): array
    {
        /** @var \MikoPBX\Common\Models\NetworkFilters $network_filter */
        /** @var \MikoPBX\Common\Models\Sip $sip_peer */
        /** @var \MikoPBX\Common\Models\Extensions $extension */
        /** @var \MikoPBX\Common\Models\Users $user */
        /** @var \MikoPBX\Common\Models\ExtensionForwardingRights $extensionForwarding */

        $data    = [];
        $db_data = Sip::find("type = 'peer' AND ( disabled <> '1')");
        foreach ($db_data as $sip_peer) {
            $arr_data       = $sip_peer->toArray();
            $network_filter = null;
            if (null != $sip_peer->networkfilterid) {
                $network_filter = NetworkFilters::findFirst($sip_peer->networkfilterid);
            }
            $arr_data['permit'] = ($network_filter === null) ? '' : $network_filter->permit;
            $arr_data['deny']   = ($network_filter === null) ? '' : $network_filter->deny;

            // Получим используемые кодеки.
            $arr_data['codecs'] = $this->getCodecs($sip_peer->uniqid);

            // Имя сотрудника.
            $extension = ExtensionsModel::findFirst("number = '{$sip_peer->extension}'");
            if (null === $extension) {
                $arr_data['publicaccess'] = false;
                $arr_data['language']     = '';
                $arr_data['calleridname'] = $sip_peer->extension;
            } else {
                $arr_data['publicaccess'] = $extension->public_access;
                $arr_data['calleridname'] = $extension->callerid;
                $user                     = Users::findFirst($extension->userid);
                if (null !== $user) {
                    $arr_data['language'] = $user->language;
                    $arr_data['user_id']  = $user->id;
                }
            }
            $extensionForwarding = ExtensionForwardingRights::findFirst("extension = '{$sip_peer->extension}'");
            if (null === $extensionForwarding) {
                $arr_data['ringlength']              = '';
                $arr_data['forwarding']              = '';
                $arr_data['forwardingonbusy']        = '';
                $arr_data['forwardingonunavailable'] = '';
            } else {
                $arr_data['ringlength']              = $extensionForwarding->ringlength;
                $arr_data['forwarding']              = $extensionForwarding->forwarding;
                $arr_data['forwardingonbusy']        = $extensionForwarding->forwardingonbusy;
                $arr_data['forwardingonunavailable'] = $extensionForwarding->forwardingonunavailable;
            }
            $data[] = $arr_data;
        }

        return $data;
    }

    /**
     * Возвращает доступные пиру кодеки.
     *
     * @param $uniqid
     *
     * @return array
     */
    private function getCodecs($uniqid): array
    {
        $arr_codecs = [];
        $filter     = [
            "sipuid=:id:",
            'bind'  => ['id' => $uniqid],
            'order' => 'priority',
        ];
        $codecs     = SipCodecs::find($filter);
        foreach ($codecs as $codec_data) {
            $arr_codecs[] = $codec_data->codec;
        }

        return $arr_codecs;
    }

    /**
     * Получение данных по SIP провайдерам.
     *
     * @return array
     */
    private function getProviders(): array
    {
        /** @var \MikoPBX\Common\Models\Sip $sip_peer */
        /** @var \MikoPBX\Common\Models\NetworkFilters $network_filter */
        // Получим настройки всех аккаунтов.
        $data    = [];
        $db_data = Sip::find("type = 'friend' AND ( disabled <> '1')");
        foreach ($db_data as $sip_peer) {
            $arr_data                               = $sip_peer->toArray();
            $arr_data['receive_calls_without_auth'] = $sip_peer->receive_calls_without_auth;
            $network_filter                         = NetworkFilters::findFirst($sip_peer->networkfilterid);
            $arr_data['permit']                     = ($network_filter === null) ? '' : $network_filter->permit;
            $arr_data['deny']                       = ($network_filter === null) ? '' : $network_filter->deny;

            // Получим используемые кодеки.
            $arr_data['codecs'] = $this->getCodecs($sip_peer->uniqid);

            $context_id = preg_replace("/[^a-z\d]/iu", '', $sip_peer->host . $sip_peer->port);
            if ( ! isset($this->contexts_data[$context_id])) {
                $this->contexts_data[$context_id] = [];
            }
            $this->contexts_data[$context_id][$sip_peer->uniqid] = $sip_peer->username;

            $arr_data['context_id'] = $context_id;
            $data[]                 = $arr_data;
        }

        return $data;
    }

    /**
     * Генератор исходящих контекстов для пиров.
     *
     * @return array
     */
    private function getOutRoutes(): array
    {
        /** @var \MikoPBX\Common\Models\OutgoingRoutingTable $rout */
        /** @var \MikoPBX\Common\Models\OutgoingRoutingTable $routs */
        /** @var \MikoPBX\Common\Models\Sip $db_data */
        /** @var \MikoPBX\Common\Models\Sip $sip_peer */

        $data    = [];
        $routs   = OutgoingRoutingTable::find(['order' => 'priority']);
        $db_data = Sip::find("type = 'friend' AND ( disabled <> '1')");
        foreach ($routs as $rout) {
            foreach ($db_data as $sip_peer) {
                if ($sip_peer->uniqid !== $rout->providerid) {
                    continue;
                }
                $arr_data                = $rout->toArray();
                $arr_data['description'] = $sip_peer->description;
                $arr_data['uniqid']      = $sip_peer->uniqid;
                $data[]                  = $arr_data;
            }
        }

        return $data;
    }



    /**
     * Генератор extension для контекста peers.
     *
     * @return string
     */
    public function extensionGenContexts(): string
    {
        if ($this->data_peers===null){
            $this->getSettings();
        }
        // Генерация внутреннего номерного плана.
        $conf = '';

        foreach ($this->data_peers as $peer) {
            $conf .= "[peer_{$peer['extension']}] \n";
            $conf .= "include => internal \n";
            $conf .= "include => outgoing \n";
        }

        $contexts = [];
        // Входящие контексты.
        foreach ($this->data_providers as $provider) {
            $contexts_data = $this->contexts_data[$provider['context_id']];
            if (count($contexts_data) === 1) {
                $conf .= ExtensionsConf::generateIncomingContextPeers($provider['uniqid'], $provider['username'], '');
            } elseif ( ! in_array($provider['context_id'], $contexts, true)) {
                $conf       .= ExtensionsConf::generateIncomingContextPeers(
                    $contexts_data,
                    null,
                    $provider['context_id']
                );
                $contexts[] = $provider['context_id'];
            }
        }

        return $conf;
    }

    /**
     * Генерация хинтов.
     *
     * @return string
     */
    public function extensionGenHints(): string
    {
        if ($this->data_peers===null){
            $this->getSettings();
        }
        $conf = '';
        foreach ($this->data_peers as $peer) {
            $conf .= "exten => {$peer['extension']},hint,{$this->technology}/{$peer['extension']} \n";
        }

        return $conf;
    }

    public function extensionGenInternal(): string
    {
        if ($this->data_peers===null){
            $this->getSettings();
        }
        // Генерация внутреннего номерного плана.
        $conf = '';
        foreach ($this->data_peers as $peer) {
            $conf .= "exten => {$peer['extension']},1,Goto(internal-users,{$peer['extension']},1) \n";
        }
        $conf .= "\n";

        return $conf;
    }

    public function extensionGenInternalTransfer(): string
    {
        // Генерация внутреннего номерного плана.
        $conf = '';
        foreach ($this->data_peers as $peer) {
            $conf .= "exten => {$peer['extension']},1,Set(__ISTRANSFER=transfer_) \n";
            $conf .= "	same => n,Goto(internal-users,{$peer['extension']},1) \n";
        }
        $conf .= "\n";

        return $conf;
    }
}