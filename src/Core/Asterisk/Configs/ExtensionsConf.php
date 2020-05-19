<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 4 2020
 */

namespace MikoPBX\Core\Asterisk\Configs;

use MikoPBX\Common\Models\{IncomingRoutingTable, OutgoingRoutingTable, OutWorkTimes, SoundFiles};
use MikoPBX\Modules\Config\ConfigClass;
use MikoPBX\Core\System\{MikoPBXConfig, Util};
use Phalcon\Di;

class ExtensionsConf extends ConfigClass
{

    /**
     * Основной генератор exgtensions.conf
     */
    public function generate(): void
    {
        $additionalModules = $this->di->getShared('pbxConfModules');
        $conf              = "[globals] \n";
        $conf              .= "TRANSFER_CONTEXT=internal-transfer; \n";
        foreach ($additionalModules as $appClass) {
            $conf .= $appClass->extensionGlobals();
        }
        $conf .= "\n";
        $conf .= "\n";
        $conf .= "[general] \n";
        $conf .= "\n";

        // Создаем диалплан внутренних учеток.
        $this->generateOtherExten($conf);
        // Контекст для внутренних вызовов.
        $this->generateInternal($conf);
        // Контекст для внутренних переадресаций.
        $this->generateInternalTransfer($conf);
        // Создаем контекст хинтов.
        $this->generateSipHints($conf);
        // Создаем контекст (исходящие звонки).
        $this->generateOutContextPeers($conf);
        // Описываем контекст для публичных входящих.
        $this->generatePublicContext($conf);
        // Переключатель по времени.
        $this->generateOutWorkTimes($conf);

        Util::fileWriteContent("/etc/asterisk/extensions.conf", $conf);
    }

    /**
     * Генератор прочих контекстов.
     *
     * @param $conf
     */
    private function generateOtherExten(&$conf)
    {
        $extension = 'X!';
        // Контекст для AMI originate. Без него отображается не корректный CallerID.
        $conf .= '[sipregistrations]' . "\n\n";

        $conf .= '[messages]' . "\n" .
            'exten => _' . $extension . ',1,MessageSend(sip:${EXTEN},"${CALLERID(name)}"${MESSAGE(from)})' . "\n\n";

        $conf .= '[internal-originate]' . " \n";
        $conf .= 'exten => _' . $extension . ',1,NoOP(Hint ${HINT} exten ${EXTEN} )' . " \n";
        $conf .= '; Если это originate, то скроем один CDR.' . " \n\t";
        $conf .= 'same => n,ExecIf($["${pt1c_cid}x" != "x"]?Set(CALLERID(num)=${pt1c_cid}))' . " \n\t";

        $technology = SIPConf::getTechnology();
        if (SIPConf::TYPE_SIP === $technology) {
            $conf .= 'same => n,ExecIf($["${SIPADDHEADER}x" != "x"]?SIPaddheader(${SIPADDHEADER}))' . " \n\t";
        } else {
            $conf .= 'same => n,ExecIf($["${CUT(CHANNEL,\;,2)}" == "2"]?Set(__PT1C_SIP_HEADER=${SIPADDHEADER}))' . " \n\t";
        }
        $conf .= 'same => n,ExecIf($["${peer_mobile}x" != "x"]?Set(ADDITIONAL_PEER=&Local/${peer_mobile}@outgoing/n))' . " \n\t";

        // Описываем возможность прыжка в пользовательский sub контекст.
        $conf .= 'same => n,GosubIf($["${DIALPLAN_EXISTS(${CONTEXT}-custom,${EXTEN},1)}" == "1"]?${CONTEXT}-custom,${EXTEN},1)' . "\n\t";
        $conf .= 'same => n,Dial(Local/${EXTEN}@internal-users/n${ADDITIONAL_PEER},60,TteKkHhb(originate_create_chan,s,1))' . " \n\n";

        $conf .= '[macro-dial_answer]' . "\n";
        // $conf.= 'exten => s,1,AGI(cdr_connector.php,${ISTRANSFER}dial_answer)'."\n\n";
        $conf .= 'exten => s,1,Gosub(${ISTRANSFER}dial_answer,${EXTEN},1)' . "\n\n";

        $conf .= '[originate_create_chan]' . " \n";
        $conf .= 'exten => s,1,Set(CHANNEL(hangup_handler_wipe)=hangup_handler,s,1)' . "\n\t";
        $conf .= 'same => n,return' . " \n\n";

        $conf .= '[dial_create_chan]' . " \n";
        $conf .= 'exten => s,1,Gosub(lua_${ISTRANSFER}dial_create_chan,${EXTEN},1)' . "\n\t";
        $conf .= 'same => n,Set(pt1c_is_dst=1)' . " \n\t";
        $conf .= 'same => n,ExecIf($["${PT1C_SIP_HEADER}x" != "x"]?Set(PJSIP_HEADER(add,${CUT(PT1C_SIP_HEADER,:,1)})=${CUT(PT1C_SIP_HEADER,:,2)}))' . " \n\t";
        $conf .= 'same => n,Set(__PT1C_SIP_HEADER=${UNDEFINED})' . " \n\t";
        $conf .= 'same => n,Set(CHANNEL(hangup_handler_wipe)=hangup_handler,s,1)' . " \n\t";
        $conf .= 'same => n,return' . " \n\n";

        $conf .= '[hangup_handler]' . "\n";
        $conf .= 'exten => s,1,NoOp(--- hangup - ${CHANNEL} ---)' . "\n\t";
        $conf .= 'same => n,Gosub(hangup_chan,${EXTEN},1)' . "\n\t";

        $conf .= 'same => n,return' . "\n\n";

        $conf .= '[set_orign_chan]' . "\n";
        $conf .= 'exten => s,1,Wait(0.2)' . "\n\t";
        $conf .= 'same => n,Set(pl=${IF($["${CHANNEL:-1}" == "1"]?2:1)})' . "\n\t";
        $conf .= 'same => n,Set(orign_chan=${IMPORT(${CUT(CHANNEL,\;,1)}\;${pl},BRIDGEPEER)})' . "\n\t";
        $conf .= 'same => n,ExecIf($[ "${orign_chan}x" == "x" ]?Set(orign_chan=${IMPORT(${CUT(CHANNEL,\;,1)}\;${pl},FROM_CHAN)}))' . "\n\t";
        $conf .= 'same => n,ExecIf($[ "${QUEUE_SRC_CHAN}x" != "x" ]?Set(__QUEUE_SRC_CHAN=${orign_chan}))' . "\n\t";
        $conf .= 'same => n,ExecIf($[ "${QUEUE_SRC_CHAN:0:5}" == "Local" ]?Set(__QUEUE_SRC_CHAN=${FROM_CHAN}))' . "\n\t";
        $conf .= 'same => n,ExecIf($[ "${FROM_CHAN}x" == "x" ]?Set(__FROM_CHAN=${IMPORT(${CUT(CHANNEL,\;,1)}\;${pl},BRIDGEPEER)}))' . "\n\t";
        $conf .= 'same => n,return' . "\n\n";

        $conf .= '[playback]' . "\n";
        $conf .= 'exten => s,1,Playback(hello_demo,noanswer)' . "\n\t";
        $conf .= 'same => n,ExecIf($["${SRC_BRIDGE_CHAN}x" == "x"]?Wait(30))' . "\n\t";
        $conf .= 'same => n,Wait(0.3)' . "\n\t";
        $conf .= 'same => n,Bridge(${SRC_BRIDGE_CHAN},kKTthH)' . "\n\n";

        $conf .= 'exten => h,1,ExecIf($["${ISTRANSFER}x" != "x"]?Gosub(${ISTRANSFER}dial_hangup,${EXTEN},1))' . "\n\n";

        // TODO / Добавление / удаление префиксов на входящий callerid.
        $conf .= '[add-trim-prefix-clid]' . "\n";
        $conf .= 'exten => _.!,1,NoOp(--- Incoming call from ${CALLERID(num)} ---)' . "\n\t";
        $conf .= 'same => n,GosubIf($["${DIALPLAN_EXISTS(${CONTEXT}-custom,${EXTEN},1)}" == "1"]?${CONTEXT}-custom,${EXTEN},1)' . "\n\t";
        // Отсекаем "+".
        // $conf.= 'same => n,ExecIf( $["${CALLERID(num):0:1}" == "+"]?Set(CALLERID(num)=${CALLERID(num):1}))'."\n\t";
        // Отсекаем "7" и добавляем "8".
        // $conf.= 'same => n,ExecIf( $["${REGEX("^7[0-9]+" ${CALLERID(num)})}" == "1"]?Set(CALLERID(num)=8${CALLERID(num):1}))'."\n\t";
        $conf .= 'same => n,return' . "\n\n";
    }

