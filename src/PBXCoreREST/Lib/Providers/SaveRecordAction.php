<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Lib\Providers;

use MikoPBX\Common\Models\Iax;
use MikoPBX\Common\Models\Providers;
use MikoPBX\Common\Models\Sip;
use MikoPBX\Common\Models\SipHosts;
use MikoPBX\Common\Providers\RedisClientProvider;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\Core\Asterisk\Configs\SIPConf;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\Utilities\DnsResolver;
use MikoPBX\Core\Utilities\IpAddressHelper;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractSaveRecordAction;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Throwable;

/**
 * ✨ REFERENCE IMPLEMENTATION: Provider Save Action (Polymorphic)
 *
 * This follows the canonical 7-phase pattern with polymorphic schema support (SIP + IAX).
 * Single Source of Truth pattern - all definitions in DataStructure::getParameterDefinitions()
 *
 * Processing Pipeline (7 Phases):
 * 1. SANITIZE: Clean user input (XSS, SQL injection prevention)
 * 2. VALIDATE REQUIRED: Check required fields (type, description, registration_type)
 * 3. DETERMINE OPERATION: Detect CREATE vs UPDATE/PATCH
 * 4. APPLY DEFAULTS: Add missing values (CREATE only!) type-specific defaults
 * 5. VALIDATE SCHEMA: Check enum/range constraints + business rules
 * 6. SAVE: Transaction with model + type-specific config (SIP/IAX)
 * 7. BUILD RESPONSE: Format data using DataStructure
 *
 * @api {post} /pbxcore/api/v3/providers Create provider
 * @api {put} /pbxcore/api/v3/providers/:id Full update
 * @api {patch} /pbxcore/api/v3/providers/:id Partial update
 * @apiVersion 3.0.0
 * @apiName SaveProvider
 * @apiGroup Providers
 */
