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
use MikoPBX\Common\Providers\MutexProvider;
use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Common\Providers\RedisClientProvider;
use MikoPBX\Core\Asterisk\AstDB;
use MikoPBX\Core\Asterisk\Configs\Generators\Extensions\IncomingContexts;
use MikoPBX\Core\Asterisk\Configs\Generators\Extensions\CallerIdDidProcessor;
use MikoPBX\Core\System\{ Network, Processes, SslCertificateService, System, SystemMessages, Util};
use MikoPBX\Core\System\Configs\PbxConf;
use MikoPBX\Core\Utilities\IpAddressHelper;
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

    /**
     * Cached TLS-certificate presence check.
     * Used to gate WebRTC (-WS) and SIP/TLS (-TLS) endpoint generation.
     */
    private static ?bool $hasCertsCache = null;

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
     * Track peer uniqids already emitted across paginated getPeers() calls.
     * Reset on each fresh paging cycle (offsetPeers === 0). See #1045.
     *
     * @var array<string,string>
     */
    protected array $seenPeerUniqids = [];

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
     * Cache key holding the list of provider hostnames that need periodic
     * DNS resolution for identify match=. Written at the end of each
     * pjsip.conf generation; read by WorkerSipDnsResolver. Lives on
     * RedisClientProvider (DB1, worker-IPC namespace) — admin-facing
     * "cache clear" buttons that wipe DB4 must NOT erase this state.
     */
    public const string CACHE_KEY_PENDING_HOSTS = 'pjsip:identify:pending-hosts';

    /**
     * Cache key prefix for the resolved-IP record of a single hostname.
     * Full key: CACHE_KEY_RESOLVED_PREFIX . normalizeHostnameKey($hostname).
     * Value: ['ips' => [...], 'at' => <unix-ts>, 'src' => 'A'|'SRV'].
     * Lives on RedisClientProvider (DB1).
     */
    public const string CACHE_KEY_RESOLVED_PREFIX = 'pjsip:identify:resolved:';

    /**
     * Resolved-IP records live 7 days. Long TTL is deliberate: it lets the
     * last known-good identify match= survive transient DNS outages spanning
     * reboots, while {@see \MikoPBX\Core\Workers\WorkerSipDnsResolver} refreshes
     * the value every `WorkerSipDnsResolver::CHECK_INTERVAL_SECONDS` (300s =
     * 5 minutes) when DNS is healthy (reviewer-agent finding R5-1).
     */
    public const int CACHE_TTL_RESOLVED = 7 * 86400;

    /**
     * Defensive cap on IPs read from one resolved-IP cache entry. A poisoned
     * Redis payload could otherwise flood pjsip.conf `identify match=` with
     * thousands of IPs, blowing up config size and Asterisk's identify-lookup
     * table. 64 IPs covers every real ITSP we have seen (Twilio publishes ≤4
     * regional IPs per signaling endpoint); anything larger is an indicator
     * of either misconfiguration or attack.
     */
    public const int MAX_IPS_PER_RESOLVED_ENTRY = 64;

    /**
     * Mutex name used to serialize concurrent pjsip.conf regeneration between
     * WorkerModelsEvents (ReloadPJSIPAction) and WorkerSipDnsResolver
     * (ReloadPJSIPIdentifyAction). Without this both PIDs may write the file
     * and the topology hash at the same wall-clock moment, leaving Asterisk
     * to module-reload a half-flushed config. See code-review item Critical-1.
     */
    public const string MUTEX_CONF_WRITE = 'pjsip-conf-write';

    /**
     * Provider → {ips: [], hostnames: []} map of admin-controlled additional
     * hosts loaded from m_SipHosts. IPs go straight into identify match=;
     * hostnames flow through the same Redis-cache pipeline as provider.host
     * (pendingResolveHostnames + readResolvedIps).
     *
     * Shape: [
     *   'provider_uniqid' => [
     *     'ips'       => ['1.2.3.4/32', ...],
     *     'hostnames' => ['sip.example.com', ...],
     *   ],
     * ]
     *
     * @var array<string, array{ips: array<int, string>, hostnames: array<int, string>}>
     */
    protected array $dataSipHosts;

    /**
     * Hostnames collected during pjsip.conf generation that need to be
     * resolved by WorkerSipDnsResolver. Persisted at the end of generation
     * into CACHE_KEY_PENDING_HOSTS so the worker has a single source of
     * truth and stale entries do not linger across config regenerations.
     *
     * @var array<string,true> Set-semantics: hostname keys, true values.
     */
    protected array $pendingResolveHostnames = [];

    /**
     * Process-local memo of resolved-IP lookups, keyed by normalized hostname.
     * A full pjsip.conf + extensions.conf regeneration calls
     * {@see self::readResolvedIps()} multiple times per hostname (from
     * generateProviderIdentify, getIncomingContextId for each peer/provider,
     * and from ExtensionsOutWorkTimeConf). Without this memo each call is a
     * Redis GET on a loopback socket — fast, but multiplied by N providers
     * × 4 call-sites it adds up needlessly.
     *
     * Reset at the top of {@see self::generateConfigProtected()} so stale
     * data from a previous generation cannot leak across calls in the long-
     * running WorkerModelsEvents process.
     *
     * @var array<string,array<int,string>>
     */
    private static array $resolvedIpsMemo = [];

    /**
     * The SIP technology used.
     *
     * @var string
     */
    protected string $technology = self::TYPE_PJSIP;

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
     * Check if interface is configured in dual-stack mode (IPv4 + IPv6 simultaneously).
     *
     * Dual-stack is active when:
     * - IPv4 is configured (ipaddr is not empty)
     * - IPv6 is in Manual mode (ipv6_mode='2') with address configured
     *
     * @param array $if_data Interface data from database
     * @return bool True if dual-stack mode is active, false otherwise
     */
    private function isDualStackInterface(array $if_data): bool
    {
        // Check IPv4 configuration
        $hasIPv4 = !empty($if_data['ipaddr']);

        // Check IPv6 Manual mode with address
        $hasIPv6 = ($if_data['ipv6_mode'] ?? '0') === '2' && !empty($if_data['ipv6addr']);

        return $hasIPv4 && $hasIPv6;
    }

    /**
     * Get topology data.
     *
     * Retrieves the necessary topology data including the topology type, external IP address, external hostname, subnets, and dual-stack mode.
     *
     * @return array An array containing the topology data: [topology, extipaddr, exthostname, subnets, dual_stack_mode]
     */
    private function getTopologyData(): array
    {
        $network = new Network();

        $topology       = LanInterfaces::TOPOLOGY_PUBLIC;
        $extipaddr      = '';
        $exthostname    = '';
        $dualStackMode  = '0'; // Default: dual-stack disabled
        $networks       = $network->getEnabledLanInterfaces();
        $subnets        = ['127.0.0.1/32', '::1/128']; // IPv4 and IPv6 localhost

        foreach ($networks as $if_data) {
            $lan_config = $network->getInterface($if_data['interface']);

            // Process IPv4 subnet
            if (!empty($lan_config['ipaddr']) && !empty($lan_config['subnet'])) {
                try {
                    $sub = new SubnetCalculator($lan_config['ipaddr'], $lan_config['subnet']);
                    $net = $sub->getNetworkPortion() . '/' . $lan_config['subnet'];
                    if ($if_data['topology'] === LanInterfaces::TOPOLOGY_PRIVATE && in_array($net, $subnets, true) === false) {
                        $subnets[] = $net;
                    }
                } catch (Throwable $e) {
                    CriticalErrorsHandler::handleExceptionWithSyslog($e);
                }
            }

            // Process IPv6 subnet (if IPv6 mode is Manual)
            $ipv6Mode = trim($if_data['ipv6_mode'] ?? '0');
            if ($ipv6Mode === '2' && !empty($lan_config['ipv6addr']) && !empty($lan_config['ipv6_subnet'])) {
                // IPv6 doesn't use SubnetCalculator - prefix length is stored directly
                $ipv6Net = trim($lan_config['ipv6addr']) . '/' . trim($lan_config['ipv6_subnet']);
                if ($if_data['topology'] === LanInterfaces::TOPOLOGY_PRIVATE && in_array($ipv6Net, $subnets, true) === false) {
                    $subnets[] = $ipv6Net;
                }
            }

            if (trim($if_data['internet']) === '1') {
                $topology       = trim($if_data['topology']??'');
                $extipaddr      = trim($if_data['extipaddr']??'');
                $exthostname    = trim($if_data['exthostname']??'');
                // Compute dual-stack mode dynamically (IPv4 + IPv6 Manual both configured)
                $dualStackMode  = $this->isDualStackInterface($if_data) ? '1' : '0';
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
            $dualStackMode,
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
        // Always re-read: singleton may hold stale data from a previous reload cycle.
        $this->refreshProviders();

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
        // Retrieve providers, out routes, technology, and SIP hosts data.
        $this->refreshProviders();
        $this->data_rout         = $this->getOutRoutes();
        $this->technology        = self::getTechnology();
        $this->dataSipHosts      = self::getSipHostsBuckets();
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

        // Issue #1045 (peers symmetry): start of a fresh paging cycle — clear
        // the duplicate tracker so a new generation does not see ghosts from
        // a previous one. ORDER BY id ASC keeps the smallest-id row as the
        // dedup winner across pages.
        if ($this->offsetPeers === 0) {
            $this->seenPeerUniqids = [];
        }

        $filter = [
            "type = 'peer' AND ( disabled <> '1')",
            'order'  => 'id ASC',
            'offset' => $this->offsetPeers,
            'limit'  => $this->limitSelectPeers,
        ];
        $db_data = Sip::find($filter)->toArray();
        $this->offsetPeers += $this->limitSelectPeers;
        if(count($db_data)===0){
            $this->offsetPeers = 0;
            $this->seenPeerUniqids = [];
            return $data;
        }
        // Process each SIP peer.
        foreach ($db_data as $arr_data) {
            // Issue #1045: same dedup as for providers — duplicate uniqid in
            // m_Sip rows of type='peer' would emit duplicate [name](aor) and
            // [name](endpoint) sections and Asterisk 22 res_sorcery_config
            // would reject pjsip.conf as a whole. Skip the later row.
            if ($this->shouldSkipDuplicateUniqid(
                (string)($arr_data['uniqid'] ?? ''),
                (string)($arr_data['id'] ?? ''),
                $this->seenPeerUniqids,
                'peer'
            )) {
                continue;
            }

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
            $arr_data['accept_multiple_calls'] = ($arr_data['accept_multiple_calls'] ?? '0') === '1';

            // Retrieve employee name.
            $extension = Extensions::findFirst("number = '$arr_data[extension]'");
            if (null === $extension) {
                $arr_data['publicaccess'] = false;
                $arr_data['calleridname'] = $arr_data['extension'];
                $arr_data['user_id'] = 0;
            } else {
                $arr_data['publicaccess'] = $extension->public_access;
                $arr_data['calleridname'] = $extension->callerid;
                $user                     = Users::findFirst($extension->userid);
                $arr_data['user_id'] = ($user !== null) ? $user->id : 0;
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
     * Reloads providers and their incoming contexts from DB.
     *
     * Resets contexts_data before reading because getProviders() appends to it.
     */
    private function refreshProviders(): void
    {
        $this->contexts_data = [];
        $this->data_providers = $this->getProviders();
    }

    /**
     * Decide whether a SIP row with the given uniqid is a duplicate that
     * must be skipped to keep pjsip.conf parseable.
     *
     * Issue #1045: when two m_Sip rows share one uniqid, pjsip.conf gets
     * duplicate `[name](aor)`/`[name](endpoint)` sections and Asterisk 22
     * res_sorcery_config rejects the whole file. Caller iterates rows in
     * id ASC order — the smallest-id row registers as the winner here, all
     * later rows are reported as duplicates and skipped.
     *
     * @param string             $uniqid       Row uniqid (already cast to string).
     * @param string             $rowId        m_Sip.id of the current row.
     * @param array<string,string> $seenUniqids Tracker mutated by this method:
     *                                          uniqid → winning rowId.
     * @param string             $kind         "provider"|"peer" — used in log only.
     *
     * @return bool true if the caller must skip this row.
     */
    protected function shouldSkipDuplicateUniqid(
        string $uniqid,
        string $rowId,
        array &$seenUniqids,
        string $kind
    ): bool {
        if (isset($seenUniqids[$uniqid])) {
            SystemMessages::sysLogMsg(
                __METHOD__,
                sprintf(
                    'Duplicate SIP %s uniqid "%s" detected (m_Sip.id=%s, kept m_Sip.id=%s). '
                    . 'Skipping duplicate to keep pjsip.conf parseable. '
                    . 'Fix: rewrite uniqid for the offending row or delete it.',
                    $kind,
                    $uniqid,
                    $rowId,
                    $seenUniqids[$uniqid]
                ),
                LOG_WARNING
            );
            return true;
        }
        $seenUniqids[$uniqid] = $rowId;
        return false;
    }

    /**
     * Get providers.
     *
     * Retrieves and returns the providers data as an array.
     * Side effect: appends to $this->contexts_data — call refreshProviders() instead of calling directly.
     *
     * @return array The providers data.
     */
    private function getProviders(): array
    {
        $data    = [];
        $codecs  = $this->getCodecs();
        // ORDER BY id ASC: on duplicate uniqid the earlier-created row wins,
        // later collisions are skipped (see #1045 dedup loop below).
        $db_data = Sip::find([
            "type = 'friend' AND ( disabled <> '1')",
            'order' => 'id ASC',
        ]);

        // Issue #1045: defensive dedup against duplicate provider uniqids.
        // Two providers sharing one uniqid produce duplicate [name](aor)/[name](endpoint)
        // sections in pjsip.conf. Asterisk 22 res_sorcery_config rejects the WHOLE file
        // on a duplicate object, taking down all extensions.
        $seenUniqids = [];
        foreach ($db_data as $sip_peer) {
            if ($this->shouldSkipDuplicateUniqid(
                (string)$sip_peer->uniqid,
                (string)$sip_peer->id,
                $seenUniqids,
                'provider'
            )) {
                continue;
            }

            $arr_data                               = $sip_peer->toArray();
            $network_filter                         = NetworkFilters::findFirst($sip_peer->networkfilterid);
            $arr_data['permit']                     = ($network_filter === null) ? '' : $network_filter->permit;
            $arr_data['deny']                       = ($network_filter === null) ? '' : $network_filter->deny;

            $arr_data['transport'] = trim($arr_data['transport'] ?? '');
            $arr_data['codecs'] = $codecs;
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
            // Preserve empty/zero port as marker for SRV-based discovery (RFC 3263).
            // Trim whitespace; do NOT substitute default — generators below build URI without :port.
            $arr_data['port'] = trim((string)($arr_data['port'] ?? ''));
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
        // ORDER BY id ASC keeps the same dedup winner as getProviders() (see #1045).
        $db_data = Sip::find([
            "type = 'friend' AND ( disabled <> '1')",
            'order' => 'id ASC',
        ]);

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
                // Issue #1045: stop on first match — if uniqid collides in m_Sip,
                // bind the route only to the row with the smallest id (the same
                // winner that getProviders() emits to pjsip.conf). Without this
                // break the dialplan would grow duplicate sections per route.
                break;
            }
        }

        return $data;
    }

    /**
     * Returns PJSIP ot SIP uses at PBX
     *
     * @return string
     */
    /**
     * Whether Asterisk has a usable TLS certificate file pair available.
     *
     * Result is cached per-process because the underlying SslCertificateService call
     * is invoked from generatePeerAor/Endpoint for every extension and from
     * InternalContexts dialplan generation. Only file presence is checked — expiry
     * validation is intentionally left to Asterisk at TLS handshake time.
     *
     * In long-running workers (WorkerApiCommands, WorkerSafeScriptsCore) the cache
     * can outlive the certificate file lifecycle (e.g. cert was created after the
     * first false-result was cached). resetCertsCache() must be called at the
     * start of every fresh config regeneration to force a re-probe.
     *
     * @return bool True if both certPath and keyPath are non-empty.
     */
    public static function hasCertificates(): bool
    {
        if (self::$hasCertsCache === null) {
            $certs = SslCertificateService::prepareAsteriskCertificates('asterisk-pjsip');
            self::$hasCertsCache = !empty($certs['certPath']) && !empty($certs['keyPath']);
        }
        return self::$hasCertsCache;
    }

    /**
     * Invalidate the cached TLS-certificate presence flag. Called from the top of
     * every fresh pjsip.conf / dialplan generation so a long-running worker picks
     * up newly-issued certificates without process restart.
     */
    public static function resetCertsCache(): void
    {
        self::$hasCertsCache = null;
    }

    public static function getTechnology(): string
    {
        return self::TYPE_PJSIP;
    }

    /**
     * Per-process memo of m_SipHosts row IDs already reported as invalid by
     * {@see self::getSipHostsBuckets()}. WorkerModelsEvents fires
     * getSipHostsBuckets on every related model change (SIP, Extension, Route
     * saves), which can easily reach dozens of regens per day. Without
     * de-duplication a single legacy invalid row would flood syslog with one
     * identical WARNING per regen — see code-review finding #10. Memoizing
     * per-process keeps the operator-visible signal (one log line on the
     * first regen after upgrade) without the noise.
     *
     * @var array<string, true>
     */
    private static array $warnedInvalidSipHostIds = [];

    /**
     * Flat per-provider list of address strings (IPs and hostnames mixed).
     *
     * Kept as the stable public API for 3rd-party modules in /var/www/mikopbx/
     * that iterate as `foreach ($hosts as $address) {...}`. Core consumers
     * inside this repo use {@see self::getSipHostsBuckets()} directly when
     * they need the IP/hostname split (for handing hostnames to
     * WorkerSipDnsResolver or for skipping non-IPs in the iptables whitelist).
     *
     * **Order contract** (changed in 2026.x; reviewer-agent finding A5):
     * within each provider's list, IP/CIDR literals come FIRST, hostnames
     * SECOND. Pre-2026.x this returned rows in SQLite-defined natural order,
     * which interspersed the two types. Modules that depended on insertion
     * order should switch to {@see self::getSipHostsBuckets()} and consume
     * `ips` / `hostnames` independently, or sort the flat list themselves.
     * Invalid rows that {@see self::getSipHostsBuckets()} drops with a
     * WARNING are also absent here — modules that need to surface invalid
     * data in their UI should iterate `SipHosts::find()` directly.
     *
     * Code-review finding #5.
     *
     * @return array<string, array<int, string>>
     */
    public static function getSipHosts(): array
    {
        return self::flattenBucketsToLegacyShape(self::getSipHostsBuckets());
    }

    /**
     * Pure transformation: bucket shape → legacy flat shape.
     *
     * Extracted as a testable static (reviewer-agent finding R5-4 / H8) so
     * the IPs-first ordering invariant — load-bearing for 3rd-party modules
     * pinned to pre-2026.x layout — has a unit test that doesn't need a DB.
     * If anyone "simplifies" by reverting to a single-pass `SipHosts::find()`
     * loop, the test fires before review.
     *
     * @param array<string, array{ips: array<int, string>, hostnames: array<int, string>}> $buckets
     * @return array<string, array<int, string>>
     */
    public static function flattenBucketsToLegacyShape(array $buckets): array
    {
        $flat = [];
        foreach ($buckets as $providerId => $bucket) {
            $flat[$providerId] = array_values(array_merge(
                $bucket['ips'] ?? [],
                $bucket['hostnames'] ?? []
            ));
        }
        return $flat;
    }

    /**
     * Load admin-controlled additional hosts (m_SipHosts) grouped by provider,
     * pre-split into IP/CIDR literals and hostnames.
     *
     * IPs land in identify match= verbatim; hostnames are queued for
     * WorkerSipDnsResolver and their resolved IPs are merged in at generation
     * time from the Redis cache. Invalid rows (control characters, totally
     * malformed values from pre-validation DB writes) are dropped here so the
     * generator never has to think about defence-in-depth on the bucket.
     *
     * @return array<string, array{ips: array<int, string>, hostnames: array<int, string>}>
     */
    public static function getSipHostsBuckets(): array
    {
        $dataSipHosts = [];
        // Deterministic order: SQLite returns rows in implementation-defined
        // order otherwise, which makes the per-row WARNING block below flap
        // between regens and confuses log-aggregation correlation
        // (code-review finding #15).
        $sipHosts = SipHosts::find(['order' => 'id']);

        foreach ($sipHosts as $hostData) {
            $providerId = (string)$hostData->provider_id;
            if (!isset($dataSipHosts[$providerId])) {
                $dataSipHosts[$providerId] = ['ips' => [], 'hostnames' => []];
            }

            // Strip stray newlines that pre-validation DB writes might have
            // landed (older code accepted raw textarea input verbatim).
            $address = trim(str_replace(PHP_EOL, '', (string)$hostData->address));
            if ($address === '') {
                continue;
            }

            if (self::isIpOrCidr($address)) {
                $dataSipHosts[$providerId]['ips'][] = $address;
                continue;
            }
            if (self::isValidHostname($address)) {
                $dataSipHosts[$providerId]['hostnames'][] = $address;
                continue;
            }
            // Anything left here is neither IP/CIDR nor a usable hostname —
            // a stale row from a release older than this validation gate, or
            // a value inserted directly via SQL. Emit the WARNING once per
            // process (memoized below) so operators upgrading from <2026.x
            // notice the silent drop, without flooding syslog on every regen
            // (code-review findings #9 and #10).
            $rowId = (string)$hostData->id;
            if (!isset(self::$warnedInvalidSipHostIds[$rowId])) {
                self::$warnedInvalidSipHostIds[$rowId] = true;
                // SIP-IDENT-DROP prefix groups all silent-drop sites
                // (additional hosts, additionalHosts ingest, warmup
                // failure) under one grep / alertmanager pattern
                // (reviewer-agent finding R5-3).
                SystemMessages::sysLogMsg(
                    __METHOD__,
                    sprintf(
                        "SIP-IDENT-DROP: m_SipHosts row id=%s provider=%s address=%s "
                        . "rejected by validation — skipped on regen",
                        $rowId,
                        $providerId,
                        $address
                    ),
                    LOG_WARNING
                );
            }
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
                if (self::hasCertificates()) {
                    $hint .= "&$this->technology/$peer[extension]-WS";
                    $hint .= "&$this->technology/$peer[extension]-TLS";
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
        // Force a fresh certificate-presence probe so long-running workers pick up
        // newly-issued certs without restart.
        self::resetCertsCache();

        // Reset the per-generation hostname collector. Without this, repeated
        // generations on the same long-running object would accumulate stale
        // entries from providers that were since removed or renamed.
        $this->pendingResolveHostnames = [];

        // NOTE: resolvedIpsMemo reset has been moved out of this method to
        // the top-level callers (SIPConf::reloadUnderLock, ExtensionsConf::
        // reload, ReloadPJSIPIdentifyAction::regenerateAndReload, and
        // SaveRecordAction::warmupDnsCache). Resetting here would wipe the
        // memo that getSettings() / refreshProviders() / getIncomingContextId()
        // populated BEFORE generateConfigProtected() runs in the parent
        // generateConfig() flow, producing a mismatch between the context
        // name baked into endpoint.context (step 1) and the match-IPs read
        // for the identify section (step 3) when WorkerSipDnsResolver
        // updates Redis between those two steps.

        $conf  = $this->generateGeneralPj();
        $conf .= $this->generateProvidersPj();
        $conf .= $this->generatePeersPj();

        // In environments without iptables (Docker, LXC without CAP_NET_ADMIN),
        // add global PJSIP ACL sections that check ALL incoming SIP requests
        // before endpoint identification and authentication (res_pjsip_acl module).
        // This is required because per-endpoint 'acl' only applies after auth.
        if (!System::canManageFirewall()) {
            $conf .= "\n; === Global ACL filters (checked on every incoming SIP request) ===\n";
            $conf .= "[fail2ban-acl]\n";
            $conf .= "type = acl\n";
            $conf .= "acl = acl_fail2ban\n\n";

            $conf .= "[network-filters-deny-acl]\n";
            $conf .= "type = acl\n";
            $conf .= "acl = acl_network_filters_deny\n\n";
        }

        // Write pjsip.conf file
        $this->saveConfig($conf, $this->description);

        // Publish the SET of provider hostnames that still need DNS resolution.
        // Populated incrementally by generateProviderIdentify() for every provider
        // whose host or outbound_proxy is a hostname (not an IP/CIDR literal).
        // Read by WorkerSipDnsResolver on its next tick.
        $this->persistPendingHostnames();

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
            "user_agent = PBX\n\n";
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

        // IPv4 UDP transport
        $conf .= "[transport-udp]\n" .
            "$typeTransport\n" .
            "protocol = udp\n" .
            "bind=0.0.0.0:{$transportParams['sipPort']}\n" .
            "{$transportParams['natConf']}\n\n";

        // IPv4 TCP transport
        $conf .= "[transport-tcp]\n" .
            "$typeTransport\n" .
            "protocol = tcp\n" .
            "bind=0.0.0.0:{$transportParams['sipPort']}\n" .
            "{$transportParams['natConf']}\n\n";

        // Check if IPv6 is enabled on any interface
        if ($this->hasIpv6Interfaces()) {
            // IPv6 UDP transport
            $conf .= "[transport-udp-ipv6]\n" .
                "$typeTransport\n" .
                "protocol = udp\n" .
                "bind=[::]:{$transportParams['sipPort']}\n" .
                "{$transportParams['natConf']}\n\n";

            // IPv6 TCP transport
            $conf .= "[transport-tcp-ipv6]\n" .
                "$typeTransport\n" .
                "protocol = tcp\n" .
                "bind=[::]:{$transportParams['sipPort']}\n" .
                "{$transportParams['natConf']}\n\n";
        }

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

        // IPv4 TLS transport
        $conf .= "[transport-tls]\n" .
            "$typeTransport\n" .
            "protocol = tls\n" .
            "bind=0.0.0.0:{$transportParams['tlsPort']}\n" .
            "cert_file={$transportParams['certs']['certPath']}\n" .
            "priv_key_file={$transportParams['certs']['keyPath']}\n" .
            "method=tlsv1_2\n" .
            "{$transportParams['tlsNatConf']}\n\n";

        // IPv4 WSS transport for WebRTC
        $conf .= "[transport-wss]\n" .
            "$typeTransport\n" .
            "protocol = wss\n" .
            "bind=0.0.0.0:{$transportParams['wssPort']}\n" .
            "cert_file={$transportParams['certs']['certPath']}\n" .
            "priv_key_file={$transportParams['certs']['keyPath']}\n" .
            "{$transportParams['natConf']}\n\n";

        // Check if IPv6 is enabled on any interface
        if ($this->hasIpv6Interfaces()) {
            // IPv6 TLS transport
            $conf .= "[transport-tls-ipv6]\n" .
                "$typeTransport\n" .
                "protocol = tls\n" .
                "bind=[::]:{$transportParams['tlsPort']}\n" .
                "cert_file={$transportParams['certs']['certPath']}\n" .
                "priv_key_file={$transportParams['certs']['keyPath']}\n" .
                "method=tlsv1_2\n" .
                "{$transportParams['tlsNatConf']}\n\n";

            // IPv6 WSS transport for WebRTC
            $conf .= "[transport-wss-ipv6]\n" .
                "$typeTransport\n" .
                "protocol = wss\n" .
                "bind=[::]:{$transportParams['wssPort']}\n" .
                "cert_file={$transportParams['certs']['certPath']}\n" .
                "priv_key_file={$transportParams['certs']['keyPath']}\n" .
                "{$transportParams['natConf']}\n\n";
        }

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
            "sdp_session = PBX\n" .
            "language = {$templateParams['language']}\n" .
            "device_state_busy_at = 1\n" .
            "timers = no\n" .
            "rtp_timeout = " . self::RTP_TIMEOUT . "\n" .
            "rtp_timeout_hold = " . self::RTP_TIMEOUT_HOLD . "\n" .
            "rtp_keepalive = " . self::RTP_KEEPALIVE . "\n" .
            "message_context = messages\n" .
            "inband_progress = yes\n" .
            "tone_zone = {$templateParams['toneZone']}\n\n";

        // AUTO template — no pinned transport; PJSIP selects per contact URI.
        // Used when peer has multiple transports (e.g. TRANSPORT_AUTO = 'udp,tcp')
        // so that qualify/OPTIONS to TCP-registered contacts does not fail with
        // PJSIP_ETPNOTSUITABLE on a UDP-only endpoint.
        $conf .= "[endpoint-auto](endpoint-base,!)\n\n";

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
            "sdp_session = PBX\n" .
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
     * @param array $topologyData Topology data [topology, extipaddr, exthostname, subnets, dual_stack_mode]
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
        $dualStackMode = $topologyData[4] ?? '0';

        // CRITICAL: Dual-stack mode validation
        // In dual-stack (IPv4+IPv6), PJSIP MUST use hostname with A+AAAA records
        // Using IP address in dual-stack is FORBIDDEN
        if ($dualStackMode === '1') {
            if (empty($externalHostName)) {
                SystemMessages::sysLogMsg(__METHOD__, "ERROR: Dual-stack mode enabled but exthostname is empty. Dual-stack requires hostname with A and AAAA DNS records.");
                return ['natConf' => $natConf, 'tlsNatConf' => $tlsNatConf];
            }

            // Verify hostname resolves (both A and AAAA records should exist)
            $resolveOk = Processes::mwExec("timeout 1 getent hosts '$externalHostName'") === 0;
            if (!$resolveOk) {
                SystemMessages::sysLogMsg(__METHOD__, "ERROR: Dual-stack mode enabled but hostname '$externalHostName' does not resolve. Check DNS configuration.");
                return ['natConf' => $natConf, 'tlsNatConf' => $tlsNatConf];
            }

            // In dual-stack mode, ONLY use hostname (NEVER IP address)
            $parts = explode(':', $externalHostName);
            $externalHostNameWithoutPort = $parts[0];
            $natConf .= 'external_media_address=' . $externalHostNameWithoutPort . "\n";
            $natConf .= 'external_signaling_address=' . $externalHostNameWithoutPort . "\n";
            $tlsNatConf = "{$natConf}external_signaling_port=$externalTlsPort";
            $natConf .= 'external_signaling_port=' . $externalSipPort;

            SystemMessages::sysLogMsg(__METHOD__, "Dual-stack mode: Using hostname '$externalHostNameWithoutPort' for external addresses.");
            return ['natConf' => $natConf, 'tlsNatConf' => $tlsNatConf];
        }

        // Non-dual-stack mode: Use existing priority logic (hostname > IP)
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
        $seenProviderUniqids = [];

        // Iterate through each data provider
        foreach ($this->data_providers as $provider) {
            // Defensive dedup at render stage (issue #1045):
            // if upstream provider collection returns duplicate uniqids for any reason,
            // skip later rows to keep pjsip.conf parseable.
            if ($this->shouldSkipDuplicateUniqid(
                (string)($provider['uniqid'] ?? ''),
                (string)($provider['id'] ?? ''),
                $seenProviderUniqids,
                'provider'
            )) {
                continue;
            }

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

        // Unique parameters not in template.
        // Empty/zero port → omit ":port" from URI so PJSIP performs SRV-based discovery
        // (RFC 3263): _sip._udp/_tcp/_tls.<host>. Required by SRV-only providers.
        $hostPort = self::buildHostPort($provider['host'], $provider['port']);
        $uniqueParams = [
            'outbound_auth' => "{$provider['uniqid']}-REG-AUTH",
            'contact_user'  => $provider['username'],
            'server_uri'    => "sip:{$hostPort}",
            'client_uri'    => "sip:{$provider['username']}@{$hostPort}",
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

        // Add contact for outbound and peer trunk types.
        // Empty/zero port → omit ":port" so PJSIP performs SRV-based discovery (RFC 3263).
        $hostPort = self::buildHostPort($provider['host'], $provider['port']);
        if ($provider['registration_type'] === Sip::REG_TYPE_OUTBOUND) {
            $uniqueParams['contact'] = "sip:{$provider['username']}@{$hostPort}";
        } elseif ($provider['registration_type'] === Sip::REG_TYPE_NONE) {
            $uniqueParams['contact'] = "sip:{$hostPort}";
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
        // identify match= MUST contain literal IP/CIDR — res_pjsip_endpoint_identifier_ip
        // resolves match through the PJLIB DNS resolver exactly once at module load and
        // never re-resolves. A failed resolve at load (DNS race on boot, NXDOMAIN at the
        // moment) leaves identify empty forever and incoming INVITEs fall into anonymous.
        //
        // Source order for the literal IP/CIDR pool:
        //   1. admin-controlled m_SipHosts IPs  (literal, used verbatim)
        //   2. provider.host                    if it is itself an IP/CIDR
        //   3. outbound_proxy host              same rule
        //   4. cached resolved IPs              from CACHE_KEY_RESOLVED_PREFIX, populated by
        //                                       WorkerSipDnsResolver via SRV+A/AAAA, for
        //                                       provider.host, outbound_proxy AND any
        //                                       hostname stored in m_SipHosts
        //
        // Hostnames (from any source) go into $pendingResolveHostnames; the worker reads
        // the accumulated SET at CACHE_KEY_PENDING_HOSTS after we persist it at end of
        // generation. Graceful degradation: when an admin-stored hostname has no cache
        // entry yet, only that hostname is silently dropped from match= — sibling
        // IP literals stay, so identify remains operational on its known-good subset.
        $bucket = $this->dataSipHosts[$provider['uniqid']]
            ?? ['ips' => [], 'hostnames' => []];
        $providerHosts = $bucket['ips'];

        $hostnamesToResolve = $bucket['hostnames'];
        foreach ([$provider['host'] ?? '', self::extractHostFromOutboundProxy($provider['outbound_proxy'] ?? '')] as $rawHost) {
            $rawHost = trim((string)$rawHost);
            if ($rawHost === '') {
                continue;
            }
            if (self::isIpOrCidr($rawHost)) {
                $providerHosts[] = $rawHost;
                continue;
            }
            $hostnamesToResolve[] = $rawHost;
        }

        foreach ($hostnamesToResolve as $rawHost) {
            // Hostname — defer to cache. Worker fills CACHE_KEY_RESOLVED_PREFIX.
            $hostKey = self::normalizeHostnameKey($rawHost);
            if ($hostKey === '') {
                continue;
            }
            $this->pendingResolveHostnames[$hostKey] = true;
            $cachedIps = self::readResolvedIps($hostKey);
            if (!empty($cachedIps)) {
                $providerHosts = array_merge($providerHosts, $cachedIps);
            }
        }

        if (empty($providerHosts)) {
            // No literal IP/CIDR available (yet). identify section is omitted; incoming
            // calls from this provider will not be identified by IP until either:
            //   - admin adds an IP/CIDR to "Additional hosts" (m_SipHosts), or
            //   - WorkerSipDnsResolver successfully resolves the hostname and we
            //     regenerate via ReloadPJSIPIdentifyAction.
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
            'sdp_session'     => 'PBX',
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
     * Clear the process-local resolved-IP memo populated by {@see self::readResolvedIps()}.
     *
     * Must be called at the top of any code path that may consume the cached
     * resolved IPs but does NOT go through {@see self::generateConfigProtected()}.
     * In particular, {@see ExtensionsConf::reload()} calls
     * {@see self::getIncomingContextId()} via the off-work-times generator
     * without first regenerating pjsip.conf — without this reset the memo
     * survives across two unrelated reload actions in a single long-running
     * WorkerModelsEvents process and serves stale data.
     */
    public static function resetResolvedIpsMemo(): void
    {
        self::$resolvedIpsMemo = [];
    }

    /**
     * Whether a string is a literal IPv4/IPv6 address or CIDR block.
     * Used as the gate that decides if a provider host is suitable for
     * identify match= directly, or whether it must go through DNS resolution
     * (which is deferred to WorkerSipDnsResolver, never done synchronously
     * during pjsip.conf generation — see SIPConf.php:2107-2109 comment).
     */
    public static function isIpOrCidr(string $value): bool
    {
        $value = trim($value);
        if ($value === '') {
            return false;
        }
        $ip = explode('/', $value, 2)[0];
        return IpAddressHelper::isIpv4($ip) || IpAddressHelper::isIpv6($ip);
    }

    /**
     * Strict RFC 1123 hostname check used by m_SipHosts ingest, warmup and
     * generation. Intentionally NARROW: only LDH characters (Letter / Digit /
     * Hyphen), dots between labels, no colons, no brackets, no underscores.
     *
     * Rejected by design (each was a source of silent failure in prior
     * iterations — see follow-up code review of dad236bba):
     *   - bracketed IPv6 `[2001:db8::1]` (filter_var rejects brackets, so
     *     isIpOrCidr returns false; if isValidHostname accepted the bracket
     *     form the value would route to the DNS pipeline and never resolve).
     *   - `host:port` shape `sip.example.com:5060` (admin copy-paste typo —
     *     the colon broke the warmup batch key demux `{host}::{tag}`).
     *   - SRV labels `_sip._tcp.example.com` (warmup re-prefixes with the
     *     same SIP service prefixes, producing nonsense queries like
     *     `_sip._udp._sip._tcp.example.com` which always NXDOMAIN).
     *   - bare colons / structural garbage `::::`, `.....`, `:::.`.
     *
     * IPv6 in canonical (unbracketed) form is handled by {@see self::isIpOrCidr()};
     * CIDR is also handled there. Punycoded IDNs pass because they are pure
     * LDH (e.g. `xn--80aaxitdbjk.xn--p1ai`).
     *
     * @internal The strict gate is the load-bearing invariant for the
     *           `{hostKey}::{tag}` key scheme in
     *           {@see SaveRecordAction::warmupDnsCache()}. Loosening it to
     *           re-admit `:` requires switching that delimiter to a sentinel
     *           that cannot appear in any hostname (e.g. `"\x1f"`).
     */
    public static function isValidHostname(string $value): bool
    {
        $value = trim($value);
        if ($value === '') {
            return false;
        }
        // FQDN canonical form may end with a trailing dot — accept that
        // shape but require the labels themselves to validate.
        $value = rtrim($value, '.');
        // Total length cap from RFC 1035 (253 octets, not counting the
        // implicit final dot). Per-label length cap is 63, enforced by
        // the regex below.
        if ($value === '' || strlen($value) > 253) {
            return false;
        }
        // Per-label: starts and ends with alphanumeric, may contain
        // alphanumeric or hyphens in between, length 1..63. At least two
        // labels required (otherwise single-label `pbx1`/`localhost` slip
        // through — almost always typos for a literal IP).
        $label = '[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?';
        return (bool)preg_match("/^{$label}(?:\\.{$label})+$/", $value);
    }

    /**
     * Composite gate for additional-hosts ingest (m_SipHosts).
     * True if the value is either an IP/CIDR literal or a hostname.
     *
     * Upgrade note (code-review finding #6): pre-2026.x deployments may
     * carry single-label hostnames in m_SipHosts (e.g. corporate `mainpbx`
     * resolvable through a DHCP search domain). After this patch they no
     * longer satisfy {@see self::isValidHostname()} and are skipped here
     * AND rejected upstream by the OpenAPI pattern in
     * {@see \MikoPBX\PBXCoreREST\Lib\Providers\DataStructure}'s
     * `additionalHosts[].address`. The result is loud, not silent: the
     * REST API returns HTTP 422 (schema validation) before
     * {@see SaveRecordAction::updateAdditionalHosts()} ever runs, so
     * legacy rows stay in the DB untouched until the admin edits them.
     * Per-process WARNING from {@see SIPConf::getSipHosts()} surfaces the
     * dead rows in syslog so operators can clean them up post-upgrade.
     */
    public static function isAcceptableAdditionalHost(string $value): bool
    {
        // CIDR path: parse strictly via IpAddressHelper::normalizeCidr(),
        // which applies FILTER_VALIDATE_INT to the prefix and enforces the
        // legal range (1..32 for IPv4, 1..128 for IPv6) — then explicitly
        // reject prefix 0.
        //
        // The previous gate compared the prefix string against the literal
        // "0" after trim(), which was bypassable by any non-canonical
        // decimal-equivalent shape: "/00", "/+0", "/-0", "/0x0". Each of
        // those left the string-compare unequal, then fell through to
        // isIpOrCidr() — which only validates the IP half and accepts any
        // garbage prefix. The value then landed verbatim in pjsip identify
        // match= and iptables -s, where Asterisk / netfilter parse the
        // prefix with C-style atoi() and collapse it to /0 ("trust ALL
        // source IPs", "ACCEPT from anywhere") — silently disabling the
        // entire SIP source-IP ACL (security review finding H1 / extends
        // reviewer-agent finding R6-P1).
        //
        // Non-CIDR shapes fall through to the existing union check.
        $trimmed = trim($value);
        if (str_contains($trimmed, '/')) {
            $cidr = IpAddressHelper::normalizeCidr($trimmed);
            if ($cidr === false || $cidr['prefix'] === 0) {
                return false;
            }
            return true;
        }
        return self::isIpOrCidr($value) || self::isValidHostname($value);
    }

    /**
     * Strip the surrounding brackets from a `[IPv6]`-shaped string and
     * return the bare IPv6 literal; pass anything else through unchanged.
     *
     * Admins commonly copy-paste IPv6 from SIP URIs where bracketing is
     * canonical (e.g. `[2001:db8::1]`). MikoPBX stores host fields without
     * brackets, so both the provider.host ingest path and the
     * m_SipHosts additionalHosts ingest path normalize here before the
     * structural gate {@see self::isAcceptableAdditionalHost()}. Keeping the
     * normalization in one place avoids the asymmetry where one ingest
     * accepts bracketed IPv6 and the other silently drops it.
     */
    public static function stripIpv6Brackets(string $value): string
    {
        $value = trim($value);
        if (
            strlen($value) >= 2
            && $value[0] === '['
            && str_ends_with($value, ']')
        ) {
            return substr($value, 1, -1);
        }
        return $value;
    }

    /**
     * Canonical key for a hostname used in cache lookups. Mirrors the
     * normalizeHost() rule from #1044 (AbstractProviderStatusAction) so that
     * hostnames stored in DB and hostnames returned from the SRV/A resolver
     * collapse to the same key regardless of case or trailing FQDN dot.
     *
     * Also strips any character outside the host whitelist (same one enforced
     * by the API DataStructure pattern for provider.host) as defence-in-depth:
     * pre-patch DB rows or m_SipHosts entries written before the validation
     * existed could contain newlines or control characters that would land in
     * syslog formatting via the worker (see audit finding INFO-LEAK-1).
     */
    public static function normalizeHostnameKey(string $hostname): string
    {
        $stripped = preg_replace('/[^a-zA-Z0-9._\-:\[\]]/', '', $hostname) ?? '';
        return strtolower(rtrim(trim($stripped), '.'));
    }

    /**
     * Extract the host portion from an outbound_proxy value, handling:
     *   - bare hostname/IP                       → "host"
     *   - hostname/IPv4 with port                → "host:port" → "host"
     *   - IPv6 in brackets, optional port        → "[2001:db8::1]:5060" → "2001:db8::1"
     *   - SIP URI with parameters                → "host;transport=udp" → "host"
     * Mirrors the bracketing rules of buildHostPort() (the inverse direction).
     */
    public static function extractHostFromOutboundProxy(string $outboundProxy): string
    {
        $value = trim($outboundProxy);
        if ($value === '') {
            return '';
        }
        // Strip URI parameters (;transport=...) and scheme (sip:/sips:) — outbound_proxy
        // in MikoPBX is normally just host[:port] but be defensive.
        $value = preg_replace('/^sips?:/i', '', $value);
        $value = explode(';', $value, 2)[0];

        // Bracketed IPv6: [2001:db8::1] or [2001:db8::1]:5060
        if (str_starts_with($value, '[')) {
            $end = strpos($value, ']');
            if ($end !== false) {
                return substr($value, 1, $end - 1);
            }
        }
        // hostname/IPv4 [:port]
        $parts = explode(':', $value);
        if (count($parts) === 2) {
            return $parts[0];
        }
        // Bare IPv6 without brackets — return whole string; isIpOrCidr will validate.
        return $value;
    }

    /**
     * Read the cached resolved-IP set for a normalized hostname key.
     * Returns an array of literal IPs (filtered to valid IPv4/IPv6 only).
     * Empty array on cache miss, malformed payload, or DI absence.
     *
     * Cache lives on RedisClientProvider (DB1) — same namespace as the rest
     * of worker IPC; survives admin-side "cache clear" of DB4.
     *
     * Storage shape: raw \Redis (DB1) returns string|false. We store payloads
     * JSON-encoded so the format is explicit and format-independent
     * (Phalcon's PHP serializer is bypassed because RedisClientProvider
     * returns the bare \Redis client, not its Storage Adapter wrapper).
     *
     * Process-local memo (see {@see self::$resolvedIpsMemo}) collapses the
     * 4+ Redis GETs per hostname during a single full generation pass into
     * one. Memo is reset at the top of generateConfigProtected().
     *
     * Public so cross-config consumers (e.g. {@see \MikoPBX\Core\System\Configs\IptablesConf}
     * for the additional-hosts firewall whitelist) can share the same cache
     * and memo as pjsip identify match= generation, keeping identify trust
     * and firewall trust end-to-end consistent (code-review finding #7).
     * Callers MUST pass a key already normalized via
     * {@see self::normalizeHostnameKey()}.
     */
    public static function readResolvedIps(string $hostKey): array
    {
        if (isset(self::$resolvedIpsMemo[$hostKey])) {
            return self::$resolvedIpsMemo[$hostKey];
        }

        $di = \Phalcon\Di\Di::getDefault();
        if ($di === null) {
            return self::$resolvedIpsMemo[$hostKey] = [];
        }
        try {
            $cache = $di->get(RedisClientProvider::SERVICE_NAME);
            $raw = $cache->get(self::CACHE_KEY_RESOLVED_PREFIX . $hostKey);
        } catch (Throwable) {
            return self::$resolvedIpsMemo[$hostKey] = [];
        }
        if (!is_string($raw) || $raw === '') {
            return self::$resolvedIpsMemo[$hostKey] = [];
        }
        $payload = json_decode($raw, true);
        if (!is_array($payload) || empty($payload['ips']) || !is_array($payload['ips'])) {
            return self::$resolvedIpsMemo[$hostKey] = [];
        }
        // Defensive truncation BEFORE the per-IP validation loop — a payload
        // with tens of thousands of strings would otherwise pay the
        // filter_var() cost on every entry. Anyone exceeding the cap is
        // either misconfigured or hostile; log once so operators can spot it.
        $ips = $payload['ips'];
        if (count($ips) > self::MAX_IPS_PER_RESOLVED_ENTRY) {
            SystemMessages::sysLogMsg(
                __METHOD__,
                sprintf(
                    'Resolved-IP cache entry for %s holds %d entries (max %d) — truncated',
                    $hostKey,
                    count($ips),
                    self::MAX_IPS_PER_RESOLVED_ENTRY
                ),
                LOG_WARNING
            );
            $ips = array_slice($ips, 0, self::MAX_IPS_PER_RESOLVED_ENTRY);
        }
        // Defense in depth: even though WorkerSipDnsResolver and
        // SaveRecordAction::warmupDnsCache already filter via isPublicIp()
        // on write, drop any non-public IPs that might have landed in
        // Redis from an older patch revision or direct Redis-side
        // tampering. Without this, `identify match=` in pjsip.conf could
        // accept attacker-controlled traffic from loopback / RFC1918.
        $valid = [];
        foreach ($ips as $ip) {
            $ip = (string)$ip;
            if (IpAddressHelper::isPublicIp($ip)) {
                $valid[] = $ip;
            }
        }
        return self::$resolvedIpsMemo[$hostKey] = $valid;
    }

    /**
     * Persist the list of hostnames encountered during this generation pass
     * so WorkerSipDnsResolver can iterate them on its next tick.
     * Single overwrite — old entries removed implicitly when no provider
     * references that hostname anymore.
     *
     * Stored on RedisClientProvider (DB1) as a JSON-encoded array; the raw
     * \Redis client does not auto-serialize, so we encode explicitly.
     *
     * Degradation mode: if Redis is down at generation time the list is
     * never published, the worker reads `false` and sleeps until the next
     * generation succeeds. pjsip.conf is still self-consistent — identify
     * sections for hostname providers were also omitted because the
     * resolved-IP cache was unreachable in the same call.
     */
    protected function persistPendingHostnames(): void
    {
        $di = \Phalcon\Di\Di::getDefault();
        if ($di === null) {
            return;
        }
        try {
            $cache = $di->get(RedisClientProvider::SERVICE_NAME);
            $payload = json_encode(array_keys($this->pendingResolveHostnames));
            if ($payload === false) {
                return; // unreachable for a plain array of strings, but defensive
            }
            // setex semantics: SET key TTL value. Long TTL — refreshed implicitly
            // on every pjsip.conf regeneration. If generation stops happening
            // for >7 days the list expires and the worker has nothing to do.
            $cache->setex(self::CACHE_KEY_PENDING_HOSTS, self::CACHE_TTL_RESOLVED, $payload);
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                __METHOD__,
                'Failed to persist pending hostnames: ' . $e->getMessage(),
                LOG_WARNING
            );
        }
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
        // Empty port = SRV-based discovery (RFC 3263). Use 'srv' marker so context names are
        // self-documenting (e.g. "example.com-srv-incoming") and SRV providers do not silently
        // merge with legacy records that happen to have an empty port column from older versions.
        $portMarker = (trim($port) === '' || (int)$port === 0) ? 'srv' : $port;

        // Two providers whose distinct hostnames resolve to the same backing IP must share
        // one incoming dialplan context (issue #1066). Pre-6e4d8bbb0c achieved this by calling
        // `gethostbyname()` here synchronously — which we will not re-introduce: that path
        // blocks 30-50s per unreachable host and was the very reason 6e4d8bbb0c removed it.
        //
        // Instead read the Redis-cached resolved-IP set populated by WorkerSipDnsResolver.
        // The canonical IP is the lexicographically smallest entry (sort() is stable on
        // strings) — NOT the numerically smallest. "10.0.0.1" lexsorts BEFORE "9.0.0.1".
        // That is intentional and safe: the ONLY requirement is that every writer of the
        // resolved-IPs cache (WorkerSipDnsResolver, SaveRecordAction::warmupDnsCache, this
        // method) picks the SAME canonical via the SAME comparator, so different writers
        // can never disagree on the context name. Lexicographic `sort()` on strings is
        // identical in all three call sites.
        //
        // Cache miss (worker never ran, Redis down, brand-new hostname) → fall back to
        // hostname-as-string, matching post-6e4d8bbb0c behaviour. WorkerSipDnsResolver
        // will populate the cache within one tick and trigger a regeneration that picks
        // up the IP-based name.
        if (!self::isIpOrCidr($name)) {
            $cachedIps = self::readResolvedIps(self::normalizeHostnameKey($name));
            if (!empty($cachedIps)) {
                sort($cachedIps);
                $name = $cachedIps[0];
            }
        }

        return preg_replace("/[^a-z\d]/iu", '', $name . $portMarker) . '-incoming';
    }

    /**
     * Build "host:port" segment for a SIP URI, omitting ":port" when port is
     * empty or zero. An empty port is the marker for SRV-based discovery
     * (RFC 3263) — PJSIP only performs _sip._udp/_tcp/_tls SRV lookups when
     * the URI contains no explicit port.
     *
     * Literal IPv6 addresses are wrapped in brackets per RFC 3986 / RFC 5118
     * so that the trailing ":port" is unambiguously parsed (e.g.
     * "[2001:db8::1]:5060" instead of "2001:db8::1:5060" which PJSIP parses
     * as a hostname).
     *
     * @param string|null $host Provider host, hostname, IPv4 or IPv6 literal
     * @param string|int|null $port Provider port ('', '0', 0 → SRV mode)
     * @return string "host", "host:port", "[ipv6]" or "[ipv6]:port"
     */
    public static function buildHostPort(?string $host, $port): string
    {
        $hostStr = (string)($host ?? '');
        $portInt = (int)($port ?? 0);

        // Wrap literal IPv6 in brackets. Detection: contains ':' (invalid in
        // hostnames per RFC 1123 and not present in IPv4 literals) and not
        // already bracketed.
        if (str_contains($hostStr, ':') && ($hostStr === '' || $hostStr[0] !== '[')) {
            $hostStr = '[' . $hostStr . ']';
        }

        return $portInt > 0 ? "{$hostStr}:{$portInt}" : $hostStr;
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
     * Returns the SIP authentication realm.
     *
     * Uses a stored value from PbxSettings, or generates one from the primary
     * network interface MAC address. This hides the PBX identity from SIP scanners
     * that look for realm="asterisk" in Digest challenges.
     *
     * @return string The realm string (12-char hex hash)
     */
    public static function getSipRealm(): string
    {
        $realm = PbxSettings::getValueByKey(PbxSettings::SIP_REALM);
        if (!empty($realm)) {
            return $realm;
        }

        // Generate realm from primary interface MAC address
        $interfaces = LanInterfaces::find(['conditions' => 'internet = 1', 'limit' => 1]);
        $ifName = '';
        foreach ($interfaces as $iface) {
            $ifName = $iface->interface;
            break;
        }

        $mac = '';
        $macFile = "/sys/class/net/$ifName/address";
        if (!empty($ifName) && file_exists($macFile)) {
            $mac = trim(file_get_contents($macFile));
        }

        if (empty($mac)) {
            // Fallback: use any non-loopback interface
            $netFiles = glob('/sys/class/net/*/address');
            foreach ($netFiles as $file) {
                $content = trim(file_get_contents($file));
                if ($content !== '00:00:00:00:00:00') {
                    $mac = $content;
                    break;
                }
            }
        }

        $realm = substr(md5($mac ?: 'mikopbx'), 0, 12);

        // Persist for stability across restarts
        $setting = PbxSettings::findFirst("key = '" . PbxSettings::SIP_REALM . "'");
        if ($setting === null) {
            $setting = new PbxSettings();
            $setting->key = PbxSettings::SIP_REALM;
        }
        $setting->value = $realm;
        $setting->save();

        return $realm;
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
            'realm'    => self::getSipRealm(),
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
     * When TLS certificates are present, it also generates additional aor sections for WebRTC (-WS) and SIP/TLS (-TLS).
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

        // Generate the WebRTC aor section when TLS certificates are present
        // (WSS transport and endpoint-wss template depend on the same certs).
        if (self::hasCertificates()) {
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

        // Generate the SIP/TLS aor section when TLS certificates are present.
        if (self::hasCertificates()) {
            // TLS AOR also needs to match endpoint name for registration
            if ($hasCustomizations) {
                $conf .= "[{$peer['extension']}-TLS](aor-common)\n";
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
                $conf .= "[{$peer['extension']}-TLS](aor-common)\n\n";
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

        // Determine template name based on transport.
        // For AUTO (empty after normalization above) or any multi-value transport,
        // use endpoint-auto template — it has no fixed `transport=` line so PJSIP
        // picks the correct one from the contact URI for both incoming and qualify.
        $transportTemplate = 'endpoint-auto';
        if (!empty($peer['transport']) && !str_contains($peer['transport'], ',')) {
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

        // Override device_state_busy_at only when the user enabled call waiting,
        // since the endpoint-base template already has device_state_busy_at = 1.
        if (!empty($peer['accept_multiple_calls'])) {
            $uniqueParams['device_state_busy_at'] = '2';
        }

        // Add ACL only if network filter exists
        if (!empty($peer['permit']) || !empty($peer['deny'])) {
            $uniqueParams['acl'] = "acl_{$peer['extension']}";
        }

        // Extensions always use system language settings
        // No individual language configuration per extension

        // device_state_busy_at: number of active calls at which the endpoint is reported BUSY.
        // 1 (default, hardcoded in endpoint-base template) — single-line behaviour: BLF goes red on
        //   the first call, queues/follow-me treat the user as busy. Matches the 3CX default
        //   ("Accept multiple calls" off).
        // 2 — call waiting: second concurrent call is allowed, BLF stays "InUse" until the second
        //   call lands. Toggled per-extension via Sip.accept_multiple_calls — emitted as a unique
        //   param above so it overrides the template only when needed.
        // For higher concurrency (shared endpoints with max_contacts>1) override via manualattributes.

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
            'sdp_session'          => 'PBX',
            'language'             => $asteriskLang,
            'device_state_busy_at' => !empty($peer['accept_multiple_calls']) ? '2' : '1',
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

        // Generate the WebRTC endpoint section when TLS certificates are present.
        if (self::hasCertificates()) {
            $conf .= "[{$peer['extension']}-WS](endpoint-wss)\n";
            $conf .= "callerid = $calleridname <{$peer['extension']}>\n";
            $conf .= "aors = {$peer['extension']}-WS\n";  // WebRTC AOR matches endpoint name
            $conf .= "auth = {$peer['extension']}-AUTH\n";
            $conf .= "outbound_auth = {$peer['extension']}-AUTH\n";
            $conf .= "dtmf_mode = $dtmfmode\n";

            // Mirror the call-waiting override on the WebRTC endpoint so the toggle behaves
            // the same whether the user is registered via SIP or the built-in WebRTC client.
            if (!empty($peer['accept_multiple_calls'])) {
                $conf .= "device_state_busy_at = 2\n";
            }

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

        // Generate the SIP/TLS endpoint section when TLS certificates are present.
        // Inherits transport=transport-tls and media_encryption=sdes from [endpoint-tls] template
        // (created only when TLS certificates exist — see generateEndpointTemplates()).
        if (self::hasCertificates()) {
            $conf .= "[{$peer['extension']}-TLS](endpoint-tls)\n";
            $conf .= "callerid = $calleridname <{$peer['extension']}>\n";
            $conf .= "aors = {$peer['extension']}-TLS\n";
            $conf .= "auth = {$peer['extension']}-AUTH\n";
            $conf .= "outbound_auth = {$peer['extension']}-AUTH\n";
            $conf .= "dtmf_mode = $dtmfmode\n";

            // Mirror call-waiting toggle on the TLS endpoint.
            if (!empty($peer['accept_multiple_calls'])) {
                $conf .= "device_state_busy_at = 2\n";
            }

            // Add ACL if exists
            if (!empty($peer['permit']) || !empty($peer['deny'])) {
                $conf .= "acl = acl_{$peer['extension']}\n";
            }

            // Apply manual attributes for TLS endpoint
            if (!empty($manual_attributes['endpoint'])) {
                foreach ($manual_attributes['endpoint'] as $key => $value) {
                    if (!in_array($key, ['type', 'callerid', 'aors', 'auth', 'outbound_auth', 'dtmf_mode', 'acl', 'transport', 'media_encryption'])) {
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
     * Check if any LAN interface has IPv6 enabled
     *
     * @return bool True if at least one interface has IPv6 mode = '1' (Auto) or '2' (Manual), false otherwise
     */
    private function hasIpv6Interfaces(): bool
    {
        $network = new Network();
        $networks = $network->getEnabledLanInterfaces();

        foreach ($networks as $if_data) {
            $ipv6Mode = trim($if_data['ipv6_mode'] ?? '0');
            // IPv6 is enabled if mode is '1' (Auto/SLAAC) or '2' (Manual/Static)
            if ($ipv6Mode === '1' || $ipv6Mode === '2') {
                return true;
            }
        }

        return false;
    }

    /**
     * Refreshes the SIP configurations and reloads the PJSIP module.
     * Synchronizes codec database with Asterisk before regenerating config.
     *
     * Serialized through MUTEX_CONF_WRITE so it cannot race with the narrow
     * ReloadPJSIPIdentifyAction (which also regenerates pjsip.conf). Both
     * paths writing the same file at the same wall-clock moment would let
     * Asterisk module-reload a half-flushed config — see code-review
     * item Critical-1.
     */
    public static function reload(): void
    {
        $di = \Phalcon\Di\Di::getDefault();
        if ($di === null) {
            return;
        }

        try {
            $di->get(MutexProvider::SERVICE_NAME)->synchronized(
                self::MUTEX_CONF_WRITE,
                static fn() => self::reloadUnderLock(),
                timeout: 10,
                ttl: 30
            );
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                __METHOD__,
                'pjsip.conf reload skipped: could not acquire mutex (' . $e->getMessage() . ')',
                LOG_WARNING
            );
        }
    }

    /**
     * Body of {@see self::reload()}, separated to keep the mutex-acquisition
     * and the configuration-regeneration paths visually distinct.
     *
     * Callers MUST hold MUTEX_CONF_WRITE for the duration of this call. The
     * single caller is the closure inside {@see self::reload()} itself —
     * external callers go through `reload()` to acquire the lock first.
     */
    private static function reloadUnderLock(): void
    {
        // Top-level reset so a stale Redis miss cached by a previous
        // generation in the same long-lived process cannot leak into
        // this pjsip.conf write — see code-review Pass 5 finding on
        // mid-generation memo reset.
        self::resetResolvedIpsMemo();

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
            PbxConf::safeRestart(hangupChannels: true);
        }
    }
}
