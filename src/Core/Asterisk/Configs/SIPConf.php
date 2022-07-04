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
    Users
};
use MikoPBX\Core\Asterisk\AstDB;
use MikoPBX\Core\Asterisk\Configs\Generators\Extensions\IncomingContexts;
use MikoPBX\Modules\Config\ConfigClass;
use MikoPBX\Core\System\{MikoPBXConfig, Network, Util};
use MikoPBX\Core\Utilities\SubnetCalculator;
use Phalcon\Di;
use Throwable;

class SIPConf extends CoreConfigClass
{
    public const TYPE_PJSIP = 'PJSIP';
    private const TOPOLOGY_HASH_FILE = '/topology_hash';

    protected $data_peers;
    protected $data_providers;
    protected $data_rout;
    protected array $dataSipHosts;

    protected string $technology;
    protected array $contexts_data;

    protected string $description = 'pjsip.conf';

    /**
     *
     * @return array
     */
    public function getDependenceModels(): array
    {
        return [Sip::class, Users::class, SipHosts::class];
    }

    /**
     * Проверка ключевых параметров.
     * Если параметры изменены, то необходим рестарт Asterisk процесса.
     *
     * @return bool
     */
    public function needAsteriskRestart(): bool
    {
        $di = Di::getDefault();
        if ($di === null) {
            return false;
        }
        $mikoPBXConfig = new MikoPBXConfig();
        [$topology, $extIpAddress, $externalHostName, $subnets] = $this->getTopologyData();

        $generalSettings = $mikoPBXConfig->getGeneralSettings();
        $now_hash        = md5($topology . $externalHostName . $extIpAddress . $generalSettings['SIPPort']. $generalSettings['TLS_PORT'] . implode('',$subnets));
        $old_hash        = '';
        $varEtcDir       = $di->getShared('config')->path('core.varEtcDir');
        if (file_exists($varEtcDir . self::TOPOLOGY_HASH_FILE)) {
            $old_hash = file_get_contents($varEtcDir . self::TOPOLOGY_HASH_FILE);
        }

        return $old_hash !== $now_hash;
    }