    /**
     * Генератор контекста для внутренних вызовов.
     *
     * @param $conf
     */
    private function generateInternal(&$conf)
    {
        $extension  = 'X!';
        $technology = SIPConf::getTechnology();

        $additionalModules = $this->di->getShared('pbxConfModules');
        foreach ($additionalModules as $appClass) {
            $conf .= $appClass->extensionGenContexts();
        }
        $conf .= "\n";
        $conf .= "[internal-num-undefined] \n";
        $conf .= 'exten => _' . $extension . ',1,ExecIf($["${ISTRANSFER}x" != "x"]?Gosub(${ISTRANSFER}dial_hangup,${EXTEN},1))' . "\n\t";
        $conf .= 'same => n,ExecIf($["${BLINDTRANSFER}x" != "x"]?AGI(check_redirect.php,${BLINDTRANSFER}))' . "\n\t";
        $conf .= "same => n,Playback(pbx-invalid,noanswer) \n\n";

        $conf .= "[internal-fw]\n";
        $conf .= 'exten => _' . $extension . ',1,NoOp(DIALSTATUS - ${DIALSTATUS})' . "\n\t";
        // CANCEL - вызов был отменен, к примеру *0, не нужно дальше искать адресат.
        $conf .= 'same => n,ExecIf($["${DIALSTATUS}" == "CANCEL"]?Hangup())' . "\n\t";
        // BUSY - занято. К примру абонент завершил вызов или DND.
        $conf .= 'same => n,ExecIf($["${DIALSTATUS}" == "BUSY"]?Set(dstatus=FW_BUSY))' . "\n\t";
        // CHANUNAVAIL - канал не доступен. К примеру телефон не зарегистрирован или не отвечает.
        $conf .= 'same => n,ExecIf($["${DIALSTATUS}" == "CHANUNAVAIL"]?Set(dstatus=FW_UNAV))' . "\n\t";
        // NOANSWER - не ответили по таймауту.
        $conf .= 'same => n,ExecIf($["${dstatus}x" == "x"]?Set(dstatus=FW))' . "\n\t";
        $conf .= 'same => n,Set(fw=${DB(${dstatus}/${EXTEN})})' . "\n\t";
        $conf .= 'same => n,ExecIf($["${fw}x" != "x"]?Set(__pt1c_UNIQUEID=${UNDEFINED})' . "\n\t";
        $conf .= 'same => n,ExecIf($["${fw}x" != "x"]?Goto(internal,${fw},1))' . "\n\t";
        $conf .= 'same => n,ExecIf($["${BLINDTRANSFER}x" != "x"]?AGI(check_redirect.php,${BLINDTRANSFER}))' . "\n\t";
        $conf .= 'same => n,Hangup() ' . "\n\n";

        $conf .= "[all_peers]\n";
        $conf .= 'include => internal-hints' . "\n";
        $conf .= 'exten => failed,1,Hangup()' . "\n";

        $conf .= 'exten => _.!,1,ExecIf($[ "${EXTEN}" == "h" ]?Hangup())' . "\n\t";
        $conf .= 'same => n,Set(__FROM_CHAN=${CHANNEL})' . "\n\t";
        $conf .= 'same => n,ExecIf($["${OLD_LINKEDID}x" == "x"]?Set(__OLD_LINKEDID=${CDR(linkedid)}))' . "\n\t";
        $conf .= 'same => n,ExecIf($["${CHANNEL(channeltype)}" != "Local"]?Gosub(set_from_peer,s,1))' . "\n\t";
        $conf .= 'same => n,ExecIf($["${CHANNEL(channeltype)}" == "Local"]?Gosub(set_orign_chan,s,1))' . "\n\t";

        $conf .= 'same => n,ExecIf($["${CALLERID(num)}x" == "x"]?Set(CALLERID(num)=${FROM_PEER}))' . "\n\t";
        $conf .= 'same => n,ExecIf($["${CALLERID(num)}x" == "x"]?Set(CALLERID(name)=${FROM_PEER}))' . "\n\t";

        $conf .= 'same => n,ExecIf($["${CHANNEL(channeltype)}" == "Local" && "${FROM_PEER}x" == "x"]?Set(__FROM_PEER=${CALLERID(num)}))' . "\n\t";
        $conf .= 'same => n,Set(CHANNEL(hangup_handler_wipe)=hangup_handler,s,1)' . "\n\t";
        $conf .= 'same => n,Gosub(${ISTRANSFER}dial,${EXTEN},1)' . "\n\t";

        // Описываем возможность прыжка в пользовательский sub контекст.
        $conf .= 'same => n,GosubIf($["${DIALPLAN_EXISTS(${CONTEXT}-custom,${EXTEN},1)}" == "1"]?${CONTEXT}-custom,${EXTEN},1)' . "\n\t";

        $conf .= 'same => n,Goto(peer_${FROM_PEER},${EXTEN},1)' . "\n\n";

        $pickupexten = $this->mikoPBXConfig->getPickupExten();
        $conf        .= 'exten => _' . $pickupexten . $extension . ',1,Set(PICKUPEER=' . $technology . '/${FILTER(0-9,${EXTEN:2})})' . "\n\t";
        $conf        .= 'same => n,Set(pt1c_dnid=${EXTEN})' . "\n\t";
        $conf        .= 'same => n,PickupChan(${PICKUPEER})' . "\n\t";
        $conf        .= 'same => n,Hangup()' . "\n\n";

        $voicemail_exten = $this->mikoPBXConfig->getVoicemailExten();
        $conf            .= 'exten => ' . $voicemail_exten . ',1,NoOp(NOTICE, Dialing out from ${CALLERID(all)} to VoiceMail)' . "\n\t";
        $conf            .= 'same => n,VoiceMailMain(admin@voicemailcontext,s)' . "\n\t";
        $conf            .= 'same => n,Hangup()' . "\n\n";

        $conf .= "[voice_mail_peer] \n";
        $conf .= 'exten => voicemail,1,Answer()' . "\n\t";
        $conf .= 'same => n,VoiceMail(admin@voicemailcontext)' . "\n\t";
        $conf .= 'same => n,Hangup()' . "\n\n";

        // Контекст для внутренних вызовов.
        $conf .= "[internal] \n";

        foreach ($additionalModules as $appClass) {
            $conf .= $appClass->getIncludeInternal();
        }

        foreach ($additionalModules as $appClass) {
            $conf .= $appClass->extensionGenInternal();
        }

        $conf .= 'exten => i,1,NoOp(-- INVALID NUMBER --)' . "\n\t";
        $conf .= 'same => n,Set(DIALSTATUS=INVALID_NUMBER)' . "\n\t";
        $conf .= 'same => n,Playback(privacy-incorrect,noanswer)' . "\n\t";
        $conf .= 'same => n,Hangup()' . "\n";

        $conf .= 'exten => h,1,ExecIf($["${ISTRANSFER}x" != "x"]?Gosub(${ISTRANSFER}dial_hangup,${EXTEN},1))' . "\n\n";

        $conf .= "[internal-incoming]\n";
        $conf .= 'exten => _.!,1,ExecIf($["${MASTER_CHANNEL(M_TIMEOUT)}x" != "x"]?Set(TIMEOUT(absolute)=${MASTER_CHANNEL(M_TIMEOUT)}))' . " \n\t";
        $conf .= 'same => n,Set(MASTER_CHANNEL(M_TIMEOUT_CHANNEL)=${CHANNEL})' . " \n\t";
        $conf .= 'same => n,Set(MASTER_CHANNEL(M_TIMEOUT)=${EMPTY_VAR})' . " \n\t";
        $conf .= 'same => n,Goto(internal,${EXTEN},1)' . " \n\n";

        $conf .= "[internal-users] \n";
        $conf .= 'exten => _' . $extension . ',1,Set(CHANNEL(hangup_handler_wipe)=hangup_handler,s,1)' . " \n\t";
        $conf .= 'same => n,ExecIf($["${ISTRANSFER}x" != "x"]?Set(SIPADDHEADER01=${EMPTY_VAR})' . " \n\t";
        $conf .= 'same => n,ExecIf($["${CHANNEL(channeltype)}" == "Local"]?Gosub(set_orign_chan,s,1))' . " \n\t";

        $conf .= 'same => n,Gosub(${ISTRANSFER}dial,${EXTEN},1)' . "\n\t";
        // Проверим, существует ли такой пир.

        if (SIPConf::TYPE_SIP === $technology) {
            $conf .= 'same => n,ExecIf($["${SIPPEER(${EXTEN},status)}x" == "x"]?Goto(internal-num-undefined,${EXTEN},1))' . " \n\t";
        } else {
            $conf .= 'same => n,ExecIf($["${PJSIP_ENDPOINT(${EXTEN},auth)}x" == "x"]?Goto(internal-num-undefined,${EXTEN},1))' . " \n\t";
        }
        $conf .= 'same => n,ExecIf($["${DEVICE_STATE(' . $technology . '/${EXTEN})}" == "BUSY"]?Set(DIALSTATUS=BUSY))' . " \n\t";
        $conf .= 'same => n,GotoIf($["${DEVICE_STATE(' . $technology . '/${EXTEN})}" == "BUSY"]?fw_start)' . " \n\t";

        // Как долго звонить пиру.
        $conf .= 'same => n,Set(ringlength=${DB(FW_TIME/${EXTEN})})' . " \n\t";
        $conf .= 'same => n,ExecIf($["${ringlength}x" == "x" || "${QUEUE_SRC_CHAN}x" != "x"]?Set(ringlength=600))' . " \n\t";

        $conf .= 'same => n,GosubIf($["${DIALPLAN_EXISTS(${CONTEXT}-custom,${EXTEN},1)}" == "1"]?${CONTEXT}-custom,${EXTEN},1) ' . " \n\t";
        // Совершаем вызов пира.

        if ($technology === SIPConf::TYPE_SIP) {
            $conf .= 'same => n,Dial(' . $technology . '/${EXTEN},${ringlength},TtekKHhM(dial_answer)b(dial_create_chan,s,1))' . " \n\t";
        } else {
            // $conf.= 'same => n,Dial(${PJSIP_DIAL_CONTACTS(${EXTEN})},${ringlength},TtekKHhU(dial_answer)b(dial_create_chan,s,1))'." \n\t";
            $conf .= 'same => n,Set(DST_CONTACT=${PJSIP_DIAL_CONTACTS(${EXTEN})})' . " \n\t";
            $conf .= 'same => n,ExecIf($["${DST_CONTACT}x" != "x"]?Dial(${DST_CONTACT},${ringlength},TtekKHhU(${ISTRANSFER}dial_answer)b(${ISTRANSFER}dial_create_chan,s,1)):Set(DIALSTATUS=CHANUNAVAIL))' . " \n\t";
        }


        $conf .= 'same => n(fw_start),NoOp(dial_hangup)' . " \n\t";

        // QUEUE_SRC_CHAN - установлена, если вызов сервершен агенту очереди.
        // Проверяем нужна ли переадресация
        $expression = '$["${DIALSTATUS}" != "ANSWER" && "${QUEUE_SRC_CHAN}x" == "x"]';
        $conf       .= 'same => n,ExecIf(' . $expression . '?Goto(internal-fw,${EXTEN},1))' . " \n\t";
        $conf       .= 'same => n,ExecIf($["${BLINDTRANSFER}x" != "x"]?AGI(check_redirect.php,${BLINDTRANSFER}))' . " \n\t";
        $conf       .= 'same => n,Hangup()' . "\n\n";

        $conf .= 'exten => h,1,ExecIf($["${ISTRANSFER}x" != "x"]?Gosub(${ISTRANSFER}dial_hangup,${EXTEN},1))' . "\n\n";
    }

