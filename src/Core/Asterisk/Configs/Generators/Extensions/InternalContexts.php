<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2021 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Core\Asterisk\Configs\Generators\Extensions;


use MikoPBX\Core\Asterisk\Configs\ExtensionsConf;
use MikoPBX\Core\Asterisk\Configs\SIPConf;
use MikoPBX\Core\Asterisk\Configs\CoreConfigClass;

class InternalContexts extends CoreConfigClass
{

    private string $technology;
    private string $extensionPattern = 'X!';

    /**
     * Генератор входящих контекстов. Точка входа.
     *
     * @return string
     */
    public static function generate(): string
    {
        $generator = new self();
        $generator->getSettings();

        return $generator->makeDialplan();
    }

    public function getSettings(): void
    {
        $this->technology = SIPConf::getTechnology();
    }

    /**
     * Генерация dialplan.
     *
     * @return string
     */
    public function makeDialplan(): string
    {
        $conf = $this->generateAdditionalModulesContext();

        $conf .= "[internal-num-undefined] \n";
        $conf .= 'exten => _' . $this->extensionPattern . ',1,ExecIf($["${ISTRANSFER}x" != "x"]?Goto(transfer_dial_hangup,${EXTEN},1))' . "\n\t";
        $conf .= 'same => n,ExecIf($["${BLINDTRANSFER}x" != "x"]?AGI(check_redirect.php,${BLINDTRANSFER}))' . "\n\t";
        $conf .= "same => n,Playback(pbx-invalid,noanswer) \n\n";

        $conf .= "[set-answer-state]".PHP_EOL;
        $conf .= 'exten => _.!,1,ExecIf($["${CHANNEL_EXISTS(${FROM_CHAN})}" == "0"]?return)'.PHP_EOL."\t";
        $conf .= 'same => n,Set(EXPORT(${FROM_CHAN},MASTER_CHANNEL(M_DIALSTATUS))=ANSWER)'.PHP_EOL."\t";
        $conf .= 'same => n,Set(EXPORT(${FROM_CHAN},M_DIALSTATUS)=ANSWER)'.PHP_EOL."\t";
        $conf .= 'same => n,return'.PHP_EOL;
        $conf .= 'exten => _[hit],1,Hangup()'.PHP_EOL.PHP_EOL;

        $conf .= '[set-dial-contacts]'.PHP_EOL.
                 'exten => _X!,1,NoOp()'.PHP_EOL."\t";

        if($this->generalSettings['UseWebRTC'] === '1') {
            $conf .= 'same => n,Set(SIP_CONTACT=${PJSIP_DIAL_CONTACTS(${EXTEN})})'.PHP_EOL."\t".
                     'same => n,Set(WS_CONTACTS=${PJSIP_DIAL_CONTACTS(${EXTEN}-WS)})'.PHP_EOL."\t".
                     'same => n,Set(DST_CONTACT=${SIP_CONTACT}${IF($["${SIP_CONTACT}x" != "x" && "${WS_CONTACTS}x" != "x"]?&)}${WS_CONTACTS})'.PHP_EOL."\t";
        }else{
            $conf .= 'same => n,Set(DST_CONTACT=${PJSIP_DIAL_CONTACTS(${EXTEN})})'.PHP_EOL."\t";
        }
        $conf .= 'same => n,return'.PHP_EOL.PHP_EOL;

        $conf .= $this->generateInternalFW();
        $conf .= $this->generateAllPeers();
        $conf .= $this->generateInternal();
        $conf .= $this->generateInternalUsers();

        return $conf;
    }

    /**
     * Генератор dialplan дополнительных модулей.
     *
     * @return string
     */
    private function generateAdditionalModulesContext(): string
    {
        $conf = $this->hookModulesMethod(CoreConfigClass::EXTENSION_GEN_CONTEXTS);
        $conf .= "\n";

        return $conf;
    }

    /**
     * Генератор [internal-fw] dialplan.
     *
     * @return string
     */
    private function generateInternalFW(): string
    {
        $conf = "[internal-fw]\n";
        $conf .= 'exten => h,1,ExecIf($["${ISTRANSFER}x" != "x"]?Goto(transfer_dial_hangup,${EXTEN},1))' . "\n";
        $conf .= 'exten => _' . $this->extensionPattern . ',1,NoOp(DIALSTATUS - ${DIALSTATUS})' . "\n\t";
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
        $conf .= 'same => n,ExecIf($["${DIALSTATUS}" == "BUSY"]?Busy(2):Hangup())' . "\n\n";

        return $conf;
    }

