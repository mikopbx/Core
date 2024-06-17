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

use MikoPBX\Common\Models\{Codecs,
    ExtensionForwardingRights,
    Extensions,
    LanInterfaces,
    NetworkFilters,
    OutgoingRoutingTable,
    PbxSettings,
    PbxSettingsConstants,
    Sip,
    SipHosts,
    Users};
use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Common\Providers\RegistryProvider;
use MikoPBX\Core\Asterisk\AstDB;
use MikoPBX\Core\Asterisk\Configs\Generators\Extensions\IncomingContexts;
use MikoPBX\Core\System\{MikoPBXConfig, Network, Processes, SystemMessages, Util};
use MikoPBX\Core\Utilities\SubnetCalculator;
use Phalcon\Di;
use Throwable;

/**
 * Class SIPConf
 *
 * This class represents the pjsip.conf configuration file.
 *
 * @package MikoPBX\Core\Asterisk\Configs
 */
class SIPConf extends AsteriskConfigClass
{
    // The module hook applying priority
    public int $priority = 540;

    /**
     * Constant representing the PJSIP technology.
     */
    public const TYPE_PJSIP = 'PJSIP';

    /**
     * The path to the topology hash file.
     */
    private const TOPOLOGY_HASH_FILE = '/topology_hash';

    /**
     * Peers data.
     *
     * @var mixed
     */
    protected $data_peers;

    /**
     * Providers data.
     *
     * @var mixed
     */
    protected $data_providers;

    /**
     * Rout data.
     *
     * @var mixed
     */
    protected $data_rout;

    /**
     * SIP hosts data.
     *
     * @var array
     */
    protected array $dataSipHosts;

    /**
     * The SIP technology used.
     *
     * @var string
     */
    protected string $technology;

    /**
     * Contexts data.
     *
     * @var array
     */
    protected array $contexts_data;

    protected string $description = 'pjsip.conf';

    /**
     * Get the dependence models.
     *
     * Returns an array of dependence models for this configuration file.
     *
     * @return array The array of dependence models.
     */
    public function getDependenceModels(): array
    {
        return [Sip::class, Users::class, SipHosts::class];
    }

    /**
     * Check if an Asterisk restart is needed.
     *
     * Compares the current topology hash with the stored hash to determine if an Asterisk restart is required.
     *
     * @return bool True if an Asterisk restart is needed, false otherwise.
     */
    public function needAsteriskRestart(): bool
    {
        $di = Di::getDefault();
        if ($di === null) {
            return false;
        }
        [$topology, $extIpAddress, $externalHostName, $subnets] = $this->getTopologyData();

        $externalSipPort    = $this->generalSettings[PbxSettingsConstants::EXTERNAL_SIP_PORT];
        $externalTlsPort    = $this->generalSettings[PbxSettingsConstants::EXTERNAL_TLS_PORT];
        $sipPort            = $this->generalSettings[PbxSettingsConstants::SIP_PORT];
        $tlsPort            = $this->generalSettings[PbxSettingsConstants::TLS_PORT];

        $now_hash           = md5($topology . $externalHostName . $extIpAddress . $sipPort.$externalSipPort. $tlsPort .$externalTlsPort. implode('',$subnets));

        $old_hash        = '';
        $varEtcDir       = $di->getShared('config')->path('core.varEtcDir');
        if (file_exists($varEtcDir . self::TOPOLOGY_HASH_FILE)) {
            $old_hash = file_get_contents($varEtcDir . self::TOPOLOGY_HASH_FILE);
        }

        return $old_hash !== $now_hash;
    }

