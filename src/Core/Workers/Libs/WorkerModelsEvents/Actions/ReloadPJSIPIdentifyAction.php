<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Common\Providers\MutexProvider;
use MikoPBX\Core\Asterisk\Configs\ExtensionsConf;
use MikoPBX\Core\Asterisk\Configs\SIPConf;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\System\Util;
use Throwable;

/**
 * Narrow reload triggered by WorkerSipDnsResolver when provider hostnames
 * resolve to a new set of IPs. Regenerates pjsip.conf so the freshly cached
 * resolved IPs flow into `identify match=`, then issues only
 * `module reload res_pjsip_endpoint_identifier_ip.so` instead of a full
 * `pjsip reload` / `core reload` — active calls and registrations stay up.
 *
 * **Strict contract: only non-destructive Asterisk commands.** This action
 * runs every 5 minutes from a DNS TTL refresh and MUST NOT drop calls.
 *
 * If the topology hash is dirty (admin recently changed extipaddr, SIP
 * port, timezone, etc.) we SKIP the entire regeneration and defer to the
 * normal WorkerModelsEvents pipeline. Reason: `SIPConf::generateConfig()`
 * unconditionally overwrites the persisted topology hash from inside
 * `generateGeneralPj()`, so running it here would silently clear the
 * dirty marker — the next `ReloadPJSIPAction` from WorkerModelsEvents
 * would see matching hashes, skip `safeRestart()`, and the operator's
 * topology change would be lost. The DNS resolver's job is to keep the
 * identify cache fresh; the rest of the topology belongs to the model-
 * events pipeline. Skipping costs at most one 5-minute window of DNS
 * staleness; swallowing a topology change is far worse.
 *
 * Optional parameter:
 *   - 'canonicalChanged' (bool, default false) — when true, the canonical
 *     (smallest) IP of at least one hostname changed, which renames the
 *     incoming-context produced by {@see SIPConf::getIncomingContextId()}.
 *     In that case extensions.conf must be regenerated under the SAME
 *     mutex so pjsip.conf endpoint.context and the dialplan section name
 *     stay in lock-step; a brief Redis blip between two unsynchronised
 *     writes could otherwise leave them out of sync.
 *
 * Serialized with {@see SIPConf::reload} via the {@see SIPConf::MUTEX_ASTERISK_RELOAD}
 * mutex.
 */
class ReloadPJSIPIdentifyAction implements ReloadActionInterface
{
    public function execute(array $parameters = []): void
    {
        $di = \Phalcon\Di\Di::getDefault();
        if ($di === null) {
            return;
        }

        try {
            $di->get(MutexProvider::SERVICE_NAME)->synchronized(
                SIPConf::MUTEX_ASTERISK_RELOAD,
                static fn() => self::regenerateAndReload($parameters),
                timeout: 10,
                ttl: 30
            );
        } catch (Throwable $e) {
            // Could not acquire — another writer has the lock right now.
            // The competing writer will publish a fresh pjsip.conf with our
            // cached IPs anyway (it calls the same generateConfig() under the
            // same lock), so we degrade silently without producing noise.
            SystemMessages::sysLogMsg(
                __METHOD__,
                'identify-only reload skipped: ' . $e->getMessage(),
                LOG_INFO
            );
        }
    }

    /**
     * Body of the action, executed under MUTEX_ASTERISK_RELOAD.
     *
     * Always non-destructive: regenerate pjsip.conf → `module reload
     * res_pjsip_endpoint_identifier_ip.so`, plus optional `dialplan reload`
     * via ExtensionsConf::reloadUnderLock() when the canonical IP shifted. Neither
     * command hangs up live channels. We deliberately do NOT call
     * `safeRestart()` here even if topology is dirty — see class docblock.
     */
    private static function regenerateAndReload(array $parameters): void
    {
        $sip = new SIPConf();

        // Bail out when the persisted topology hash diverges from the
        // current settings — running generateConfig() here would overwrite
        // the hash and silently swallow the admin's pending topology
        // change. The normal model-events pipeline will pick up the dirty
        // marker, regenerate, and call safeRestart() under its own mutex.
        if ($sip->needAsteriskRestart()) {
            SystemMessages::sysLogMsg(
                __METHOD__,
                'identify-only reload skipped: topology dirty, deferring to ReloadPJSIPAction',
                LOG_INFO
            );
            return;
        }

        // Drop any stale resolved-IP memo so generateConfig() reads fresh
        // values from Redis for every hostname referenced in pjsip.conf.
        SIPConf::resetResolvedIpsMemo();

        $sip->generateConfig();

        $asterisk = Util::which('asterisk');
        $output = [];
        $exitCode = 0;
        Processes::mwExec(
            "$asterisk -rx 'module reload res_pjsip_endpoint_identifier_ip.so'",
            $output,
            $exitCode
        );

        if ($exitCode !== 0) {
            // The DNS cache update succeeded and pjsip.conf was regenerated,
            // but the running Asterisk did NOT pick up the new identify set.
            // Operators must know — without this log line the system falls
            // into the exact failure mode this patch is meant to prevent
            // (incoming calls landing in anonymous despite a healthy cache).
            SystemMessages::sysLogMsg(
                __METHOD__,
                'asterisk module reload returned exit=' . $exitCode . ': ' . implode("\n", $output),
                LOG_ERR
            );
            return;
        }

        // Canonical-IP shift renames the incoming-context produced by
        // SIPConf::getIncomingContextId(). pjsip.conf endpoint.context was
        // just rewritten with the new name; extensions.conf must be brought
        // along under the same lock so a concurrent Redis blip cannot leave
        // the two referencing different section names. Asterisk's
        // `dialplan reload` (issued inside ExtensionsConf::reloadUnderLock) is
        // non-destructive on live channels — established calls finish in
        // the old context section, new INVITEs land in the new one.
        $canonicalChanged = !empty($parameters['canonicalChanged']);
        if ($canonicalChanged) {
            try {
                // We already hold MUTEX_ASTERISK_RELOAD here, so call the
                // under-lock body directly — reload() would try to re-acquire the
                // same (non-reentrant) mutex and time out, skipping the reload.
                ExtensionsConf::reloadUnderLock();
                SystemMessages::sysLogMsg(
                    __METHOD__,
                    'Reloaded dialplan after canonical IP change',
                    LOG_INFO
                );
            } catch (Throwable $e) {
                SystemMessages::sysLogMsg(
                    __METHOD__,
                    'Dialplan reload after canonical change failed: ' . $e->getMessage(),
                    LOG_ERR
                );
            }
        }

        SystemMessages::sysLogMsg(
            __METHOD__,
            'Reloaded res_pjsip_endpoint_identifier_ip after DNS-driven identify update',
            LOG_INFO
        );
    }
}