    /**
     * Генератор [all_peers] dialplan.
     *
     * @return string
     */
    private function generateAllPeers(): string
    {
        $conf = "[all_peers]\n";
        $conf .= 'include => internal-hints' . "\n";
        $conf .= 'exten => failed,1,Hangup()' . "\n";
        $conf .= 'exten => ' . ExtensionsConf::ALL_EXTENSION . ',1,ExecIf($[ "${ORIGINATE_SRC_CHANNEL}x" != "x" ]?Wait(0.2))' . PHP_EOL . "\t";
        $conf .= 'same => n,ExecIf($[ "${ORIGINATE_SRC_CHANNEL}x" != "x" ]?ChannelRedirect(${ORIGINATE_SRC_CHANNEL},${CONTEXT},${ORIGINATE_DST_EXTEN},1))' . PHP_EOL . "\t";
        $conf .= 'same => n,ExecIf($[ "${ORIGINATE_SRC_CHANNEL}x" != "x" ]?Hangup())' . PHP_EOL . "\t";

        // Фильтр спецсимволов. Разершаем только цифры.
        $conf .= 'same => n,Set(cleanNumber=${FILTER(\*\#\+1234567890,${EXTEN})})' . "\n\t";
        $conf .= 'same => n,ExecIf($["${EXTEN}" != "${cleanNumber}"]?Goto(${CONTEXT},${cleanNumber},$[${PRIORITY} + 1]))' . "\n\t";

        $conf .= $this->generateAdditionalModulesAllPeersContext();
        $conf .= 'same => n,Set(__FROM_CHAN=${CHANNEL})' . "\n\t";
        $conf .= 'same => n,Set(__M_CALLID=${CHANNEL(callid)})' . "\n\t";
        $conf .= 'same => n,ExecIf($["${OLD_LINKEDID}x" == "x"]?Set(__OLD_LINKEDID=${CHANNEL(linkedid)}))' . "\n\t";
        $conf .= 'same => n,ExecIf($["${CHANNEL(channeltype)}" != "Local"]?Gosub(set_from_peer,s,1))' . "\n\t";
        $conf .= 'same => n,ExecIf($["${CHANNEL(channeltype)}" == "Local"]?Gosub(set_orign_chan,s,1))' . "\n\t";

        $conf .= 'same => n,ExecIf($["${CALLERID(num)}x" == "x"]?Set(CALLERID(num)=${FROM_PEER}))' . "\n\t";
        $conf .= 'same => n,ExecIf($["${CALLERID(num)}x" == "x"]?Set(CALLERID(name)=${FROM_PEER}))' . "\n\t";

        $conf .= 'same => n,ExecIf($["${CHANNEL(channeltype)}" == "Local" && "${FROM_PEER}x" == "x"]?Set(__FROM_PEER=${CALLERID(num)}))' . "\n\t";
        $conf .= 'same => n,Set(CHANNEL(hangup_handler_wipe)=hangup_handler,s,1)' . "\n\t";
        $conf .= 'same => n,Gosub(${ISTRANSFER}dial,${EXTEN},1)' . "\n\t";

        $conf          .= 'same => n,GosubIf($["${DIALPLAN_EXISTS(${CONTEXT}-custom,${EXTEN},1)}" == "1"]?${CONTEXT}-custom,${EXTEN},1)' . "\n\t";
        $dialplanNames = ['applications', 'internal', 'outgoing'];
        foreach ($dialplanNames as $name) {
            $conf .= 'same => n,GosubIf($["${DIALPLAN_EXISTS(' . $name . ',${EXTEN},1)}" == "1"]?' . $name . ',${EXTEN},1)' . " \n\t";
        }
        $conf .= 'same => n,Hangup()' . " \n";
        $conf .= 'exten => _[hit],1,Hangup()' . " \n";

        $pickupExtension = $this->generalSettings['PBXFeaturePickupExten'];
        if(!empty($pickupExtension)){
            $conf            .= 'exten => _' . $pickupExtension . $this->extensionPattern . ',1,Set(PICKUPEER=' . $this->technology . '/${FILTER(0-9,${EXTEN:2})})' . "\n\t";
            $conf            .= 'same => n,Set(pt1c_dnid=${EXTEN})' . "\n\t";
            $conf            .= 'same => n,PickupChan(${PICKUPEER})' . "\n\t";
            $conf            .= 'same => n,Hangup()' . "\n\n";
        }
        return $conf;
    }

