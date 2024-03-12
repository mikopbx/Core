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

use MikoPBX\Core\System\Util;

/**
 * Class ModulesConf
 *
 * Represents the configuration class for modules.conf and codecs.conf
 *
 * @package MikoPBX\Core\Asterisk\Configs
 */
class ModulesConf extends AsteriskConfigClass
{
    // The module hook applying priority
    public int $priority = 1000;

    protected string $description = 'modules.conf';

    /**
     * Generates the configuration for modules.conf and codecs.conf
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

            'codec_alaw.so',
            'codec_g722.so',
            'codec_g726.so',
            'codec_gsm.so',
            'codec_ulaw.so',
            'codec_adpcm.so',
            'codec_speex.so',
            //
            'codec_opus.so',
            'codec_resample.so',
            'codec_a_mu.so',
            'codec_ilbc.so',
            'codec_lpc10.so',
            'codec_silk.so',
            'codec_g729.so',

            'format_ogg_speex.so',
            'format_gsm.so',
            'format_pcm.so',
            'format_wav.so',
            'format_wav_gsm.so',
            'format_ogg_vorbis.so',
            'format_mp3.so',
            'format_ogg_opus.so',

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
            'res_crypto.so',
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
        ];

        // Check if specific files exist and add modules accordingly
        if(file_exists('/dev/dahdi/transcode')){
            $modules[] = 'app_meetme.so';
            $modules[] = 'chan_dahdi.so';
            $modules[] = 'res_timing_dahdi.so';
            $modules[] = 'codec_dahdi.so';
        }

        foreach ($modules as $value) {
            $conf .= "load => $value\n";
        }

        // Call the hook modules method for generating additional configuration
        $conf .= $this->hookModulesMethod(AsteriskConfigInterface::GENERATE_MODULES_CONF);

        // Write the configuration content to the file
        Util::fileWriteContent($this->config->path('asterisk.astetcdir') . '/modules.conf', $conf);
        Util::fileWriteContent($this->config->path('asterisk.astetcdir') . '/codecs.conf', '');
    }
}