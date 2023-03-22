<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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

use MikoPBX\Common\Models\IncomingRoutingTable;
use MikoPBX\Core\Asterisk\Configs\Generators\Extensions\{IncomingContexts, InternalContexts, OutgoingContext};
use MikoPBX\Core\System\{Storage, Util};

class ExtensionsConf extends CoreConfigClass
{
    public const ALL_NUMBER_EXTENSION = '_[0-9*#+a-zA-Z][0-9*#+a-zA-Z]!';
    public const ALL_EXTENSION = '_[0-9*#+a-zA-Z]!';
    public const DIGIT_NUMBER_EXTENSION = '_X!';
    protected string $description = 'extensions.conf';

    /**
     * Sorts array by priority field
     *
     * @param $a
     * @param $b
     *
     * @return int|null
     */
    public static function sortArrayByPriority(array $a, array $b): int
    {
        $aPriority = (int)($a['priority'] ?? 0);
        $bPriority = (int)($b['priority'] ?? 0);
        if ($aPriority === $bPriority) {
            return 0;
        }

        return ($aPriority < $bPriority) ? -1 : 1;
    }

    /**
     * Основной генератор extensions.conf
     */
    protected function generateConfigProtected(): void
    {
        /** @scrutinizer ignore-call */
        $conf              = "[globals]" .PHP_EOL.
            "TRANSFER_CONTEXT=internal-transfer;".PHP_EOL;
        if ($this->generalSettings['PBXRecordCalls'] === '1') {
            $conf .= "MONITOR_DIR=" . Storage::getMonitorDir() .PHP_EOL;
            $conf .= "MONITOR_STEREO=" . $this->generalSettings['PBXSplitAudioThread'] .PHP_EOL;
        }
        if ($this->generalSettings['PBXRecordCallsInner'] === '0') {
            $conf .= "MONITOR_INNER=0".PHP_EOL;
        }else{
            $conf .= "MONITOR_INNER=1".PHP_EOL;
        }
        $conf .= "PBX_REC_ANNONCE_IN=" .ExtensionsAnnounceRecording::getPathAnnounceFile($this->generalSettings['PBXRecordAnnouncementIn']).PHP_EOL;
        $conf .= "PBX_REC_ANNONCE_OUT=".ExtensionsAnnounceRecording::getPathAnnounceFile($this->generalSettings['PBXRecordAnnouncementOut']).PHP_EOL;
        $conf .= $this->hookModulesMethod(CoreConfigClass::EXTENSION_GLOBALS);
        $conf .= PHP_EOL.PHP_EOL;
        $conf .= "[general]".PHP_EOL;

        // Контекст для внутренних вызовов.
        $conf .= InternalContexts::generate();
        // Создаем диалплан внутренних учеток.
        $this->generateOtherExten($conf);
        // Контекст для внутренних переадресаций.
        $this->generateInternalTransfer($conf);
        // Создаем контекст хинтов.
        $this->generateSipHints($conf);
        // Создаем контекст (исходящие звонки).
        $conf .= OutgoingContext::generate();

        // Описываем контекст для публичных входящих.
        $conf .= $this->generatePublicContext();

        Util::fileWriteContent($this->config->path('asterisk.astetcdir') . '/extensions.conf', $conf);
        $confLua =  '-- extensions["test-default"] = {'.PHP_EOL.
                    '--    ["100"] = function(context, extension)'.PHP_EOL.
                    '--        app.playback("please-hold");'.PHP_EOL.
                    '--    end;'.PHP_EOL.
                    '-- -- Forbidden to describe contexts defined in extensions.conf. This will cause a crash asterisk.'.PHP_EOL.
                    '-- };';
        Util::fileWriteContent($this->config->path('asterisk.luaDialplanDir') . '/99-extensions-override.lua', $confLua);
    }