    /**
     * Генератор [internal] dialplan.
     *
     * @return string
     */
    private function generateInternal(): string
    {
        // Контекст для внутренних вызовов.
        $conf = "[internal] \n";
        $conf .= $this->generateAdditionalModulesInternalContext();

        $conf .= 'exten => i,1,NoOp(-- INVALID NUMBER --)' . "\n\t";
        $conf .= 'same => n,Set(DIALSTATUS=INVALID_NUMBER)' . "\n\t";
        $conf .= 'same => n,Playback(privacy-incorrect,noanswer)' . "\n\t";
        $conf .= 'same => n,Hangup()' . "\n";

        $conf .= 'exten => h,1,ExecIf($["${ISTRANSFER}x" != "x"]?Goto(transfer_dial_hangup,${EXTEN},1))' . "\n\n";

        $conf .= 'exten => hangup,1,Set(MASTER_CHANNEL(M_DIALSTATUS)=ANSWER)'.PHP_EOL."\t";
        $conf .= 'same => n,Hangup()'.PHP_EOL;
        $conf .= 'exten => busy,1,Set(MASTER_CHANNEL(M_DIALSTATUS)=BUSY)'.PHP_EOL."\t";
        $conf .= 'same => n,Busy(2)'.PHP_EOL;
        $conf .= 'exten => did2user,1,ExecIf($["${FROM_DID}x" != "x" && ${DIALPLAN_EXISTS(internal,${FROM_DID},1)} ]?Goto(internal,${FROM_DID},1))'.PHP_EOL."\t";
        $conf .= 'same => n,Hangup()'.PHP_EOL.PHP_EOL;


        $conf .= "[internal-incoming]\n";
        $conf .= 'exten => ' . ExtensionsConf::ALL_NUMBER_EXTENSION . ',1,ExecIf($["${MASTER_CHANNEL(M_TIMEOUT)}x" != "x"]?Set(TIMEOUT(absolute)=${MASTER_CHANNEL(M_TIMEOUT)}))' . " \n\t";
        $conf .= 'same => n,Set(MASTER_CHANNEL(M_TIMEOUT_CHANNEL)=${CHANNEL})' . " \n\t";
        $conf .= 'same => n,Set(MASTER_CHANNEL(M_TIMEOUT)=${EMPTY_VAR})' . " \n\t";
        $conf .= 'same => n,Goto(internal,${EXTEN},1)' . " \n\n";

        return $conf;
    }

    /**
     * Переопределение dialplan [internal] из дополнительных модулей.
     *
     * @return string
     */
    private function generateAdditionalModulesInternalContext(): string
    {
        $conf = $this->hookModulesMethod(CoreConfigClass::GET_INCLUDE_INTERNAL);
        $conf .= $this->hookModulesMethod(CoreConfigClass::EXTENSION_GEN_INTERNAL);

        return $conf;
    }

    private function generateAdditionalModulesInternalUsersContext():string
    {
        return $this->hookModulesMethod(CoreConfigClass::EXTENSION_GEN_INTERNAL_USERS_PRE_DIAL);
    }

    private function generateAdditionalModulesAllPeersContext():string
    {
        return $this->hookModulesMethod(CoreConfigClass::EXTENSION_GEN_ALL_PEERS_CONTEXT);
    }


