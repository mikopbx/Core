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

use MikoPBX\Common\Models\Codecs;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\System;
use MikoPBX\Core\System\Util;

/**
 * Class ModulesConf
 *
 * Represents the configuration class for modules.conf
 *
 * @package MikoPBX\Core\Asterisk\Configs
 */
class ModulesConf extends AsteriskConfigClass
{
    // The module hook applying priority
    public int $priority = 1000;

    protected string $description = 'modules.conf';

    /**
     * Asterisk modules that are not available on ARM64 (aarch64).
     * These are x86_64-only proprietary or platform-specific codec/format modules.
     */
    private const array ARM64_UNAVAILABLE_MODULES = [
        'codec_silk.so',
        'codec_g719.so',
        'codec_codec2.so',
        'codec_g723.so',
        'format_g723.so',
        'format_g719.so',
    ];

    /**
     * Generates the configuration for modules.conf
     */
    protected function generateConfigProtected(): void
    {
        $conf = "[modules]\n" .
            "autoload=no\n";

        $modules = [
            'app_cdr.so',
            'app_exec.so',
            'app_dial.so',
            'app_directed_pickup.so',
            'app_echo.so',
            'app_confbridge.so',
            'app_page.so',
            'app_milliwatt.so',
            'app_originate.so',
            'app_playback.so',
            'app_playtones.so',
            'app_read.so',
            'app_stack.so',
            'app_verbose.so',
            'app_voicemail.so',
            'chan_iax2.so',
        ];

        // Load codec translator modules based on enabled codecs in database
        $codecModules = $this->getEnabledCodecModules();
        $modules = array_merge($modules, $codecModules);

        $modules = array_merge($modules, [
            // Format modules (file format handlers, not codec translators)
            'format_gsm.so',
            'format_pcm.so',
            'format_wav.so',
            'format_wav_gsm.so',
            'format_ogg_vorbis.so',
            'format_mp3.so',
            'format_ogg_opus.so',  // Opus file format (requires codec_opus.so for transcoding)

            'format_g726.so',
            'format_h263.so',
            'format_h264.so',
            'format_g723.so',
            'format_g719.so',
            'format_sln.so',

            'func_callerid.so',
            'func_speex.so',
            'func_channel.so',
            'func_config.so',
            'func_cdr.so',
            'func_devstate.so',
            'func_db.so',
            'func_logic.so',
            'func_strings.so',
            'func_pjsip_contact.so',
            'func_pjsip_aor.so',
            'pbx_config.so',
            'pbx_loopback.so',
            'pbx_spool.so',
            'res_agi.so',
            'res_limit.so',
            'res_musiconhold.so',
            'res_rtp_asterisk.so',
            'res_srtp.so',
            'res_convert.so',
            'res_timing_timerfd.so',
            'res_timing_pthread.so',
            'res_mutestream.so',

            'func_timeout.so',
            'res_parking.so',
            'pbx_lua.so',
            'app_senddtmf.so',
            'app_userevent.so',
            'app_chanspy.so',

            'func_cut.so',
            'func_periodic_hook.so',
            'func_uri.so',
            'func_groupcount.so',
            'func_export.so',
            'app_mixmonitor.so',

            // Required for call forwarding.
            'bridge_simple.so',
            // Other bridge modules. One of them is necessary for parking functionality.
            'bridge_holding.so',
            'bridge_builtin_features.so',
            'bridge_builtin_interval_features.so',
            // 'bridge_native_rtp.so',
            'bridge_softmix.so',
            // 'chan_bridge_media.so',
            'app_mp3.so',
            'app_stack.so',
            'app_channelredirect.so',
            'func_dialplan.so',
            'app_queue.so',
            // 'res_crypto.so', // Disabled: not used (IAX2 encryption disabled), causes 36s startup delay in Asterisk 20+
            'res_pjproject.so',
            'res_speech.so',
            'res_sorcery_astdb.so',
            'res_sorcery_config.so',
            'res_sorcery_memory.so',
            'app_while.so',

            'chan_pjsip.so',
            'func_pjsip_endpoint.so',
            'res_http_websocket.so',
            'res_musiconhold.so',
            'res_pjproject.so',
            'res_pjsip_acl.so',
            'res_pjsip_authenticator_digest.so',
            'res_pjsip_caller_id.so',
            'res_pjsip_dialog_info_body_generator.so',
            'res_pjsip_diversion.so',
            'res_pjsip_dtmf_info.so',
            'res_pjsip_empty_info.so',
            'res_pjsip_endpoint_identifier_anonymous.so',
            'res_pjsip_endpoint_identifier_ip.so',
            'res_pjsip_endpoint_identifier_user.so',
            'res_pjsip_exten_state.so',
            'res_pjsip_header_funcs.so',
            'res_pjsip_logger.so',
            'res_pjsip_messaging.so',
            'res_pjsip_mwi_body_generator.so',
            'res_pjsip_mwi.so',
            'res_pjsip_nat.so',
            'res_pjsip_notify.so',
            'res_pjsip_one_touch_record_info.so',
            'res_pjsip_outbound_authenticator_digest.so',
            'res_pjsip_outbound_publish.so',
            'res_pjsip_outbound_registration.so',
            'res_pjsip_path.so',
            'res_pjsip_pidf_body_generator.so',
            'res_pjsip_pidf_digium_body_supplement.so',
            'res_pjsip_pidf_eyebeam_body_supplement.so',
            'res_pjsip_publish_asterisk.so',
            'res_pjsip_pubsub.so',
            'res_pjsip_refer.so',
            'res_pjsip_registrar.so',
            'res_pjsip_rfc3326.so',
            'res_pjsip_sdp_rtp.so',
            'res_pjsip_send_to_voicemail.so',
            'res_pjsip_session.so',
            'res_pjsip.so',
            'res_pjsip_t38.so',
            'res_pjsip_transport_websocket.so',
            'res_pjsip_xpidf_body_generator.so',
            'res_pjsip_dlg_options.so',
            'res_security_log.so',

            'cel_beanstalkd.so',
            'app_celgenuserevent.so',

            // 'res_hep.so',
            // 'res_hep_pjsip.so',
            // 'res_hep_rtcp.so',
        ]);

        // Check if specific files exist and add modules accordingly
        if(file_exists('/dev/dahdi/transcode')){
            $modules[] = 'app_meetme.so';
            $modules[] = 'chan_dahdi.so';
            $modules[] = 'res_timing_dahdi.so';
            $modules[] = 'codec_dahdi.so';
        }

        // Filter out modules unavailable on ARM64 architecture
        if (System::isARM64()) {
            $modules = array_filter(
                $modules,
                static fn(string $module): bool => !in_array($module, self::ARM64_UNAVAILABLE_MODULES, true)
            );
        }

        foreach ($modules as $value) {
            $conf .= "load => $value\n";
        }
        
        // Load ARI modules if ARI is enabled
        $ariEnabled = PbxSettings::getValueByKey(PbxSettings::ARI_ENABLED) === '1';
        if ($ariEnabled) {
            $conf .= "\n; ARI (Asterisk REST Interface) modules\n";
            $ariModules = AriConf::getAriModules();
            foreach ($ariModules as $module) {
                $conf .= "load => $module\n";
            }
        }

        // Call the hook modules method for generating additional configuration
        $conf .= $this->hookModulesMethod(AsteriskConfigInterface::GENERATE_MODULES_CONF);

        // Write the configuration content to the file
        $this->saveConfig($conf, $this->description);
    }