    /**
     * Генератор прочих контекстов.
     *
     * @param $conf
     */
    private function generateOtherExten(&$conf): void
    {
        // Контекст для AMI originate. Без него отображается не корректный CallerID.
        $conf .= '[sipregistrations]' . "\n\n";
        // messages
        // https://community.asterisk.org/t/messagesend-to-all-pjsip-contacts/75485/5
        $conf .= '[messages]' . PHP_EOL .
                 'exten => _X.,1,NoOp("Sending message, To ${MESSAGE(to)}, Hint ${ARG1}, From ${MESSAGE(from)}, CID ${CALLERID}, Body ${MESSAGE(body)}")' . PHP_EOL ."\t".
                 'same => n,Gosub(set-dial-contacts,${EXTEN},1)' . PHP_EOL ."\t".
                 'same => n,While($["${SET(contact=${SHIFT(DST_CONTACT,&):6})}" != ""])' . PHP_EOL ."\t".
                 'same => n,MessageSend(pjsip:${contact},${REPLACE(MESSAGE(from),-WS)})' . PHP_EOL ."\t".
                 'same => n,NoOp("Send status is ${MESSAGE_SEND_STATUS}")' . PHP_EOL ."\t".
                 'same => n,EndWhile' . PHP_EOL ."\t".
                 'same => n,HangUp()' . PHP_EOL .PHP_EOL;

        $conf .= '[internal-originate]' . PHP_EOL .
            'exten => _.!,1,Set(pt1c_cid=${FILTER(\*\#\+1234567890,${pt1c_cid})})' . PHP_EOL . "\t" .
            'same => n,Set(MASTER_CHANNEL(ORIGINATE_DST_EXTEN)=${pt1c_cid})' . PHP_EOL . "\t" .
            'same => n,Set(number=${FILTER(\*\#\+1234567890,${EXTEN})})' . PHP_EOL . "\t" .
            'same => n,ExecIf($["${EXTEN}" != "${number}"]?Goto(${CONTEXT},${number},$[${PRIORITY} + 1]))' . PHP_EOL . "\t" .
            'same => n,Set(__IS_ORGNT=${EMPTY})' . PHP_EOL . "\t" .

            'same => n,Gosub(interception_start,${EXTEN},1)' . PHP_EOL . "\t" .
            'same => n,ExecIf($["${pt1c_cid}x" != "x"]?Set(CALLERID(num)=${pt1c_cid}))' . PHP_EOL . "\t" .
            'same => n,ExecIf($["${origCidName}x" != "x"]?Set(CALLERID(name)=${origCidName}))' . PHP_EOL . "\t" .
            'same => n,GosubIf($["${DIALPLAN_EXISTS(${CONTEXT}-custom,${EXTEN},1)}" == "1"]?${CONTEXT}-custom,${EXTEN},1)' . PHP_EOL . "\t" .
            'same => n,ExecIf($["${SRC_QUEUE}x" != "x"]?Goto(internal-originate-queue,${EXTEN},1))' . PHP_EOL . "\t" .
            'same => n,ExecIf($["${CUT(CHANNEL,\;,2)}" == "2"]?Set(__PT1C_SIP_HEADER=${SIPADDHEADER})) ' . PHP_EOL . "\t" .
            'same => n,ExecIf($["${PJSIP_ENDPOINT(${EXTEN},auth)}x" == "x"]?Goto(internal-num-undefined,${EXTEN},1))' . PHP_EOL . "\t" .
            'same => n,Gosub(set-dial-contacts,${EXTEN},1)' . PHP_EOL . "\t" .
            'same => n,ExecIf($["${FIELDQTY(DST_CONTACT,&)}" != "1" && "${ALLOW_MULTY_ANSWER}" != "1"]?Set(__PT1C_SIP_HEADER=${EMPTY_VAR}))' . PHP_EOL . "\t" .
            'same => n,ExecIf($["${DST_CONTACT}x" != "x"]?Dial(${DST_CONTACT},${ringlength},TtekKHhb(originate-create-channel,${EXTEN},1)U(originate-answer-channel),s,1)))' . PHP_EOL.
            'exten => h,1,Gosub(interception_bridge_result,${EXTEN},1)' . "\n\n".

            '[internal-originate-queue]' . PHP_EOL .
            'exten => _X!,1,Set(_NOCDR=1)' . PHP_EOL . "\t" .
            'same => n,GosubIf($["${DIALPLAN_EXISTS(${CONTEXT}-custom,${EXTEN},1)}" == "1"]?${CONTEXT}-custom,${EXTEN},1)' . PHP_EOL . "\t" .
            'same => n,ExecIf($["${SRC_QUEUE}x" != "x"]?Queue(${SRC_QUEUE},kT,,,300,,,originate-answer-channel))' . PHP_EOL . PHP_EOL .
            'exten => h,1,Hangup' . "\n\n".

            '[originate-create-channel] ' . PHP_EOL .
            'exten => _.!,1,ExecIf($[ "${EXTEN}" == "h" ]?Hangup()'. PHP_EOL . "\t" .
            'same => n,ExecIf($["${PT1C_SIP_HEADER}x" != "x"]?Set(PJSIP_HEADER(add,${CUT(PT1C_SIP_HEADER,:,1)})=${CUT(PT1C_SIP_HEADER,:,2)})) ' . PHP_EOL . "\t" .
            'same => n,Set(__PT1C_SIP_HEADER=${UNDEFINED}) ' . PHP_EOL . "\t" .
            'same => n,return' . PHP_EOL . PHP_EOL .

            '[originate-answer-channel]' . PHP_EOL .
            'exten => s,1,Set(IS_ORGNT=${EMPTY})' . PHP_EOL . "\t" .
            'same => n,Set(orign_chan=${CHANNEL})' . PHP_EOL . "\t" .
            'same => n,ExecIf($[ "${CHANNEL:0:5}" == "Local" ]?Set(pl=${IF($["${CHANNEL:-1}" == "1"]?2:1)}))' . PHP_EOL . "\t" .
            'same => n,ExecIf($[ "${CHANNEL:0:5}" == "Local" ]?Set(orign_chan=${IMPORT(${CUT(CHANNEL,\;,1)}\;${pl},DIALEDPEERNAME)}))' . PHP_EOL . "\t" .
            'same => n,Set(MASTER_CHANNEL(ORIGINATE_SRC_CHANNEL)=${orign_chan})' . PHP_EOL . "\t" .
            'same => n,return' . PHP_EOL . PHP_EOL;

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
        $conf .= 'same => n,ExecIf($[ "${orign_chan}x" == "x" ]?Set(orign_chan=${IMPORT(${CUT(CHANNEL,\;,1)}\;${pl},TRANSFERERNAME)}))' . "\n\t";
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

        $conf .= 'exten => h,1,ExecIf($["${ISTRANSFER}x" != "x"]?Goto(transfer_dial_hangup,${EXTEN},1))' . "\n\n";

        $conf .= '[add-trim-prefix-clid]' . "\n";
        $conf .= 'exten => ' . self::ALL_NUMBER_EXTENSION . ',1,NoOp(--- Incoming call from ${CALLERID(num)} ---)' . "\n\t";
        $conf .= 'same => n,GosubIf($["${DIALPLAN_EXISTS(${CONTEXT}-custom,${EXTEN},1)}" == "1"]?${CONTEXT}-custom,${EXTEN},1)' . "\n\t";
        $conf .= 'same => n,return' . "\n\n";
        $conf .= 'exten => ' . self::DIGIT_NUMBER_EXTENSION . ',1,NoOp(--- Incoming call from ${CALLERID(num)} ---)' . "\n\t";
        $conf .= 'same => n,GosubIf($["${DIALPLAN_EXISTS(${CONTEXT}-custom,${EXTEN},1)}" == "1"]?${CONTEXT}-custom,${EXTEN},1)' . "\n\t";
        $conf .= 'same => n,return' . "\n\n";
    }

