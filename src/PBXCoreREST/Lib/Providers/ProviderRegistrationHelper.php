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

use MikoPBX\Common\Models\Sip;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\System\Util;
use Throwable;

/**
 * Cancels an outbound SIP provider registration at the upstream provider.
 *
 * When a SIP provider with outbound registration is disabled or deleted in the web UI,
 * Asterisk only removes it from pjsip.conf on the next reload — it never sends a
 * REGISTER with Expires:0. The upstream provider therefore keeps the binding alive
 * until it expires, still routing inbound calls to a trunk the operator switched off.
 *
 * This helper issues the explicit `pjsip send unregister <uniqid>-REG` AMI command so
 * the provider drops the binding immediately. It must run while the registration object
 * is still present in the running Asterisk (i.e. before the async PJSIP reload removes it).
 */
class ProviderRegistrationHelper
{
    /**
     * Suffix appended to a provider uniqid to build its PJSIP registration object name.
     * Mirrors the naming used by SIPConf::generateProviderRegistration() ({uniqid}-REG).
     */
    public const string REGISTRATION_SUFFIX = '-REG';

    /**
     * Send an outbound de-registration for a SIP provider.
     *
     * No-op for non-outbound providers (inbound/none have no upstream REGISTER to cancel)
     * and for IAX providers (chan_iax2 has no PJSIP registration object). Failures are
     * logged but never thrown — de-registration is best-effort and must not break the
     * disable/delete flow that triggered it.
     *
     * @param string      $uniqid           Provider uniqid (e.g. SIP-TRUNK-xxxx).
     * @param string|null $registrationType Sip::REG_TYPE_* value; only outbound is acted upon.
     * @param string      $description      Human-readable provider name for the log message.
     * @return void
     */
    public static function sendUnregister(string $uniqid, ?string $registrationType, string $description = ''): void
    {
        if ($registrationType !== Sip::REG_TYPE_OUTBOUND || $uniqid === '') {
            return;
        }

        $objectName = $uniqid . self::REGISTRATION_SUFFIX;

        try {
            $am = Util::getAstManager('off');
            $am->Command("pjsip send unregister $objectName");
            SystemMessages::sysLogMsg(
                __CLASS__,
                "Sent outbound de-registration 'pjsip send unregister $objectName' for provider '$description'",
                LOG_INFO
            );
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                __CLASS__,
                "Failed to send de-registration for provider '$description' ($objectName): " . $e->getMessage(),
                LOG_WARNING
            );
        }
    }
}