class SaveRecordAction extends AbstractSaveRecordAction
{
    /**
     * Save provider with comprehensive validation (polymorphic SIP/IAX)
     *
     * @param array<string, mixed> $data Input data from API request
     * @return PBXApiResult Result with data/errors and HTTP status code
     */
    public static function main(array $data): PBXApiResult
    {
        $res = self::createApiResult(__METHOD__);

        // ============================================================
        // SPECIAL CASE: Status-only update (lightweight operation)
        // WHY: Allows quick enable/disable without full validation
        // ============================================================

        $isStatusUpdate = isset($data['id']) && isset($data['type']) && isset($data['disabled']) &&
                          count(array_diff_key($data, array_flip(['id', 'type', 'disabled']))) === 0;

        if ($isStatusUpdate) {
            return self::updateStatusOnly($data, $res);
        }

        // ============================================================
        // PHASE 1: DATA SANITIZATION
        // Clean user input to prevent XSS, SQL injection, etc.
        // WHY: Security first - never trust user input
        // ============================================================

        $sanitizationRules = DataStructure::getSanitizationRules();
        $textFields = ['note', 'description'];

        // Preserve ID field (not in sanitization rules, uses uniqid)
        $recordId = $data['id'] ?? null;

        // Determine provider type for type-specific validation
        $providerType = strtoupper($data['type'] ?? 'SIP');

        try {
            // Sanitize: remove dangerous chars, trim whitespace, normalize format
            $sanitizedData = self::sanitizeInputData($data, $sanitizationRules, $textFields);

            // Restore preserved ID field (essential for UPDATE/PATCH operations)
            if ($recordId !== null) {
                $sanitizedData['id'] = $recordId;
            }

            // Force uppercase for type
            if (isset($sanitizedData['type'])) {
                $sanitizedData['type'] = strtoupper($sanitizedData['type']);
            }

            // Handle 'none' value for networkfilterid
            if (isset($sanitizedData['networkfilterid']) &&
                ($sanitizedData['networkfilterid'] === 'none' || $sanitizedData['networkfilterid'] === '')) {
                $sanitizedData['networkfilterid'] = null;
            }

        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            return $res;
        }

        // ============================================================
        // PHASE 2.5: EARLY EXISTENCE CHECK (for PATCH/PUT)
        // WHY: Check if resource exists BEFORE validating required fields
        // This prevents misleading "field required" errors for non-existent resources
        // ============================================================

        $httpMethod = $data['httpMethod'] ?? 'POST';
        $provider = null;
        $isNewRecord = true;

        if (!empty($sanitizedData['id'])) {
            // Try to find existing record by uniqid
            $provider = Providers::findFirstByUniqid($sanitizedData['id']);

            if ($provider) {
                // Record exists - UPDATE or PATCH operation
                $isNewRecord = false;
            } else {
                // ID provided but record not found
                // Check if PUT/PATCH should fail with 404 BEFORE validating required fields
                $error = self::validateRecordExistence($httpMethod, 'Provider');
                if ($error) {
                    $res->messages['error'][] = $error['message'];
                    $res->httpCode = $error['code'];
                    return $res;
                }
                // POST with custom ID allowed for migrations
            }
        }

        // ============================================================
        // PHASE 2: REQUIRED FIELDS VALIDATION
        // Check required fields before database operations
        // WHY: Fail fast - don't waste resources on incomplete data
        // Note: For PATCH, required fields are optional (partial update)
        // ============================================================

        $isPatch = ($httpMethod === 'PATCH');

        $validationRules = [
            'type' => [
                ['type' => 'required', 'message' => 'Provider type is required'],
                ['type' => 'enum', 'values' => ['SIP', 'IAX'], 'message' => 'Provider type must be SIP or IAX']
            ]
        ];

        // For PATCH, description and registration_type are optional (partial update)
        if (!$isPatch) {
            $validationRules['description'] = [
                ['type' => 'required', 'message' => 'Provider description is required']
            ];
            $validationRules['registration_type'] = [
                ['type' => 'required', 'message' => 'Registration type is required'],
                ['type' => 'enum', 'values' => ['none', 'outbound', 'inbound'],
                 'message' => 'Registration type must be: none, outbound, or inbound']
            ];
        }

        $validationErrors = self::validateRequiredFields($sanitizedData, $validationRules);
        if (!empty($validationErrors)) {
            $res->messages['error'] = $validationErrors;
            return $res;
        }

        // Type cannot be changed on existing provider
        if (!$isNewRecord && isset($sanitizedData['type']) && $provider->type !== $sanitizedData['type']) {
            $res->messages['error'][] = 'Cannot change provider type after creation';
            return $res;
        }

        // ============================================================
        // PHASE 3: FINALIZE OPERATION TYPE
        // Initialize model if needed
        // ============================================================

        if ($isNewRecord) {
            // CREATE: Initialize new provider
            $provider = new Providers();
            $provider->type = $sanitizedData['type'];
            $provider->uniqid = !empty($sanitizedData['id']) ? $sanitizedData['id'] :
                                Providers::generateUniqueID($sanitizedData['type']);
        }

        // ============================================================
        // PHASE 4: APPLY DEFAULTS (CREATE ONLY!)
        // Add missing field defaults from schema
        // WHY CREATE: New records need complete data with sensible defaults
        // WHY NOT UPDATE/PATCH: Would overwrite existing values!
        // ============================================================

        if ($isNewRecord) {
            // Capture port presence BEFORE applyDefaults() to distinguish
            // "user omitted port" from "schema injected SIP default 5060".
            // applyDefaults() is type-blind and the shared schema default is
            // SIP-centric — IAX providers need 4569, not 5060.
            $portWasProvided = array_key_exists('port', $sanitizedData)
                && $sanitizedData['port'] !== null;

            // ✅ CREATE: Apply defaults for missing fields
            $sanitizedData = DataStructure::applyDefaults($sanitizedData);

            // Type-specific port default (only when user did not provide one).
            // Note: SIP user can submit port=0 explicitly to request SRV-based
            // discovery (RFC 3263) — that is preserved here.
            if (!$portWasProvided) {
                $sanitizedData['port'] = ($providerType === 'IAX') ? 4569 : 5060;
            }

            // IAX does not support SRV-based discovery — coerce explicit 0/invalid
            // to the canonical IAX2 port.
            if ($providerType === 'IAX' && (int)$sanitizedData['port'] < 1) {
                $sanitizedData['port'] = 4569;
            }
        }
        // ❌ UPDATE/PATCH: Do NOT apply defaults (would overwrite existing values!)

        // ============================================================
        // PHASE 5: SCHEMA VALIDATION
        // Validate enum, min/max constraints + business rules
        // WHY: Validate AFTER defaults to check complete dataset
        // ============================================================

        $schemaErrors = DataStructure::validateInputData($sanitizedData);
        if (!empty($schemaErrors)) {
            $res->messages['error'] = $schemaErrors;
            $res->httpCode = 422; // Unprocessable Entity
            return $res;
        }

        // Business rules validation (depends on registration_type)
        $businessErrors = self::validateBusinessRules($sanitizedData, $isNewRecord, $provider);
        if (!empty($businessErrors)) {
            $res->messages['error'] = $businessErrors;
            $res->httpCode = 422;
            return $res;
        }

        // ============================================================
        // PHASE 6: SAVE TO DATABASE
        // Transaction ensures atomicity (provider + SIP/IAX config)
        // WHY: All-or-nothing - either complete save or complete rollback
        // ============================================================

        try {
            $savedProvider = self::executeInTransaction(function() use ($provider, $sanitizedData, $isNewRecord) {

                // Update Providers model
                $provider->note = $sanitizedData['note'] ?? '';

                if (!$provider->save()) {
                    throw new \Exception('Failed to save provider: ' . implode(', ', $provider->getMessages()));
                }

                // Save type-specific configuration
                if ($sanitizedData['type'] === 'SIP') {
                    self::saveSipConfiguration($provider, $sanitizedData, $isNewRecord);
                } else {
                    self::saveIaxConfiguration($provider, $sanitizedData, $isNewRecord);
                }

                return $provider;
            });

            // ============================================================
            // PHASE 7: BUILD RESPONSE
            // Format data using DataStructure (representations, types, etc.)
            // WHY: Consistent API response format with all computed fields
            // ============================================================

            $res->data = DataStructure::createFromModel($savedProvider);
            $res->success = true;
            $res->httpCode = $isNewRecord ? 201 : 200; // 201 Created, 200 OK

            // Set reload path for frontend navigation
            // WHY: Frontend needs to know where to redirect after save
            if ($isNewRecord) {
                $urlType = strtolower($savedProvider->type);
                $res->reload = "providers/modify{$urlType}/{$savedProvider->uniqid}";
            }

            // Log successful operation
            $configType = ucfirst(strtolower($savedProvider->type));
            $config = $savedProvider->$configType;
            $description = $config ? $config->description : $savedProvider->note;
            self::logSuccessfulSave('Provider', $description, $savedProvider->type, __METHOD__);

        } catch (\Exception $e) {
            return self::handleError($e, $res);
        }

        return $res;
    }