    /**
     * Генератор контекста для переадресаций.
     *
     * @param $conf
     */
    private function generateInternalTransfer(&$conf): void
    {
        $conf              .= "[internal-transfer] \n";
        $conf .= $this->hookModulesMethod(CoreConfigClass::GET_INCLUDE_INTERNAL_TRANSFER);
        $conf .= $this->hookModulesMethod(CoreConfigClass::EXTENSION_GEN_INTERNAL_TRANSFER);
        $conf .= 'exten => h,1,Goto(transfer_dial_hangup,${EXTEN},1)' . "\n\n";
    }

    /**
     * Генератор хинтов SIP.
     *
     * @param $conf
     */
    private function generateSipHints(&$conf): void
    {
        $conf .= "[internal-hints] \n";
        $conf .= $this->hookModulesMethod(CoreConfigClass::EXTENSION_GEN_HINTS);
        $conf .= "\n\n";
    }

    /**
     * Контекст для входящих внешних звонков без авторизации.
     *
     */
    public function generatePublicContext(): string
    {
        $conf              = "\n";
        $conf              .= IncomingContexts::generate('none');
        $conf              .= "[public-direct-dial] \n";
        $conf .= $this->hookModulesMethod(CoreConfigClass::GENERATE_PUBLIC_CONTEXT);
        $filter = ["provider IS NULL AND priority<>9999"];

        /**
         * @var array
         */
        $m_data = IncomingRoutingTable::find($filter);
        if (count($m_data->toArray()) > 0) {
            $conf .= 'include => none-incoming';
        }

        return $conf;
    }

    public static function getExtenByDid($did):string
    {
        if(mb_strpos($did, '_') === 0){
            $ext_prefix = '';
        }elseif(preg_match_all('/^[.|!|N|X|Z|0-9|\[|\]|\-]+$/m', $did, $matches, PREG_SET_ORDER) === 1){
            // Это скорее всего шаблон EXTEN.
            $ext_prefix = '_';
        }else{
            $ext_prefix = '';
        }
        return $ext_prefix.$did;
    }
}