    /**
     * Генератор [internal-users] dialplan.
     *
     * @return string
     */
    private function generateInternalUsers(): string
    {
        $conf = "[internal-users] \n";
        $conf .= 'exten => _' . $this->extensionPattern . ',1,Set(CHANNEL(hangup_handler_wipe)=hangup_handler,s,1)' . " \n\t";
        $conf .= 'same => n,ExecIf($["${ISTRANSFER}x" != "x"]?Set(SIPADDHEADER01=${EMPTY_VAR})' . " \n\t";
        $conf .= 'same => n,ExecIf($["${CHANNEL(channeltype)}" == "Local"]?Gosub(set_orign_chan,s,1))' . " \n\t";

        $conf .= 'same => n,Gosub(${ISTRANSFER}dial,${EXTEN},1)' . "\n\t";
        // Проверим, существует ли такой пир.
        $conf .= 'same => n,ExecIf($["${PJSIP_ENDPOINT(${EXTEN},auth)}x" == "x"]?Goto(internal-num-undefined,${EXTEN},1))' . " \n\t";

        $conf .= $this->generateAdditionalModulesInternalUsersContext();
        $conf .= 'same => n,ExecIf($["${DEVICE_STATE(' . $this->technology . '/${EXTEN})}" == "BUSY" || "${DEVICE_STATE(' . $this->technology . '/${EXTEN}-WS)}" == "BUSY"]?Set(IS_BUSY=1))' . " \n\t";
        $conf .= 'same => n,ExecIf($["${IS_BUSY}" == "1"]?Set(DIALSTATUS=BUSY))' . " \n\t";
        $conf .= 'same => n,GotoIf($["${IS_BUSY}" == "1" && "${QUEUE_SRC_CHAN}x" == "x"]?fw_start)' . " \n\t";

        // Как долго звонить пиру.
        $conf .= 'same => n,Set(ringlength=${DB(FW_TIME/${EXTEN})})' . " \n\t";
        $conf .= 'same => n,ExecIf($["${ringlength}x" == "x"]?Set(ringlength=600))' . " \n\t";
        $conf .= 'same => n,ExecIf($["${QUEUE_SRC_CHAN}x" != "x" && "${ISTRANSFER}x" == "x"]?Set(ringlength=600))' . " \n\t";

        $conf .= 'same => n,GosubIf($["${DIALPLAN_EXISTS(${CONTEXT}-custom,${EXTEN},1)}" == "1"]?${CONTEXT}-custom,${EXTEN},1) ' . " \n\t";
        // Совершаем вызов пира.
        $conf .= 'same => n,Gosub(set-dial-contacts,${EXTEN},1)' . " \n\t";
        $conf .= 'same => n,ExecIf($["${FIELDQTY(DST_CONTACT,&)}" != "1"]?Set(__PT1C_SIP_HEADER=${EMPTY_VAR}))' . " \n\t";
        $conf .= 'same => n,ExecIf($["${TRANSFER_OPTIONS}x" == "x" || "${ISTRANSFER}x" != "x"]?Set(TRANSFER_OPTIONS=Tt))' . " \n\t";
        $conf .= 'same => n,ExecIf($["${DST_CONTACT}x" != "x"]?Dial(${DST_CONTACT},${ringlength},${TRANSFER_OPTIONS}ekKHhU(${ISTRANSFER}dial_answer)b(dial_create_chan,s,1)):Set(DIALSTATUS=CHANUNAVAIL))' . " \n\t";
        $conf .= 'same => n,ExecIf($["${DST_CONTACT}x" == "x"]?Gosub(dial_end,s,1))' . " \n\t";
        $conf .= 'same => n(fw_start),NoOp(start dial hangup)' . " \n\t";

        // QUEUE_SRC_CHAN - установлена, если вызов сервершен агенту очереди.
        // Проверяем нужна ли переадресация
        $conf .= 'same => n,ExecIf($["${DIALSTATUS}" != "ANSWER" && "${ISTRANSFER}x" != "x"]?Goto(internal-fw,${EXTEN},1))' . " \n\t";
        $conf .= 'same => n,ExecIf($["${DIALSTATUS}" != "ANSWER" && "${QUEUE_SRC_CHAN}x" == "x"]?Goto(internal-fw,${EXTEN},1))' . " \n\t";
        $conf .= 'same => n,ExecIf($["${BLINDTRANSFER}x" != "x"]?AGI(check_redirect.php,${BLINDTRANSFER}))' . " \n\t";
        $conf .= 'same => n,Hangup()' . "\n\n";

        $conf .= 'exten => h,1,ExecIf($["${ISTRANSFER}x" != "x"]?Goto(transfer_dial_hangup,${EXTEN},1))' . "\n\n";

        return $conf;
    }

}