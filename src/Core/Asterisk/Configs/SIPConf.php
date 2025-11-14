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
    Sip,
    SipHosts,
    Users};
use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Core\Asterisk\AstDB;
use MikoPBX\Core\Asterisk\Configs\Generators\Extensions\IncomingContexts;
use MikoPBX\Core\Asterisk\Configs\Generators\Extensions\CallerIdDidProcessor;
use MikoPBX\Core\System\{ Network, Processes, SslCertificateService, SystemMessages, Util};
use MikoPBX\Core\Utilities\SubnetCalculator;
use MikoPBX\Core\System\Directories;
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
    public const string TYPE_PJSIP = 'PJSIP';

    /**
     * The path to the topology hash file.
     */
    private const string TOPOLOGY_HASH_FILE = '/topology_hash';

    // PJSIP Timeouts and intervals (in seconds)
    private const int QUALIFY_FREQUENCY = 60;
    private const int QUALIFY_TIMEOUT = 5;
    private const int RETRY_INTERVAL = 45;
    private const int MAX_RETRIES = 200;
    private const int FORBIDDEN_RETRY_INTERVAL = 300;
    private const int FATAL_RETRY_INTERVAL = 300;

    // Contact limits
    private const int MAX_CONTACTS_PEER = 5;
    private const int MAX_CONTACTS_PROVIDER = 1;

    // RTP Settings (in seconds)
    private const int RTP_TIMEOUT = 120;
    private const int RTP_TIMEOUT_HOLD = 600;
    private const int RTP_KEEPALIVE = 30;
    private const int PROVIDER_RTP_TIMEOUT = 60;
    private const int PROVIDER_RTP_TIMEOUT_HOLD = 300;

    // Default ports
    private const string DEFAULT_SIP_PORT = '5060';

    // Database batch processing
    private const int PEERS_BATCH_SIZE = 150;

    // Default tone zone for unspecified languages (Russian market focus)
    private const string DEFAULT_TONE_ZONE = 'ru';

    // Default Asterisk language format (Russian market focus)
    private const string DEFAULT_ASTERISK_LANGUAGE = 'ru-ru';

    /**
     * Peers data offset.
     *
     * @var int
     */
    protected int $offsetPeers = 0;

    /**
     * Peers data batch limit.
     *
     * @var int
     */
    protected int $limitSelectPeers = self::PEERS_BATCH_SIZE;

    /**
     * Providers data.
     *
     * @var array|null
     */
    protected ?array $data_providers = null;

    /**
     * Route data.
     *
     * @var array|null
     */
    protected ?array $data_rout = null;

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
        [$topology, $extIpAddress, $externalHostName, $subnets] = $this->getTopologyData();
        $externalSipPort    = PbxSettings::getValueByKey(PbxSettings::EXTERNAL_SIP_PORT);
        $externalTlsPort    = PbxSettings::getValueByKey(PbxSettings::EXTERNAL_TLS_PORT);
        $sipPort            = PbxSettings::getValueByKey(PbxSettings::SIP_PORT);
        $tlsPort            = PbxSettings::getValueByKey(PbxSettings::TLS_PORT);
        $timeZone           = PbxSettings::getValueByKey(PbxSettings::PBX_TIMEZONE);

        $now_hash           = md5($timeZone.$topology . $externalHostName . $extIpAddress . $sipPort . $externalSipPort . $tlsPort . $externalTlsPort . implode('', $subnets));

        $old_hash        = '';

        $varEtcDir       = Directories::getDir(Directories::CORE_VAR_ETC_DIR);
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
                CriticalErrorsHandler::handleExceptionWithSyslog($e);
                continue;
            }
            $net = $sub->getNetworkPortion() . '/' . $lan_config['subnet'];
            if ($if_data['topology'] === LanInterfaces::TOPOLOGY_PRIVATE && in_array($net, $subnets, true) === false) {
                $subnets[] = $net;
            }
            if (trim($if_data['internet']) === '1') {
                $topology    = trim($if_data['topology']??'');
                $extipaddr   = trim($if_data['extipaddr']??'');
                $exthostname = trim($if_data['exthostname']??'');
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
        if ($this->data_providers === null) {
            $this->getSettings();
        }
        // Generate internal number plan.
        $conf = '';

        $contexts = [];
        $processedProviders = []; // Track processed providers for CallerID/DID contexts
        
        // Process incoming contexts.
        foreach ($this->data_providers as $provider) {
            $contextsData = $this->contexts_data[$provider['context_id']];
            if (count($contextsData) === 1) {
                // For inbound providers, use username as provider ID to match endpoint name
                // Fallback to uniqid if username is empty
                $providerId = ($provider['registration_type'] === Sip::REG_TYPE_INBOUND && !empty($provider['username']))
                    ? $provider['username']
                    : $provider['uniqid'];
                $conf .= IncomingContexts::generate($providerId, $provider['username'], $provider['uniqid']);
                
                // Generate CallerID/DID processing context if configured
                if ($this->needsCallerIdDidProcessing($provider) && !in_array($provider['uniqid'], $processedProviders, true)) {
                    // Use the same providerId as for main incoming context
                    $processor = new CallerIdDidProcessor($providerId, $provider);
                    $conf .= $processor->generateIncomingProcessingContext();
                    $processedProviders[] = $provider['uniqid'];
                }
            } elseif (! in_array($provider['context_id'], $contexts, true)) {
                $context_id = str_replace('-incoming', '', $provider['context_id']);
                $conf      .= IncomingContexts::generate($contextsData, '', $context_id);
                $contexts[] = $provider['context_id'];

                // Generate CallerID/DID processing contexts for all providers in this context
                foreach ($this->data_providers as $contextProvider) {
                    if ($contextProvider['context_id'] === $provider['context_id']
                        && $this->needsCallerIdDidProcessing($contextProvider)
                        && !in_array($contextProvider['uniqid'], $processedProviders, true)) {
                        $processor = new CallerIdDidProcessor($contextProvider['uniqid'], $contextProvider);
                        $conf .= $processor->generateIncomingProcessingContext();
                        $processedProviders[] = $contextProvider['uniqid'];
                    }
                }
            }
        }

        $usersNumbers = [];
        $extensionsData = Extensions::find([ 'conditions' => 'userid <> "" and userid>0 ', 'columns' => 'userid,number']);
        /** @var Extensions $extension */
        foreach ($extensionsData as $extension) {
            $usersNumbers[$extension->userid][] = $extension->number;
        }

        $conf .= PHP_EOL . '[monitor-internal]' . PHP_EOL;
        $confExceptions = '';

        do {
            $data_peers = $this->getPeers();
            foreach ($data_peers as $peer) {
                $numbers = $usersNumbers[$peer['user_id']] ?? [];
                foreach ($numbers as $num) {
                    $num = substr($num, -9);
                    if (!str_contains($conf, " $num,")) {
                        $conf  .= "exten => $num,1,NoOp(-)" . PHP_EOL;
                    }
                    if ($peer['enableRecording'] !== true && !str_contains($confExceptions, " $num,")) {
                        $confExceptions .= "exten => $num,1,NoOp(-)" . PHP_EOL;
                    }
                }
            }
        } while (!empty($data_peers));

        $conf .= PHP_EOL . '[monitor-exceptions]' . PHP_EOL .
                $confExceptions . PHP_EOL . PHP_EOL;
        
        // Add CallerID extraction subroutine (shared by all providers)
        $conf .= CallerIdDidProcessor::generateCallerIdExtractionSubroutine();
        
        return $conf;
    }
    
    /**
     * Check if provider needs CallerID/DID processing
     * 
     * @param array $provider Provider configuration
     * @return bool True if CallerID or DID processing is configured
     */
    private function needsCallerIdDidProcessing(array $provider): bool
    {
        // Check if CallerID source is configured (not default)
        $callerIdSource = $provider['cid_source'] ?? Sip::CALLERID_SOURCE_DEFAULT;
        if ($callerIdSource !== Sip::CALLERID_SOURCE_DEFAULT) {
            return true;
        }
        
        // Check if DID source is configured (not default)
        $didSource = $provider['did_source'] ?? Sip::DID_SOURCE_DEFAULT;
        if ($didSource !== Sip::DID_SOURCE_DEFAULT) {
            return true;
        }
        
        // Check if debug mode is enabled
        if (($provider['cid_did_debug'] ?? '0') === '1') {
            return true;
        }
        
        return false;
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
        $data    = [];

        $filter = [
            "type = 'peer' AND ( disabled <> '1')",
            "offset" => $this->offsetPeers,
            'limit'  => $this->limitSelectPeers
        ];
        $db_data = Sip::find($filter)->toArray();
        $this->offsetPeers += $this->limitSelectPeers;
        if(count($db_data)===0){
            $this->offsetPeers = 0;
            return $data;
        }
        // Process each SIP peer.
        foreach ($db_data as $arr_data) {
            $network_filter = null;
            // Retrieve associated network filter if available.
            if (!empty($arr_data['networkfilterid'])) {
                $network_filter = NetworkFilters::findFirst($arr_data['networkfilterid']);
            }
            // Assign permit and deny values based on network filter.
            $arr_data['permit'] = ($network_filter === null)?'': $network_filter->permit;
            $arr_data['deny']   = ($network_filter === null)?'': $network_filter->deny;
            
            $arr_data['transport'] = trim($arr_data['transport'] ?? Sip::TRANSPORT_AUTO);

            // Retrieve used codecs.
            $arr_data['codecs'] = $this->getCodecs();
            $arr_data['enableRecording'] = $arr_data['enableRecording'] !== '0';

            // Retrieve employee name.
            $extension = Extensions::findFirst("number = '$arr_data[extension]'");
            if (null === $extension) {
                $arr_data['publicaccess'] = false;
                // Language is not per-extension, using system-wide setting
                $arr_data['calleridname'] = $arr_data['extension'];
            } else {
                $arr_data['publicaccess'] = $extension->public_access;
                $arr_data['calleridname'] = $extension->callerid;
                $user                     = Users::findFirst($extension->userid);
                if (null !== $user) {
                    // Language is not per-extension, using system-wide setting
                    $arr_data['user_id']  = $user->id;
                }
            }
            // Retrieve extension forwarding rights.
            $extensionForwarding = ExtensionForwardingRights::findFirst("extension = '$arr_data[extension]'");
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
     * Retrieves enabled and supported codecs from database.
     * Uses CodecSync to ensure only Asterisk-available codecs are returned.
     *
     * @return array The codecs data.
     */
    private function getCodecs(): array
    {
        return Generators\CodecSync::getEnabledSupportedCodecs();
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
        // Get settings for all accounts.
        $data    = [];
        $db_data = Sip::find("type = 'friend' AND ( disabled <> '1')");
        foreach ($db_data as $sip_peer) {
            $arr_data                               = $sip_peer->toArray();
            $network_filter                         = NetworkFilters::findFirst($sip_peer->networkfilterid);
            $arr_data['permit']                     = ($network_filter === null) ? '' : $network_filter->permit;
            $arr_data['deny']                       = ($network_filter === null) ? '' : $network_filter->deny;

            $arr_data['transport'] = trim($arr_data['transport'] ?? '');
            // Retrieve used codecs.
            $arr_data['codecs'] = $this->getCodecs();
            $context_id = self::getIncomingContextId($sip_peer->host, $sip_peer->port);
            if (! isset($this->contexts_data[$context_id])) {
                $this->contexts_data[$context_id] = [];
            }
            $this->contexts_data[$context_id][$sip_peer->uniqid] = $sip_peer->username;
            $arr_data['context_id'] = $context_id;
            if (empty($arr_data['registration_type'])) {
                if ($sip_peer->noregister === '0') {
                    $arr_data['registration_type'] = Sip::REG_TYPE_OUTBOUND;
                } else {
                    $arr_data['registration_type'] = Sip::REG_TYPE_NONE;
                }
            }
            $arr_data['port']  = (trim($arr_data['port']) === '') ? self::DEFAULT_SIP_PORT : $arr_data['port'];
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
        $sipHosts = SipHosts::find();

        // Process each SIP host.
        foreach ($sipHosts as $hostData) {
            if (! isset($dataSipHosts[$hostData->provider_id])) {
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
        $conf = '';
        do {
            $data_peers = $this->getPeers();
            foreach ($data_peers as $peer) {
                $hint = "$this->technology/$peer[extension]";
                if (PbxSettings::getValueByKey(PbxSettings::USE_WEB_RTC) === '1') {
                    $hint .= "&$this->technology/$peer[extension]-WS";
                }
                $conf .= "exten => $peer[extension],hint,$hint&Custom:$peer[extension] \n";
            }
        } while (!empty($data_peers));

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
        $conf = '';
        do {
            $data_peers = $this->getPeers();
            foreach ($data_peers as $peer) {
                $conf .= "exten => $peer[extension],1,Goto(internal-users,$peer[extension],1) \n";
            }
        } while (!empty($data_peers));
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
        $conf = '';
        do {
            $data_peers = $this->getPeers();
            foreach ($data_peers as $peer) {
                $conf .= "exten => $peer[extension],1,Set(__ISTRANSFER=transfer_) \n";
                $conf .= "	same => n,Set(__QUEUE_SRC_CHAN=\${EMPTY}) \n";
                $conf .= "	same => n,Goto(internal-users,$peer[extension],1) \n";
            }
        } while (!empty($data_peers));
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

        // Write pjsip.conf file
        $this->saveConfig($conf, $this->description);

        // Asterisk has to be restarted to apply the changes over ami
        if ($this->booting !== true) {
            $this->updateAsteriskDatabase();
        }
    }

    /**
     * Updates the Asterisk database with the forwarding and ring length information for each peer.
     *
     * @return bool True if the update was successful, false otherwise.
     */
    public function updateAsteriskDatabase(): bool
    {
        $warError = false;
        $db = new AstDB();

        do {
            $data_peers = $this->getPeers();
            foreach ($data_peers as $peer) {
                // Update Asterisk database with routing information.
                $ringLength = ((string)$peer['ringlength'] === '0') ? '' : trim($peer['ringlength']??'');
                $warError |= !$db->databasePut('FW_TIME', $peer['extension'], $ringLength);
                $warError |= !$db->databasePut('FW', $peer['extension'], trim($peer['forwarding']??''));
                $warError |= !$db->databasePut('FW_BUSY', $peer['extension'], trim($peer['forwardingonbusy']??''));
                $warError |= !$db->databasePut('FW_UNAV', $peer['extension'], trim($peer['forwardingonunavailable']??''));
            }
        } while (!empty($data_peers));

        return !$warError;
    }

    /**
     * Generates the general section of the PJSIP configuration file based on the provided settings.
     *
     * @return string The generated general section configuration.
     */
    private function generateGeneralPj(): string
    {
        // Prepare configuration parameters
        $langCode = PbxSettings::getValueByKey(PbxSettings::PBX_LANGUAGE); // Database format: ru_RU
        $asteriskLang = self::convertToAsteriskLanguageFormat($langCode);  // Asterisk format: ru-ru

        $pbxVersion = PbxSettings::getValueByKey(PbxSettings::PBX_VERSION);
        $sipPort = PbxSettings::getValueByKey(PbxSettings::SIP_PORT);
        $tlsPort = PbxSettings::getValueByKey(PbxSettings::TLS_PORT);
        $externalSipPort = PbxSettings::getValueByKey(PbxSettings::EXTERNAL_SIP_PORT);
        $externalTlsPort = PbxSettings::getValueByKey(PbxSettings::EXTERNAL_TLS_PORT);
        $timeZone = PbxSettings::getValueByKey(PbxSettings::PBX_TIMEZONE);
        $wssPort = PbxSettings::getValueByKey(PbxSettings::AJAM_PORT_TLS);

        // Get topology and NAT configuration
        [$topology, $extIpAddress, $externalHostName, $subnets] = $this->getTopologyData();
        $natConfig = $this->generateNatConfiguration(
            [$topology, $extIpAddress, $externalHostName, $subnets],
            $externalSipPort,
            $externalTlsPort
        );

        // Prepare codec configuration
        $codecs = $this->getCodecs();
        $codecConf = '';
        foreach ($codecs as $codec) {
            $codecConf .= "allow = $codec\n";
        }

        // Get certificates for secure transports
        $certs = SslCertificateService::prepareAsteriskCertificates('asterisk-pjsip');

        // Build configuration using helper methods
        $conf = '';

        // Global section
        $conf .= $this->generateGlobalSection($pbxVersion);

        // Transport configurations
        $transportParams = [
            'sipPort' => $sipPort,
            'tlsPort' => $tlsPort,
            'wssPort' => $wssPort,
            'natConf' => $natConfig['natConf'],
            'tlsNatConf' => $natConfig['tlsNatConf'],
            'certs' => $certs,
        ];
        $conf .= $this->generateTransports($transportParams);

        // PJSIP Templates
        $templateParams = [
            'language' => $asteriskLang,
            'codecConf' => $codecConf,
            'toneZone' => self::getToneZoneValue($langCode),
            'hasCerts' => !empty($certs['certPath']) && !empty($certs['keyPath']),
        ];
        $conf .= $this->generatePjsipTemplates($templateParams);

        // Anonymous endpoint for guest calls
        $allowGuestCalls = PbxSettings::getValueByKey(PbxSettings::PBX_ALLOW_GUEST_CALLS);
        if ($allowGuestCalls === '1') {
            $conf .= "[anonymous]\n" .
                "type = endpoint\n" .
                $codecConf .
                "language=$asteriskLang\n" .
                "timers = no\n" .
                "context = public-direct-dial\n\n";
        }

        // Save topology hash
        $varEtcDir = $this->config->path('core.varEtcDir');
        $hash = md5($timeZone . $topology . $externalHostName . $extIpAddress .
                   $sipPort . $externalSipPort . $tlsPort . $externalTlsPort . implode('', $subnets));
        file_put_contents($varEtcDir . self::TOPOLOGY_HASH_FILE, $hash);

        $conf .= "\n";
        return $conf;
    }

    /**
     * Generate global PJSIP configuration
     *
     * @param string $pbxVersion The PBX version
     * @return string The generated configuration
     */
    private function generateGlobalSection(string $pbxVersion): string
    {
        return "[global] \n" .
            "type = global\n" .
            "disable_multi_domain=yes\n" .
            "endpoint_identifier_order=username,ip,anonymous\n" .
            "user_agent = mikopbx-$pbxVersion\n\n";
    }

    /**
     * Generate transport configurations for PJSIP
     *
     * @param array $transportParams Transport parameters
     * @return string The generated transport configurations
     */
    private function generateTransports(array $transportParams): string
    {
        $conf = '';
        $typeTransport = 'type = transport';

        // UDP transport
        $conf .= "[transport-udp]\n" .
            "$typeTransport\n" .
            "protocol = udp\n" .
            "bind=0.0.0.0:{$transportParams['sipPort']}\n" .
            "{$transportParams['natConf']}\n\n";

        // TCP transport
        $conf .= "[transport-tcp]\n" .
            "$typeTransport\n" .
            "protocol = tcp\n" .
            "bind=0.0.0.0:{$transportParams['sipPort']}\n" .
            "{$transportParams['natConf']}\n\n";

        // TLS and WSS transports if certificates are available
        if (!empty($transportParams['certs']['certPath']) && !empty($transportParams['certs']['keyPath'])) {
            $conf .= $this->generateSecureTransports($transportParams);
        }

        return $conf;
    }

    /**
     * Generate secure transports (TLS and WSS)
     *
     * @param array $transportParams Transport parameters
     * @return string The generated secure transport configurations
     */
    private function generateSecureTransports(array $transportParams): string
    {
        $typeTransport = 'type = transport';
        $conf = '';

        // TLS transport
        $conf .= "[transport-tls]\n" .
            "$typeTransport\n" .
            "protocol = tls\n" .
            "bind=0.0.0.0:{$transportParams['tlsPort']}\n" .
            "cert_file={$transportParams['certs']['certPath']}\n" .
            "priv_key_file={$transportParams['certs']['keyPath']}\n" .
            "method=tlsv1_2\n" .
            "{$transportParams['tlsNatConf']}\n\n";

        // WSS transport for WebRTC
        $conf .= "[transport-wss]\n" .
            "$typeTransport\n" .
            "protocol = wss\n" .
            "bind=0.0.0.0:{$transportParams['wssPort']}\n" .
            "cert_file={$transportParams['certs']['certPath']}\n" .
            "priv_key_file={$transportParams['certs']['keyPath']}\n" .
            "{$transportParams['natConf']}\n\n";

        return $conf;
    }

    /**
     * Generate PJSIP templates for endpoints and AORs
     *
     * @param array $templateParams Template parameters
     * @return string The generated templates configuration
     */
    private function generatePjsipTemplates(array $templateParams): string
    {
        $conf = '';

        // AOR template
        $conf .= $this->generateAorTemplate();

        // Endpoint templates
        $conf .= $this->generateEndpointTemplates($templateParams);

        // Provider templates
        $conf .= $this->generateProviderTemplates();

        return $conf;
    }

    /**
     * Generate AOR common template
     *
     * @return string The generated AOR template
     */
    private function generateAorTemplate(): string
    {
        return "[aor-common](!)\n" .
            "type = aor\n" .
            "qualify_frequency = " . self::QUALIFY_FREQUENCY . "\n" .
            "qualify_timeout = " . self::QUALIFY_TIMEOUT . "\n" .
            "max_contacts = " . self::MAX_CONTACTS_PEER . "\n" .
            "remove_existing = yes\n" .
            "remove_unavailable = yes\n\n";
    }

    /**
     * Generate endpoint templates
     *
     * @param array $templateParams Template parameters
     * @return string The generated endpoint templates
     */
    private function generateEndpointTemplates(array $templateParams): string
    {
        $conf = '';

        // Base endpoint template
        $conf .= "[endpoint-base](!)\n" .
            "type = endpoint\n" .
            "context = all_peers\n" .
            "disallow = all\n" .
            $templateParams['codecConf'] .
            "rtp_symmetric = yes\n" .
            "force_rport = yes\n" .
            "rewrite_contact = yes\n" .
            "ice_support = no\n" .
            "direct_media = no\n" .
            "send_pai = yes\n" .
            "named_call_group = 1\n" .
            "named_pickup_group = 1\n" .
            "sdp_session = mikopbx\n" .
            "language = {$templateParams['language']}\n" .
            "device_state_busy_at = 1\n" .
            "timers = no\n" .
            "rtp_timeout = " . self::RTP_TIMEOUT . "\n" .
            "rtp_timeout_hold = " . self::RTP_TIMEOUT_HOLD . "\n" .
            "rtp_keepalive = " . self::RTP_KEEPALIVE . "\n" .
            "message_context = messages\n" .
            "inband_progress = yes\n" .
            "tone_zone = {$templateParams['toneZone']}\n\n";

        // Transport-specific templates
        $conf .= "[endpoint-udp](endpoint-base,!)\n" .
            "transport = transport-udp\n\n";

        $conf .= "[endpoint-tcp](endpoint-base,!)\n" .
            "transport = transport-tcp\n\n";

        // Only create TLS/WSS templates if certificates are available
        if (!empty($templateParams['hasCerts'])) {
            $conf .= "[endpoint-tls](endpoint-base,!)\n" .
                "transport = transport-tls\n" .
                "media_encryption = sdes\n\n";

            $conf .= "[endpoint-wss](endpoint-base,!)\n" .
                "transport = transport-wss\n" .
                "webrtc = yes\n\n";
        }

        return $conf;
    }

    /**
     * Generate provider templates
     *
     * @return string The generated provider templates
     */
    private function generateProviderTemplates(): string
    {
        $conf = '';

        // Registration template
        $conf .= "[registration-base](!)\n" .
            "type = registration\n" .
            "retry_interval = " . self::RETRY_INTERVAL . "\n" .
            "max_retries = " . self::MAX_RETRIES . "\n" .
            "forbidden_retry_interval = " . self::FORBIDDEN_RETRY_INTERVAL . "\n" .
            "fatal_retry_interval = " . self::FATAL_RETRY_INTERVAL . "\n" .
            "expiration = " . PbxSettings::getValueByKey(PbxSettings::SIP_DEFAULT_EXPIRY) . "\n\n";

        // Provider AOR template
        $conf .= "[provider-aor-base](!)\n" .
            "type = aor\n" .
            "max_contacts = " . self::MAX_CONTACTS_PROVIDER . "\n" .
            "maximum_expiration = " . PbxSettings::getValueByKey(PbxSettings::SIP_MAX_EXPIRY) . "\n" .
            "minimum_expiration = " . PbxSettings::getValueByKey(PbxSettings::SIP_MIN_EXPIRY) . "\n" .
            "default_expiration = " . PbxSettings::getValueByKey(PbxSettings::SIP_DEFAULT_EXPIRY) . "\n\n";

        // Provider endpoint template
        $conf .= $this->generateProviderEndpointTemplate();

        return $conf;
    }

    /**
     * Generate provider endpoint template
     *
     * @return string The generated provider endpoint template
     */
    private function generateProviderEndpointTemplate(): string
    {
        $langCode = PbxSettings::getValueByKey(PbxSettings::PBX_LANGUAGE); // Database format: ru_RU
        $codecConf = '';
        $codecs = $this->getCodecs();
        foreach ($codecs as $codec) {
            $codecConf .= "allow = $codec\n";
        }

        // Get tone zone for provider endpoint template
        $toneZone = self::getToneZoneValue($langCode);

        $conf = "[provider-endpoint-base](!)\n" .
            "type = endpoint\n" .
            "disallow = all\n" .
            $codecConf .
            "100rel = no\n" .
            "rtp_symmetric = yes\n" .
            "force_rport = yes\n" .
            "rewrite_contact = yes\n" .
            "ice_support = no\n" .
            "direct_media = no\n" .
            "sdp_session = mikopbx\n" .
            "language = " . self::convertToAsteriskLanguageFormat($langCode) . "\n" .
            "timers = no\n" .
            "rtp_keepalive = 0\n" .
            "rtp_timeout = " . self::PROVIDER_RTP_TIMEOUT . "\n" .
            "rtp_timeout_hold = " . self::PROVIDER_RTP_TIMEOUT_HOLD . "\n" .
            "inband_progress = yes\n" .
            "tone_zone = $toneZone\n\n";

        // Transport-specific provider templates
        $conf .= "[provider-endpoint-udp](provider-endpoint-base,!)\n" .
            "transport = transport-udp\n\n";

        $conf .= "[provider-endpoint-tcp](provider-endpoint-base,!)\n" .
            "transport = transport-tcp\n\n";

        // Only add TLS template if certificates are available
        $certs = SslCertificateService::prepareAsteriskCertificates('asterisk-pjsip');
        if (!empty($certs['certPath']) && !empty($certs['keyPath'])) {
            $conf .= "[provider-endpoint-tls](provider-endpoint-base,!)\n" .
                "transport = transport-tls\n" .
                "media_encryption = sdes\n\n";
        }

        return $conf;
    }

    /**
     * Generate NAT configuration based on topology
     *
     * @param array $topologyData Topology data
     * @param string $externalSipPort External SIP port
     * @param string $externalTlsPort External TLS port
     * @return array NAT configuration strings
     */
    private function generateNatConfiguration(array $topologyData, string $externalSipPort, string $externalTlsPort): array
    {
        $natConf = '';
        $tlsNatConf = '';

        if ($topologyData[0] !== LanInterfaces::TOPOLOGY_PRIVATE) {
            return ['natConf' => $natConf, 'tlsNatConf' => $tlsNatConf];
        }

        // Add local networks
        foreach ($topologyData[3] as $net) {
            $natConf .= "local_net=$net\n";
        }

        $externalHostName = $topologyData[2];
        $extIpAddress = $topologyData[1];

        $resolveOk = Processes::mwExec("timeout 1 getent hosts '$externalHostName'") === 0;

        if (!empty($externalHostName) && !$resolveOk) {
            SystemMessages::sysLogMsg('DNS', "ERROR: DNS $externalHostName not resolved, It will not be used in SIP signaling.");
        }

        if (!empty($externalHostName) && $resolveOk) {
            $parts = explode(':', $externalHostName);
            $externalHostNameWithoutPort = $parts[0];
            $natConf .= 'external_media_address=' . $externalHostNameWithoutPort . "\n";
            $natConf .= 'external_signaling_address=' . $externalHostNameWithoutPort . "\n";
            $tlsNatConf = "{$natConf}external_signaling_port=$externalTlsPort";
            $natConf .= 'external_signaling_port=' . $externalSipPort;
        } elseif (!empty($extIpAddress)) {
            $parts = explode(':', $extIpAddress);
            $externalIPWithoutPort = $parts[0];
            $natConf .= 'external_media_address=' . $externalIPWithoutPort . "\n";
            $natConf .= 'external_signaling_address=' . $externalIPWithoutPort . "\n";
            $tlsNatConf = "{$natConf}external_signaling_port=$externalTlsPort";
            $natConf .= 'external_signaling_port=' . $externalSipPort;
        }

        return ['natConf' => $natConf, 'tlsNatConf' => $tlsNatConf];
    }

    /**
     * Get the transport type for a provider
     *
     * @param array $provider Provider data
     * @return string Transport type (udp, tcp, tls) - defaults to udp
     */
    private function getProviderTransport(array $provider): string
    {
        $transport = trim($provider['transport'] ?? '');

        // Handle auto or empty transport
        if (empty($transport) || $transport === Sip::TRANSPORT_AUTO) {
            return 'udp';
        }

        return $transport;
    }

    /**
     * Build configuration section with overrides
     *
     * @param string $sectionName Section name
     * @param array $baseOptions Base options
     * @param array $overriddenOptions Module overridden options
     * @param array $manualAttributes Manual attributes
     * @param string $sectionType Section type for manual attributes
     * @return string Generated configuration
     */
    private function buildSectionWithOverrides(
        string $sectionName,
        array $baseOptions,
        array $overriddenOptions,
        array $manualAttributes,
        string $sectionType
    ): string {
        $conf = "[$sectionName]\n";

        // Add base options
        foreach ($baseOptions as $key => $value) {
            if (empty($value) || empty($key)) {
                continue;
            }
            if (is_array($value)) {
                $value = implode(',', $value);
            }
            $conf .= "$key = $value\n";
        }

        // Add module overrides (only parameters that differ from base)
        $moduleOverrides = array_diff_assoc($overriddenOptions, $baseOptions);
        if (!empty($moduleOverrides)) {
            $conf .= "; === Module overrides ===\n";
            foreach ($moduleOverrides as $key => $value) {
                if ($key !== 'type' && !empty($value) && !empty($key)) {
                    if (is_array($value)) {
                        $value = implode(',', $value);
                    }
                    $conf .= "$key = $value\n";
                }
            }
        }

        // Apply manual attributes (highest priority)
        if (!empty($manualAttributes[$sectionType])) {
            $conf .= "; === Manual attributes ===\n";
            foreach ($manualAttributes[$sectionType] as $key => $value) {
                if ($key !== 'type' && !empty($value) && !empty($key)) {
                    if (is_array($value)) {
                        $value = implode(',', $value);
                    }
                    $conf .= "$key = $value\n";
                }
            }
        }

        $conf .= "\n";
        return $conf;
    }

    /**
     * Check if provider needs customization (module overrides or manual attributes)
     *
     * @param array $provider Provider data
     * @param array $manual_attributes Parsed manual attributes
     * @param string $section Section name (registration, aor, endpoint, etc.)
     * @param array $baseOptions Base options to compare against
     * @return bool True if customization is needed
     */
    private function needsProviderCustomization(
        array $provider,
        array $manual_attributes,
        string $section,
        array $baseOptions
    ): bool {
        // Check for manual attributes for this section
        if (!empty($manual_attributes[$section])) {
            return true;
        }

        // Check for module overrides
        $overridden = $this->overridePJSIPOptionsFromModules(
            $provider['uniqid'],
            $baseOptions,
            AsteriskConfigInterface::OVERRIDE_PROVIDER_PJSIP_OPTIONS
        );

        return $overridden !== $baseOptions;
    }

    /**
     * Get the visual separator label for a provider type
     *
     * @param string $registrationType Provider registration type
     * @return string Label for separator (OUTBOUND TRUNK, INBOUND TRUNK, PEER TRUNK)
     */
    private function getProviderTypeLabel(string $registrationType): string
    {
        return match ($registrationType) {
            Sip::REG_TYPE_OUTBOUND => 'OUTBOUND TRUNK',
            Sip::REG_TYPE_INBOUND => 'INBOUND TRUNK',
            Sip::REG_TYPE_NONE => 'PEER TRUNK',
            default => 'TRUNK',
        };
    }

    /**
     * Генератор секции провайдеров в sip.conf
     *
     *
     * @return string
     */
    private function generateProvidersPj(): string
    {
        $conf = '';
        if ($this->data_providers === null) {
            $this->getSettings();
        }

        // Iterate through each data provider
        foreach ($this->data_providers as $provider) {
            $manual_attributes = Util::parseIniSettings($provider['manualattributes'] ?? '');

            // Add visual separator for provider
            $providerTypeLabel = $this->getProviderTypeLabel($provider['registration_type']);
            $providerDescription = $provider['description'] ?? $provider['uniqid'];
            $transport = strtoupper($this->getProviderTransport($provider));

            $conf .= "; ============================================================\n";
            $conf .= "; $providerTypeLabel: $providerDescription ($transport)\n";
            $conf .= "; ============================================================\n\n";

            // Generate registration sections for outbound registration type (REG-AUTH and REG)
            if ($provider['registration_type'] === Sip::REG_TYPE_OUTBOUND) {
                $conf .= $this->generateProviderRegistrationAuth($provider, $manual_attributes);
                $conf .= $this->generateProviderRegistration($provider, $manual_attributes);
            }

            // Generate provider authentication configuration if registration type is not none
            if ($provider['registration_type'] !== Sip::REG_TYPE_NONE) {
                $conf .= $this->generateProviderAuth($provider, $manual_attributes);
            }

            // Generate AOR, identify, and endpoint configurations for the provider
            $conf .= $this->generateProviderAor($provider, $manual_attributes);
            $conf .= $this->generateProviderIdentify($provider, $manual_attributes);
            $conf .= $this->generateProviderEndpoint($provider, $manual_attributes);
        }

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
    private function generateProviderRegistrationAuth(array $provider, array $manual_attributes): string
    {
        // Initialize the configuration string
        $conf = '';

        $options         = [
            'type'     => 'auth',
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

        // Add configuration section header (no description - already in visual separator)
        $conf .= "[{$provider['uniqid']}-REG-AUTH]\n";

        // Generate and add configuration options
        $conf .= Util::overrideConfigurationArray($options, $manual_attributes, 'registration-auth');

        return $conf;
    }

    /**
     * Calls an overridePJSIPOptions function from additional modules
     *
     * @param string|int $extensionOrId Extension or provider ID
     * @param array $options Base options array
     * @param string $method Method name for hook
     *
     * @return array Modified options array
     */
    private function overridePJSIPOptionsFromModules(string|int $extensionOrId, array $options, string $method): array
    {
        $newOptions = $options;
        $modulesOverridingArrays = PBXConfModulesProvider::hookModulesMethod($method, [$extensionOrId, $options]);
        foreach ($modulesOverridingArrays as $newOptionsSet) {
            if ($options === $newOptionsSet) {
                continue;
            }
            // How to make some order of overrides?
            foreach ($newOptionsSet as $key => $value) {
                if (isset($newOptions[$key])) {
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
    private function generateProviderRegistration(array $provider, array $manual_attributes): string
    {
        // Initialize the configuration string
        $conf = '';

        // Base options that match the template
        $baseOptions = [
            'type'                     => 'registration',
            'retry_interval'           => (string)self::RETRY_INTERVAL,
            'max_retries'              => (string)self::MAX_RETRIES,
            'forbidden_retry_interval' => (string)self::FORBIDDEN_RETRY_INTERVAL,
            'fatal_retry_interval'     => (string)self::FATAL_RETRY_INTERVAL,
            'expiration'               => PbxSettings::getValueByKey(PbxSettings::SIP_DEFAULT_EXPIRY),
        ];

        // Unique parameters not in template
        $uniqueParams = [
            'outbound_auth' => "{$provider['uniqid']}-REG-AUTH",
            'contact_user'  => $provider['username'],
            'server_uri'    => "sip:{$provider['host']}:{$provider['port']}",
            'client_uri'    => "sip:{$provider['username']}@{$provider['host']}:{$provider['port']}",
        ];

        if (!empty($provider['transport']) && $provider['transport'] !== Sip::TRANSPORT_AUTO) {
            $uniqueParams['transport'] = "transport-{$provider['transport']}";
        }
        if (!empty($provider['outbound_proxy'])) {
            $uniqueParams['outbound_proxy'] = "sip:{$provider['outbound_proxy']}\;lr";
        }

        // Check if customization is needed
        $needsCustomization = $this->needsProviderCustomization(
            $provider,
            $manual_attributes,
            'registration',
            array_merge($baseOptions, $uniqueParams)
        );

        // Add configuration section header (no description - already in visual separator)
        if ($needsCustomization) {
            // Use template with explicit overrides
            $conf .= "[{$provider['uniqid']}-REG](registration-base)\n";

            // Add unique parameters
            foreach ($uniqueParams as $key => $value) {
                $conf .= "$key = $value\n";
            }

            // Override PJSIP options from modules
            $fullOptions = array_merge($baseOptions, $uniqueParams);
            $overriddenOptions = $this->overridePJSIPOptionsFromModules(
                $provider['uniqid'],
                $fullOptions,
                AsteriskConfigInterface::OVERRIDE_PROVIDER_PJSIP_OPTIONS
            );

            // Add module overrides (only parameters that differ from base)
            $moduleOverrides = array_diff_assoc($overriddenOptions, $fullOptions);
            $moduleOverrideLines = '';
            foreach ($moduleOverrides as $key => $value) {
                if (!isset($uniqueParams[$key]) && $key !== 'type') {
                    if (is_array($value)) {
                        $value = implode(',', $value);
                    }
                    $moduleOverrideLines .= "$key = $value\n";
                }
            }
            if (!empty($moduleOverrideLines)) {
                $conf .= "; === Module overrides ===\n" . $moduleOverrideLines;
            }

            // Apply manual attributes (highest priority)
            if (!empty($manual_attributes['registration'])) {
                $conf .= "; === Manual attributes ===\n";
                foreach ($manual_attributes['registration'] as $key => $value) {
                    if ($key !== 'type') {
                        if (is_array($value)) {
                            $value = implode(',', $value);
                        }
                        $conf .= "$key = $value\n";
                    }
                }
            }
        } else {
            // Use pure template inheritance with unique parameters only
            $conf .= "[{$provider['uniqid']}-REG](registration-base)\n";
            foreach ($uniqueParams as $key => $value) {
                $conf .= "$key = $value\n";
            }
        }

        $conf .= "\n";
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
    private function generateProviderAuth(array $provider, array $manual_attributes): string
    {
        $baseOptions = [
            'type'     => 'auth',
            'username' => $provider['username'],
            'password' => $provider['secret'],
        ];

        // Override PJSIP options from modules
        $overriddenOptions = $this->overridePJSIPOptionsFromModules(
            $provider['uniqid'],
            $baseOptions,
            AsteriskConfigInterface::OVERRIDE_PROVIDER_PJSIP_OPTIONS
        );
        $overriddenOptions['type'] = 'auth';

        // Use helper method to build section with overrides
        return $this->buildSectionWithOverrides(
            "{$provider['uniqid']}-AUTH",
            $baseOptions,
            $overriddenOptions,
            $manual_attributes,
            'endpoint-auth'
        );
    }

    /**
     * Generate the AOR (Address of Record) configuration for a provider.
     *
     * This method generates the AOR configuration for a specific provider based on the provided data and manual attributes.
     *
     * IMPORTANT: For INBOUND providers, AOR must be named as provider username (without suffix) for PJSIP registration to work.
     * When an inbound provider registers with username, PJSIP looks for AOR matching that username, not "username-AOR".
     *
     * @param array $provider The provider data.
     * @param array $manual_attributes The manual attributes for the provider.
     * @return string The generated AOR configuration.
     */
    private function generateProviderAor(array $provider, array $manual_attributes): string
    {
        // Initialize the configuration string
        $conf = '';

        // Base options that match the template
        $baseOptions = [
            'type'               => 'aor',
            'max_contacts'       => (string)self::MAX_CONTACTS_PROVIDER,
            'maximum_expiration' => PbxSettings::getValueByKey(PbxSettings::SIP_MAX_EXPIRY),
            'minimum_expiration' => PbxSettings::getValueByKey(PbxSettings::SIP_MIN_EXPIRY),
            'default_expiration' => PbxSettings::getValueByKey(PbxSettings::SIP_DEFAULT_EXPIRY),
        ];

        // Unique parameters not in template
        $uniqueParams = [];

        // Add contact for outbound and peer trunk types
        if ($provider['registration_type'] === Sip::REG_TYPE_OUTBOUND) {
            $uniqueParams['contact'] = "sip:{$provider['username']}@{$provider['host']}:{$provider['port']}";
        } elseif ($provider['registration_type'] === Sip::REG_TYPE_NONE) {
            $uniqueParams['contact'] = "sip:{$provider['host']}:{$provider['port']}";
        }

        if ($provider['qualify'] === '1') {
            $uniqueParams['qualify_frequency'] = $provider['qualifyfreq'];
            $uniqueParams['qualify_timeout']   = '3.0';
        }
        if (!empty($provider['outbound_proxy'])) {
            $uniqueParams['outbound_proxy'] = "sip:{$provider['outbound_proxy']}\;lr";
        }

        // Check if customization is needed
        $needsCustomization = $this->needsProviderCustomization(
            $provider,
            $manual_attributes,
            'aor',
            array_merge($baseOptions, $uniqueParams)
        );

        // AOR name matches provider uniqid (without suffix for simplicity and consistency)
        // For INBOUND providers, AOR must match username for registration to work
        // For OUTBOUND/NONE, using uniqid is fine as they don't register on our server
        $aorName = ($provider['registration_type'] === Sip::REG_TYPE_INBOUND)
            ? $provider['username']  // INBOUND: must match username for REGISTER
            : $provider['uniqid'];   // OUTBOUND/NONE: use uniqid

        // Add configuration section header (no description - already in visual separator)
        if ($needsCustomization) {
            // Use template with explicit overrides
            $conf .= "[$aorName](provider-aor-base)\n";

            // Add unique parameters
            foreach ($uniqueParams as $key => $value) {
                $conf .= "$key = $value\n";
            }

            // Override PJSIP options from modules
            $fullOptions = array_merge($baseOptions, $uniqueParams);
            $overriddenOptions = $this->overridePJSIPOptionsFromModules(
                $provider['uniqid'],
                $fullOptions,
                AsteriskConfigInterface::OVERRIDE_PROVIDER_PJSIP_OPTIONS
            );

            // Add module overrides (only parameters that differ from base)
            $moduleOverrides = array_diff_assoc($overriddenOptions, $fullOptions);
            $moduleOverrideLines = '';
            foreach ($moduleOverrides as $key => $value) {
                if (!isset($uniqueParams[$key]) && $key !== 'type') {
                    if (is_array($value)) {
                        $value = implode(',', $value);
                    }
                    $moduleOverrideLines .= "$key = $value\n";
                }
            }
            if (!empty($moduleOverrideLines)) {
                $conf .= "; === Module overrides ===\n" . $moduleOverrideLines;
            }

            // Apply manual attributes (highest priority)
            if (!empty($manual_attributes['aor'])) {
                $conf .= "; === Manual attributes ===\n";
                foreach ($manual_attributes['aor'] as $key => $value) {
                    if ($key !== 'type') {
                        if (is_array($value)) {
                            $value = implode(',', $value);
                        }
                        $conf .= "$key = $value\n";
                    }
                }
            }
        } else {
            // Use pure template inheritance with unique parameters only
            $conf .= "[$aorName](provider-aor-base)\n";
            foreach ($uniqueParams as $key => $value) {
                $conf .= "$key = $value\n";
            }
        }

        $conf .= "\n";
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
    private function generateProviderIdentify(array $provider, array $manual_attributes): string
    {
        $providerHosts = $this->dataSipHosts[$provider['uniqid']] ?? [];
        if (!empty($provider['outbound_proxy'])) {
            $providerHosts[] = explode(':', $provider['outbound_proxy'])[0];
        }
        if (empty($providerHosts)) {
            // Return empty configuration if provider hosts are empty
            return '';
        }

        $baseOptions = [
            'type'     => 'identify',
            'endpoint' => $provider['uniqid'],
            'match'    => implode(',', array_unique($providerHosts)),
        ];

        // Override PJSIP options from modules
        $overriddenOptions = $this->overridePJSIPOptionsFromModules(
            $provider['uniqid'],
            $baseOptions,
            AsteriskConfigInterface::OVERRIDE_PROVIDER_PJSIP_OPTIONS
        );

        // Use helper method to build section with overrides
        return $this->buildSectionWithOverrides(
            $provider['uniqid'],
            $baseOptions,
            $overriddenOptions,
            $manual_attributes,
            'identify'
        );
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
    private function generateProviderEndpoint(array $provider, array $manual_attributes): string
    {
        // Initialize the configuration string
        $conf = '';

        $fromdomain = (trim($provider['fromdomain']) === '') ? $provider['host'] : $provider['fromdomain'];
        $fromuser   = (trim($provider['fromuser']) === '') ? $provider['username'] : $provider['fromuser'];

        if ($provider['disablefromuser'] === '1') {
            $from_user   = null;
            $contactUser = trim($provider['username'] ?? '');
        } else {
            $from_user   = $fromuser;
            $contactUser = $fromuser;
        }
        $language   = PbxSettings::getValueByKey(PbxSettings::PBX_LANGUAGE);
        if ($provider['registration_type'] === Sip::REG_TYPE_INBOUND) {
            // For inbound providers, use username to match the endpoint/AOR name
            // Fallback to uniqid if username is empty
            $context_id = !empty($provider['username']) ? $provider['username'] : $provider['uniqid'];
            $context = "$context_id-incoming";
        } elseif (count($this->contexts_data[$provider['context_id']]) === 1) {
            $context_id = $provider['uniqid'];
            $context = "$context_id-incoming";
        } else {
            $context_id = str_replace('-incoming', '', $provider['context_id']);
            $context = "$context_id-incoming";
        }
        $dtmfmode = ($provider['dtmfmode'] === 'rfc2833') ? 'rfc4733' : $provider['dtmfmode'];

        // Get tone zone for this language
        $toneZone = self::getToneZoneValue($language);

        // Base options that match the template
        $baseOptions  = [
            'type'            => 'endpoint',
            'disallow'        => 'all',
            'allow'           => $provider['codecs'],
            '100rel'          => 'no',
            'rtp_symmetric'   => 'yes',
            'force_rport'     => 'yes',
            'rewrite_contact' => 'yes',
            'ice_support'     => 'no',
            'direct_media'    => 'no',
            'sdp_session'     => 'mikopbx',
            'language'        => $language,
            'timers'          => 'no',
            'rtp_keepalive'   => '0',
            'rtp_timeout'     => (string)self::PROVIDER_RTP_TIMEOUT,
            'rtp_timeout_hold' => (string)self::PROVIDER_RTP_TIMEOUT_HOLD,
            'inband_progress' => 'yes',
            'tone_zone'       => $toneZone,
        ];

        // Determine AOR name and endpoint name (for inbound use username, for others use uniqid)
        if ($provider['registration_type'] === Sip::REG_TYPE_INBOUND) {
            $aorName = $provider['username'];
            $endpointName = $provider['username'];
        } else {
            $aorName = $provider['uniqid'];
            $endpointName = $provider['uniqid'];
        }

        // Unique parameters not in template
        $uniqueParams = [
            'context'      => $context,
            'dtmf_mode'    => $dtmfmode,
            'from_user'    => $from_user,
            'from_domain'  => $fromdomain,
            'contact_user' => $contactUser,
            'aors'         => $aorName,
        ];

        if (!empty($provider['outbound_proxy'])) {
            $uniqueParams['outbound_proxy'] = "sip:{$provider['outbound_proxy']}\;lr";
        }
        if ($provider['registration_type'] === Sip::REG_TYPE_OUTBOUND) {
            $uniqueParams['outbound_auth'] = "{$provider['uniqid']}-AUTH";
        } elseif ($provider['registration_type'] === Sip::REG_TYPE_INBOUND) {
            $uniqueParams['auth'] = "{$provider['uniqid']}-AUTH";
            // For inbound providers, allow identification by username without requiring IP match
            // This enables authentication via username/password from any IP address
            $uniqueParams['identify_by'] = 'username,auth_username';
        }

        // Determine transport template
        $transport = $this->getProviderTransport($provider);
        $transportTemplate = "provider-endpoint-{$transport}";

        // Check if customization is needed
        $fullOptions = array_merge($baseOptions, $uniqueParams);
        $needsCustomization = $this->needsProviderCustomization(
            $provider,
            $manual_attributes,
            'endpoint',
            $fullOptions
        );

        // Add configuration section header (no description - already in visual separator)
        if ($needsCustomization) {
            // Use template with explicit overrides
            $conf .= "[$endpointName]($transportTemplate)\n";
            $conf .= "set_var = providerID={$provider['uniqid']}\n";

            // Add unique parameters
            foreach ($uniqueParams as $key => $value) {
                if ($value !== null) {
                    if (is_array($value)) {
                        $value = implode(',', $value);
                    }
                    $conf .= "$key = $value\n";
                }
            }

            // Override PJSIP options from modules
            $overriddenOptions = $this->overridePJSIPOptionsFromModules(
                $provider['uniqid'],
                $fullOptions,
                AsteriskConfigInterface::OVERRIDE_PROVIDER_PJSIP_OPTIONS
            );

            // Add module overrides (only parameters that differ from base)
            $moduleOverrides = [];
            foreach ($overriddenOptions as $key => $value) {
                $normalizedValue = is_array($value) ? implode(',', $value) : $value;
                $normalizedOriginal = isset($fullOptions[$key]) && is_array($fullOptions[$key]) 
                    ? implode(',', $fullOptions[$key]) 
                    : ($fullOptions[$key] ?? null);
                
                if ($normalizedValue !== $normalizedOriginal) {
                    $moduleOverrides[$key] = $value;
                }
            }
            
            $moduleOverrideLines = '';
            foreach ($moduleOverrides as $key => $value) {
                if (!isset($uniqueParams[$key]) && $key !== 'type') {
                    if (is_array($value)) {
                        $value = implode(',', $value);
                    }
                    $moduleOverrideLines .= "$key = $value\n";
                }
            }
            if (!empty($moduleOverrideLines)) {
                $conf .= "; === Module overrides ===\n" . $moduleOverrideLines;
            }

            // Apply manual attributes (highest priority)
            if (!empty($manual_attributes['endpoint'])) {
                $conf .= "; === Manual attributes ===\n";
                foreach ($manual_attributes['endpoint'] as $key => $value) {
                    if ($key !== 'type') {
                        if (is_array($value)) {
                            $value = implode(',', $value);
                        }
                        $conf .= "$key = $value\n";
                    }
                }
            }
        } else {
            // Use pure template inheritance with unique parameters only
            $conf .= "[$endpointName]($transportTemplate)\n";
            $conf .= "set_var = providerID={$provider['uniqid']}\n";
            foreach ($uniqueParams as $key => $value) {
                if ($value !== null) {
                    if (is_array($value)) {
                        $value = implode(',', $value);
                    }
                    $conf .= "$key = $value\n";
                }
            }
        }

        $conf .= "\n";
        return $conf;
    }

    /**
     * Get the incoming context ID for a given name and port.
     *
     * This method generates the incoming context ID by removing non-alphanumeric characters
     * from the resolved hostname/IP and port, then appending "-incoming" suffix.
     *
     * @param string $name The hostname or IP address
     * @param string $port The port number
     * @return string The generated incoming context ID (e.g., "1921681012005060-incoming")
     */
    public static function getIncomingContextId(string $name, string $port): string
    {
        // Use hostname directly without DNS resolution to avoid blocking during config generation
        // DNS resolution can take several seconds per unreachable host, causing slow startup
        // The context ID only needs to be unique and stable, not IP-based
        return preg_replace("/[^a-z\d]/iu", '', $name . $port) . '-incoming';
    }


    /**
     * Get the tone zone value for a language
     *
     * @param string $lang The language code in database format (e.g., 'ru_RU')
     * @return string The tone zone identifier
     */
    public static function getToneZoneValue(string $lang): string
    {
        return IndicationConf::LANG_ZONE_MAP[$lang] ?? self::DEFAULT_TONE_ZONE;
    }

    /**
     * Convert language code from database format to Asterisk format
     *
     * Converts language code from database format (e.g., 'ru_RU') to Asterisk format (e.g., 'ru-ru').
     * Returns default Asterisk language if the input is empty.
     *
     * @param string $langCode The language code in database format (e.g., 'ru_RU')
     * @return string The language code in Asterisk format (e.g., 'ru-ru')
     */
    public static function convertToAsteriskLanguageFormat(string $langCode): string
    {
        $asteriskLang = str_replace('_', '-', strtolower($langCode));
        return (trim($asteriskLang) === '') ? self::DEFAULT_ASTERISK_LANGUAGE : $asteriskLang;
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
        $langCode = PbxSettings::getValueByKey(PbxSettings::PBX_LANGUAGE); // Database format: ru_RU
        $conf = '';
        do {
            $data_peers = $this->getPeers();
            foreach ($data_peers as $peer) {
                $manual_attributes = Util::parseIniSettings($peer['manualattributes'] ?? '');

                // Add visual separator for extension group
                $calleridname = !empty($peer['calleridname']) ? " - {$peer['calleridname']}" : '';
                $conf .= "; --- PEER: {$peer['extension']}{$calleridname} ---\n";

                $conf              .= $this->generatePeerAuth($peer, $manual_attributes);
                $conf              .= $this->generatePeerAor($peer, $manual_attributes);
                $conf              .= $this->generatePeerEndpoint($langCode, $peer, $manual_attributes);

                // Add closing separator
                $conf .= "; ---\n\n";
            }
        } while (!empty($data_peers));
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
            'username' => $peer['extension'].PbxSettings::getValueByKey(PbxSettings::SIP_AUTH_PREFIX),
            'password' => $peer['secret'],
        ];

        // Override PJSIP options from modules
        $options = $this->overridePJSIPOptionsFromModules(
            $peer['extension'],
            $options,
            AsteriskConfigInterface::OVERRIDE_PJSIP_OPTIONS
        );

        // Add configuration section header (no callerid comment - already in main separator)
        $conf .= "[{$peer['extension']}-AUTH]\n";
        $conf .= Util::overrideConfigurationArray($options, $manual_attributes, 'auth');

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

        // Prepare base options for module override detection
        $options = [
            'type'              => 'aor',
            'qualify_frequency' => (string)self::QUALIFY_FREQUENCY,
            'qualify_timeout'   => (string)self::QUALIFY_TIMEOUT,
            'max_contacts'      => (string)self::MAX_CONTACTS_PEER,
            'remove_existing'   => 'yes',
            'remove_unavailable' => 'yes'
        ];

        // Get any overrides from modules
        $overriddenOptions = $this->overridePJSIPOptionsFromModules(
            $peer['extension'],
            $options,
            AsteriskConfigInterface::OVERRIDE_PJSIP_OPTIONS
        );

        // Determine if there are any customizations (module overrides or manual attributes)
        $hasCustomizations = ($overriddenOptions !== $options) || !empty($manual_attributes['aor']);

        // Note: AOR must have the same name as extension (without suffix) for PJSIP registration to work
        // When a peer registers with username "204", PJSIP looks for AOR named "204", not "204-AOR"
        if ($hasCustomizations) {
            // Use template with explicit overrides (PJSIP allows template parameters to be overridden)
            $conf .= "[{$peer['extension']}](aor-common)\n";

            // Add only the customized parameters (they will override template defaults)
            $customParams = array_diff_assoc($overriddenOptions, $options);
            foreach ($customParams as $key => $value) {
                if ($key !== 'type') { // 'type' is already in template
                    $conf .= "$key = $value\n";
                }
            }

            // Apply manual attributes (highest priority)
            if (!empty($manual_attributes['aor'])) {
                foreach ($manual_attributes['aor'] as $key => $value) {
                    if ($key !== 'type') {
                        $conf .= "$key = $value\n";
                    }
                }
            }
            $conf .= "\n";
        } else {
            // Use pure template inheritance for standard configuration (82% size reduction)
            $conf .= "[{$peer['extension']}](aor-common)\n\n";
        }

        // Generate the WebRTC aor section if enabled
        if (PbxSettings::getValueByKey(PbxSettings::USE_WEB_RTC) === '1') {
            // WebRTC AOR also needs to match extension name for registration
            if ($hasCustomizations) {
                $conf .= "[{$peer['extension']}-WS](aor-common)\n";
                $customParams = array_diff_assoc($overriddenOptions, $options);
                foreach ($customParams as $key => $value) {
                    if ($key !== 'type') {
                        $conf .= "$key = $value\n";
                    }
                }
                if (!empty($manual_attributes['aor'])) {
                    foreach ($manual_attributes['aor'] as $key => $value) {
                        if ($key !== 'type') {
                            $conf .= "$key = $value\n";
                        }
                    }
                }
                $conf .= "\n";
            } else {
                $conf .= "[{$peer['extension']}-WS](aor-common)\n\n";
            }
        }

        return $conf;
    }

    /**
     * Generate the endpoint section for a SIP peer.
     *
     * This method generates the endpoint section for a SIP peer in PJSIP format based
     * on the provided language, peer data, and manual attributes.
     *
     * @param string $langCode The PBX language code in database format (e.g., 'ru_RU').
     * @param array $peer The data of the SIP peer.
     * @param array $manual_attributes The manual attributes for the SIP peer.
     * @return string The generated configuration string for the endpoint section.
     */
    private function generatePeerEndpoint(
        string $langCode,
        array $peer,
        array $manual_attributes
    ): string {
        $conf     = '';
        $asteriskLang = self::convertToAsteriskLanguageFormat($langCode);  // Asterisk format: ru-ru

        $calleridname = (trim($peer['calleridname']) === '') ? $peer['extension'] : $peer['calleridname'];
        if (mb_strlen($calleridname) !== strlen($calleridname)) {
            // Limit the length of calleridname to 40 characters
            $calleridname = mb_substr($calleridname, 0, 40);
        }

        $dtmfmode = ($peer['dtmfmode'] === 'rfc2833') ? 'rfc4733' : $peer['dtmfmode'];
        $peer['transport'] = trim($peer['transport']??Sip::TRANSPORT_AUTO);
        if ($peer['transport'] === Sip::TRANSPORT_AUTO){
            $peer['transport'] = '';
        }

        // Determine template name based on transport (default to udp)
        $transportTemplate = 'endpoint-udp';
        if (!empty($peer['transport'])) {
            $transportTemplate = "endpoint-{$peer['transport']}";
        }

        // Prepare ONLY the parameters that are NOT in the template
        // Template already has: type, context, disallow, allow (codecs), all rtp_*, force_rport,
        // rewrite_contact, ice_support, direct_media, send_pai, named_call_group, named_pickup_group,
        // sdp_session, device_state_busy_at, timers, message_context, inband_progress, tone_zone, language, transport

        $uniqueParams = [
            'callerid'       => "$calleridname <{$peer['extension']}>",
            'aors'           => "{$peer['extension']}",  // AOR must match extension name for registration
            'auth'           => "{$peer['extension']}-AUTH",
            'outbound_auth'  => "{$peer['extension']}-AUTH",
            'dtmf_mode'      => $dtmfmode,
        ];

        // Add ACL only if network filter exists
        if (!empty($peer['permit']) || !empty($peer['deny'])) {
            $uniqueParams['acl'] = "acl_{$peer['extension']}";
        }

        // Extensions always use system language settings
        // No individual language configuration per extension

        // Get full options for module override detection
        $fullOptions = array_merge([
            'type'                 => 'endpoint',
            'context'              => 'all_peers',
            'disallow'             => 'all',
            'allow'                => $peer['codecs'],
            'rtp_symmetric'        => 'yes',
            'force_rport'          => 'yes',
            'rewrite_contact'      => 'yes',
            'ice_support'          => 'no',
            'direct_media'         => 'no',
            'send_pai'             => 'yes',
            'named_call_group'     => '1',
            'named_pickup_group'   => '1',
            'sdp_session'          => 'mikopbx',
            'language'             => $asteriskLang,
            'device_state_busy_at' => "1",
            'timers'               => 'no',
            'rtp_timeout'          => (string)self::RTP_TIMEOUT,
            'rtp_timeout_hold'     => (string)self::RTP_TIMEOUT_HOLD,
            'rtp_keepalive'        => (string)self::RTP_KEEPALIVE,
            'message_context'      => 'messages',
        ], $uniqueParams);

        if (!empty($peer['transport']) && $peer['transport'] !== Sip::TRANSPORT_AUTO) {
            $fullOptions['transport'] = "transport-{$peer['transport']}";
            if ($peer['transport'] === Sip::TRANSPORT_TLS) {
                $fullOptions['media_encryption'] = 'sdes';
            }
        }

        // Set tone zone based on system language
        $fullOptions['tone_zone'] = self::getToneZoneValue($langCode);

        // Get module overrides
        $overriddenOptions = $this->overridePJSIPOptionsFromModules(
            $peer['extension'],
            $fullOptions,
            AsteriskConfigInterface::OVERRIDE_PJSIP_OPTIONS
        );

        // Determine template parameters (already in endpoint-base)
        $templateParams = [
            'type', 'context', 'disallow', 'allow', 'rtp_symmetric', 'force_rport',
            'rewrite_contact', 'ice_support', 'direct_media', 'send_pai',
            'named_call_group', 'named_pickup_group', 'sdp_session', 'device_state_busy_at',
            'timers', 'rtp_timeout', 'rtp_timeout_hold', 'rtp_keepalive',
            'message_context', 'inband_progress', 'tone_zone', 'language', 'transport', 'media_encryption'
        ];

        // Generate endpoint with template inheritance
        $conf .= "[{$peer['extension']}]($transportTemplate)\n";

        // Add unique parameters
        foreach ($uniqueParams as $key => $value) {
            if (is_array($value)) {
                $value = implode(',', $value);
            }
            $conf .= "$key = $value\n";
        }

        // Add module overrides (only parameters that differ from full options or not in template)
        // Normalize array values before comparison to avoid "Array to string conversion" error
        $moduleOverrides = [];
        foreach ($overriddenOptions as $key => $value) {
            $normalizedValue = is_array($value) ? implode(',', $value) : $value;
            $normalizedOriginal = isset($fullOptions[$key]) && is_array($fullOptions[$key])
                ? implode(',', $fullOptions[$key])
                : ($fullOptions[$key] ?? null);

            if ($normalizedValue !== $normalizedOriginal) {
                $moduleOverrides[$key] = $value;
            }
        }

        foreach ($moduleOverrides as $key => $value) {
            if (!in_array($key, array_keys($uniqueParams))) {
                if (is_array($value)) {
                    $value = implode(',', $value);
                }
                $conf .= "$key = $value\n";
            }
        }

        // Apply manual attributes (highest priority, can override template and unique params)
        if (!empty($manual_attributes['endpoint'])) {
            foreach ($manual_attributes['endpoint'] as $key => $value) {
                // Skip if already added in unique params (will be overridden by manual)
                if (!in_array($key, ['type'])) { // type is always from template
                    $conf .= "$key = $value\n";
                }
            }
        }

        $conf .= $this->hookModulesMethod(AsteriskConfigInterface::GENERATE_PEER_PJ_ADDITIONAL_OPTIONS, [$peer]);
        $conf .= "\n";

        // Generate the WebRTC endpoint section if enabled
        if (PbxSettings::getValueByKey(PbxSettings::USE_WEB_RTC) === '1') {
            $conf .= "[{$peer['extension']}-WS](endpoint-wss)\n";
            $conf .= "callerid = $calleridname <{$peer['extension']}>\n";
            $conf .= "aors = {$peer['extension']}-WS\n";  // WebRTC AOR matches endpoint name
            $conf .= "auth = {$peer['extension']}-AUTH\n";
            $conf .= "outbound_auth = {$peer['extension']}-AUTH\n";
            $conf .= "dtmf_mode = $dtmfmode\n";

            // Add ACL if exists
            if (!empty($peer['permit']) || !empty($peer['deny'])) {
                $conf .= "acl = acl_{$peer['extension']}\n";
            }


            // Set Opus codec as priority for WebRTC
            if (in_array('opus', $peer['codecs'])) {
                $codecs = $peer['codecs'];
                $opusIndex = array_search('opus', $codecs);
                if ($opusIndex !== false) {
                    unset($codecs[$opusIndex]);
                    array_unshift($codecs, 'opus');
                }
                $conf .= "disallow = all\n";
                $conf .= "allow = " . implode(',', $codecs) . "\n";
            }

            $conf .= "rtcp_mux = yes\n";

            // Apply manual attributes for WebRTC endpoint
            if (!empty($manual_attributes['endpoint'])) {
                foreach ($manual_attributes['endpoint'] as $key => $value) {
                    if (!in_array($key, ['type', 'callerid', 'aors', 'auth', 'outbound_auth', 'dtmf_mode', 'acl', 'language', 'tone_zone', 'allow', 'disallow', 'rtcp_mux'])) {
                        $conf .= "$key = $value\n";
                    }
                }
            }

            $conf .= $this->hookModulesMethod(AsteriskConfigInterface::GENERATE_PEER_PJ_ADDITIONAL_OPTIONS, [$peer]);
            $conf .= "\n";
        }
        return $conf;
    }

    /**
     * Refreshes the SIP configurations and reloads the PJSIP module.
     * Synchronizes codec database with Asterisk before regenerating config.
     */
    public static function reload(): void
    {
        $di = \Phalcon\Di\Di::getDefault();
        if ($di === null) {
            return;
        }
        
        $sip = new self();
        $needRestart = $sip->needAsteriskRestart();
        $sip->generateConfig();

        $acl = new AclConf();
        $acl->generateConfig();

        $asterisk = Util::which('asterisk');
        if ($needRestart === false) {
            Processes::mwExec("$asterisk -rx 'module reload acl'");
            Processes::mwExec("$asterisk -rx 'core reload'");
        } else {
            SystemMessages::sysLogMsg('SIP RELOAD', 'Need reload asterisk', LOG_INFO);
            // Terminate channels.
            Processes::mwExec("$asterisk -rx 'channel request hangup all'");
            usleep(500000);
            Processes::mwExec("$asterisk -rx 'core restart now'");
        }
    }
}
