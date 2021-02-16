<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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

use MikoPBX\Common\Models\{Codecs,
    ExtensionForwardingRights,
    Extensions,
    NetworkFilters,
    OutgoingRoutingTable,
    PbxSettings,
    Sip,
    SipHosts,
    Users};
use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Core\Asterisk\AstDB;
use MikoPBX\Core\Asterisk\Configs\Generators\Extensions\IncomingContexts;
use MikoPBX\Core\System\{MikoPBXConfig, Network, Util};
use MikoPBX\Core\Utilities\SubnetCalculator;
use Phalcon\Di;

class SIPConf extends CoreConfigClass
{
    public const TYPE_PJSIP = 'PJSIP';

    protected $data_peers;
    protected $data_providers;
    protected $data_rout;
    protected array $dataSipHosts;

    protected string $technology;
    protected array  $contexts_data;

    protected string $description = 'pjsip.conf';

    /**
     *
     * @return array
     */
    public function dependenceModels(): array
    {
        return [Sip::class, Users::class, SipHosts::class];
    }

    /**
     * Генератор sip.conf
     *
     * @return bool|void
     */
    protected function generateConfigProtected(): void
    {
        $conf = '';
        $conf .= $this->generateGeneralPj();
        $conf .= $this->generateProvidersPj();
        $conf .= $this->generatePeersPj();

        Util::fileWriteContent($this->config->path('asterisk.astetcdir') . '/pjsip.conf', $conf);
        $pjConf = '[log_mappings]'."\n".
            'type=log_mappings'."\n".
            'asterisk_error = 0'."\n".
            'asterisk_warning = 2'."\n".
            'asterisk_debug = 1,3,4,5,6'."\n\n";

        file_put_contents($this->config->path('asterisk.astetcdir') . '/pjproject.conf', $pjConf);
        file_put_contents($this->config->path('asterisk.astetcdir') . '/sorcery.conf', '');

        $db = new AstDB();
        foreach ($this->data_peers as $peer) {
            // Помещаем в AstDB сведения по маршуртизации.
            $ringlength = ($peer['ringlength'] === '0') ? '' : trim($peer['ringlength']);
            $db->databasePut('FW_TIME', $peer['extension'], $ringlength);
            $db->databasePut('FW', $peer['extension'], trim($peer['forwarding']));
            $db->databasePut('FW_BUSY', $peer['extension'], trim($peer['forwardingonbusy']));
            $db->databasePut('FW_UNAV', $peer['extension'], trim($peer['forwardingonunavailable']));
        }
    }

    /**
     * Генератора секции general pjsip.conf
     *
     *
     * @return string
     */
    private function generateGeneralPj(): string
    {
        $lang    = $this->generalSettings['PBXLanguage'];
        [$topology, $extipaddr, $exthostname, $subnets] = $this->getTopologyData();

        $codecs = $this->getCodecs();
        $codecConf = '';
        foreach ($codecs as $codec){
            $codecConf.= "allow = {$codec}\n";
        }

        $pbxVersion = PbxSettings::getValueByKey('PBXVersion');
        $natConf = '';
        if ($topology === 'private') {
            foreach ($subnets as $net) {
                $natConf .= "local_net={$net}\n";
            }
            if ( ! empty($exthostname)) {
                $parts = explode(':', $exthostname);
                $natConf  .= 'external_media_address=' . $parts[0] . "\n";
                $natConf  .= 'external_signaling_address=' . $parts[0] . "\n";
                $natConf  .= 'external_signaling_port=' . ($parts[1] ?? '5060');
            } elseif ( ! empty($extipaddr)) {
                $parts = explode(':', $extipaddr);
                $natConf  .= 'external_media_address=' . $parts[0] . "\n";
                $natConf  .= 'external_signaling_address=' . $parts[0] . "\n";
                $natConf  .= 'external_signaling_port=' . ($parts[1] ?? '5060');
            }
        }

        $conf = "[general] \n" .
            "disable_multi_domain=on\n" .
            "transport = udp \n\n" .

            "[global] \n" .
            "type = global\n" .
            "endpoint_identifier_order=username,ip,anonymous\n" .
            "user_agent = mikopbx-{$pbxVersion}\n\n" .

            "[transport-udp]\n" .
            "type = transport\n" .
            "protocol = udp\n" .
            "bind=0.0.0.0:{$this->generalSettings['SIPPort']}\n".
            "{$natConf}\n\n".

            "[transport-tcp]\n" .
            "type = transport\n" .
            "protocol = tcp\n" .
            "bind=0.0.0.0:{$this->generalSettings['SIPPort']}\n".
            "{$natConf}\n\n".
            '';

        $allowGuestCalls = PbxSettings::getValueByKey('PBXAllowGuestCalls');
        if($allowGuestCalls === '1'){
            $conf.= "[anonymous]\n" .
                "type = endpoint\n" .
                $codecConf.
                "language={$lang}\n".
                "timers = no\n" .
                "context = public-direct-dial\n\n";
        }

        $varEtcDir = $this->config->path('core.varEtcDir');
        file_put_contents($varEtcDir . '/topology_hash', md5($topology . $exthostname . $extipaddr. $this->generalSettings['SIPPort']));
        $conf .= "\n";

        return $conf;
    }