    /**
     * Генератор контекста для переадресаций.
     *
     * @param $conf
     */
    private function generateInternalTransfer(&$conf): void
    {
        $additionalModules = $this->di->getShared('pbxConfModules');
        $conf              .= "[internal-transfer] \n";

        foreach ($additionalModules as $appClass) {
            $conf .= $appClass->getIncludeInternalTransfer();
        }

        foreach ($additionalModules as $appClass) {
            $conf .= $appClass->extensionGenInternalTransfer();
        }
        $conf .= 'exten => h,1,Gosub(transfer_dial_hangup,${EXTEN},1)' . "\n\n";
    }

    /**
     * Генератор хинтов SIP.
     *
     * @param $conf
     */
    private function generateSipHints(&$conf): void
    {
        $additionalModules = $this->di->getShared('pbxConfModules');
        $conf              .= "[internal-hints] \n";
        foreach ($additionalModules as $appClass) {
            $conf .= $appClass->extensionGenHints();
        }
        $conf .= "\n\n";
    }

    /**
     * Генератор исходящих контекстов.
     *
     * @param $conf
     */
    private function generateOutContextPeers(&$conf): void
    {
        $additionalModules = $this->di->getShared('pbxConfModules');
        $conf              .= "[outgoing] \n";

        $conf .= 'exten => _+.!,1,NoOp(Strip + sign from number and convert it to 00)' . " \n\t";
        $conf .= 'same => n,Set(ADDPLUS=00);' . " \n\t";
        $conf .= 'same => n,Goto(${CONTEXT},${EXTEN:1},1);' . " \n\n";
        $conf .= 'exten => _X!,1,NoOp(Start outgoing calling...)' . " \n\t";
        $conf .= 'same => n,Ringing()' . " \n\t";

        // Описываем возможность прыжка в пользовательский sub контекст.
        $conf .= 'same => n,GosubIf($["${DIALPLAN_EXISTS(${CONTEXT}-custom,${EXTEN},1)}" == "1"]?${CONTEXT}-custom,${EXTEN},1)' . "\n\t";

        /** @var \MikoPBX\Common\Models\OutgoingRoutingTable $routs */
        /** @var \MikoPBX\Common\Models\OutgoingRoutingTable $rout */
        $routs             = OutgoingRoutingTable::find(['order' => 'priority']);
        $provider_contexts = [];

        foreach ($routs as $rout) {
            foreach ($additionalModules as $appClass) {
                $technology = $appClass->getTechByID($rout->providerid);
                if ($technology !== '') {
                    $rout_data                       = $rout->toArray();
                    $rout_data['technology']         = $technology;
                    $id_dialplan                     = $rout_data['providerid'] . '-' . $rout_data['id'] . '-outgoing';
                    $provider_contexts[$id_dialplan] = $rout_data;
                    $conf                            .= $this->generateOutgoingRegexPattern($rout_data);
                    break;
                }
            }
        }
        $conf .= 'same => n,ExecIf($["${peer_mobile}x" != "x"]?Hangup())' . " \n\t";
        $conf .= 'same => n,ExecIf($["${DIALSTATUS}" != "ANSWER" && "${BLINDTRANSFER}x" != "x" && "${ISTRANSFER}x" != "x"]?Gosub(${ISTRANSFER}dial_hangup,${EXTEN},1))' . "\n\t";
        $conf .= 'same => n,ExecIf($["${BLINDTRANSFER}x" != "x"]?AGI(check_redirect.php,${BLINDTRANSFER}))' . " \n\t";
        // $conf.= 'same => n,ExecIf($["${ROUTFOUND}x" == "x"]?AGI(cdr_connector.php,dial))'." \n\t";
        $conf .= 'same => n,ExecIf($["${ROUTFOUND}x" == "x"]?Gosub(dial,${EXTEN},1))' . "\n\t";

        $conf .= 'same => n,Playback(silence/2,noanswer)' . " \n\t";
        $conf .= 'same => n,ExecIf($["${ROUTFOUND}x" != "x"]?Playback(followme/sorry,noanswer):Playback(cannot-complete-as-dialed,noanswer))' . " \n\t";
        $conf .= 'same => n,Hangup()' . " \n\n";
        // $conf.= 'exten => h,1,AGI(cdr_connector.php,${ISTRANSFER}dial_hangup)'."\n";
        $conf .= 'exten => h,1,ExecIf($["${ISTRANSFER}x" != "x"]?Gosub(${ISTRANSFER}dial_hangup,${EXTEN},1))' . "\n\t";

        foreach ($provider_contexts as $id_dialplan => $rout) {
            $conf .= "\n[{$id_dialplan}]\n";
            if (isset($rout['trimfrombegin']) && $rout['trimfrombegin'] > 0) {
                // $exten_var = '${ADDPLUS}${EXTEN:'.$rout['trimfrombegin'].'}';
                $exten_var    = '${EXTEN:' . $rout['trimfrombegin'] . '}';
                $change_exten = 'same => n,ExecIf($["${EXTEN}" != "${number}"]?Goto(${CONTEXT},${number},$[${PRIORITY} + 1]))' . "\n\t";
            } else {
                $exten_var    = '${ADDPLUS}${EXTEN}';
                $change_exten = '';
            }
            $conf .= 'exten => _X!,1,Set(number=' . $rout['prepend'] . $exten_var . ')' . "\n\t";
            $conf .= $change_exten;
            foreach ($additionalModules as $appClass) {
                $conf .= $appClass->generateOutRoutContext($rout);
            }
            $conf .= 'same => n,ExecIf($["${number}x" == "x"]?Hangup())' . "\n\t";
            $conf .= 'same => n,Set(ROUTFOUND=1)' . "\n\t";
            $conf .= 'same => n,Gosub(${ISTRANSFER}dial,${EXTEN},1)' . "\n\t";

            $conf .= 'same => n,ExecIf($["${EXTERNALPHONE}" == "${EXTEN}"]?Set(DOPTIONS=tk))' . "\n\t";

            // Описываем возможность прыжка в пользовательский sub контекст.
            $conf .= 'same => n,GosubIf($["${DIALPLAN_EXISTS(' . $rout['providerid'] . '-outgoing-custom,${EXTEN},1)}" == "1"]?' . $rout['providerid'] . '-outgoing-custom,${EXTEN},1)' . "\n\t";

            $technology = SIPConf::getTechnology();
            if ($rout['technology'] === IAXConf::TYPE_IAX2) {
                $conf .= 'same => n,Dial(' . $rout['technology'] . '/' . $rout['providerid'] . '/${number},600,${DOPTIONS}TKM(dial_answer)b(dial_create_chan,s,1))' . "\n\t";
            } elseif ($technology === SIPConf::TYPE_SIP) {
                $conf .= 'same => n,Dial(' . $rout['technology'] . '/' . $rout['providerid'] . '/${number},600,${DOPTIONS}TKM(dial_answer)b(dial_create_chan,s,1))' . "\n\t";
            } else {
                $conf .= 'same => n,Dial(' . $rout['technology'] . '/${number}@' . $rout['providerid'] . ',600,${DOPTIONS}TKU(dial_answer)b(dial_create_chan,s,1))' . "\n\t";
            }
            foreach ($additionalModules as $appClass) {
                $conf .= $appClass->generateOutRoutAfterDialContext($rout);
            }
            $conf .= 'same => n,GosubIf($["${DIALPLAN_EXISTS(' . $rout['providerid'] . '-outgoing-after-dial-custom,${EXTEN}),1}" == "1"]?' . $rout['providerid'] . '-outgoing-after-dial-custom,${EXTEN},1)' . "\n\t";

            $conf .= 'same => n,ExecIf($["${ISTRANSFER}x" != "x"]?Gosub(${ISTRANSFER}dial_hangup,${EXTEN},1))' . "\n\t";
            $conf .= 'same => n,ExecIf($["${DIALSTATUS}" = "ANSWER"]?Hangup())' . "\n\t";
            $conf .= 'same => n,Set(pt1c_UNIQUEID=${EMPTY_VALUE})' . "\n\t";
            $conf .= 'same => n,return' . "\n";
        }
    }