    /**
     * Validate business rules based on registration type
     *
     * Different registration types have different requirements:
     * - outbound: requires host, username, password (registration to remote server)
     * - inbound: requires username, password (remote server registers to us)
     * - none: requires host only (direct calls without registration, username/password optional)
     *
     * @param array $data Sanitized data
     * @param bool $isNewRecord True if creating new provider
     * @param Providers|null $provider Existing provider for updates
     * @return array Error messages
     */
    private static function validateBusinessRules(array $data, bool $isNewRecord, ?Providers $provider): array
    {
        $errors = [];
        $regType = $data['registration_type'] ?? '';

        // ============================================================
        // OUTBOUND REGISTRATION: Requires host, username, password
        // WHY: We register to remote server with credentials
        // ============================================================
        if ($regType === 'outbound') {
            // Host is required
            if (empty($data['host']) || trim($data['host']) === '') {
                $errors[] = TranslationProvider::translate('pr_ValidationProviderHostIsEmpty');
            }

            // Username is required
            if (empty($data['username']) || trim($data['username']) === '') {
                $errors[] = TranslationProvider::translate('pr_ValidationProviderLogin');
            }

            // Password is required (except when updating with masked value)
            $passwordRequired = true;
            if (!$isNewRecord && isset($data['secret']) && $data['secret'] === 'XXXXXXXX') {
                $passwordRequired = false; // Keep existing password
            }

            if ($passwordRequired && (empty($data['secret']) || trim($data['secret']) === '')) {
                $errors[] = TranslationProvider::translate('pr_ValidationProviderPasswordEmpty');
            }
        }

        // ============================================================
        // INBOUND REGISTRATION: Requires username, password
        // WHY: Remote server registers to us with credentials
        // ============================================================
        if ($regType === 'inbound') {
            // Username is required
            if (empty($data['username']) || trim($data['username']) === '') {
                $errors[] = TranslationProvider::translate('pr_ValidationProviderLogin');
            }

            // Password is required (except when updating with masked value)
            $passwordRequired = true;
            if (!$isNewRecord && isset($data['secret']) && $data['secret'] === 'XXXXXXXX') {
                $passwordRequired = false; // Keep existing password
            }

            if ($passwordRequired && (empty($data['secret']) || trim($data['secret']) === '')) {
                $errors[] = TranslationProvider::translate('pr_ValidationProviderPasswordEmpty');
            }
        }

        // ============================================================
        // NO REGISTRATION: Requires host only
        // WHY: Direct calls to IP/hostname, no authentication needed
        // Username/password are OPTIONAL for this mode
        // ============================================================
        if ($regType === 'none') {
            // Host is required (where to send calls)
            if (empty($data['host']) || trim($data['host']) === '') {
                $errors[] = TranslationProvider::translate('pr_ValidationProviderHostIsEmpty');
            }
            // Username and password are OPTIONAL for 'none' registration type
            // No validation required
        }

        return $errors;
    }