    /**
     * Проверка ключевых параметров.
     * Если параметры изменены, то необходим рестарт Asterisk процесса.
     * @return bool
     */
    public function needAsteriskRestart():bool{
        $di     = Di::getDefault();
        if ($di === null) {
            return false;
        }
        $mikoPBXConfig  = new MikoPBXConfig();
        [$topology, $extipaddr, $exthostname] = $this->getTopologyData();

        $generalSettings = $mikoPBXConfig->getGeneralSettings();
        $now_hadh = md5($topology . $exthostname . $extipaddr. $generalSettings['SIPPort']);
        $old_hash   = '';
        $varEtcDir = $di->getShared('config')->path('core.varEtcDir');
        if (file_exists($varEtcDir . '/topology_hash')) {
            $old_hash = file_get_contents($varEtcDir . '/topology_hash');
        }

        return $old_hash !== $now_hadh;
    }

    /**
     * @return array
     */
    private function getTopologyData():array{
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
            try {
                $sub = new SubnetCalculator($lan_config['ipaddr'], $lan_config['subnet']);
            }catch (\Throwable $e){
                Util::sysLogMsg(self::class, $e->getMessage(), LOG_ERR);
                continue;
            }
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

        return array(
            $topology,
            $extipaddr,
            $exthostname,
            $subnets,
        );

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
        if ($this->data_providers===null){
            $this->getSettings();
        }
        $additionalModules = $this->di->getShared(PBXConfModulesProvider::SERVICE_NAME);
        foreach ($this->data_providers as $provider) {
            $manual_attributes = Util::parseIniSettings(base64_decode($provider['manualattributes'] ?? ''));
            $provider['port']  = (trim($provider['port']) === '') ? '5060' : $provider['port'];

            $reg_strings .= $this->generateProviderRegistrationAuth($provider, $additionalModules, $manual_attributes);
            $reg_strings .= $this->generateProviderRegistration($provider, $additionalModules, $manual_attributes);
            $prov_config .= $this->generateProviderOutAuth($provider, $additionalModules, $manual_attributes);

            $prov_config .= $this->generateProviderAor($provider, $additionalModules, $manual_attributes);
            $prov_config .= $this->generateProviderIdentify($provider, $additionalModules, $manual_attributes);
            $prov_config .= $this->generateProviderEndpoint($provider, $additionalModules, $manual_attributes);
        }

        $conf .= $reg_strings;
        $conf .= $prov_config;
        return $conf;
    }