    /**
     * Генератор исходящего маршрута.
     *
     * @param $rout
     *
     * @return string
     */
    private function generateOutgoingRegexPattern($rout): string
    {
        $conf        = '';
        $restnumbers = '';
        if (isset($rout['restnumbers']) && $rout['restnumbers'] > 0) {
            $restnumbers = "[0-9]{" . $rout['restnumbers'] . "}$";
        } elseif ($rout['restnumbers'] == 0) {
            $restnumbers = "$";
        } elseif ($rout['restnumbers'] == -1) {
            $restnumbers = "";
        }
        $numberbeginswith = $rout['numberbeginswith'];
        $conf             .= 'same => n,ExecIf($["${REGEX("^' . $numberbeginswith . $restnumbers . '" ${EXTEN})}" == "1"]?Gosub(' . $rout['providerid'] . '-' . $rout['id'] . '-outgoing,${EXTEN},1))' . " \n\t";

        return $conf;
    }

    /**
     * Контекст для входящих внешних звонков без авторизации.
     *
     * @param $conf
     */
    public function generatePublicContext(&$conf): void
    {
        $additionalModules = $this->di->getShared('pbxConfModules');
        $conf              .= "\n";
        $conf              .= self::generateIncomingContextPeers('none', '', '');
        $conf              .= "[public-direct-dial] \n";
        foreach ($additionalModules as $appClass) {
            $appClass->generatePublicContext($conf);
        }
        $filter = ["provider IS NULL AND priority<>9999"];

        /**
         * @var array
         */
        $m_data = IncomingRoutingTable::find($filter);
        if (count($m_data->toArray()) > 0) {
            $conf .= 'include => none-incoming';
        }
    }