    /**
     * Save SIP configuration
     *
     * @param Providers $provider Provider model
     * @param array $data Configuration data
     * @param bool $isNewRecord True if creating new record
     * @throws \Exception
     */
    private static function saveSipConfiguration(Providers $provider, array $data, bool $isNewRecord): void
    {
        // Find or create SIP configuration
        $sip = $provider->Sip ?: new Sip();
        $sip->uniqid = $provider->uniqid;

        // Boolean fields for conversion
        $booleanFields = ['disabled', 'qualify', 'disablefromuser', 'cid_did_debug'];
        $data = self::convertBooleanFields($data, $booleanFields);

        // Update fields using isset() for PATCH support
        if (isset($data['disabled'])) {
            $sip->disabled = $data['disabled'];
        } elseif ($isNewRecord) {
            $sip->disabled = '0';
        }

        if (isset($data['username'])) {
            $sip->username = $data['username'];
        }

        // Handle password update (never overwrite with masked value)
        if (isset($data['secret'])) {
            if ($data['registration_type'] === 'outbound' && $data['secret'] === 'XXXXXXXX') {
                // Keep existing password - do nothing
            } else {
                $sip->secret = $data['secret'];
            }
        } elseif ($isNewRecord) {
            $sip->secret = '';
        }

        if (isset($data['host'])) {
            $sip->host = $data['host'];
        }

        if (isset($data['port'])) {
            // Empty/zero port = SRV-based discovery (RFC 3263). Store as empty string.
            $sip->port = ((int)$data['port'] > 0) ? (string)$data['port'] : '';
        } elseif ($isNewRecord) {
            $sip->port = '5060';
        }

        if (isset($data['transport'])) {
            $sip->transport = strtolower($data['transport']);
        } elseif ($isNewRecord) {
            $sip->transport = Sip::TRANSPORT_AUTO;
        }

        if (isset($data['qualify'])) {
            $sip->qualify = $data['qualify'];
        } elseif ($isNewRecord) {
            $sip->qualify = '1';
        }

        if (isset($data['qualifyfreq'])) {
            $sip->qualifyfreq = (string)$data['qualifyfreq'];
        } elseif ($isNewRecord) {
            $sip->qualifyfreq = '60';
        }

        if (isset($data['registration_type'])) {
            $sip->registration_type = $data['registration_type'];
        } elseif ($isNewRecord) {
            $sip->registration_type = 'none';
        }

        if (isset($data['description'])) {
            $sip->description = $data['description'];
        }

        // WHY array_key_exists: Phase 1 converts 'none' to null. isset() returns false for null,
        // which would skip clearing the filter on UPDATE/PATCH when user picks "any address".
        if (array_key_exists('networkfilterid', $data)) {
            $sip->networkfilterid = $data['networkfilterid'] ?? '';
        }

        if (isset($data['manualattributes'])) {
            $sip->setManualAttributes($data['manualattributes']);
        }

        if (isset($data['dtmfmode'])) {
            $sip->dtmfmode = $data['dtmfmode'];
        } elseif ($isNewRecord) {
            $sip->dtmfmode = 'auto';
        }

        if (isset($data['fromuser'])) {
            $sip->fromuser = $data['fromuser'];
        }

        if (isset($data['fromdomain'])) {
            $sip->fromdomain = $data['fromdomain'];
        }

        if (isset($data['outbound_proxy'])) {
            $sip->outbound_proxy = $data['outbound_proxy'];
        }

        if (isset($data['disablefromuser'])) {
            $sip->disablefromuser = $data['disablefromuser'];
        } elseif ($isNewRecord) {
            $sip->disablefromuser = '0';
        }

        // CallerID and DID fields
        if (isset($data['cid_source'])) $sip->cid_source = $data['cid_source'];
        elseif ($isNewRecord) $sip->cid_source = Sip::CALLERID_SOURCE_DEFAULT;

        if (isset($data['cid_custom_header'])) $sip->cid_custom_header = $data['cid_custom_header'];
        if (isset($data['cid_parser_start'])) $sip->cid_parser_start = $data['cid_parser_start'];
        if (isset($data['cid_parser_end'])) $sip->cid_parser_end = $data['cid_parser_end'];
        if (isset($data['cid_parser_regex'])) $sip->cid_parser_regex = $data['cid_parser_regex'];

        if (isset($data['did_source'])) $sip->did_source = $data['did_source'];
        elseif ($isNewRecord) $sip->did_source = Sip::DID_SOURCE_DEFAULT;

        if (isset($data['did_custom_header'])) $sip->did_custom_header = $data['did_custom_header'];
        if (isset($data['did_parser_start'])) $sip->did_parser_start = $data['did_parser_start'];
        if (isset($data['did_parser_end'])) $sip->did_parser_end = $data['did_parser_end'];
        if (isset($data['did_parser_regex'])) $sip->did_parser_regex = $data['did_parser_regex'];

        if (isset($data['cid_did_debug'])) {
            $sip->cid_did_debug = $data['cid_did_debug'];
        } elseif ($isNewRecord) {
            $sip->cid_did_debug = '0';
        }

        // Fixed fields for providers
        $sip->type = 'friend';
        $sip->nat = 'auto_force';
        $sip->noregister = '0';
        $sip->extension = '';

        if (!$sip->save()) {
            throw new \Exception('Failed to save SIP configuration: ' . implode(', ', $sip->getMessages()));
        }

        // Update provider reference
        $provider->sipuid = $sip->uniqid;
        $provider->save();

        // Handle additional hosts
        if (isset($data['additionalHosts'])) {
            self::updateAdditionalHosts($sip->uniqid, $data['additionalHosts']);
        }

        // Pre-warm the DNS-resolve cache before WorkerModelsEvents picks up the
        // model change and triggers ReloadPJSIPAction / ReloadDialplanAction.
        // Without this, the first regeneration after Save runs with an empty
        // resolved-IP cache for any brand-new hostname, so:
        //   - identify match= omits the hostname's IPs (incoming calls fall
        //     into anonymous until WorkerSipDnsResolver ticks, up to 5 min);
        //   - getIncomingContextId() falls back to a hostname-derived context
        //     name, then has to be replaced by the canonical-IP-based name a
        //     few minutes later — creating churn in pjsip.conf / extensions.conf.
        //
        // Running the resolve synchronously here is acceptable because
        // warmupDnsCache() enforces a hard 2-second wall-clock budget
        // (see self::WARMUP_BUDGET_SEC). Typical real-world cost is ~40ms
        // when DNS is healthy; an unresponsive resolver costs at most 2s
        // and the warmup short-circuits early if the cache is already warm.
        if (!empty($sip->host)) {
            self::warmupDnsCache((string)$sip->host);
        }
    }