    /**
     * Get list of codec translator modules based on enabled codecs in database.
     *
     * Loads codec_*.so modules only for codecs that are enabled (disabled='0') in m_Codecs table.
     * Always loads critical modules required for system operation.
     *
     * @return array Array of codec module names to load
     */
    private function getEnabledCodecModules(): array
    {
        // CRITICAL: Always load these modules regardless of database settings
        // These are required for core Asterisk functionality
        $criticalModules = [
            'codec_resample.so',  // CRITICAL: Frequency resampling (MixMonitor, Voicemail, Conference, Queue recording)
            'codec_a_mu.so',      // A-law ↔ μ-law direct translator (efficient conversion)
            'codec_gsm.so',       // CRITICAL: All system sound files are in GSM format, required for playback
        ];

        // Mapping: codec name in database → codec module filename
        // Note: Some codecs may not have modules on all platforms (e.g., opus/silk on ARM64)
        $codecToModuleMap = [
            // Core G.711 codecs
            'alaw'      => 'codec_alaw.so',
            'ulaw'      => 'codec_ulaw.so',

            // Modern wideband codecs
            'g722'      => 'codec_g722.so',
            'opus'      => 'codec_opus.so',      // x86_64 only, ignored on ARM64

            // Legacy/compatible codecs
            'g726'      => 'codec_g726.so',
            'g726aal2'  => 'codec_g726.so',      // Uses same module as g726
            'gsm'       => 'codec_gsm.so',
            'ilbc'      => 'codec_ilbc.so',
            'g729'      => 'codec_g729.so',

            // Experimental/extended codecs
            'silk'      => 'codec_silk.so',      // x86_64 only, ignored on ARM64
            'silk8'     => 'codec_silk.so',      // All silk variants use same module
            'silk12'    => 'codec_silk.so',
            'silk16'    => 'codec_silk.so',
            'silk24'    => 'codec_silk.so',

            // Obsolete codecs (removed from default loading, but can be enabled if needed)
            'adpcm'     => 'codec_adpcm.so',
            'speex'     => 'codec_speex.so',
            'speex16'   => 'codec_speex.so',
            'speex32'   => 'codec_speex.so',
            'lpc10'     => 'codec_lpc10.so',
        ];

        // Get enabled codecs from database
        $enabledCodecs = Codecs::find([
            'conditions' => 'disabled = "0"',
            'columns'    => 'name',
        ]);

        $modulesToLoad = [];

        // Add modules for enabled codecs
        foreach ($enabledCodecs as $codec) {
            $codecName = strtolower($codec->name);

            if (isset($codecToModuleMap[$codecName])) {
                $module = $codecToModuleMap[$codecName];

                // Avoid duplicates (e.g., g726 and g726aal2 use same module)
                if (!in_array($module, $modulesToLoad, true)) {
                    $modulesToLoad[] = $module;
                }
            }
        }

        // Merge with critical modules (critical modules first)
        $allModules = array_merge($criticalModules, $modulesToLoad);

        // Remove duplicates while preserving order
        $allModules = array_values(array_unique($allModules));

        // Filter out modules unavailable on ARM64 architecture
        if (System::isARM64()) {
            $allModules = array_values(array_filter(
                $allModules,
                static fn(string $module): bool => !in_array($module, self::ARM64_UNAVAILABLE_MODULES, true)
            ));
        }

        return $allModules;
    }

    /**
     * Reloads the Asterisk modules.
     * @return array
     */
    public static function reload(): array
    {
        $pbx = new self();
        $pbx->generateConfig();
        $arr_out = [];
        $asterisk = Util::which('asterisk');
        Processes::mwExec("$asterisk -rx 'core restart now'", $arr_out);

        return [
            'result' => 'Success',
            'data'   => '',
        ];
    }
}