    /**
     * Генератор входящих контекстов.
     *
     * @param string | array $provider
     * @param string | array $login
     * @param string         $uniqid
     *
     * @return string
     */
    public static function generateIncomingContextPeers($provider, $login = '', $uniqid = ''): string
    {
        $conf              = '';
        $dialplan          = [];
        $additionalModules = Di::getDefault()->getShared('pbxConfModules');

        if ('none' === $provider) {
            // Звонки по sip uri.
            $filter = [
                'provider IS NULL AND priority<>9999',
                'order' => 'provider,priority,extension',
            ];
        } elseif (is_array($provider)) {
            $filter = [
                'provider IN ({provider:array})',
                'bind'  => [
                    'provider' => array_keys($provider),
                ],
                'order' => 'provider,priority,extension',
            ];
        } else {
            // Звонки через провайдера.
            $filter = [
                "provider = '$provider'",
                'order' => 'provider,priority,extension',
            ];
        }
        /** @var \MikoPBX\Common\Models\IncomingRoutingTable $default_action */
        $default_action = IncomingRoutingTable::findFirst('priority = 9999');
        /** @var \MikoPBX\Common\Models\IncomingRoutingTable $m_data */
        $m_data = IncomingRoutingTable::find($filter);
        $data   = $m_data->toArray();

        $need_def_rout = true;
        foreach ($data as $rout) {
            $number = trim($rout['number']);
            if ($number === 'X!' || $number === '') {
                $need_def_rout = false;
                break;
            }
        }
        if ($need_def_rout === true && 'none' !== $provider) {
            $data[] = ['number' => '', 'extension' => '', 'timeout' => ''];
        }
        $config = new MikoPBXConfig();
        $lang   = str_replace('_', '-', $config->getGeneralSettings('PBXLanguage'));

        $rout_data_dial = [];
        foreach ($data as $rout) {
            $number      = trim($rout['number']);
            $timeout     = trim($rout['timeout']);
            $rout_number = ($number === '') ? 'X!' : $number;
            $rout_data   = &$dialplan[$rout_number];
            if (empty($rout_data)) {
                $ext_prefix = ('none' === $provider) ? '' : '_';
                $rout_data  .= "exten => {$ext_prefix}{$rout_number},1,NoOp(--- Incoming call ---)\n\t";
                $rout_data  .= 'same => n,Set(CHANNEL(language)=' . $lang . ')' . "\n\t";
                $rout_data  .= 'same => n,Set(CHANNEL(hangup_handler_wipe)=hangup_handler,s,1)' . "\n\t";
                $rout_data  .= 'same => n,Set(__FROM_DID=${EXTEN})' . "\n\t";
                $rout_data  .= 'same => n,Set(__FROM_CHAN=${CHANNEL})' . "\n\t";

                // Установка имени пира.
                $rout_data .= 'same => n,ExecIf($["${CHANNEL(channeltype)}" != "Local"]?Gosub(set_from_peer,s,1))' . "\n\t";
                $rout_data .= 'same => n,ExecIf($["${CHANNEL(channeltype)}" == "Local"]?Set(__FROM_PEER=${CALLERID(num)}))' . "\n\t";

                // TODO / Подмена входящего callerid.
                $rout_data .= 'same => n,Gosub(add-trim-prefix-clid,${EXTEN},1)' . "\n\t";

                if ($additionalModules) {
                    foreach ($additionalModules as $appClass) {
                        $rout_data .= $appClass->generateIncomingRoutBeforeDial($rout_number);
                    }
                }

                // Перехват на ответственного.
                $rout_data .= 'same => n,UserEvent(Interception,CALLERID: ${CALLERID(num)},chan1c: ${CHANNEL},FROM_DID: ${FROM_DID})' . "\n\t";
                // Проверим распискние для входящих внешних звонков.
                $rout_data .= 'same => n,Gosub(check-out-work-time,${EXTEN},1)';
                // Описываем возможность прыжка в пользовательский sub контекст.
                $rout_data .= " \n\t" . 'same => n,GosubIf($["${DIALPLAN_EXISTS(${CONTEXT}-custom,${EXTEN},1)}" == "1"]?${CONTEXT}-custom,${EXTEN},1)';
            }

            if ( ! empty($rout['extension'])) {
                $rout_data = rtrim($rout_data);
                // Обязательно проверяем "DIALSTATUS", в случае с парковой через AMI вызова это необходимо.
                // При ответе может отработать следующий приоритет.
                if ( ! isset($rout_data_dial[$rout_number])) {
                    $rout_data_dial[$rout_number] = '';
                }

                $dial_command                 = " \n\t" . 'same => n,' . 'ExecIf($["${M_DIALSTATUS}" != "ANSWER"]?' . "Dial(Local/{$rout['extension']}@internal-incoming/n,{$timeout},TKg));";
                $rout_data_dial[$rout_number] .= " \n\t" . "same => n,Set(M_TIMEOUT={$timeout})";
                $rout_data_dial[$rout_number] .= $dial_command;

                if (is_array($provider)) {
                    $key = $provider[$rout['provider']] ?? '';
                    if ( ! isset($rout_data_dial[$key])) {
                        $rout_data_dial[$key] = '';
                    }
                    if (empty($number)) {
                        $rout_data_dial[$key] .= $dial_command;
                    }
                }
            }
        }

        if (is_string($login)) {
            $add_login_pattern = ! empty($login);
            foreach ($data as $rout) {
                if ( ! $add_login_pattern) {
                    break;
                } // Логин не заполнен, обработка не требуется.
                $is_num = preg_match_all('/^\d+$/m', $login, $matches, PREG_SET_ORDER, 0);
                if ($is_num === 1) {
                    // Это числовой номер, потому, не требуется дополнительно описывать exten.
                    $add_login_pattern = false;
                    break;
                }
                if (trim($rout['number']) !== $login) {
                    // Совпадение exten не найдено. Идем дальше.
                    continue;
                }
                // Совпадение найдено, не требуется дополнительно описывать exten.
                $add_login_pattern = false;
                break;
            }
            if ($add_login_pattern && array_key_exists('X!', $rout_data_dial) && isset($dialplan['X!'])) {
                $dialplan[$login]       = str_replace('_X!,1', "{$login},1", $dialplan['X!']);
                $rout_data_dial[$login] = $rout_data_dial['X!'];
            }
        } else {
            foreach (array_values($provider) as $_login) {
                $dialplan[$_login] = str_replace('_X!,1', "{$_login},1", $dialplan['X!']);
            }
        }

        foreach ($dialplan as $key => &$dpln) {
            if ( ! array_key_exists($key, $rout_data_dial)) {
                continue;
            }
            $dpln = rtrim($dpln);
            $dpln .= $rout_data_dial[$key];
        }
        unset($dpln);

        $uniqid = is_string($provider) ? $provider : $uniqid;
        $conf   .= "\n" . "[{$uniqid}-incoming]\n";
        foreach ($dialplan as $dpln) {
            $conf .= $dpln . "\n";
            if (null == $default_action && 'none' !== $provider) {
                continue;
            }
            if ('extension' === $default_action->action) {
                // Обязательно проверяем "DIALSTATUS", в случае с парковой через AMI вызова это необходимо.
                // При ответе может отработать следующий приоритет.
                $conf .= "\t" . 'same => n,Set(M_TIMEOUT=0)' . "\n";
                $conf .= "\t" . "same => n," . 'ExecIf($["${M_DIALSTATUS}" != "ANSWER"]?' . "Dial(Local/{$default_action->extension}@internal/n,,TKg)); default action" . "\n";

                if ($additionalModules) {
                    foreach ($additionalModules as $appClass) {
                        $conf .= $appClass->generateIncomingRoutAfterDialContext($uniqid);
                    }
                }
                $conf .= " \t" . 'same => n,GosubIf($["${DIALPLAN_EXISTS(${CONTEXT}-after-dial-custom,${EXTEN},1)}" == "1"]?${CONTEXT}-after-dial-custom,${EXTEN},1)' . "\n";
            } elseif ('busy' === $default_action->action) {
                $conf .= "\t" . "same => n,Busy()" . "\n";
            }
            $conf .= "\t" . "same => n,Hangup()" . "\n";
        }

        return $conf;
    }

