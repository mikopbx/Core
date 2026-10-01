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

use MikoPBX\Common\Library\ProviderDialplanFieldValidator;
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

        // Validate dialplan-sensitive values before sanitization. Sanitizers are
        // allowed to normalize input, but these fields must be rejected instead
        // of silently trimming CR/LF or replacing unsupported characters.
        $dialplanFieldErrors = self::validateDialplanFields($data);
        if ($dialplanFieldErrors !== []) {
            $res->messages['error'] = $dialplanFieldErrors;
            return $res;
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

        // Capture the pre-save outbound-registration state so we can cancel a live
        // upstream registration if this update disables the provider or leaves outbound mode.
        // Must be read BEFORE the transaction, which mutates $provider->Sip in place.
        $oldSipRegState = null;
        if (!$isNewRecord && ($sanitizedData['type'] ?? '') === 'SIP' && $provider->Sip) {
            $oldSipRegState = [
                'uniqid' => $provider->Sip->uniqid,
                'disabled' => $provider->Sip->disabled,
                'registration_type' => $provider->Sip->registration_type,
                'description' => $provider->Sip->description ?: $provider->note,
            ];
        }

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

            // If this update cancelled a previously-live outbound registration (provider
            // disabled or switched away from outbound), de-register it upstream now — before
            // the async PJSIP reload drops the registration object from the running Asterisk.
            if ($oldSipRegState !== null) {
                $wasLiveOutbound = $oldSipRegState['registration_type'] === Sip::REG_TYPE_OUTBOUND
                    && $oldSipRegState['disabled'] !== '1';
                $newSip = $savedProvider->Sip;
                $stillLiveOutbound = $newSip
                    && $newSip->disabled !== '1'
                    && $newSip->registration_type === Sip::REG_TYPE_OUTBOUND;
                if ($wasLiveOutbound && !$stillLiveOutbound) {
                    ProviderRegistrationHelper::sendUnregister(
                        $oldSipRegState['uniqid'],
                        $oldSipRegState['registration_type'],
                        $oldSipRegState['description']
                    );
                }
            }

        } catch (\Exception $e) {
            return self::handleError($e, $res);
        }

        return $res;
    }

    /**
     * Validate raw fields that are interpolated into generated Asterisk dialplan.
     *
     * @param array<string, mixed> $data Raw API request data
     * @return array<string, string>
     */
    public static function validateDialplanFields(array $data): array
    {
        $errors = [];

        foreach (['cid_custom_header', 'did_custom_header'] as $field) {
            if (
                isset($data[$field])
                && (!is_string($data[$field]) || !ProviderDialplanFieldValidator::isValidHeaderName($data[$field]))
            ) {
                $errors[$field] = 'SIP header name contains unsupported characters';
            }
        }

        foreach (['cid_parser_start', 'cid_parser_end', 'did_parser_start', 'did_parser_end'] as $field) {
            if (
                isset($data[$field])
                && (!is_string($data[$field]) || !ProviderDialplanFieldValidator::isValidDelimiter($data[$field]))
            ) {
                $errors[$field] = 'Parser delimiter must be one supported character';
            }
        }

        return $errors;
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

        // Hostname keys whose resolved-IP cache may need invalidation post-save.
        // Captured BEFORE we mutate $sip->host / $sip->outbound_proxy and
        // invalidated AFTER $sip->save() commits — otherwise the orphan-check
        // inside invalidateResolvedIpsCache reads the still-unchanged DB row
        // and sees the old hostname as "still referenced", silently skipping
        // the DEL (reviewer-agent finding A1).
        $cacheKeysToInvalidatePostSave = [];

        if (isset($data['host'])) {
            // Mirror the m_SipHosts ingest gate (code-review finding #8):
            // provider.host flows into the same identify/firewall pipeline
            // as additionalHosts and must satisfy the same shape contract.
            // Without this gate, bracketed-IPv6 input like "[2001:db8::1]"
            // bypasses isIpOrCidr (filter_var rejects brackets), routes to
            // the hostname resolver, and triggers nslookup -type=SRV on
            // "_sip._udp.[2001:db8::1]" forever (NXDOMAIN every tick).
            //
            // Empty string is preserved: INBOUND-only providers legitimately
            // have no outgoing host. Bracketed IPv6 is normalized to bare
            // form so it then satisfies isIpOrCidr cleanly — same helper
            // is used in updateAdditionalHosts so both ingest paths accept
            // the same copy-paste-from-SIP-URI input (self-review M2).
            //
            // **Breaking change** (reviewer-agent finding R4-5): pre-2026.x
            // accepted `host="sip.provider.com:5060"` verbatim. The port
            // belongs in the separate `port` field — `host` should hold the
            // bare host only. After this patch, host-with-port submissions
            // throw at save time. Admins / API clients that previously
            // concatenated host:port must now split them. The change is
            // intentional: combined host:port produced subtle bugs in
            // identify match=, firewall rule generation, and DNS warmup.
            $hostRaw = SIPConf::stripIpv6Brackets((string)$data['host']);
            if ($hostRaw !== '' && !SIPConf::isAcceptableAdditionalHost($hostRaw)) {
                // Do NOT echo $hostRaw — schema validation already let it
                // through chr-wise, but interpolating it into the exception
                // string (which surfaces in the API response) creates an
                // unnecessary reflection sink (reviewer-agent finding A3).
                throw new \Exception(
                    'Provider host must be an IP/CIDR literal or a multi-label hostname'
                );
            }

            // self-review m3 + A1 fix: capture the old hostname key so we
            // can DEL its Redis resolved-IP cache post-save. Done BEFORE
            // $sip->host assignment so the snapshot reflects DB state.
            $oldHost = trim((string)($sip->host ?? ''));
            if (
                $oldHost !== ''
                && $oldHost !== $hostRaw
                && !SIPConf::isIpOrCidr($oldHost)
            ) {
                $oldKey = SIPConf::normalizeHostnameKey($oldHost);
                if ($oldKey !== '') {
                    $cacheKeysToInvalidatePostSave[$oldKey] = true;
                }
            }

            $sip->host = $hostRaw;
        }

        if (isset($data['port'])) {
            // Empty/zero port = SRV-based discovery (RFC 3263). Store as
            // empty string. Clamp to 1..65535 — without this, malformed
            // input like "99999999999999999999" passes the >0 check (PHP
            // (int) overflows to PHP_INT_MAX) and the original 22-digit
            // string lands in pjsip.conf, where Asterisk's UDP bind later
            // fails with a cryptic socket error (reviewer-agent finding R6-S2).
            $portInt = (int)$data['port'];
            if ($portInt > 0 && $portInt <= 65535) {
                $sip->port = (string)$portInt;
            } else {
                $sip->port = '';
            }
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
            // Symmetric gate with provider.host (reviewer-agent finding A2):
            // outbound_proxy also flows through extractHostFromOutboundProxy
            // → normalizeHostnameKey → warmup pipeline. Without validation
            // here, garbage values like "[::1]:sip.evil" persist in DB and
            // get processed on every WorkerSipDnsResolver tick.
            //
            // The raw value may legitimately contain port / URI parameters
            // (e.g. "proxy.example.com:5061" or "sip:proxy.example.com").
            // We validate only the EXTRACTED HOST portion against the same
            // structural rules as provider.host. Empty string is allowed
            // (= "no outbound proxy"). Strip surrounding brackets first so
            // bracketed IPv6 (canonical in SIP URIs) is accepted.
            $proxyRaw = trim((string)$data['outbound_proxy']);
            if ($proxyRaw !== '') {
                $proxyHost = SIPConf::stripIpv6Brackets(
                    SIPConf::extractHostFromOutboundProxy($proxyRaw)
                );
                if (
                    $proxyHost !== ''
                    && !SIPConf::isAcceptableAdditionalHost($proxyHost)
                ) {
                    throw new \Exception(
                        'Outbound proxy host must be an IP/CIDR literal or a multi-label hostname'
                    );
                }
            }

            // Snapshot old proxy hostname for post-save invalidation
            // (reviewer-agent finding A1 + A2).
            $oldProxyRaw = trim((string)($sip->outbound_proxy ?? ''));
            if ($oldProxyRaw !== '' && $oldProxyRaw !== $proxyRaw) {
                $oldProxyHost = SIPConf::extractHostFromOutboundProxy($oldProxyRaw);
                if ($oldProxyHost !== '' && !SIPConf::isIpOrCidr($oldProxyHost)) {
                    $oldKey = SIPConf::normalizeHostnameKey($oldProxyHost);
                    if ($oldKey !== '') {
                        $cacheKeysToInvalidatePostSave[$oldKey] = true;
                    }
                }
            }

            $sip->outbound_proxy = $proxyRaw;
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

        // POST-SAVE invalidation for any hostname dropped by this save
        // (provider.host or outbound_proxy hostname changed away). Must run
        // AFTER $sip->save() so the orphan-check inside
        // invalidateResolvedIpsCache reads the COMMITTED DB state — running
        // it pre-save would see the still-old hostname as referenced and
        // skip the DEL (reviewer-agent finding A1).
        if (!empty($cacheKeysToInvalidatePostSave)) {
            self::invalidateResolvedIpsCache(array_keys($cacheKeysToInvalidatePostSave));
        }

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
        // provider.host, outbound_proxy hostname, AND every admin-added
        // m_SipHosts hostname enter identify match= via the same Redis
        // cache, so all three sources must be warmed. warmupDnsCache()
        // enforces a hard 3-second wall-clock budget across the whole
        // batch (see self::WARMUP_BUDGET_SEC) — see code-review finding #6.
        //
        // Gate: only invoke warmup if the payload actually touched any
        // host-bearing field, otherwise routine PATCHes (qualify, disabled,
        // description, …) would all pay an extra SipHosts table scan plus
        // Redis GETs per host inside the db-write mutex — see code-review
        // finding #11.
        $touchedHostFields = isset($data['host'])
            || isset($data['outbound_proxy'])
            || isset($data['additionalHosts']);
        if ($touchedHostFields) {
            $hostnamesToWarm = [];
            if (!empty($sip->host) && !SIPConf::isIpOrCidr((string)$sip->host)) {
                $hostnamesToWarm[] = (string)$sip->host;
            }
            if (!empty($sip->outbound_proxy)) {
                $oh = SIPConf::extractHostFromOutboundProxy((string)$sip->outbound_proxy);
                if ($oh !== '' && !SIPConf::isIpOrCidr($oh)) {
                    $hostnamesToWarm[] = $oh;
                }
            }
            foreach (SipHosts::find([
                'conditions' => 'provider_id = :uid:',
                'bind' => ['uid' => $sip->uniqid],
            ]) as $h) {
                $addr = trim((string)$h->address);
                if ($addr !== '' && !SIPConf::isIpOrCidr($addr)) {
                    $hostnamesToWarm[] = $addr;
                }
            }
            if (!empty($hostnamesToWarm)) {
                self::warmupDnsCache($hostnamesToWarm);
            }
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
     * for incoming SIP packets. Accepts both IP/CIDR literals (used verbatim
     * in identify match=) and hostnames (resolved via WorkerSipDnsResolver +
     * Redis cache, same pipeline as provider.host). Anything that fails the
     * shared character whitelist {@see SIPConf::isAcceptableAdditionalHost()}
     * is logged and skipped — operators see the warning in syslog and the
     * UI's pointing-label inline error.
     *
     * @param string $sipUniqid SIP unique identifier
     * @param array $hosts Array of host configurations
     */
    private static function updateAdditionalHosts(string $sipUniqid, array $hosts): void
    {
        // Snapshot the hostname-shaped addresses we're about to drop so we can
        // invalidate their resolved-IP cache after the new set lands. Without
        // this, deleting then re-adding the same hostname within the 7-day
        // CACHE_TTL_RESOLVED window would replay stale IPs from the previous
        // life of the row (code-review finding #13). IP/CIDR literals never
        // populate the resolved-IP cache, so we only track hostnames here.
        $oldHostKeys = [];
        $existingHosts = SipHosts::find([
            'conditions' => 'provider_id = :uid:',
            'bind' => ['uid' => $sipUniqid]
        ]);
        foreach ($existingHosts as $host) {
            $addr = trim((string)$host->address);
            if ($addr !== '' && !SIPConf::isIpOrCidr($addr)) {
                $key = SIPConf::normalizeHostnameKey($addr);
                if ($key !== '') {
                    $oldHostKeys[$key] = true;
                }
            }
            $host->delete();
        }

        // Add new hosts and collect surviving hostname keys.
        // Self-review M2: strip surrounding `[...]` from copy-pasted SIP-URI
        // IPv6 literals so both ingest paths (provider.host and additional
        // hosts) accept the same input. Without this the additional-hosts
        // path silently drops `[2001:db8::1]` while provider.host now
        // normalizes it — inconsistent UX.
        $newHostKeys = [];
        foreach ($hosts as $hostData) {
            $rawAddress = isset($hostData['address']) ? (string)$hostData['address'] : '';
            $address = SIPConf::stripIpv6Brackets($rawAddress);
            if ($address === '') {
                continue;
            }
            if (!SIPConf::isAcceptableAdditionalHost($address)) {
                // SIP-IDENT-DROP prefix groups silent-drop sites for
                // ops grep / alertmanager (reviewer-agent finding R5-3).
                SystemMessages::sysLogMsg(
                    __METHOD__,
                    "SIP-IDENT-DROP: additional host '$address' for provider $sipUniqid is neither IP/CIDR nor a valid hostname — skipped",
                    LOG_WARNING
                );
                continue;
            }
            $sipHost = new SipHosts();
            $sipHost->provider_id = $sipUniqid;
            $sipHost->address = $address;
            // Throw on save failure so the surrounding transaction rolls
            // back. Pre-patch the return value was ignored, which silently
            // dropped rows when, e.g., the parent provider was concurrently
            // deleted (FK constraint). The DELETE loop above has already
            // run by this point, so a silent insert failure would lose ALL
            // existing additional hosts for the provider with no error
            // surfaced to the admin (reviewer-agent finding R4-4).
            if (!$sipHost->save()) {
                throw new \Exception(
                    'Failed to save additional host: '
                    . implode(', ', $sipHost->getMessages())
                );
            }

            if (!SIPConf::isIpOrCidr($address)) {
                $key = SIPConf::normalizeHostnameKey($address);
                if ($key !== '') {
                    $newHostKeys[$key] = true;
                }
            }
        }

        // Drop resolved-IP cache for hostnames that no longer back ANY row
        // (this provider OR any other). The cache key is keyed on the
        // hostname, not the provider — a sibling provider may still rely on
        // it, in which case skipping the DEL is correct. WorkerSipDnsResolver
        // will repopulate fresh IPs on its next tick for any new hostnames.
        $removedKeys = array_diff_key($oldHostKeys, $newHostKeys);
        if (!empty($removedKeys)) {
            self::invalidateResolvedIpsCache(array_keys($removedKeys));
        }
    }

    /**
     * Delete resolved-IP cache entries for hostnames no longer referenced
     * by ANY provider source (m_Sip.host, m_Sip.outbound_proxy, m_SipHosts).
     *
     * Best-effort: a Redis hiccup here only means a stale entry survives
     * until its 7-day TTL — never blocks the save.
     *
     * Complexity: ONE pass over each of the two tables to build a set of
     * currently-referenced hostKeys, then O(|hostKeys|) Set lookups (self-
     * review M1 — the previous N×M pattern hit the DB once per removed key).
     *
     * **Pending-hosts NOT synced here** (reviewer-agent finding R4-1): an
     * earlier round added a GET+filter+SETEX of {@see SIPConf::CACHE_KEY_PENDING_HOSTS}
     * to prevent {@see \MikoPBX\Core\Workers\WorkerSipDnsResolver} from
     * re-resolving the orphan we just DELled. The CAS pattern raced against
     * `SIPConf::persistPendingHostnames()` (which does an atomic full
     * overwrite during every pjsip regen, debounced 5s after model changes):
     * if our SETEX landed AFTER a concurrent regen's overwrite, it would
     * silently drop any NEW hostname that regen added to the set, causing a
     * ≤5 minute SIP outage for the new provider. The trade-off inverted —
     * orphan re-resolution costs one extra DNS query plus a 200-byte Redis
     * entry that lives 7 days unread (memory only, no functional impact),
     * while the CAS race cost real call-routing correctness. Pending-set
     * cleanup is therefore deferred to the next pjsip regen, which is the
     * sole authoritative writer of the pending set.
     *
     * **Transaction semantics** (reviewer-agent finding F1): this method is
     * invoked from within {@see self::executeInTransaction()}; Redis is NOT
     * part of the Phalcon transaction. If the surrounding transaction rolls
     * back (e.g. a later `SipHost->save()` fails), the DB reverts to the
     * pre-save state while Redis stays DEL'd. Impact is bounded: the next
     * SIPConf regeneration re-adds the hostname to the pending set and
     * WorkerSipDnsResolver re-resolves on its next tick. Worker cadence is
     * `WorkerSipDnsResolver::CHECK_INTERVAL_SECONDS = 300` (5 minutes;
     * reviewer-agent finding R4-3 — earlier doc claimed 60s, that's the
     * spawn interval, not the work interval). Total worst-case window:
     * ~5 minutes until reconvergence. No data loss, no security impact —
     * only a brief cache miss while the worker catches up.
     *
     * @param array<int, string> $hostKeys Normalized hostname keys to consider
     *                                     for invalidation
     */
    private static function invalidateResolvedIpsCache(array $hostKeys): void
    {
        if (empty($hostKeys)) {
            return;
        }
        try {
            // Build the union of referenced hostKeys in a single scan of
            // each table — covers all three pjsip consumers of the resolved
            // cache: provider.host, outbound_proxy host, and m_SipHosts.
            //
            // Both scans are scoped to only the columns we need (reviewer-
            // agent finding A4). On large deployments this avoids hydrating
            // full model rows inside the synchronous save path; Phalcon
            // returns `Row` objects whose property accessors still work.
            $stillReferenced = [];
            foreach (SipHosts::find(['columns' => 'address']) as $row) {
                $addr = trim((string)$row->address);
                if ($addr === '' || SIPConf::isIpOrCidr($addr)) {
                    continue;
                }
                $key = SIPConf::normalizeHostnameKey($addr);
                if ($key !== '') {
                    $stillReferenced[$key] = true;
                }
            }
            foreach (Sip::find(['columns' => 'host, outbound_proxy']) as $sipRow) {
                $host = trim((string)($sipRow->host ?? ''));
                if ($host !== '' && !SIPConf::isIpOrCidr($host)) {
                    $key = SIPConf::normalizeHostnameKey($host);
                    if ($key !== '') {
                        $stillReferenced[$key] = true;
                    }
                }
                $proxyRaw = trim((string)($sipRow->outbound_proxy ?? ''));
                if ($proxyRaw !== '') {
                    $proxyHost = SIPConf::extractHostFromOutboundProxy($proxyRaw);
                    if ($proxyHost !== '' && !SIPConf::isIpOrCidr($proxyHost)) {
                        $key = SIPConf::normalizeHostnameKey($proxyHost);
                        if ($key !== '') {
                            $stillReferenced[$key] = true;
                        }
                    }
                }
            }

            $hostKeysToDrop = [];
            foreach ($hostKeys as $hostKey) {
                if (!isset($stillReferenced[$hostKey])) {
                    $hostKeysToDrop[] = $hostKey;
                }
            }
            if (empty($hostKeysToDrop)) {
                return;
            }

            $di = \Phalcon\Di\Di::getDefault();
            if ($di === null) {
                return;
            }
            $cache = $di->get(RedisClientProvider::SERVICE_NAME);
            foreach ($hostKeysToDrop as $hostKey) {
                $cache->del(SIPConf::CACHE_KEY_RESOLVED_PREFIX . $hostKey);
            }

            // Mirror the warmup invariant — the next regen must not read a
            // stale memo entry for a key we just dropped from Redis.
            SIPConf::resetResolvedIpsMemo();
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                __METHOD__,
                'Resolved-IP cache invalidation failed: ' . $e->getMessage(),
                LOG_WARNING
            );
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
     * Process-local guard against re-registering the warmupInFlight
     * shutdown-reset closure. In long-lived WorkerApiCommands (uptime
     * measured in weeks) every Save would otherwise append a fresh
     * closure to PHP's shutdown queue, growing the queue linearly with
     * save count until the process is restarted (security review L2).
     * Registering once per process is sufficient — the closure resets
     * the same static var, and only the final invocation matters at
     * shutdown time.
     */
    private static bool $warmupShutdownRegistered = false;

    /**
     * Total wall-clock budget for warmupDnsCache, in seconds.
     *
     * Must stay well under WorkerApiCommands' API_REQUEST_TTL (default 35s)
     * so a Save can never end up dropped as stale and reported to the admin
     * as a failure while the row is already persisted in the DB. 3 seconds
     * is generous for a healthy local resolver (typical real-world warmup
     * is ~40ms) and short enough that even a completely unresponsive DNS
     * server cannot stall the UI. The budget is shared across all hostnames
     * in the batch — concurrent resolution via DnsResolver::resolveBatch
     * keeps cost ~max(per_host), not ~sum, so a typical 1–5 hostname batch
     * still finishes well inside the window.
     */
    private const int WARMUP_BUDGET_SEC = 3;

    /**
     * Sentinel separator for {@see self::warmupDnsCache()} batch demux keys.
     *
     * Must NOT appear in any normalized hostname or SRV target. Both
     * {@see SIPConf::isValidHostname()} (LDH-only labels) and standard DNS
     * rules forbid control characters, so \x1f (ASCII US, "Unit Separator")
     * is safe and unambiguous. Code-review finding #2 documented why the
     * previous `::` delimiter was unsafe: it aliased the legal `::` inside
     * any hostname that slipped through validation, mis-attributing SRV
     * targets across providers and producing silent cross-provider trust
     * bleed in identify match=.
     *
     * Exposed via {@see self::buildBatchKey()} / {@see self::demuxBatchKey()}
     * so the load-bearing invariant has unit-test coverage (reviewer-agent
     * finding R5-5 / B1).
     */
    public const string WARMUP_BATCH_KEY_SEPARATOR = "\x1f";

    /**
     * Compose a batch-key from a hostKey and one or more tags.
     *
     * Pure function. Tags are joined with {@see self::WARMUP_BATCH_KEY_SEPARATOR}.
     * Used by {@see self::warmupDnsCache()} to attribute SRV / A / AAAA
     * results back to their parent hostname after a single concurrent
     * `DnsResolver::resolveBatch` pass.
     *
     * @param string $hostKey Normalized hostname (LDH-only, no \x1f possible)
     * @param string ...$tags Stage-and-target tags (e.g. "udp", "A", target name)
     */
    public static function buildBatchKey(string $hostKey, string ...$tags): string
    {
        return implode(
            self::WARMUP_BATCH_KEY_SEPARATOR,
            array_merge([$hostKey], $tags)
        );
    }

    /**
     * Extract the parent hostKey from a batch-key built by
     * {@see self::buildBatchKey()}. Returns '' when the key contains no
     * separator (malformed or never built via this scheme).
     *
     * Pure function. Round-trips with `buildBatchKey()` for any valid
     * normalized hostname.
     */
    public static function demuxBatchKey(string $key): string
    {
        $pos = strpos($key, self::WARMUP_BATCH_KEY_SEPARATOR);
        return $pos === false ? '' : substr($key, 0, $pos);
    }

    /**
     * Pre-warm the resolved-IP Redis cache for a batch of hostname-shaped SIP
     * hosts (provider.host and / or any m_SipHosts admin-added hostnames).
     *
     * Called from saveSipConfiguration() right after the model is persisted.
     * Skips IP/CIDR literals (no DNS needed) and hostnames whose cache is
     * already warm (avoids redundant work on routine PATCH operations that
     * don't touch the host field).
     *
     * Enforces a HARD wall-clock budget of {@see self::WARMUP_BUDGET_SEC}
     * across the WHOLE batch — every host shares the same deadline. SRV
     * expansion (3 prefixes × N targets × 2 A/AAAA) for several hosts at
     * once otherwise piles up unbounded latency on a flaky resolver.
     *
     * On resolution failure for an individual host (no addresses or budget
     * exhausted) we log INFO for that host and let WorkerSipDnsResolver
     * retry on its next tick. Last-known-good cache entries are never
     * overwritten with a blank result. Sibling hosts in the same batch
     * still get processed if budget remains.
     *
     * @param array<int, string> $rawHosts Raw host strings (may be IP, CIDR,
     *                                     hostname, FQDN with trailing dot,
     *                                     or whitespace-laden — all filtered here)
     */
    private static function warmupDnsCache(array $rawHosts): void
    {
        // Normalize, dedup and drop IP/CIDR literals upfront so the batch
        // contains only resolvable hostnames.
        $hostKeys = [];
        foreach ($rawHosts as $rawHost) {
            $host = trim((string)$rawHost);
            if ($host === '' || SIPConf::isIpOrCidr($host)) {
                continue;
            }
            $hostKey = SIPConf::normalizeHostnameKey($host);
            if ($hostKey !== '') {
                $hostKeys[$hostKey] = true;
            }
        }
        if (empty($hostKeys)) {
            return;
        }
        $hostKeys = array_keys($hostKeys);

        // Architectural invariant (see SIPConf.php:962-971): any code path
        // that may consume resolved-IP cache state must drop the process-local
        // memo BEFORE reading Redis. Long-running WorkerApiCommands processes
        // (maxProc=3) accumulate memo entries across unrelated saves, and
        // WorkerSipDnsResolver can refresh Redis between any two saves once
        // SRV TTL expires. Resetting here — unconditionally, including the
        // cache-warm short-circuit path — guarantees the subsequent SIPConf
        // regeneration reads whatever IPs Redis currently holds, not a stale
        // snapshot from the previous Save in the same worker process.
        //
        // See code-review finding #3: a missing reset on the cache-warm
        // return below produced stale identify match= entries despite a
        // freshly-resolved Redis cache.
        SIPConf::resetResolvedIpsMemo();

        // Cheap short-circuit BEFORE the in-flight guard: a concurrent save
        // whose hosts are already cache-warm should be a no-op, not get
        // blocked by another save's in-flight DNS work — see code-review
        // finding #12. The Redis client is hoisted so the work block below
        // reuses the same instance (#12 hoist).
        try {
            $di = \Phalcon\Di\Di::getDefault();
            if ($di === null) {
                return;
            }
            $cache = $di->get(RedisClientProvider::SERVICE_NAME);

            $hostKeysToResolve = [];
            foreach ($hostKeys as $hostKey) {
                $existing = $cache->get(SIPConf::CACHE_KEY_RESOLVED_PREFIX . $hostKey);
                if (is_string($existing) && $existing !== '') {
                    $decoded = json_decode($existing, true);
                    if (is_array($decoded) && !empty($decoded['ips'])) {
                        continue;
                    }
                }
                $hostKeysToResolve[] = $hostKey;
            }
            if (empty($hostKeysToResolve)) {
                return;
            }
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                __METHOD__,
                'DNS warmup cache pre-check failed: ' . $e->getMessage(),
                LOG_WARNING
            );
            return;
        }

        // Process-local re-entrancy guard. See $warmupInFlight docblock.
        // Only reached when at least one host still needs resolution.
        if (self::$warmupInFlight) {
            SystemMessages::sysLogMsg(
                __METHOD__,
                'Concurrent warmup attempt within the same worker process for [' .
                    implode(',', $hostKeysToResolve) . '] — skipped',
                LOG_INFO
            );
            return;
        }
        self::$warmupInFlight = true;
        // Bullet-proof reset (reviewer-agent finding R6-W1): PHP `finally`
        // does NOT run on fatal errors (OOM mid-allocation, segfault in a
        // child process, signal kill). In a long-lived WorkerApiCommands
        // process that would leave the flag stuck `true` forever — every
        // subsequent save silently skipping warmup with no operator signal
        // beyond an INFO log line. `register_shutdown_function` fires on
        // graceful PHP shutdown including most fatal-error paths.
        //
        // Register ONCE per process (security review L2). Previously this
        // call ran on every warmup invocation, appending closures to the
        // shutdown queue without bound — slow leak in WorkerApiCommands
        // (uptime weeks). Single registration suffices because the closure
        // resets a static, and only the last shutdown firing matters.
        if (!self::$warmupShutdownRegistered) {
            self::$warmupShutdownRegistered = true;
            register_shutdown_function(static function (): void {
                self::$warmupInFlight = false;
            });
        }
        // Capture wall-clock start so we can report the actual cost in the
        // finally block (reviewer-agent finding R5-2). Visible duration is
        // the only way ops can see whether warmup is degrading API latency
        // — the per-host log lines below only fire on success.
        $warmupStart = microtime(true);

        try {
            $deadline = $warmupStart + self::WARMUP_BUDGET_SEC;
            $budgetExhausted = static fn() => microtime(true) >= $deadline;
            // Returns ≥0 wall-clock seconds left in the warmup budget.
            // ceil() prevents fractional-second underspecification; max(0,…)
            // guarantees we never extend the deadline once it has passed —
            // see code-review finding #14.
            $remainingTimeout = static fn(): int => max(
                0,
                (int)ceil(max(0.0, $deadline - microtime(true)))
            );

            // Batch-key build / demux uses self::buildBatchKey() and
            // self::demuxBatchKey() — exposed as testable statics so the
            // load-bearing \x1f invariant has unit coverage (R5-5 / B1).

            // Stage 1: single concurrent batch covering SRV for ALL hosts.
            $srvQueries = [];
            foreach ($hostKeysToResolve as $hostKey) {
                $srvQueries[self::buildBatchKey($hostKey, 'udp')] = ['type' => 'SRV', 'name' => '_sip._udp.' . $hostKey];
                $srvQueries[self::buildBatchKey($hostKey, 'tcp')] = ['type' => 'SRV', 'name' => '_sip._tcp.' . $hostKey];
                $srvQueries[self::buildBatchKey($hostKey, 'tls')] = ['type' => 'SRV', 'name' => '_sips._tcp.' . $hostKey];
            }
            $srvResults = DnsResolver::resolveBatch($srvQueries, $remainingTimeout());

            // Collect SRV targets per host.
            $targetsPerHost = [];
            foreach ($srvResults as $key => $list) {
                $host = self::demuxBatchKey($key);
                if ($host === '') {
                    continue;
                }
                foreach ($list as $target) {
                    $targetsPerHost[$host][$target] = true;
                }
            }

            // Stage 2a: single concurrent batch covering A/AAAA for every
            // SRV target across every host.
            $ipsPerHost = array_fill_keys($hostKeysToResolve, []);
            if (!empty($targetsPerHost) && !$budgetExhausted()) {
                $addrQueries = [];
                foreach ($targetsPerHost as $host => $targets) {
                    foreach (array_keys($targets) as $target) {
                        $addrQueries[self::buildBatchKey($host, $target, 'A')]    = ['type' => 'A',    'name' => $target];
                        $addrQueries[self::buildBatchKey($host, $target, 'AAAA')] = ['type' => 'AAAA', 'name' => $target];
                    }
                }
                if (!empty($addrQueries)) {
                    $addrResults = DnsResolver::resolveBatch($addrQueries, $remainingTimeout());
                    foreach ($addrResults as $key => $list) {
                        $host = self::demuxBatchKey($key);
                        if ($host !== '' && isset($ipsPerHost[$host])) {
                            $ipsPerHost[$host] = array_merge($ipsPerHost[$host], $list);
                        }
                    }
                }
            }

            // Hosts whose SRV+A pass produced no PUBLIC IPs fall back to bare
            // A/AAAA on the hostname itself. Gating on "no public IPs" (not
            // "no IPs at all" — see code-review finding #13) covers the
            // misconfigured-split-horizon-DNS case where SRV resolves only to
            // RFC1918 targets while bare A would return a public address.
            $bareCandidates = [];
            foreach ($hostKeysToResolve as $hostKey) {
                $hasPublic = false;
                foreach ($ipsPerHost[$hostKey] ?? [] as $ip) {
                    if (IpAddressHelper::isPublicIp((string)$ip)) {
                        $hasPublic = true;
                        break;
                    }
                }
                if (!$hasPublic) {
                    $bareCandidates[] = $hostKey;
                }
            }
            $srcPerHost = array_fill_keys($hostKeysToResolve, 'SRV');
            if (!empty($bareCandidates) && !$budgetExhausted()) {
                $bareQueries = [];
                foreach ($bareCandidates as $hostKey) {
                    $bareQueries[self::buildBatchKey($hostKey, 'A')]    = ['type' => 'A',    'name' => $hostKey];
                    $bareQueries[self::buildBatchKey($hostKey, 'AAAA')] = ['type' => 'AAAA', 'name' => $hostKey];
                }
                $bareResults = DnsResolver::resolveBatch($bareQueries, $remainingTimeout());
                foreach ($bareResults as $key => $list) {
                    $host = self::demuxBatchKey($key);
                    if ($host !== '' && isset($ipsPerHost[$host])) {
                        $ipsPerHost[$host] = array_merge($ipsPerHost[$host], $list);
                        if (!empty($list)) {
                            $srcPerHost[$host] = 'A';
                        }
                    }
                }
            }

            // Persist per-host. Each host honours the last-known-good rule
            // independently: a sibling failing must not blank a host that
            // succeeded earlier in the same batch.
            foreach ($hostKeysToResolve as $hostKey) {
                $valid = [];
                foreach (($ipsPerHost[$hostKey] ?? []) as $ip) {
                    $ip = (string)$ip;
                    if (IpAddressHelper::isPublicIp($ip)) {
                        $valid[$ip] = true;
                    }
                }
                if (empty($valid)) {
                    // SIP-IDENT-DROP prefix groups silent-drop sites for
                    // ops grep / alertmanager (reviewer-agent finding R5-3).
                    SystemMessages::sysLogMsg(
                        __METHOD__,
                        "SIP-IDENT-DROP: DNS warmup yielded no addresses for $hostKey — leaving to WorkerSipDnsResolver"
                        . ($budgetExhausted() ? ' (budget exhausted)' : ''),
                        LOG_INFO
                    );
                    continue;
                }
                $resolvedIps = array_keys($valid);
                sort($resolvedIps);

                $payload = json_encode([
                    'ips' => $resolvedIps,
                    'at'  => time(),
                    'src' => $srcPerHost[$hostKey] ?? 'A',
                ]);
                if ($payload === false) {
                    continue;
                }
                $cache->setex(
                    SIPConf::CACHE_KEY_RESOLVED_PREFIX . $hostKey,
                    SIPConf::CACHE_TTL_RESOLVED,
                    $payload
                );
                SystemMessages::sysLogMsg(
                    __METHOD__,
                    sprintf(
                        'DNS warmup for %s via %s: [%s]',
                        $hostKey,
                        $srcPerHost[$hostKey] ?? 'A',
                        implode(',', $resolvedIps)
                    ),
                    LOG_INFO
                );
            }
        } catch (Throwable $e) {
            // Save must not fail because DNS is flaky — degrade silently.
            SystemMessages::sysLogMsg(
                __METHOD__,
                'DNS warmup failed: ' . $e->getMessage(),
                LOG_WARNING
            );
        } finally {
            // Visibility for ops (reviewer-agent finding R5-2): emit total
            // wall-clock cost for THIS warmup batch. Promotes to LOG_WARNING
            // when we burn >67% of the budget so log-aggregation alerts can
            // fire BEFORE warmups start pushing API requests over
            // API_REQUEST_TTL=35s and dropping them as stale.
            $warmupElapsedMs = (int)round((microtime(true) - $warmupStart) * 1000);
            $warmupBudgetMs = self::WARMUP_BUDGET_SEC * 1000;
            $hostsCsv = implode(',', $hostKeysToResolve);
            SystemMessages::sysLogMsg(
                __METHOD__,
                sprintf(
                    'DNS warmup batch [%s] took %dms (budget %dms)',
                    $hostsCsv,
                    $warmupElapsedMs,
                    $warmupBudgetMs
                ),
                $warmupElapsedMs > ($warmupBudgetMs * 2 / 3) ? LOG_WARNING : LOG_INFO
            );
            self::$warmupInFlight = false;
        }
    }

    /**
     * Update provider status only (lightweight operation)
     *
     * Reached from main() ONLY when $data holds exactly {id, type, disabled} (see the
     * $isStatusUpdate guard). Any other field — including registration_type — routes to
     * main() instead, so a registration_type change is always handled there. This method
     * therefore only needs to cancel the upstream registration on the disable transition.
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

            $wasDisabled = $config->disabled === '1';
            $config->disabled = $disabled ? '1' : '0';

            if (!$config->save()) {
                $res->messages['error'] = $config->getMessages();
                return $res;
            }

            // A SIP provider switched OFF must be de-registered upstream immediately,
            // otherwise the provider keeps routing inbound calls until the binding expires.
            if ($providerType === 'SIP' && $disabled && !$wasDisabled) {
                ProviderRegistrationHelper::sendUnregister(
                    $config->uniqid,
                    $config->registration_type,
                    $config->description ?: $provider->note
                );
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