    /**
     * Save IAX configuration
     *
     * @param Providers $provider Provider model
     * @param array $data Configuration data
     * @param bool $isNewRecord True if creating new record
     * @throws \Exception
     */
    private static function saveIaxConfiguration(Providers $provider, array $data, bool $isNewRecord): void
    {
        // Find or create IAX configuration
        $iax = $provider->Iax ?: new Iax();
        $iax->uniqid = $provider->uniqid;

        // Boolean fields for conversion
        $booleanFields = ['disabled'];
        $data = self::convertBooleanFields($data, $booleanFields);

        // Update fields using isset() for PATCH support
        if (isset($data['disabled'])) {
            $iax->disabled = $data['disabled'];
        } elseif ($isNewRecord) {
            $iax->disabled = '0';
        }

        if (isset($data['username'])) {
            $iax->username = $data['username'];
        }

        // Handle password update (never overwrite with masked value)
        if (isset($data['secret'])) {
            if ($data['registration_type'] === 'outbound' && $data['secret'] === 'XXXXXXXX') {
                // Keep existing password - do nothing
            } else {
                $iax->secret = $data['secret'];
            }
        } elseif ($isNewRecord) {
            $iax->secret = '';
        }

        if (isset($data['host'])) {
            $iax->host = $data['host'];
        }

        if (isset($data['port'])) {
            $iax->port = (string)$data['port'];
        } elseif ($isNewRecord) {
            $iax->port = '4569';
        }

        if (isset($data['registration_type'])) {
            $iax->registration_type = $data['registration_type'];
        } elseif ($isNewRecord) {
            $iax->registration_type = 'none';
        }

        if (isset($data['description'])) {
            $iax->description = $data['description'];
        }

        if (isset($data['manualattributes'])) {
            $iax->setManualAttributes($data['manualattributes']);
        }

        // WHY array_key_exists: Phase 1 converts 'none' to null. isset() returns false for null,
        // which would skip clearing the filter on UPDATE/PATCH when user picks "any address".
        if (array_key_exists('networkfilterid', $data)) {
            $iax->networkfilterid = $data['networkfilterid'] ?? '';
        }

        // Fixed fields for providers
        $iax->qualify = '1';
        $iax->noregister = '0';

        if (!$iax->save()) {
            throw new \Exception('Failed to save IAX configuration: ' . implode(', ', $iax->getMessages()));
        }

        // Update provider reference
        $provider->iaxuid = $iax->uniqid;
        $provider->save();
    }