    /**
     * @return array
     */
    private function getTopologyData(): array
    {
        $network = new Network();

        $topology    = 'public';
        $extipaddr   = '';
        $exthostname = '';
        $networks    = $network->getEnabledLanInterfaces();
        $subnets     = ['127.0.0.1/32'];
        foreach ($networks as $if_data) {
            $lan_config = $network->getInterface($if_data['interface']);
            if (empty($lan_config['ipaddr']) || empty($lan_config['subnet'])) {
                continue;
            }
            try {
                $sub = new SubnetCalculator($lan_config['ipaddr'], $lan_config['subnet']);
            } catch (Throwable $e) {
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

        return [
            $topology,
            $extipaddr,
            $exthostname,
            $subnets,
        ];
    }

    /**
     * Генератор extension для контекста peers.
     *
     * @return string
     */
    public function extensionGenContexts(): string
    {
        if ($this->data_peers === null) {
            $this->getSettings();
        }
        // Генерация внутреннего номерного плана.
        $conf = '';

        $contexts = [];
        // Входящие контексты.
        foreach ($this->data_providers as $provider) {
            $contextsData = $this->contexts_data[$provider['context_id']];
            if (count($contextsData) === 1) {
                $conf .= IncomingContexts::generate($provider['uniqid'], $provider['username']);
            } elseif ( ! in_array($provider['context_id'], $contexts, true)) {
                $conf       .= IncomingContexts::generate(
                    $contextsData,
                    null,
                    $provider['context_id']
                );
                $contexts[] = $provider['context_id'];
            }
        }

        return $conf;
    }

    /**
     * Получение настроек.
     */
    public function getSettings(): void
    {
        $this->contexts_data = [];
        // Настройки для текущего класса.
        $this->data_peers        = $this->getPeers();
        $this->data_providers    = $this->getProviders();
        $this->data_rout         = $this->getOutRoutes();
        $this->technology        = self::getTechnology();
        $this->dataSipHosts      = self::getSipHosts();
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
            if ( ! empty($sip_peer->networkfilterid)) {
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
            'conditions' => 'disabled="0"',
            'order'      => 'type, priority',
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
        if ($this->data_peers === null) {
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
     * Returns PJSIP ot SIP uses at PBX
     *
     * @return string
     */
    public static function getTechnology(): string
    {
        return self::TYPE_PJSIP;
    }

    /**
     * Возвращает массив хостов.
     *
     * @return array
     */
    public static function getSipHosts(): array
    {
        $dataSipHosts = [];
        /** @var SipHosts $sipHosts */
        /** @var SipHosts $hostData */
        $sipHosts = SipHosts::find();
        foreach ($sipHosts as $hostData) {
            if ( ! isset($dataSipHosts[$hostData->provider_id])) {
                $dataSipHosts[$hostData->provider_id] = [];
            }
            $dataSipHosts[$hostData->provider_id][] = str_replace(PHP_EOL, '', $hostData->address);
        }

        return $dataSipHosts;
    }

    /**
     * Генерация хинтов.
     *
     * @return string
     */
    public function extensionGenHints(): string
    {
        if ($this->data_peers === null) {
            $this->getSettings();
        }
        $conf = '';
        foreach ($this->data_peers as $peer) {
            $hint = "{$this->technology}/{$peer['extension']}";
            if($this->generalSettings['UseWebRTC'] === '1') {
                $hint.="&{$this->technology}/{$peer['extension']}-WS";
            }
            $conf .= "exten => {$peer['extension']},hint,$hint&Custom:{$peer['extension']} \n";
        }
        return $conf;
    }

    public function extensionGenInternal(): string
    {
        if ($this->data_peers === null) {
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
        if ($this->data_peers === null) {
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
     * Генератор sip.conf
     *
     * @return void
     */
    protected function generateConfigProtected(): void
    {
        $conf  = $this->generateGeneralPj();
        $conf .= $this->generateProvidersPj();
        $conf .= $this->generatePeersPj();

        $astEtcDir = $this->config->path('asterisk.astetcdir');

        Util::fileWriteContent($astEtcDir . '/pjsip.conf', $conf);
        $pjConf = '[log_mappings]' . "\n" .
            'type=log_mappings' . "\n" .
            'asterisk_error = 0' . "\n" .
            'asterisk_warning = 2' . "\n" .
            'asterisk_debug = 1,3,4,5,6' . "\n\n";
        file_put_contents($astEtcDir.'/pjproject.conf', $pjConf);
        file_put_contents($astEtcDir.'/sorcery.conf', '');
        $this->updateAsteriskDatabase();
    }

    /**
     * Обновление маршрутизации в AstDB
     * @return bool
     */
    public function updateAsteriskDatabase():bool
    {
        if ($this->data_peers === null) {
            $this->getSettings();
        }
        $warError = false;
        $db = new AstDB();
        foreach ($this->data_peers as $peer) {
            // Помещаем в AstDB сведения по маршуртизации.
            $ringLength = ($peer['ringlength'] === '0') ? '' : trim($peer['ringlength']);
            $warError |= !$db->databasePut('FW_TIME', $peer['extension'], $ringLength);
            $warError |= !$db->databasePut('FW', $peer['extension'], trim($peer['forwarding']));
            $warError |= !$db->databasePut('FW_BUSY', $peer['extension'], trim($peer['forwardingonbusy']));
            $warError |= !$db->databasePut('FW_UNAV', $peer['extension'], trim($peer['forwardingonunavailable']));
        }

        return !$warError;
    }

    /**
     * Генератора секции general pjsip.conf
     *
     *
     * @return string
     */
    private function generateGeneralPj(): string
    {
        $lang = $this->generalSettings['PBXLanguage'];
        [$topology, $extIpAddress, $externalHostName, $subnets] = $this->getTopologyData();

        $codecs    = $this->getCodecs();
        $codecConf = '';
        foreach ($codecs as $codec) {
            $codecConf .= "allow = $codec\n";
        }

        $pbxVersion = $this->generalSettings['PBXVersion'];
        $sipPort    = $this->generalSettings['SIPPort'];
        $tlsPort    = $this->generalSettings['TLS_PORT'];
        $natConf    = '';
        $tlsNatConf = '';
        if ($topology === 'private') {
            foreach ($subnets as $net) {
                $natConf .= "local_net=$net\n";
            }
            if ( ! empty($externalHostName)) {
                $parts   = explode(':', $externalHostName);
                $natConf .= 'external_media_address=' . $parts[0] . "\n";
                $natConf .= 'external_signaling_address=' . $parts[0] . "\n";
                $tlsNatConf = "{$natConf}external_signaling_port=$tlsPort";
                $natConf .= 'external_signaling_port=' . ($parts[1] ?? $sipPort);
            } elseif ( ! empty($extIpAddress)) {
                $parts   = explode(':', $extIpAddress);
                $natConf .= 'external_media_address=' . $parts[0] . "\n";
                $natConf .= 'external_signaling_address=' . $parts[0] . "\n";
                $tlsNatConf = "{$natConf}external_signaling_port=$tlsPort";
                $natConf .= 'external_signaling_port=' . ($parts[1] ?? $sipPort);
            }
        }

        $typeTransport = 'type = transport';
        $conf = "[global] \n" .
            "type = global\n" .
            "disable_multi_domain=yes\n" .
            "endpoint_identifier_order=username,ip,anonymous\n" .
            "user_agent = mikopbx-$pbxVersion\n\n" .

            "[transport-udp]\n" .
            "$typeTransport\n" .
            "protocol = udp\n" .
            "bind=0.0.0.0:{$this->generalSettings['SIPPort']}\n" .
            "$natConf\n\n" .

            "[transport-tcp]\n" .
            "$typeTransport\n" .
            "protocol = tcp\n" .
            "bind=0.0.0.0:{$this->generalSettings['SIPPort']}\n" .
            "$natConf\n\n" .

            "[transport-tls]\n" .
            "$typeTransport\n" .
            "protocol = tls\n" .
            "bind=0.0.0.0:{$tlsPort}\n" .
            "cert_file=/etc/asterisk/keys/ajam.pem\n" .
            "priv_key_file=/etc/asterisk/keys/ajam.pem\n" .
            "method=sslv23\n" .
            "$tlsNatConf\n\n" .

            "[transport-wss]\n" .
            "$typeTransport\n" .
            "protocol = wss\n" .
            "bind=0.0.0.0:{$this->generalSettings['SIPPort']}\n" .
            "$natConf\n\n";

        $allowGuestCalls = PbxSettings::getValueByKey('PBXAllowGuestCalls');
        if ($allowGuestCalls === '1') {
            $conf .= "[anonymous]\n" .
                "type = endpoint\n" .
                $codecConf .
                "language=$lang\n" .
                "timers = no\n" .
                "context = public-direct-dial\n\n";
        }

        $varEtcDir = $this->config->path('core.varEtcDir');
        $hash = md5($topology . $externalHostName . $extIpAddress . $this->generalSettings['SIPPort']. $this->generalSettings['TLS_PORT'] . implode('',$subnets));
        file_put_contents($varEtcDir.self::TOPOLOGY_HASH_FILE, $hash);
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
        if ($this->data_providers === null) {
            $this->getSettings();
        }
        foreach ($this->data_providers as $provider) {
            $manual_attributes = Util::parseIniSettings(base64_decode($provider['manualattributes'] ?? ''));
            $provider['port']  = (trim($provider['port']) === '') ? '5060' : $provider['port'];

            $reg_strings .= $this->generateProviderRegistrationAuth($provider, $manual_attributes);
            $reg_strings .= $this->generateProviderRegistration($provider, $manual_attributes);
            $prov_config .= $this->generateProviderOutAuth($provider, $manual_attributes);

            $prov_config .= $this->generateProviderAor($provider, $manual_attributes);
            $prov_config .= $this->generateProviderIdentify($provider, $manual_attributes);
            $prov_config .= $this->generateProviderEndpoint($provider, $manual_attributes);
        }

        $conf .= $reg_strings;
        $conf .= $prov_config;

        return $conf;
    }

    /**
     * Генерация Auth для секции Registration провайдера.
     *
     * @param array $provider
     * @param array $manual_attributes
     *
     * @return string
     */
    private function generateProviderRegistrationAuth(
        array $provider,
        array $manual_attributes
    ): string {
        $conf = '';
        if ($provider['noregister'] === '1') {
            return $conf;
        }
        $options         = [
            'type'     => 'registration-auth',
            'username' => $provider['username'],
            'password' => $provider['secret'],
        ];
        $options         = $this->overridePJSIPOptionsFromModules(
            $provider['uniqid'],
            $options,
            CoreConfigClass::OVERRIDE_PROVIDER_PJSIP_OPTIONS
        );
        $options['type'] = 'auth';
        $conf            .= "[REG-AUTH-{$provider['uniqid']}]\n";
        $conf            .= Util::overrideConfigurationArray($options, $manual_attributes, 'registration-auth');

        return $conf;
    }

    /**
     * Calls an overridePJSIPOptions function from additional modules
     *
     * @param $extensionOrId
     * @param $options
     * @param $method
     *
     * @return array
     */
    private function overridePJSIPOptionsFromModules($extensionOrId, $options, $method): array
    {
        $configClassObj = new ConfigClass();
        $modulesOverridingArrays = $configClassObj->hookModulesMethodWithArrayResult($method, [$extensionOrId, $options]);
        foreach ($modulesOverridingArrays as $newOptionsSet) {
            // How to make some order of overrides?
            $options = $newOptionsSet;
        }
        return $options;
    }

    /**
     * Генерация Registration провайдера.
     *
     * @param array $provider
     * @param array $manual_attributes
     *
     * @return string
     */
    private function generateProviderRegistration(
        array $provider,
        array $manual_attributes
    ): string {
        $conf = '';
        if ($provider['noregister'] === '1') {
            return $conf;
        }
        $options = [
            'type'                     => 'registration',
            'outbound_auth'            => "REG-AUTH-{$provider['uniqid']}",
            'contact_user'             => $provider['username'],
            'retry_interval'           => '30',
            'max_retries'              => '100',
            'forbidden_retry_interval' => '300',
            'fatal_retry_interval'     => '300',
            'expiration'               => $this->generalSettings['SIPDefaultExpiry'],
            'server_uri'               => "sip:{$provider['host']}:{$provider['port']}",
            'client_uri'               => "sip:{$provider['username']}@{$provider['host']}:{$provider['port']}",
        ];

        if(!empty($provider['transport'])){
            $options['transport'] = "transport-{$provider['transport']}";
        }
        if(!empty($provider['outbound_proxy'])){
            $options['outbound_proxy'] = "sip:{$provider['outbound_proxy']}\;lr";
        }
        $options = $this->overridePJSIPOptionsFromModules(
            $provider['uniqid'],
            $options,
            CoreConfigClass::OVERRIDE_PROVIDER_PJSIP_OPTIONS
        );
        $conf    .= "[REG-{$provider['uniqid']}] \n";
        $conf    .= Util::overrideConfigurationArray($options, $manual_attributes, 'registration');

        return $conf;
    }

    /**
     * Генерация Auth провайдера.
     *
     * @param array $provider
     * @param array $manual_attributes
     *
     * @return string
     */
    private function generateProviderOutAuth(array $provider, array $manual_attributes): string {
        $conf = '';
        if ('1' === $provider['receive_calls_without_auth'] || empty("{$provider['username']}{$provider['secret']}")) {
            return $conf;
        }
        $options         = [
            'type'     => 'endpoint-auth',
            'username' => $provider['username'],
            'password' => $provider['secret'],
        ];
        $options         = $this->overridePJSIPOptionsFromModules(
            $provider['uniqid'],
            $options,
            CoreConfigClass::OVERRIDE_PROVIDER_PJSIP_OPTIONS
        );
        $options['type'] = 'auth';
        $conf            .= "[{$provider['uniqid']}-OUT]\n";
        $conf            .= Util::overrideConfigurationArray($options, $manual_attributes, 'endpoint-auth');

        return $conf;
    }

    /**
     * Генерация AOR для Endpoint.
     *
     * @param array $provider
     * @param array $manual_attributes
     *
     * @return string
     */
    private function generateProviderAor(array $provider, array $manual_attributes): string
    {
        $conf        = '';
        $defaultuser = (trim($provider['defaultuser']) === '') ? $provider['username'] : $provider['defaultuser'];
        if ( ! empty($defaultuser) && '1' !== $provider['receive_calls_without_auth']) {
            $contact = "sip:$defaultuser@{$provider['host']}:{$provider['port']}";
        } else {
            $contact = "sip:{$provider['host']}:{$provider['port']}";
        }
        $options = [
            'type'               => 'aor',
            'max_contacts'       => '1',
            'contact'            => $contact,
            'maximum_expiration' => $this->generalSettings['SIPMaxExpiry'],
            'minimum_expiration' => $this->generalSettings['SIPMinExpiry'],
            'default_expiration' => $this->generalSettings['SIPDefaultExpiry'],
        ];
        if ($provider['qualify'] === '1') {
            $options['qualify_frequency'] = $provider['qualifyfreq'];
            $options['qualify_timeout']   = '3.0';
        }
        if(!empty($provider['outbound_proxy'])){
            $options['outbound_proxy'] = "sip:{$provider['outbound_proxy']}\;lr";
        }
        $options = $this->overridePJSIPOptionsFromModules(
            $provider['uniqid'],
            $options,
            CoreConfigClass::OVERRIDE_PROVIDER_PJSIP_OPTIONS
        );
        $conf    .= "[{$provider['uniqid']}]\n";
        $conf    .= Util::overrideConfigurationArray($options, $manual_attributes, 'aor');

        return $conf;
    }

    /**
     * Генерация AOR для Endpoint.
     *
     * @param array $provider
     * @param array $manual_attributes
     *
     * @return string
     */
    private function generateProviderIdentify(
        array $provider,
        array $manual_attributes
    ): string {
        $conf          = '';
        $providerHosts = $this->dataSipHosts[$provider['uniqid']] ?? [];
        if ( ! in_array($provider['host'], $providerHosts, true)) {
            $providerHosts[] = $provider['host'];
        }
        if(!empty($provider['outbound_proxy'])){
            $providerHosts[] = explode(':', $provider['outbound_proxy'])[0];
        }
        $options = [
            'type'     => 'identify',
            'endpoint' => $provider['uniqid'],
            'match'    => implode(',', array_unique($providerHosts)),
        ];

        $options = $this->overridePJSIPOptionsFromModules(
            $provider['uniqid'],
            $options,
            CoreConfigClass::OVERRIDE_PROVIDER_PJSIP_OPTIONS
        );
        $conf    .= "[{$provider['uniqid']}]\n";
        $conf    .= Util::overrideConfigurationArray($options, $manual_attributes, 'identify');
        return $conf;
    }

    /**
     * Генерация Endpoint провайдера.
     *
     * @param array $provider
     * @param array $manual_attributes
     *
     * @return string
     */
    private function generateProviderEndpoint(
        array $provider,
        array $manual_attributes
    ): string {
        $conf       = '';
        $fromdomain = (trim($provider['fromdomain']) === '') ? $provider['host'] : $provider['fromdomain'];
        $from       = (trim($provider['fromuser']) === '') ? "{$provider['username']}; username" : "{$provider['fromuser']}; fromuser";

        if($provider['disablefromuser'] === '1'){
            $from_user   = null;
            $contactUser = trim($provider['username']??'');
        }else{
            $from_user   = $from;
            $contactUser = $from;
        }

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
            'contact_user'    => $contactUser,
            'sdp_session'     => 'mikopbx',
            'language'        => $language,
            'aors'            => $provider['uniqid'],
            'timers'          => ' no',
        ];

        if(!empty($provider['transport'])){
            $options['transport'] = "transport-{$provider['transport']}";
            if($provider['transport'] === Sip::TRANSPORT_TLS){
                $options['media_encryption'] = 'sdes';
            }
        }
        if(!empty($provider['outbound_proxy'])){
            $options['outbound_proxy'] = "sip:{$provider['outbound_proxy']}\;lr";
        }
        if ('1' !== $provider['receive_calls_without_auth'] && !empty("{$provider['username']}{$provider['secret']}")) {
            $options['outbound_auth'] = "{$provider['uniqid']}-OUT";
        }
        self::getToneZone($options, $language);
        $options = $this->overridePJSIPOptionsFromModules(
            $provider['uniqid'],
            $options,
            CoreConfigClass::OVERRIDE_PROVIDER_PJSIP_OPTIONS
        );
        $conf    .= "[{$provider['uniqid']}]\n";
        $conf    .= Util::overrideConfigurationArray($options, $manual_attributes, 'endpoint');

        return $conf;
    }

    /**
     * @param array  $options
     * @param string $lang
     */
    public static function getToneZone(array &$options, string $lang): void
    {
        $settings = [
            'ru-ru' => 'ru',
            'en-gb' => 'uk',
            'de-de' => 'de',
            'da-dk' => 'dk',
            'es-es' => 'es',
            'gr-gr' => 'gr',
            'fr-ca' => 'fr',
            'it-it' => 'it',
            'ja-jp' => 'jp',
            'nl-nl' => 'nl',
            'pl-pl' => 'pl',
            'pt-br' => 'pt',
        ];
        $toneZone = $settings[$lang] ?? '';
        if ( ! empty($toneZone)) {
            $options['inband_progress'] = 'yes';
            $options['tone_zone']       = $toneZone;
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
        if ($this->data_peers === null) {
            $this->getSettings();
        }
        $lang = $this->generalSettings['PBXLanguage'];
        $conf = '';

        foreach ($this->data_peers as $peer) {
            $manual_attributes = Util::parseIniSettings($peer['manualattributes'] ?? '');
            $conf              .= $this->generatePeerAuth($peer, $manual_attributes);
            $conf              .= $this->generatePeerAor($peer, $manual_attributes);
            $conf              .= $this->generatePeerEndpoint($lang, $peer, $manual_attributes);
        }

        $conf .= $this->hookModulesMethod(CoreConfigClass::GENERATE_PEERS_PJ);

        return $conf;
    }

    /**
     * Генерация AOR для Endpoint.
     *
     * @param array $peer
     * @param array $manual_attributes
     *
     * @return string
     */
    private function generatePeerAuth(array $peer, array $manual_attributes): string
    {
        $conf    = '';
        $options = [
            'type'     => 'auth',
            'username' => $peer['extension'],
            'password' => $peer['secret'],
        ];
        $options = $this->overridePJSIPOptionsFromModules(
            $peer['extension'],
            $options,
            CoreConfigClass::OVERRIDE_PJSIP_OPTIONS
        );
        $conf    .= "[{$peer['extension']}] \n";
        $conf    .= Util::overrideConfigurationArray($options, $manual_attributes, 'auth');

        return $conf;
    }

    /**
     * Генерация AOR для Endpoint.
     *
     * @param array $peer
     * @param array $manual_attributes
     *
     * @return string
     */
    private function generatePeerAor(array $peer, array $manual_attributes): string
    {
        $conf    = '';
        $options = [
            'type'              => 'aor',
            'qualify_frequency' => '60',
            'qualify_timeout'   => '5',
            'max_contacts'      => '5',
        ];
        $options = $this->overridePJSIPOptionsFromModules(
            $peer['extension'],
            $options,
            CoreConfigClass::OVERRIDE_PJSIP_OPTIONS
        );
        $conf    .= "[{$peer['extension']}]\n";
        $conf    .= Util::overrideConfigurationArray($options, $manual_attributes, 'aor');

        if($this->generalSettings['UseWebRTC'] === '1'){
            $conf    .= "[{$peer['extension']}-WS]\n";
            $conf    .= Util::overrideConfigurationArray($options, $manual_attributes, 'aor');
        }

        return $conf;
    }

    /**
     * Генерация endpoint.
     *
     * @param        $lang
     * @param array  $peer
     * @param array  $manual_attributes
     *
     * @return string
     */
    private function generatePeerEndpoint(
        $lang,
        array $peer,
        array $manual_attributes
    ): string {
        $conf     = '';
        $language = str_replace('_', '-', strtolower($lang));
        $language = (trim($language) === '') ? 'en-en' : $language;

        $calleridname = (trim($peer['calleridname']) === '') ? $peer['extension'] : $peer['calleridname'];
        $busylevel    = (trim($peer['busylevel']) === '') ? '1' : '' . $peer['busylevel'];

        $dtmfmode = ($peer['dtmfmode'] === 'rfc2833') ? 'rfc4733' : $peer['dtmfmode'];
        $options  = [
            'type'                 => 'endpoint',
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
            'timers'               => 'no',
            'message_context'      => 'messages',
        ];

        if(!empty($peer['transport'])){
            $options['transport'] = "transport-{$peer['transport']}";
            if($peer['transport'] === Sip::TRANSPORT_TLS){
                $options['media_encryption'] = 'sdes';
            }
        }

        self::getToneZone($options, $language);
        $options = $this->overridePJSIPOptionsFromModules(
            $peer['extension'],
            $options,
            CoreConfigClass::OVERRIDE_PJSIP_OPTIONS
        );
        $conf    .= "[{$peer['extension']}] \n";
        $conf    .= Util::overrideConfigurationArray($options, $manual_attributes, 'endpoint');
        $conf    .= $this->hookModulesMethod(self::GENERATE_PEER_PJ_ADDITIONAL_OPTIONS, [$peer]);

        if($this->generalSettings['UseWebRTC'] === '1') {
            unset($options['media_encryption']);

            $conf .= "[{$peer['extension']}-WS] \n";
            $options['webrtc'] = 'yes';
            $options['transport'] = 'transport-wss';
            $options['aors'] = $peer['extension'] . '-WS';

            /** Устанавливаем кодек Opus в приоритет. */
            $opusIndex = array_search('opus', $options['allow']);
            if($opusIndex !== false){
                unset($options['allow'][$opusIndex]);
                array_unshift($options['allow'], 'opus');
            }

            /*
             * https://www.asterisk.org/rtcp-mux-webrtc/
             */
            $options['rtcp_mux'] = 'yes';
            $conf .= Util::overrideConfigurationArray($options, $manual_attributes, 'endpoint');
            $conf .= $this->hookModulesMethod(CoreConfigClass::GENERATE_PEER_PJ_ADDITIONAL_OPTIONS, [$peer]);
        }
        return $conf;
    }

}