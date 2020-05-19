<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2020
 *
 */

namespace MikoPBX\Core\Asterisk\Configs;

use MikoPBX\Core\System\Util;
use MikoPBX\Modules\Config\ConfigClass;

class ModulesConf extends ConfigClass
{
    /**
     * Создание конфига modules.conf
     */
    public function generateModulesConf(): string
    {
        $conf = "[modules]\n" .
            "autoload=no\n";

        $modules = [];
        //$modules[]='res_odbc.so';
        //$modules[]='res_config_odbc.so';
        //$modules[]='pbx_realtime.so';
        //$modules[]='res_sorcery_realtime.so';
        //$modules[]='res_config_sqlite3.so';

        $modules[] = 'app_mixmonitor.so';
        $modules[] = 'app_cdr.so';
        $modules[] = 'app_exec.so';
        $modules[] = 'app_dial.so';
        $modules[] = 'app_directed_pickup.so';
        $modules[] = 'app_echo.so';
        $modules[] = 'app_meetme.so';
        $modules[] = 'app_milliwatt.so';
        $modules[] = 'app_originate.so';
        $modules[] = 'app_playback.so';
        $modules[] = 'app_playtones.so';
        $modules[] = 'app_read.so';
        $modules[] = 'app_stack.so';
        $modules[] = 'app_verbose.so';
        $modules[] = 'app_voicemail.so';
        $modules[] = 'chan_dahdi.so';
        $modules[] = 'chan_iax2.so';

        $modules[] = 'codec_alaw.so';
        $modules[] = 'codec_dahdi.so';
        $modules[] = 'codec_g722.so';
        $modules[] = 'codec_g726.so';
        $modules[] = 'codec_gsm.so';
        $modules[] = 'codec_ulaw.so';
        $modules[] = 'codec_adpcm.so';
        $modules[] = 'codec_speex.so';

        $modules[] = 'codec_opus.so';
        $modules[] = 'codec_resample.so';
        // $modules[]='codec_g729a.so';
        // $modules[]='codec_siren14.so';
        // $modules[]='codec_siren7.so';
        $modules[] = 'codec_a_mu.so';
        $modules[] = 'codec_ilbc.so';
        $modules[] = 'codec_lpc10.so';
        $modules[] = 'codec_silk.so';

        $modules[] = 'format_ogg_speex.so';
        $modules[] = 'format_gsm.so';
        $modules[] = 'format_pcm.so';
        $modules[] = 'format_wav.so';
        $modules[] = 'format_wav_gsm.so';
        $modules[] = 'format_ogg_vorbis.so';
        $modules[] = 'format_mp3.so';

        $modules[] = 'format_g726.so';
        $modules[] = 'format_h263.so';
        $modules[] = 'format_h264.so';
        $modules[] = 'format_g723.so';
        $modules[] = 'format_g719.so';

        $modules[] = 'func_callerid.so';
        $modules[] = 'func_speex.so';
        $modules[] = 'func_channel.so';
        $modules[] = 'func_config.so';
        $modules[] = 'func_cut.so';
        $modules[] = 'func_cdr.so';
        $modules[] = 'func_devstate.so';
        $modules[] = 'func_db.so';
        $modules[] = 'func_logic.so';
        $modules[] = 'func_strings.so';
        $modules[] = 'func_periodic_hook.so';
        $modules[] = 'pbx_config.so';
        $modules[] = 'pbx_loopback.so';
        $modules[] = 'pbx_spool.so';
        $modules[] = 'res_agi.so';
        $modules[] = 'res_limit.so';
        $modules[] = 'res_musiconhold.so';
        $modules[] = 'res_rtp_asterisk.so';
        $modules[] = 'res_srtp.so';
        $modules[] = 'res_convert.so';
        $modules[] = 'res_timing_dahdi.so';
        $modules[] = 'res_mutestream.so';
        // $modules[]='cdr_sqlite3_custom.so';
        // $modules[]='cdr_manager.so';
        // $modules[]='cel_sqlite3_custom.so';
        $modules[] = 'func_timeout.so';
        $modules[] = 'res_parking.so';
        // $modules[]='app_authenticate.so';
        // $modules[]='app_page.so';
        $modules[] = 'app_queue.so';
        $modules[] = 'app_senddtmf.so';
        $modules[] = 'app_userevent.so';
        $modules[] = 'app_chanspy.so';
        // Необходимое для работы переадресаций.
        $modules[] = 'bridge_simple.so';
        // Прочие bridge модули. Один из них необходим для работы парковки.
        $modules[] = 'bridge_holding.so';
        $modules[] = 'bridge_builtin_features.so';
        $modules[] = 'bridge_builtin_interval_features.so';
        // $modules[]='bridge_native_rtp.so';
        // $modules[]='bridge_softmix.so';
        // $modules[]='chan_bridge_media.so';
        $modules[] = 'app_mp3.so';
        $modules[] = 'pbx_lua.so';
        $modules[] = 'app_stack.so';
        $modules[] = 'func_dialplan.so';

        if (file_exists('/offload/asterisk/modules/res_pjproject.so')) {
            $modules[] = 'res_crypto.so';
            $modules[] = 'res_pjproject.so';
            $modules[] = 'res_speech.so';
            $modules[] = 'res_sorcery_astdb.so';
            $modules[] = 'res_sorcery_config.so';
            $modules[] = 'res_sorcery_memory.so';

            $modules[] = 'chan_pjsip.so';
            $modules[] = 'func_pjsip_endpoint.so';
            $modules[] = 'res_http_websocket.so';
            $modules[] = 'res_musiconhold.so';
            $modules[] = 'res_pjproject.so';
            $modules[] = 'res_pjsip_acl.so';
            $modules[] = 'res_pjsip_authenticator_digest.so';
            $modules[] = 'res_pjsip_caller_id.so';
            $modules[] = 'res_pjsip_dialog_info_body_generator.so';
            $modules[] = 'res_pjsip_diversion.so';
            $modules[] = 'res_pjsip_dtmf_info.so';
            $modules[] = 'res_pjsip_endpoint_identifier_anonymous.so';
            $modules[] = 'res_pjsip_endpoint_identifier_ip.so';
            $modules[] = 'res_pjsip_endpoint_identifier_user.so';
            $modules[] = 'res_pjsip_exten_state.so';
            $modules[] = 'res_pjsip_header_funcs.so';
            $modules[] = 'res_pjsip_logger.so';
            $modules[] = 'res_pjsip_messaging.so';
            $modules[] = 'res_pjsip_mwi_body_generator.so';
            $modules[] = 'res_pjsip_mwi.so';
            $modules[] = 'res_pjsip_nat.so';
            $modules[] = 'res_pjsip_notify.so';
            $modules[] = 'res_pjsip_one_touch_record_info.so';
            $modules[] = 'res_pjsip_outbound_authenticator_digest.so';
            $modules[] = 'res_pjsip_outbound_publish.so';
            $modules[] = 'res_pjsip_outbound_registration.so';
            $modules[] = 'res_pjsip_path.so';
            $modules[] = 'res_pjsip_pidf_body_generator.so';
            $modules[] = 'res_pjsip_pidf_digium_body_supplement.so';
            $modules[] = 'res_pjsip_pidf_eyebeam_body_supplement.so';
            $modules[] = 'res_pjsip_publish_asterisk.so';
            $modules[] = 'res_pjsip_pubsub.so';
            $modules[] = 'res_pjsip_refer.so';
            $modules[] = 'res_pjsip_registrar.so';
            $modules[] = 'res_pjsip_rfc3326.so';
            $modules[] = 'res_pjsip_sdp_rtp.so';
            $modules[] = 'res_pjsip_send_to_voicemail.so';
            $modules[] = 'res_pjsip_session.so';
            $modules[] = 'res_pjsip.so';
            $modules[] = 'res_pjsip_t38.so';
            $modules[] = 'res_pjsip_transport_websocket.so';
            $modules[] = 'res_pjsip_xpidf_body_generator.so';
            $modules[] = 'res_pjsip_dlg_options.so';
            $modules[] = 'res_security_log.so';

            file_put_contents('/etc/asterisk/pjproject.conf', '');
            file_put_contents('/etc/asterisk/sorcery.conf', '');
            file_put_contents('/etc/asterisk/pjsip.conf', '');
            file_put_contents('/etc/asterisk/pjsip_notify.conf', '');
        } else {
            $modules[] = 'chan_sip.so';
            $modules[] = 'app_macro.so';
        }

        foreach ($modules as $key => $value) {
            $conf .= "load => $value\n";
        }

        $additionalModules = $this->di->getShared('pbxConfModules');
        foreach ($additionalModules as $appClass) {
            // Prevent cycling, skip current class
            if (is_a($appClass, __CLASS__)) {
                continue;
            }
            $conf .= $appClass->generateModulesConf();
        }

        Util::fileWriteContent('/etc/asterisk/modules.conf', $conf);
        Util::fileWriteContent('/etc/asterisk/codecs.conf', '');
        return '';
    }
}