    /**
     * Описываем нерабочее время.
     *
     * @param $conf
     *
     * @return string
     */
    private function generateOutWorkTimes(&$conf): string
    {
        $conf .= "\n\n[playback-exit]\n";
        $conf .= 'exten => _.!,1,NoOp(check time)' . "\n\t";
        $conf .= 'same => n,Gosub(dial_outworktimes,${EXTEN},1)' . "\n\t";
        $conf .= 'same => n,Playback(${filename})' . "\n\t";
        $conf .= 'same => n,Hangup()' . "\n\n";

        $conf .= "[check-out-work-time]\n";
        $conf .= "exten => _.!,1,NoOp(check time)\n\t";

        $data = OutWorkTimes::find(['order' => 'date_from']);

        $conf_out_set_var = '';

        $now_year = 1 * date('Y', time());
        foreach ($data as $out_data) {
            /** @var \MikoPBX\Common\Models\OutWorkTimes $out_data */
            if ( ! empty($out_data->date_from) && ! empty($out_data->date_to)) {
                $year_from = 1 * date('Y', $out_data->date_from);
                $year_to   = 1 * date('Y', $out_data->date_to);
                if ($now_year < $year_from || $now_year > $year_to) {
                    // Правило не актуально для текущего года.
                    continue;
                }
            }
            $time_from = $out_data->time_from;
            $time_to   = $out_data->time_to;
            if (empty($time_from) && empty($time_to)) {
                $times = '*';
            } else {
                $time_to = (empty($time_to)) ? '23:59' : $time_to;
                $time_to = (strlen($time_to) == 4) ? "0{$time_to}" : $time_to;

                $time_from = (empty($time_from)) ? '00:00' : $time_from;
                $time_from = (strlen($time_from) == 4) ? "0{$time_from}" : $time_from;

                $times = "{$time_from}-{$time_to}";
            }

            $weekday_from = $out_data->weekday_from;
            $weekday_to   = $out_data->weekday_to;
            $arr_weekday  = [null, "mon", "tue", "wed", "thu", "fri", "sat", "sun"];
            if (empty($weekday_from) && empty($weekday_to)) {
                $weekdays = '*';
            } else {
                $weekday_from = (empty($weekday_from)) ? '1' : $weekday_from;
                $weekday_to   = (empty($weekday_to)) ? '7' : $weekday_to;
                $weekdays     = "{$arr_weekday[$weekday_from]}-{$arr_weekday[$weekday_to]}";
            }

            $date_from = $out_data->date_from;
            $date_to   = $out_data->date_to;
            if (empty($date_from)) {
                $mdays  = '*';
                $months = '*';
            } else {
                $mdays  = strtolower(date("j", $date_from));
                $months = strtolower(date("M", $date_from));
                if ( ! empty($date_to)) {
                    $mdays  .= "-" . strtolower(date("j", $date_to));
                    $months .= "-" . strtolower(date("M", $date_to));
                }
            }


            if ('extension' === $out_data->action) {
                $appname = 'GotoIfTime';
                $appdata = "internal,{$out_data->extension},1";
            } else {
                /** @var \MikoPBX\Common\Models\SoundFiles $res */
                $res           = SoundFiles::findFirst($out_data->audio_message_id);
                $audio_message = ($res === null) ? '' : Util::trimExtensionForFile($res->path);

                $conf_out_set_var .= "[work-time-set-var-{$out_data->id}]\n" .
                    'exten => _.!,1,Set(filename=' . $audio_message . ')' . "\n\t" .
                    'same => n,Goto(playback-exit,${EXTEN},1)' . "\n\n";

                $appname = 'ExecIfTime';
                $appdata = 'Goto(work-time-set-var-' . $out_data->id . ',${EXTEN},1)';
            }
            $conf .= "same => n,{$appname}($times,$weekdays,$mdays,$months?{$appdata})\n\t";
        }

        $conf .= "same => n,return\n\n";

        $conf .= $conf_out_set_var;

        return $conf;
    }
}