    /**
     * Update additional SIP hosts.
     *
     * Additional hosts go verbatim into pjsip.conf `identify match=` at config
     * generation time — they are the admin-controlled trusted-source-IP whitelist
     * for incoming SIP packets. Hostnames here are nonsensical because identify
     * has no DNS resolver of its own (the whole DnsResolver/WorkerSipDnsResolver
     * machinery only applies to provider.host, not to m_SipHosts). We therefore
     * reject anything that is not an IP/CIDR literal at save time, logging a
     * warning so an operator notices the typo.
     *
     * @param string $sipUniqid SIP unique identifier
     * @param array $hosts Array of host configurations
     */
    private static function updateAdditionalHosts(string $sipUniqid, array $hosts): void
    {
        // Delete existing hosts
        $existingHosts = SipHosts::find([
            'conditions' => 'provider_id = :uid:',
            'bind' => ['uid' => $sipUniqid]
        ]);

        foreach ($existingHosts as $host) {
            $host->delete();
        }

        // Add new hosts
        foreach ($hosts as $hostData) {
            $address = isset($hostData['address']) ? trim((string)$hostData['address']) : '';
            if ($address === '') {
                continue;
            }
            if (!SIPConf::isIpOrCidr($address)) {
                SystemMessages::sysLogMsg(
                    __METHOD__,
                    "Additional host '$address' for provider $sipUniqid is not an IP/CIDR literal — skipped",
                    LOG_WARNING
                );
                continue;
            }
            $sipHost = new SipHosts();
            $sipHost->provider_id = $sipUniqid;
            $sipHost->address = $address;
            $sipHost->save();
        }
    }

    /**
     * Process-local re-entrancy guard for {@see self::warmupDnsCache()}.
     *
     * A single worker process must not have two warmups in flight at the same
     * time — each warmup can spawn up to ~23 concurrent nslookup children
     * (3 SRV + up to 10 targets × 2 A/AAAA + 2 bare A/AAAA), and a worker that
     * recurses into Save (e.g., via a CRUD-on-save module hook) would
     * multiply that fan-out without bound. WorkerApiCommands runs 3 parallel
     * processes; with this guard the absolute ceiling of concurrent nslookup
     * children attributable to warmup is 3 × ~23 = 69, which is safely within
     * PID and FD limits on every supported MikoPBX deployment.
     *
     * @var bool
     */
    private static bool $warmupInFlight = false;

    /**
     * Total wall-clock budget for warmupDnsCache, in seconds.
     *
     * Must stay well under WorkerApiCommands' API_REQUEST_TTL (default 35s)
     * so a Save can never end up dropped as stale and reported to the admin
     * as a failure while the row is already persisted in the DB. 2 seconds
     * is generous for a healthy local resolver (typical real-world warmup
     * is ~40ms) and short enough that even a completely unresponsive DNS
     * server cannot stall the UI.
     */
    private const int WARMUP_BUDGET_SEC = 2;