    /**
     * Генерация Auth для секции Registration провайдера.
     * @param array $provider
     * @param array $additionalModules
     * @param array $manual_attributes
     * @return string
     */
    private function generateProviderRegistrationAuth(array $provider, array $additionalModules, array $manual_attributes): string{
        $conf = '';
        if($provider['noregister'] === '1'){
            return $conf;
        }
        $options     = [
            'type'     => 'registration-auth',
            'username' => $provider['username'],
            'password' => $provider['secret'],
        ];
        foreach ($additionalModules as $Object) {
            $options = $Object->overridePJSIPOptions($provider['uniqid'], $options);
        }
        $options['type'] = 'auth';
        $conf .= "[REG-AUTH-{$provider['uniqid']}]\n";
        $conf .= Util::overrideConfigurationArray($options, $manual_attributes, 'registration-auth');
        return $conf;
    }

    /**
     * Генерация Registration провайдера.
     * @param array $provider
     * @param array $additionalModules
     * @param array $manual_attributes
     * @return string
     */
    private function generateProviderRegistration(array $provider, array $additionalModules, array $manual_attributes): string{
        $conf = '';
        if($provider['noregister'] === '1'){
            return $conf;
        }
        $options     = [
            'type'                        => 'registration',
            'outbound_auth'               => "REG-AUTH-{$provider['uniqid']}",
            'contact_user'                => $provider['username'],
            'retry_interval'              => '30',
            'max_retries'                 => '100',
            'forbidden_retry_interval'    => '300',
            'fatal_retry_interval'        => '300',
            'expiration'                  => $this->generalSettings['SIPDefaultExpiry'],
            'server_uri'                  => "sip:{$provider['host']}:{$provider['port']}",
            'client_uri'                  => "sip:{$provider['username']}@{$provider['host']}:{$provider['port']}",
        ];
        foreach ($additionalModules as $Object) {
            $options = $Object->overridePJSIPOptions($provider['uniqid'], $options);
        }
        $conf .= "[REG-{$provider['uniqid']}] \n";
        $conf .= Util::overrideConfigurationArray($options, $manual_attributes, 'registration');
        return $conf;
    }

    /**
     * Генерация Auth провайдера.
     * @param array $provider
     * @param array $additionalModules
     * @param array $manual_attributes
     * @return string
     */
    private function generateProviderOutAuth(array $provider, array $additionalModules, array $manual_attributes): string{
        $conf = '';
        if ('1' === $provider['receive_calls_without_auth']) {
            return $conf;
        }
        $options     = [
            'type'     => 'endpoint-auth',
            'username' => $provider['username'],
            'password' => $provider['secret'],
        ];
        foreach ($additionalModules as $Object) {
            $options = $Object->overridePJSIPOptions($provider['uniqid'], $options);
        }
        $options['type'] = 'auth';
        $conf .= "[{$provider['uniqid']}-OUT]\n";
        $conf .= Util::overrideConfigurationArray($options, $manual_attributes, 'endpoint-auth');
        return $conf;
    }

    /**
     * Генерация AOR для Endpoint.
     * @param array $provider
     * @param array $additionalModules
     * @param array $manual_attributes
     * @return string
     */
    private function generateProviderAor(array $provider, array $additionalModules, array $manual_attributes): string{
        $conf = '';
        $defaultuser = (trim($provider['defaultuser']) === '') ? $provider['username'] : $provider['defaultuser'];
        if ( ! empty($defaultuser) && '1' !== $provider['receive_calls_without_auth']) {
            $contact = "sip:$defaultuser@{$provider['host']}:{$provider['port']}";
        } else {
            $contact = "sip:{$provider['host']}:{$provider['port']}";
        }
        $options     = [
            'type'               => 'aor',
            'max_contacts'       => '1',
            'contact'            => $contact,
            'maximum_expiration' => $this->generalSettings['SIPMaxExpiry'],
            'minimum_expiration' => $this->generalSettings['SIPMinExpiry'],
            'default_expiration' => $this->generalSettings['SIPDefaultExpiry'],
        ];
        if($provider['qualify'] === '1'){
            $options['qualify_frequency'] = $provider['qualifyfreq'];
            $options['qualify_timeout']   = '3.0';
        }
        foreach ($additionalModules as $Object) {
            $options = $Object->overridePJSIPOptions($provider['uniqid'], $options);
        }
        $conf .= "[{$provider['uniqid']}]\n";
        $conf .= Util::overrideConfigurationArray($options, $manual_attributes, 'aor');
        return $conf;
    }