    /**
     * Get topology data.
     *
     * Retrieves the necessary topology data including the topology type, external IP address, external hostname, and subnets.
     *
     * @return array An array containing the topology data.
     */
    private function getTopologyData(): array
    {
        $network = new Network();

        $topology    = LanInterfaces::TOPOLOGY_PUBLIC;
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
                SystemMessages::sysLogMsg(self::class, $e->getMessage(), LOG_ERR);
                continue;
            }
            $net = $sub->getNetworkPortion() . '/' . $lan_config['subnet'];
            if ($if_data['topology'] === LanInterfaces::TOPOLOGY_PRIVATE && in_array($net, $subnets, true) === false) {
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
     * Generate extension contexts.
     *
     * Generates the extension contexts based on the configured data and returns them as a string.
     *
     * @return string The generated extension contexts.
     */
    public function extensionGenContexts(): string
    {
        if ($this->data_peers === null) {
            $this->getSettings();
        }
        // Generate internal number plan.
        $conf = '';

        $contexts = [];
        // Process incoming contexts.
        foreach ($this->data_providers as $provider) {
            $contextsData = $this->contexts_data[$provider['context_id']];
            if (count($contextsData) === 1) {
                $conf .= IncomingContexts::generate($provider['uniqid'], $provider['username']);
            } elseif ( ! in_array($provider['context_id'], $contexts, true)) {
                $context_id = str_replace('-incoming','',$provider['context_id']);
                $conf      .= IncomingContexts::generate($contextsData, '', $context_id);
                $contexts[] = $provider['context_id'];
            }
        }

        $usersNumbers = [];
        $extensionsData = Extensions::find([ 'conditions' => 'userid <> "" and userid>0 ', 'columns' => 'userid,number']);
        /** @var Extensions $extension */
        foreach ($extensionsData as $extension){
            $usersNumbers[$extension->userid][] = $extension->number;
        }

        $conf.=PHP_EOL.'[monitor-internal]'.PHP_EOL;
        $confExceptions = '';

        // Process peers and their numbers.
        foreach ($this->data_peers as $peer) {
            $numbers = $usersNumbers[$peer['user_id']]??[];
            foreach ($numbers as $num){
                $num = substr($num,-9);
                if(strpos($conf, " $num,") === false){
                    $conf  .= "exten => {$num},1,NoOp(-)".PHP_EOL;
                }
                if($peer['enableRecording'] !== true && strpos($confExceptions, " $num,") === false){
                    $confExceptions .= "exten => {$num},1,NoOp(-)".PHP_EOL;
                }
            }
        }
        $conf.= PHP_EOL.'[monitor-exceptions]'.PHP_EOL.
            $confExceptions.PHP_EOL.PHP_EOL;
        return $conf;
    }

    /**
     * Get settings.
     *
     * Retrieves and sets the necessary settings data for the current class.
     *
     * @return void
     */
    public function getSettings(): void
    {
        $this->contexts_data = [];
        // Retrieve peers, providers, out routes, technology, and SIP hosts data.
        $this->data_peers        = $this->getPeers();
        $this->data_providers    = $this->getProviders();
        $this->data_rout         = $this->getOutRoutes();
        $this->technology        = self::getTechnology();
        $this->dataSipHosts      = self::getSipHosts();
    }

    /**
     * Get peers.
     *
     * Retrieves and returns the peers data as an array.
     *
     * @return array The peers data.
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

        // Process each SIP peer.
        foreach ($db_data as $sip_peer) {
            $arr_data       = $sip_peer->toArray();
            $network_filter = null;

            // Retrieve associated network filter if available.
            if ( ! empty($sip_peer->networkfilterid)) {
                $network_filter = NetworkFilters::findFirst($sip_peer->networkfilterid);
            }

            // Assign permit and deny values based on network filter.
            $arr_data['permit'] = ($network_filter === null) ? '' : $network_filter->permit;
            $arr_data['deny']   = ($network_filter === null) ? '' : $network_filter->deny;

            $arr_data['transport'] = trim($arr_data['transport']);
            // Retrieve used codecs.
            $arr_data['codecs'] = $this->getCodecs();
            $arr_data['enableRecording'] = $sip_peer->enableRecording !== '0';

            // Retrieve employee name.
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

            // Retrieve extension forwarding rights.
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
     * Get codecs.
     *
     * Retrieves and returns the codecs data as an array.
     *
     * @return array The codecs data.
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
     * Get providers.
     *
     * Retrieves and returns the providers data as an array.
     *
     * @return array The providers data.
     */
    private function getProviders(): array
    {
        /** @var Sip $sip_peer */
        /** @var NetworkFilters $network_filter */

        // Get settings for all accounts.
        $data    = [];
        $db_data = Sip::find("type = 'friend' AND ( disabled <> '1')");
        foreach ($db_data as $sip_peer) {
            $arr_data                               = $sip_peer->toArray();
            $network_filter                         = NetworkFilters::findFirst($sip_peer->networkfilterid);
            $arr_data['permit']                     = ($network_filter === null) ? '' : $network_filter->permit;
            $arr_data['deny']                       = ($network_filter === null) ? '' : $network_filter->deny;

            $arr_data['transport'] = trim($arr_data['transport']);
            // Retrieve used codecs.
            $arr_data['codecs'] = $this->getCodecs();
            $context_id = self::getContextId($sip_peer->host, $sip_peer->port);
            if ( ! isset($this->contexts_data[$context_id])) {
                $this->contexts_data[$context_id] = [];
            }
            $this->contexts_data[$context_id][$sip_peer->uniqid] = $sip_peer->username;
            $arr_data['context_id'] = $context_id;
            if(empty($arr_data['registration_type'])){
                if($sip_peer->noregister === '0'){
                    $arr_data['registration_type'] = Sip::REG_TYPE_OUTBOUND;
                }else{
                    $arr_data['registration_type'] = Sip::REG_TYPE_NONE;
                }
            }
            $arr_data['port']  = (trim($arr_data['port']) === '') ? '5060' : $arr_data['port'];
            $data[]                 = $arr_data;
        }

        return $data;
    }

    /**
     * Get outgoing routes.
     *
     * Retrieves and returns the outgoing routes data as an array.
     *
     * @return array The outgoing routes data.
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

        // Process each outgoing route.
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
     * Get SIP hosts.
     *
     * Retrieves and returns the SIP hosts data as an array.
     *
     * @return array The SIP hosts data.
     */
    public static function getSipHosts(): array
    {
        $dataSipHosts = [];
        /** @var SipHosts $sipHosts */
        /** @var SipHosts $hostData */
        $sipHosts = SipHosts::find();

        // Process each SIP host.
        foreach ($sipHosts as $hostData) {
            if ( ! isset($dataSipHosts[$hostData->provider_id])) {
                $dataSipHosts[$hostData->provider_id] = [];
            }
            $dataSipHosts[$hostData->provider_id][] = str_replace(PHP_EOL, '', $hostData->address);
        }

        return $dataSipHosts;
    }

    /**
     * Generate extension hints.
     *
     * Generates and returns the extension hints configuration as a string.
     *
     * @return string The extension hints configuration.
     */
    public function extensionGenHints(): string
    {
        if ($this->data_peers === null) {
            $this->getSettings();
        }
        $conf = '';
        foreach ($this->data_peers as $peer) {
            $hint = "{$this->technology}/{$peer['extension']}";
            if($this->generalSettings[PbxSettingsConstants::USE_WEB_RTC] === '1') {
                $hint.="&{$this->technology}/{$peer['extension']}-WS";
            }
            $conf .= "exten => {$peer['extension']},hint,$hint&Custom:{$peer['extension']} \n";
        }
        return $conf;
    }

    /**
     * Generate internal number plan.
     *
     * Generates and returns the internal number plan configuration as a string.
     *
     * @return string The internal number plan configuration.
     */
    public function extensionGenInternal(): string
    {
        if ($this->data_peers === null) {
            $this->getSettings();
        }
        $conf = '';
        foreach ($this->data_peers as $peer) {
            $conf .= "exten => {$peer['extension']},1,Goto(internal-users,{$peer['extension']},1) \n";
        }
        $conf .= "\n";

        return $conf;
    }

    /**
     * Generate internal transfer.
     *
     * Generates and returns the internal transfer configuration as a string.
     *
     * @return string The internal transfer configuration.
     */
    public function extensionGenInternalTransfer(): string
    {
        if ($this->data_peers === null) {
            $this->getSettings();
        }
        $conf = '';
        foreach ($this->data_peers as $peer) {
            $conf .= "exten => {$peer['extension']},1,Set(__ISTRANSFER=transfer_) \n";
            $conf .= "	same => n,Goto(internal-users,{$peer['extension']},1) \n";
        }
        $conf .= "\n";

        return $conf;
    }

    /**
     * Generate PJSIP configuration.
     *
     * Generates and writes the PJSIP configuration files.
     */
    protected function generateConfigProtected(): void
    {
        $conf  = $this->generateGeneralPj();
        $conf .= $this->generateProvidersPj();
        $conf .= $this->generatePeersPj();

        $astEtcDir = $this->config->path('asterisk.astetcdir');

        // Write pjsip.conf file
        Util::fileWriteContent($astEtcDir . '/pjsip.conf', $conf);

        // Write pjproject.conf file
        $pjConf = '[log_mappings]' . "\n" .
            'type=log_mappings' . "\n" .
            'asterisk_error = 0' . "\n" .
            'asterisk_warning = 2' . "\n" .
            'asterisk_debug = 1,3,4,5,6' . "\n\n";
        file_put_contents($astEtcDir.'/pjproject.conf', $pjConf);

        // Write sorcery.conf file
        file_put_contents($astEtcDir.'/sorcery.conf', '');

        // Asterisk has to be restarted to apply the changes over ami
        if ($this->di->getShared(RegistryProvider::SERVICE_NAME)->booting!==true) {
            $this->updateAsteriskDatabase();
        }

    }

    /**
     * Updates the Asterisk database with the forwarding and ring length information for each peer.
     *
     * @return bool True if the update was successful, false otherwise.
     */
    public function updateAsteriskDatabase():bool
    {
        if ($this->data_peers === null) {
            $this->getSettings();
        }
        $warError = false;
        $db = new AstDB();
        foreach ($this->data_peers as $peer) {
            // Update Asterisk database with routing information.
            $ringLength = ((string)$peer['ringlength'] === '0') ? '' : trim($peer['ringlength']);
            $warError |= !$db->databasePut('FW_TIME', $peer['extension'], $ringLength);
            $warError |= !$db->databasePut('FW', $peer['extension'], trim($peer['forwarding']));
            $warError |= !$db->databasePut('FW_BUSY', $peer['extension'], trim($peer['forwardingonbusy']));
            $warError |= !$db->databasePut('FW_UNAV', $peer['extension'], trim($peer['forwardingonunavailable']));
        }

        return !$warError;
    }

    /**
     * Generates the general section of the PJSIP configuration file based on the provided settings.
     *
     * @return string The generated general section configuration.
     */
    private function generateGeneralPj(): string
    {
        $lang = $this->generalSettings[PbxSettingsConstants::PBX_LANGUAGE];
        [$topology, $extIpAddress, $externalHostName, $subnets] = $this->getTopologyData();

        $codecs    = $this->getCodecs();
        $codecConf = '';
        foreach ($codecs as $codec) {
            $codecConf .= "allow = $codec\n";
        }
        $pbxVersion = $this->generalSettings['PBXVersion'];
        $sipPort    = $this->generalSettings[PbxSettingsConstants::SIP_PORT];
        $tlsPort    = $this->generalSettings[PbxSettingsConstants::TLS_PORT];
        $externalSipPort    = $this->generalSettings[PbxSettingsConstants::EXTERNAL_SIP_PORT];
        $externalTlsPort    = $this->generalSettings[PbxSettingsConstants::EXTERNAL_TLS_PORT];
        $natConf    = '';
        $tlsNatConf = '';

        $resolveOk = Processes::mwExec("timeout 1 getent hosts '$externalHostName'") === 0;

        // Check if external hostname is provided and can be resolved
        if(!empty($externalHostName) && !$resolveOk){
            SystemMessages::sysLogMsg('DNS', "ERROR: DNS $externalHostName not resolved, It will not be used in SIP signaling.");
        }

        // Configure NAT settings for private topology
        if ($topology === LanInterfaces::TOPOLOGY_PRIVATE) {
            foreach ($subnets as $net) {
                $natConf .= "local_net=$net\n";
            }
            if ( !empty($externalHostName) && $resolveOk ) {
                // If external hostname is provided and resolved, use it for signaling
                $parts   = explode(':', $externalHostName);
                $externalHostNameWithoutPort = $parts[0];
                $natConf .= 'external_media_address=' . $externalHostNameWithoutPort . "\n";
                $natConf .= 'external_signaling_address=' . $externalHostNameWithoutPort . "\n";
                $tlsNatConf = "{$natConf}external_signaling_port=$externalTlsPort";
                $natConf .= 'external_signaling_port=' . $externalSipPort;
            } elseif ( ! empty($extIpAddress)) {
                // If external IP address is provided, use it for signaling
                $parts   = explode(':', $extIpAddress);
                $externalIPWithoutPort = $parts[0];
                $natConf .= 'external_media_address=' . $externalIPWithoutPort . "\n";
                $natConf .= 'external_signaling_address=' . $externalIPWithoutPort . "\n";
                $tlsNatConf = "{$natConf}external_signaling_port=$externalTlsPort";
                $natConf .= 'external_signaling_port=' . $externalSipPort;
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
            "bind=0.0.0.0:{$sipPort}\n" .
            "$natConf\n\n" .

            "[transport-tcp]\n" .
            "$typeTransport\n" .
            "protocol = tcp\n" .
            "bind=0.0.0.0:{$sipPort}\n" .
            "$natConf\n\n" .

            "[transport-tls]\n" .
            "$typeTransport\n" .
            "protocol = tls\n" .
            "bind=0.0.0.0:{$tlsPort}\n" .
            "cert_file=/etc/asterisk/keys/ajam.pem\n" .
            "priv_key_file=/etc/asterisk/keys/ajam.pem\n" .
            // "ca_list_file=/etc/ssl/certs/ca-certificates.crt\n".
            // "verify_server=yes\n".
            "method=sslv23\n" .
            "$tlsNatConf\n\n" .

            "[transport-wss]\n" .
            "$typeTransport\n" .
            "protocol = wss\n" .
            "bind=0.0.0.0:{$sipPort}\n" .
            "$natConf\n\n";

        $allowGuestCalls = PbxSettings::getValueByKey(PbxSettingsConstants::PBX_ALLOW_GUEST_CALLS);
        if ($allowGuestCalls === '1') {
            // Add anonymous endpoint if guest calls are allowed
            $conf .= "[anonymous]\n" .
                "type = endpoint\n" .
                $codecConf .
                "language=$lang\n" .
                "timers = no\n" .
                "context = public-direct-dial\n\n";
        }

        $varEtcDir = $this->config->path('core.varEtcDir');
        $hash = md5($topology . $externalHostName . $extIpAddress . $sipPort.$externalSipPort. $tlsPort .$externalTlsPort. implode('',$subnets));

        // Write the configuration content to the file
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

        // Iterate through each data provider
        foreach ($this->data_providers as $provider) {
            $manual_attributes = Util::parseIniSettings(base64_decode($provider['manualattributes'] ?? ''));

            // Generate registration strings for outbound registration type
            if($provider['registration_type'] === Sip::REG_TYPE_OUTBOUND){
                $reg_strings .= $this->generateProviderRegistrationAuth($provider, $manual_attributes);
                $reg_strings .= $this->generateProviderRegistration($provider, $manual_attributes);
            }

            // Generate provider authentication configuration if registration type is not none
            if($provider['registration_type'] !== Sip::REG_TYPE_NONE){
                $prov_config .= $this->generateProviderAuth($provider, $manual_attributes);
            }

            // Generate identify, AOR, and endpoint configurations for the provider
            $prov_config .= $this->generateProviderIdentify($provider, $manual_attributes);
            $prov_config .= $this->generateProviderAor($provider, $manual_attributes);
            $prov_config .= $this->generateProviderEndpoint($provider, $manual_attributes);
        }

        $conf .= $reg_strings;
        $conf .= $prov_config;

        return $conf;
    }

    /**
     * Generate the registration authentication configuration for a provider.
     *
     * This method generates the registration authentication configuration for a specific provider based on the provided data and manual attributes.
     *
     * @param array $provider The provider data.
     * @param array $manual_attributes The manual attributes for the provider.
     * @return string The generated registration authentication configuration.
     */
    private function generateProviderRegistrationAuth(array $provider, array $manual_attributes): string {
        // Initialize the configuration string
        $conf = '';

        $options         = [
            'type'     => 'registration-auth',
            'username' => $provider['username'],
            'password' => $provider['secret'],
        ];

        // Override PJSIP options from modules
        $options         = $this->overridePJSIPOptionsFromModules(
            $provider['uniqid'],
            $options,
            AsteriskConfigInterface::OVERRIDE_PROVIDER_PJSIP_OPTIONS
        );

        $options['type'] = 'auth';

        // Add configuration section header
        $conf            .= "[REG-AUTH-{$provider['uniqid']}]\n";

        // Generate and add configuration options
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
        $newOptions = $options;
        $modulesOverridingArrays = PBXConfModulesProvider::hookModulesMethod($method, [$extensionOrId, $options]);
        foreach ($modulesOverridingArrays as $newOptionsSet) {
            if($options === $newOptionsSet){
                continue;
            }
            // How to make some order of overrides?
            foreach ($newOptionsSet as $key => $value){
                if(isset($newOptions[$key])){
                    $newOptions[$key] = $value;
                }
            }
        }
        return $newOptions;
    }

    /**
     * Generate the registration configuration for a provider.
     *
     * This method generates the registration configuration for a specific provider based on the provided data and manual attributes.
     *
     * @param array $provider The provider data.
     * @param array $manual_attributes The manual attributes for the provider.
     * @return string The generated registration configuration.
     */
    private function generateProviderRegistration(array $provider, array $manual_attributes): string {

        // Initialize the configuration string
        $conf = '';


        $options = [
            'type'                     => 'registration',
            'outbound_auth'            => "REG-AUTH-{$provider['uniqid']}",
            'contact_user'             => $provider['username'],
            'retry_interval'           => '45',
            'max_retries'              => '200',
            'forbidden_retry_interval' => '300',
            'fatal_retry_interval'     => '300',
            'expiration'               => $this->generalSettings[PbxSettingsConstants::SIP_DEFAULT_EXPIRY],
            'server_uri'               => "sip:{$provider['host']}:{$provider['port']}",
            'client_uri'               => "sip:{$provider['username']}@{$provider['host']}:{$provider['port']}",
        ];

        if(!empty($provider['transport'])){
            $options['transport'] = "transport-{$provider['transport']}";
        }
        if(!empty($provider['outbound_proxy'])){
            $options['outbound_proxy'] = "sip:{$provider['outbound_proxy']}\;lr";
        }

        // Override PJSIP options from modules
        $options = $this->overridePJSIPOptionsFromModules(
            $provider['uniqid'],
            $options,
            AsteriskConfigInterface::OVERRIDE_PROVIDER_PJSIP_OPTIONS
        );

        // Add configuration section header
        $conf    .= "[REG-{$provider['uniqid']}] \n";

        // Generate and add configuration options
        $conf    .= Util::overrideConfigurationArray($options, $manual_attributes, 'registration');

        return $conf;
    }

    /**
     * Generate the authentication configuration for a provider.
     *
     * This method generates the authentication configuration for a specific provider based on the provided data and manual attributes.
     *
     * @param array $provider The provider data.
     * @param array $manual_attributes The manual attributes for the provider.
     * @return string The generated authentication configuration.
     */
    private function generateProviderAuth(array $provider, array $manual_attributes): string {

        // Initialize the configuration string
        $conf = '';
        $options         = [
            'type'     => 'endpoint-auth',
            'username' => $provider['username'],
            'password' => $provider['secret'],
        ];

        // Override PJSIP options from modules
        $options         = $this->overridePJSIPOptionsFromModules(
            $provider['uniqid'],
            $options,
            AsteriskConfigInterface::OVERRIDE_PROVIDER_PJSIP_OPTIONS
        );
        $options['type'] = 'auth';

        // Add configuration section header
        $conf            .= "[{$provider['uniqid']}-AUTH]\n";

        // Generate and add configuration options
        $conf            .= Util::overrideConfigurationArray($options, $manual_attributes, 'endpoint-auth');

        return $conf;
    }

    /**
     * Generate the AOR (Address of Record) configuration for a provider.
     *
     * This method generates the AOR configuration for a specific provider based on the provided data and manual attributes.
     *
     * @param array $provider The provider data.
     * @param array $manual_attributes The manual attributes for the provider.
     * @return string The generated AOR configuration.
     */
    private function generateProviderAor(array $provider, array $manual_attributes): string
    {
        // Initialize the configuration string
        $conf        = '';

        $contact     = '';
        if($provider['registration_type'] === Sip::REG_TYPE_OUTBOUND){
            $contact = "sip:{$provider['username']}@{$provider['host']}:{$provider['port']}";
        }elseif($provider['registration_type'] === Sip::REG_TYPE_NONE) {
            $contact = "sip:{$provider['host']}:{$provider['port']}";
        }
        $options = [
            'type'               => 'aor',
            'max_contacts'       => '1',
            'maximum_expiration' => $this->generalSettings[PbxSettingsConstants::SIP_MAX_EXPIRY],
            'minimum_expiration' => $this->generalSettings[PbxSettingsConstants::SIP_MIN_EXPIRY],
            'default_expiration' => $this->generalSettings[PbxSettingsConstants::SIP_DEFAULT_EXPIRY],
        ];
        if(!empty($contact)){
            $options['contact'] = $contact;
        }

        if ($provider['qualify'] === '1') {
            $options['qualify_frequency'] = $provider['qualifyfreq'];
            $options['qualify_timeout']   = '3.0';
        }
        if(!empty($provider['outbound_proxy'])){
            $options['outbound_proxy'] = "sip:{$provider['outbound_proxy']}\;lr";
        }

        // Override PJSIP options from modules
        $options = $this->overridePJSIPOptionsFromModules(
            $provider['uniqid'],
            $options,
            AsteriskConfigInterface::OVERRIDE_PROVIDER_PJSIP_OPTIONS
        );

        // Add configuration section header
        $conf    .= "[{$provider['uniqid']}]\n";

        // Generate and add configuration options
        $conf    .= Util::overrideConfigurationArray($options, $manual_attributes, 'aor');

        return $conf;
    }

    /**
     * Generate the Identify configuration for a provider.
     *
     * This method generates the Identify configuration for a specific provider based on the provided data and manual attributes.
     *
     * @param array $provider The provider data.
     * @param array $manual_attributes The manual attributes for the provider.
     * @return string The generated Identify configuration.
     */
    private function generateProviderIdentify(array $provider, array $manual_attributes): string {
        // Initialize the configuration string
        $conf          = '';

        $providerHosts = $this->dataSipHosts[$provider['uniqid']] ?? [];
        if(!empty($provider['outbound_proxy'])){
            $providerHosts[] = explode(':', $provider['outbound_proxy'])[0];
        }
        if(empty($providerHosts)){
            // Return empty configuration if provider hosts are empty
            return '';
        }
        $options = [
            'type'     => 'identify',
            'endpoint' => $provider['uniqid'],
            'match'    => implode(',', array_unique($providerHosts)),
        ];
        // Override PJSIP options from modules
        $options = $this->overridePJSIPOptionsFromModules(
            $provider['uniqid'],
            $options,
            AsteriskConfigInterface::OVERRIDE_PROVIDER_PJSIP_OPTIONS
        );

        // Add configuration section header
        $conf    .= "[{$provider['uniqid']}]\n";

        // Generate and add configuration options
        $conf    .= Util::overrideConfigurationArray($options, $manual_attributes, 'identify');
        return $conf;
    }

    /**
     * Generate the Endpoint configuration for a provider.
     *
     * This method generates the Endpoint configuration for a specific provider based on the provided data and manual attributes.
     *
     * @param array $provider The provider data.
     * @param array $manual_attributes The manual attributes for the provider.
     * @return string The generated Endpoint configuration.
     */
    private function generateProviderEndpoint(array $provider, array $manual_attributes): string {
        // Initialize the configuration string
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
        $language   = $this->generalSettings[PbxSettingsConstants::PBX_LANGUAGE];
        if ($provider['registration_type'] === Sip::REG_TYPE_INBOUND
            || count($this->contexts_data[$provider['context_id']]) === 1) {
            $context_id = $provider['uniqid'];
            $context = "{$context_id}-incoming";
        } else {
            $context_id = $provider['context_id'];
            $context = $context_id;
        }
        $dtmfmode = ($provider['dtmfmode'] === 'rfc2833') ? 'rfc4733' : $provider['dtmfmode'];
        $options  = [
            'type'            => 'endpoint',
            '100rel'          => "no",
            'context'         => $context,
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
            'timers'          => 'no',
            'rtp_timeout'     => '30',
            'rtp_timeout_hold'=> '30',
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
        if ($provider['registration_type'] === Sip::REG_TYPE_OUTBOUND) {
            $options['outbound_auth'] = "{$provider['uniqid']}-AUTH";
        }elseif ($provider['registration_type'] === Sip::REG_TYPE_INBOUND){
            $options['auth'] = "{$provider['uniqid']}-AUTH";
        }
        self::getToneZone($options, $language);

        // Override PJSIP options from modules
        $options = $this->overridePJSIPOptionsFromModules(
            $provider['uniqid'],
            $options,
            AsteriskConfigInterface::OVERRIDE_PROVIDER_PJSIP_OPTIONS
        );

        // Add configuration section header
        $conf    .= "[{$provider['uniqid']}]".PHP_EOL;
        $conf    .= 'set_var=providerID='.$provider['uniqid'].PHP_EOL;

        // Generate and add configuration options
        $conf    .= Util::overrideConfigurationArray($options, $manual_attributes, 'endpoint');

        return $conf;
    }

    /**
     * Get the context ID for a given name.
     *
     * This method generates the context ID for a given name by removing non-alphanumeric characters and appending "-incoming".
     *
     * @param string $name The name to generate the context ID from.
     * @param string $port The port to generate the context ID from.
     * @return string The generated context ID.
     */
    public static function getContextId(string $name, string $port):string
    {
        if (filter_var($name, FILTER_VALIDATE_IP)) {
            $nameNew = $name;
        }else{
            $nameNew = gethostbyname($name);
        }
        return preg_replace("/[^a-z\d]/iu", '', $nameNew.$port).'-incoming';
    }

    /**
     * Set the tone zone option based on the language.
     *
     * This method sets the 'inband_progress' and 'tone_zone' options in the provided options array based on the language.
     * It maps the language to the corresponding tone zone and sets the options accordingly.
     *
     * @param array $options The options array to modify.
     * @param string $lang The language to determine the tone zone.
     * @return void
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
     * Generate the configuration for SIP peers in PJSIP format.
     *
     * This method generates the configuration for SIP peers in PJSIP format based on the data_peers property.
     * It iterates over each peer, generates the corresponding auth, aor, and endpoint sections, and appends them to the configuration.
     * The manual attributes for each peer are parsed using Util::parseIniSettings() method.
     * The generated configuration is also processed by hooking into the modules' method specified by AsteriskConfigInterface::GENERATE_PEERS_PJ constant.
     *
     * @return string The generated configuration for SIP peers.
     */
    public function generatePeersPj(): string
    {
        if ($this->data_peers === null) {
            $this->getSettings();
        }
        $lang = $this->generalSettings[PbxSettingsConstants::PBX_LANGUAGE];
        $conf = '';

        foreach ($this->data_peers as $peer) {
            $manual_attributes = Util::parseIniSettings($peer['manualattributes'] ?? '');
            $conf              .= $this->generatePeerAuth($peer, $manual_attributes);
            $conf              .= $this->generatePeerAor($peer, $manual_attributes);
            $conf              .= $this->generatePeerEndpoint($lang, $peer, $manual_attributes);
        }

        $conf .= $this->hookModulesMethod(AsteriskConfigInterface::GENERATE_PEERS_PJ);

        return $conf;
    }

    /**
     * Generate the auth section for a SIP peer.
     *
     * This method generates the auth section for a SIP peer in PJSIP format based on the provided peer data and manual attributes.
     * It creates the auth section with the username and password of the peer.
     * The PJSIP options can be overridden using the overridePJSIPOptionsFromModules() method.
     * The manual attributes are applied using the Util::overrideConfigurationArray() method.
     *
     * @param array $peer The data of the SIP peer.
     * @param array $manual_attributes The manual attributes for the peer.
     * @return string The generated auth section for the SIP peer.
     */
    private function generatePeerAuth(array $peer, array $manual_attributes): string
    {
        // Initialize the configuration string
        $conf    = '';

        // Set the options for the auth section
        $options = [
            'type'     => 'auth',
            'username' => $peer['extension'],
            'password' => $peer['secret'],
        ];

        // Override PJSIP options from modules
        $options = $this->overridePJSIPOptionsFromModules(
            $peer['extension'],
            $options,
            AsteriskConfigInterface::OVERRIDE_PJSIP_OPTIONS
        );
        $conf    .= "[{$peer['extension']}] \n";
        $conf    .= Util::overrideConfigurationArray($options, $manual_attributes, 'auth');

        return $conf;
    }

    /**
     * Generate the aor section for a SIP peer.
     *
     * This method generates the aor section for a SIP peer in PJSIP format based on the provided peer data and manual attributes.
     * It creates the aor section with the qualify frequency, qualify timeout, and max contacts options.
     * The PJSIP options can be overridden using the overridePJSIPOptionsFromModules() method.
     * The manual attributes are applied using the Util::overrideConfigurationArray() method.
     * If the "UseWebRTC" general setting is enabled, it also generates an additional aor section for WebRTC.
     *
     * @param array $peer The data of the SIP peer.
     * @param array $manual_attributes The manual attributes for the peer.
     * @return string The generated aor sections for the SIP peer.
     */
    private function generatePeerAor(array $peer, array $manual_attributes): string
    {
        $conf    = '';

        // Set the options for the aor section
        $options = [
            'type'              => 'aor',
            'qualify_frequency' => '60',
            'qualify_timeout'   => '5',
            'max_contacts'      => '5',
        ];

        // Override PJSIP options from modules
        $options = $this->overridePJSIPOptionsFromModules(
            $peer['extension'],
            $options,
            AsteriskConfigInterface::OVERRIDE_PJSIP_OPTIONS
        );

        // Generate the aor section
        $conf    .= "[{$peer['extension']}]\n";
        $conf    .= Util::overrideConfigurationArray($options, $manual_attributes, 'aor');

        // Generate the WebRTC aor section if enabled
        if($this->generalSettings[PbxSettingsConstants::USE_WEB_RTC] === '1'){
            $conf    .= "[{$peer['extension']}-WS]\n";
            $conf    .= Util::overrideConfigurationArray($options, $manual_attributes, 'aor');
        }

        return $conf;
    }

    /**
     * Generate the endpoint section for a SIP peer.
     *
     * This method generates the endpoint section for a SIP peer in PJSIP format based
     * on the provided language, peer data, and manual attributes.
     *
     * @param string $lang The PBX language.
     * @param array $peer The data of the SIP peer.
     * @param array $manual_attributes The manual attributes for the SIP peer.
     * @return string The generated configuration string for the endpoint section.
     */
    private function generatePeerEndpoint(
        string $lang,
        array $peer,
        array $manual_attributes
    ): string {
        $conf     = '';
        $language = str_replace('_', '-', strtolower($lang));
        $language = (trim($language) === '') ? 'en-en' : $language;

        $calleridname = (trim($peer['calleridname']) === '') ? $peer['extension'] : $peer['calleridname'];
        if(mb_strlen($calleridname) !== strlen($calleridname)){
            // Limit the length of calleridname to 40 characters
            $calleridname = mb_substr($calleridname,0, 40);
        }

        $dtmfmode = ($peer['dtmfmode'] === 'rfc2833') ? 'rfc4733' : $peer['dtmfmode'];
        $peer['transport'] = trim($peer['transport']);
        // Prepare the options for the endpoint section
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
            'named_call_group'     => '1',
            'named_pickup_group'   => '1',
            'sdp_session'          => 'mikopbx',
            'language'             => $language,
            'device_state_busy_at' => "1",
            'aors'                 => $peer['extension'],
            'auth'                 => $peer['extension'],
            'outbound_auth'        => $peer['extension'],
            'acl'                  => "acl_{$peer['extension']}",
            'timers'               => 'no',
            'rtp_timeout'          => '30',
            'rtp_timeout_hold'     => '30',
            'message_context'      => 'messages',
        ];

        // Set transport and media encryption options if applicable
        if(!empty($peer['transport'])){
            $options['transport'] = "transport-{$peer['transport']}";
            if($peer['transport'] === Sip::TRANSPORT_TLS){
                $options['media_encryption'] = 'sdes';
            }
        }

        // Set tone zone options based on language
        self::getToneZone($options, $language);

        // Override PJSIP options from modules
        $options = $this->overridePJSIPOptionsFromModules(
            $peer['extension'],
            $options,
            AsteriskConfigInterface::OVERRIDE_PJSIP_OPTIONS
        );

        // Generate the endpoint section header and options
        $conf    .= "[{$peer['extension']}] \n";
        $conf    .= Util::overrideConfigurationArray($options, $manual_attributes, 'endpoint');
        $conf    .= $this->hookModulesMethod(AsteriskConfigInterface::GENERATE_PEER_PJ_ADDITIONAL_OPTIONS, [$peer]);


        // Generate the WebRTC endpoint section if enabled
        if($this->generalSettings[PbxSettingsConstants::USE_WEB_RTC] === '1') {
            unset($options['media_encryption']);

            $conf .= "[{$peer['extension']}-WS] \n";
            $options['webrtc'] = 'yes';
            $options['transport'] = 'transport-wss';
            $options['aors'] = $peer['extension'] . '-WS';

            // Set Opus codec as a priority
            $opusIndex = array_search('opus', $options['allow']);
            if($opusIndex !== false){
                unset($options['allow'][$opusIndex]);
                array_unshift($options['allow'], 'opus');
            }

            /*
             * https://www.asterisk.org/rtcp-mux-webrtc/
             */
            $options['rtcp_mux'] = 'yes';

            // Generate the WebRTC endpoint section options
            $conf .= Util::overrideConfigurationArray($options, $manual_attributes, 'endpoint');
            $conf .= $this->hookModulesMethod(AsteriskConfigInterface::GENERATE_PEER_PJ_ADDITIONAL_OPTIONS, [$peer]);
        }
        return $conf;
    }

}