    /**
     * Pre-warm the resolved-IP Redis cache for a hostname-shaped SIP host.
     *
     * Called from saveSipConfiguration() right after the model is persisted.
     * Skips IP/CIDR literals (no DNS needed) and hostnames whose cache is
     * already warm (avoids redundant work on routine PATCH operations that
     * don't touch the host field).
     *
     * Enforces a HARD wall-clock budget of {@see self::WARMUP_BUDGET_SEC}
     * across all DNS work. SRV expansion (3 prefixes × N targets × 2 A/AAAA)
     * can otherwise pile up unbounded latency on a flaky resolver — see
     * code-review item Critical-3.
     *
     * On resolution failure (no addresses or budget exhausted) we log INFO
     * and let WorkerSipDnsResolver retry on its next tick. Last-known-good
     * cache entries are never overwritten with a blank result.
     *
     * @param string $rawHost Raw host string from the request (may be IP, CIDR,
     *                        hostname, FQDN with trailing dot, or whitespace-laden)
     */
    private static function warmupDnsCache(string $rawHost): void
    {
        $host = trim($rawHost);
        if ($host === '' || SIPConf::isIpOrCidr($host)) {
            return;
        }

        // Process-local re-entrancy guard. See $warmupInFlight docblock.
        if (self::$warmupInFlight) {
            SystemMessages::sysLogMsg(
                __METHOD__,
                "Concurrent warmup attempt for $host within the same worker process — skipped",
                LOG_INFO
            );
            return;
        }
        self::$warmupInFlight = true;

        // Drop any stale resolved-IP memo so the SIPConf instance we
        // construct below reads fresh values from Redis. Long-running
        // WorkerApiCommands processes can otherwise hold a stale memo
        // from a previous Save in the same process — an architectural
        // invariant: any code path that mutates the resolved-IPs cache
        // first invalidates the memo.
        SIPConf::resetResolvedIpsMemo();

        try {
            $di = \Phalcon\Di\Di::getDefault();
            if ($di === null) {
                return;
            }
            $cache = $di->get(RedisClientProvider::SERVICE_NAME);

            $hostKey = SIPConf::normalizeHostnameKey($host);
            if ($hostKey === '') {
                return;
            }
            $cacheKey = SIPConf::CACHE_KEY_RESOLVED_PREFIX . $hostKey;

            // Cheap short-circuit: if the entry already exists with a payload
            // that decodes to a non-empty IP list, do not pay DNS latency.
            $existing = $cache->get($cacheKey);
            if (is_string($existing) && $existing !== '') {
                $decoded = json_decode($existing, true);
                if (is_array($decoded) && !empty($decoded['ips'])) {
                    return;
                }
            }

            $deadline = microtime(true) + self::WARMUP_BUDGET_SEC;
            $budgetExhausted = static fn() => microtime(true) >= $deadline;
            $remainingTimeout = static fn() => max(
                1,
                (int)ceil(max(0.0, $deadline - microtime(true)))
            );

            // Two-stage concurrent resolution, mirroring
            // WorkerSipDnsResolver::resolveSrvWithFallback(). Each stage runs
            // all of its queries concurrently through DnsResolver::resolveBatch
            // so the wall-clock cost is ~max(per_query), not ~sum. The 2-second
            // global budget is enforced by passing the remaining time to each
            // batch.
            $ips = [];
            $src = 'A';

            // Stage 1: concurrent SRV across the three SIP service prefixes.
            $srvResults = DnsResolver::resolveBatch(
                [
                    'udp' => ['type' => 'SRV', 'name' => '_sip._udp.' . $hostKey],
                    'tcp' => ['type' => 'SRV', 'name' => '_sip._tcp.' . $hostKey],
                    'tls' => ['type' => 'SRV', 'name' => '_sips._tcp.' . $hostKey],
                ],
                $remainingTimeout()
            );
            $targets = [];
            foreach ($srvResults as $list) {
                foreach ($list as $target) {
                    $targets[$target] = true;
                }
            }

            // Stage 2a: concurrent A + AAAA across every collected target.
            if (!empty($targets) && !$budgetExhausted()) {
                $addrQueries = [];
                foreach (array_keys($targets) as $target) {
                    $addrQueries["{$target}__A"]    = ['type' => 'A',    'name' => $target];
                    $addrQueries["{$target}__AAAA"] = ['type' => 'AAAA', 'name' => $target];
                }
                foreach (DnsResolver::resolveBatch($addrQueries, $remainingTimeout()) as $list) {
                    $ips = array_merge($ips, $list);
                }
            }

            if (!empty($ips)) {
                $src = 'SRV';
            } elseif (!$budgetExhausted()) {
                // Stage 2b: bare A/AAAA on the hostname itself, also concurrent.
                $bareResults = DnsResolver::resolveBatch(
                    [
                        'A'    => ['type' => 'A',    'name' => $hostKey],
                        'AAAA' => ['type' => 'AAAA', 'name' => $hostKey],
                    ],
                    $remainingTimeout()
                );
                $ips = array_merge($bareResults['A'] ?? [], $bareResults['AAAA'] ?? []);
            }

            $valid = [];
            foreach ($ips as $ip) {
                // Reject loopback/RFC1918/link-local from upstream DNS — see
                // WorkerSipDnsResolver::uniqueValidIps() for the rationale.
                $ip = (string)$ip;
                if (IpAddressHelper::isPublicIp($ip)) {
                    $valid[$ip] = true;
                }
            }
            if (empty($valid)) {
                // Defer to the worker — never leave a "blank" entry that would
                // shadow a previous successful resolve (last-known-good rule).
                SystemMessages::sysLogMsg(
                    __METHOD__,
                    "DNS warmup yielded no addresses for $hostKey — leaving to WorkerSipDnsResolver"
                    . ($budgetExhausted() ? ' (budget exhausted)' : ''),
                    LOG_INFO
                );
                return;
            }

            // Lexicographic sort — stable and deterministic. Not numeric IP
            // order ("10.0.0.1" < "9.0.0.1") but that is fine: the canonical
            // IP only needs to be the same across all writers (worker, save,
            // SIPConf), and the sort comparator is identical in all places.
            $resolvedIps = array_keys($valid);
            sort($resolvedIps);

            $payload = json_encode([
                'ips' => $resolvedIps,
                'at'  => time(),
                'src' => $src,
            ]);
            if ($payload === false) {
                return;
            }
            $cache->setex($cacheKey, SIPConf::CACHE_TTL_RESOLVED, $payload);

            SystemMessages::sysLogMsg(
                __METHOD__,
                sprintf(
                    'DNS warmup for %s via %s: [%s]',
                    $hostKey,
                    $src,
                    implode(',', $resolvedIps)
                ),
                LOG_INFO
            );
        } catch (Throwable $e) {
            // Save must not fail because DNS is flaky — degrade silently.
            SystemMessages::sysLogMsg(
                __METHOD__,
                'DNS warmup failed: ' . $e->getMessage(),
                LOG_WARNING
            );
        } finally {
            self::$warmupInFlight = false;
        }
    }