    /**
     * Генерация Endpoint провайдера.
     * @param array $provider
     * @param array $additionalModules
     * @param array $manual_attributes
     * @return string
     */
    private function generateProviderEndpoint(array $provider, array $additionalModules, array $manual_attributes): string{
        $conf = '';
        $fromdomain = (trim($provider['fromdomain']) === '') ? $provider['host'] : $provider['fromdomain'];
        $from       = (trim(
                $provider['fromuser']
            ) === '') ? "{$provider['username']}; username" : "{$provider['fromuser']}; fromuser";
        $from_user  = ($provider['disablefromuser'] === '1') ? null : $from;
        $language   = $this->generalSettings['PBXLanguage'];

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
            'language'        => $language,
            'aors'            => $provider['uniqid'],
            'timers'          => ' no',
        ];
        if ('1' !== $provider['receive_calls_without_auth']) {
            $options['outbound_auth'] = "{$provider['uniqid']}-OUT";
        }
        self::getToneZone($options, $language);
        foreach ($additionalModules as $Object) {
            $options = $Object->overridePJSIPOptions($provider['uniqid'], $options);
        }
        $conf .= "[{$provider['uniqid']}]\n";
        $conf .= Util::overrideConfigurationArray($options, $manual_attributes, 'endpoint');
        return $conf;
    }


    /**
     * Генерация AOR для Endpoint.
     * @param array $provider
     * @param array $additionalModules
     * @param array $manual_attributes
     * @return string
     */
    private function generateProviderIdentify(array $provider, array $additionalModules, array $manual_attributes): string{
        $conf = '';
        $providerHosts = $this->dataSipHosts[$provider['uniqid']] ?? [];
        if(!in_array($provider['host'], $providerHosts, true)){
            $providerHosts[] = $provider['host'];
        }
        $options     = [
            'type'     => 'identify',
            'endpoint' => $provider['uniqid'],
            'match'    => implode(',',array_unique($providerHosts)),
        ];
        foreach ($additionalModules as $Object) {
            $options = $Object->overridePJSIPOptions($provider['uniqid'], $options);
        }
        $conf .= "[{$provider['uniqid']}]\n";
        $conf .= Util::overrideConfigurationArray($options, $manual_attributes, 'identify');
        return $conf;
    }


    /**
     * @param array  $options
     * @param string $lang
     */
    public static function getToneZone(array &$options, string $lang):void {
        $settings = [
            'ru-ru' => 'ru',
            'en-gb' => 'uk',
            'de-de' => 'de',
            'da-dk' => 'dk',
            'es-es' => 'es',
            'fr-ca' => 'fr',
            'it-it' => 'it',
            'ja-jp' => 'jp',
            'nl-nl' => 'nl',
            'pl-pl' => 'pl',
            'pt-br' => 'pt',
        ];
        $toneZone = $settings[$lang]??'';
        if(!empty($toneZone)){
            $options['inband_progress'] = 'yes';
            $options['tone_zone'] = $toneZone;
        }
    }

    /**
     * Генератор сеции пиров для sip.conf
     *
     *
     * @return string
     */
    public function generatePeersPj(): string
    {
        if ($this->data_peers===null){
            $this->getSettings();
        }
        $lang              = $this->generalSettings['PBXLanguage'];
        $additionalModules = $this->di->getShared(PBXConfModulesProvider::SERVICE_NAME);
        $conf              = '';

        foreach ($this->data_peers as $peer) {
            $manual_attributes = Util::parseIniSettings($peer['manualattributes'] ?? '');
            $conf .= $this->generatePeerAuth($peer, $additionalModules, $manual_attributes);
            $conf .= $this->generatePeerAor($peer, $additionalModules, $manual_attributes);
            $conf .= $this->generatePeerEndpoint($lang, $peer, $additionalModules, $manual_attributes);
        }

        $conf .= $this->generatePeersAdditional($additionalModules);

        return $conf;
    }

    /**
     * Генерация AOR для Endpoint.
     * @param       $additionalModules
     * @return string
     */
    private function generatePeersAdditional($additionalModules): string{
        $conf = '';
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
     * Генерация AOR для Endpoint.
     * @param       $peer
     * @param       $additionalModules
     * @param array $manual_attributes
     * @return string
     */
    private function generatePeerAuth($peer, $additionalModules, array $manual_attributes): string{
        $conf = '';
        $options = [
            'type'     => 'auth',
            'username' => $peer['extension'],
            'password' => $peer['secret'],
        ];
        foreach ($additionalModules as $Object) {
            $options = $Object->overridePJSIPOptions($peer['extension'], $options);
        }
        $conf    .= "[{$peer['extension']}] \n";
        $conf    .= Util::overrideConfigurationArray($options, $manual_attributes, 'auth');
        return $conf;
    }

    /**
     * Генерация AOR для Endpoint.
     * @param       $peer
     * @param       $additionalModules
     * @param array $manual_attributes
     * @return string
     */
    private function generatePeerAor($peer, $additionalModules, array $manual_attributes): string{
        $conf = '';
        $options = [
            'type'              => 'aor',
            'qualify_frequency' => '60',
            'qualify_timeout'   => '5',
            'max_contacts'      => '5',
        ];
        foreach ($additionalModules as $Object) {
            $options = $Object->overridePJSIPOptions($peer['extension'], $options);
        }
        $conf .= "[{$peer['extension']}] \n";
        $conf .= Util::overrideConfigurationArray($options, $manual_attributes, 'aor');
        return $conf;
    }

    /**
     * Генерация endpoint.
     * @param        $lang
     * @param        $peer
     * @param        $additionalModules
     * @param array  $manual_attributes
     * @return string
     */
    private function generatePeerEndpoint($lang, $peer, $additionalModules, array $manual_attributes): string{
        $conf = '';
        $language = str_replace('_', '-', strtolower($lang));
        $language = (trim($language) === '') ? 'en-en' : $language;

        $calleridname = (trim($peer['calleridname']) === '') ? $peer['extension'] : $peer['calleridname'];
        $busylevel = (trim($peer['busylevel']) === '') ? '1' : '' . $peer['busylevel'];

        $dtmfmode = ($peer['dtmfmode'] === 'rfc2833') ? 'rfc4733' : $peer['dtmfmode'];
        $options = [
            'type' => 'endpoint',
            'context' => 'all_peers',
            'dtmf_mode' => $dtmfmode,
            'disallow' => 'all',
            'allow' => $peer['codecs'],
            'rtp_symmetric' => 'yes',
            'force_rport' => 'yes',
            'rewrite_contact' => 'yes',
            'ice_support' => 'no',
            'direct_media' => 'no',
            'callerid' => "{$calleridname} <{$peer['extension']}>",
            'send_pai' => 'yes',
            'call_group' => '1',
            'pickup_group' => '1',
            'sdp_session' => 'mikopbx',
            'language' => $language,
            'mailboxes' => 'admin@voicemailcontext',
            'device_state_busy_at' => $busylevel,
            'aors' => $peer['extension'],
            'auth' => $peer['extension'],
            'outbound_auth' => $peer['extension'],
            'acl' => "acl_{$peer['extension']}",
            'timers' => ' no',
        ];
        self::getToneZone($options, $language);
        foreach ($additionalModules as $Object) {
            $options = $Object->overridePJSIPOptions($peer['extension'], $options);
        }
        $conf .= "[{$peer['extension']}] \n";
        $conf .= Util::overrideConfigurationArray($options, $manual_attributes, 'endpoint');
        foreach ($additionalModules as $Object) {
            $conf .= $Object->generatePeerPjAdditionalOptions($peer);
        }
        return $conf;
    }


    /**
     * Получение настроек.
     */
    public function getSettings(): void
    {
        $this->contexts_data  = [];
        // Настройки для текущего класса.
        $this->data_peers     = $this->getPeers();
        $this->data_providers = $this->getProviders();
        $this->data_rout      = $this->getOutRoutes();
        $this->technology     = self::getTechnology();
        $this->dataSipHosts   = self::getSipHosts();
    }

    /**
     * Возвращает массив хостов.
     * @return array
     */
    public static function getSipHosts():array
    {
        $dataSipHosts = [];
        /** @var SipHosts $sipHosts */
        /** @var SipHosts $hostData */
        $sipHosts = SipHosts::find();
        foreach ($sipHosts as $hostData){
            if(!isset($dataSipHosts[$hostData->provider_id])){
                $dataSipHosts[$hostData->provider_id] = [];
            }
            $dataSipHosts[$hostData->provider_id][] = str_replace(PHP_EOL, '', $hostData->address);
        }
        return $dataSipHosts;
    }

    /**
     * Получение данных по SIP пирам.
     *
     * @return array
     */
    private function getPeers(): array
    {
        /** @var NetworkFilters $network_filter */
        /** @var Sip $sip_peer */
        /** @var Extensions $extension */
        /** @var Users $user */
        /** @var ExtensionForwardingRights $extensionForwarding */

        $data    = [];
        $db_data = Sip::find("type = 'peer' AND ( disabled <> '1')");
        foreach ($db_data as $sip_peer) {
            $arr_data       = $sip_peer->toArray();
            $network_filter = null;
            if (!empty($sip_peer->networkfilterid)) {
                $network_filter = NetworkFilters::findFirst($sip_peer->networkfilterid);
            }
            $arr_data['permit'] = ($network_filter === null) ? '' : $network_filter->permit;
            $arr_data['deny']   = ($network_filter === null) ? '' : $network_filter->deny;

            // Получим используемые кодеки.
            $arr_data['codecs'] = $this->getCodecs();

            // Имя сотрудника.
            $extension = Extensions::findFirst("number = '{$sip_peer->extension}'");
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
     * @return array
     */
    private function getCodecs(): array
    {
        $arr_codecs = [];
        $filter     = [
            'conditions'=>'disabled="0"',
            'order' => 'type, priority',
        ];
        $codecs     = Codecs::find($filter);
        foreach ($codecs as $codec_data) {
            $arr_codecs[] = $codec_data->name;
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
        /** @var Sip $sip_peer */
        /** @var NetworkFilters $network_filter */
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
            $arr_data['codecs'] = $this->getCodecs();

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
        if ($this->data_peers===null){
            $this->getSettings();
        }
        /** @var OutgoingRoutingTable $rout */
        /** @var OutgoingRoutingTable $routs */
        /** @var Sip $db_data */
        /** @var Sip $sip_peer */

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

        $contexts = [];
        // Входящие контексты.
        foreach ($this->data_providers as $provider) {
            $contexts_data = $this->contexts_data[$provider['context_id']];
            if (count($contexts_data) === 1) {
                $conf .= IncomingContexts::generate($provider['uniqid'], $provider['username']);
            } elseif ( ! in_array($provider['context_id'], $contexts, true)) {
                $conf       .= IncomingContexts::generate(
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
            $conf .= "exten => {$peer['extension']},hint,{$this->technology}/{$peer['extension']}&Custom:{$peer['extension']} \n";
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
        if ($this->data_peers===null){
            $this->getSettings();
        }
        // Генерация внутреннего номерного плана.
        $conf = '';
        foreach ($this->data_peers as $peer) {
            $conf .= "exten => {$peer['extension']},1,Set(__ISTRANSFER=transfer_) \n";
            $conf .= "	same => n,Goto(internal-users,{$peer['extension']},1) \n";
        }
        $conf .= "\n";

        return $conf;
    }

    /**
     * Returns PJSIP ot SIP uses at PBX
     *
     * @return string
     */
    public static function getTechnology(): string
    {
        return self::TYPE_PJSIP;
    }

}