    /**
     * Update provider status only (lightweight operation)
     *
     * @param array $data Data containing id, type, disabled
     * @param PBXApiResult $res Result object
     * @return PBXApiResult
     */
    private static function updateStatusOnly(array $data, PBXApiResult $res): PBXApiResult
    {
        try {
            // Sanitize inputs
            $providerId = trim($data['id']);
            $providerType = strtoupper(trim($data['type']));
            $disabled = isset($data['disabled']) ? (bool)$data['disabled'] : false;

            // Validate provider type
            if (!in_array($providerType, ['SIP', 'IAX'])) {
                $res->messages['error'][] = 'Invalid provider type';
                return $res;
            }

            // Find provider
            $provider = Providers::findFirst([
                'conditions' => 'uniqid = :id: AND type = :type:',
                'bind' => [
                    'id' => $providerId,
                    'type' => $providerType
                ]
            ]);

            if (!$provider) {
                $res->messages['error'][] = 'Provider not found';
                $res->httpCode = 404;
                return $res;
            }

            // Update status in type-specific table
            $config = $providerType === 'SIP' ? $provider->Sip : $provider->Iax;
            if (!$config) {
                $res->messages['error'][] = 'Provider configuration not found';
                return $res;
            }

            $config->disabled = $disabled ? '1' : '0';

            if (!$config->save()) {
                $res->messages['error'] = $config->getMessages();
                return $res;
            }

            // Return updated data
            $res->data = [
                'id' => $provider->uniqid,
                'type' => $provider->type,
                'disabled' => $disabled,
                'description' => $config->description ?? $provider->note
            ];
            $res->success = true;

            // Log status change
            $status = $disabled ? 'disabled' : 'enabled';
            $description = $config->description ?: $provider->note;
            SystemMessages::sysLogMsg(__CLASS__, "Provider '{$description}' ({$providerType}) {$status} via API", LOG_INFO);

        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            SystemMessages::sysLogMsg(__CLASS__, "Failed to update provider status: " . $e->getMessage(), LOG_ERR);
        }

        return $res;
    }
}
