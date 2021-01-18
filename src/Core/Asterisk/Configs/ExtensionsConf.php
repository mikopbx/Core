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

use MikoPBX\Common\Models\{Iax, IncomingRoutingTable, OutgoingRoutingTable, OutWorkTimes, Providers, Sip, SoundFiles};
use MikoPBX\AdminCabinet\Forms\OutgoingRouteEditForm;
use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Core\Asterisk\Configs\Generators\Extensions\IncomingContexts;
use MikoPBX\Core\Asterisk\Configs\Generators\Extensions\InternalContexts;
use MikoPBX\Core\Asterisk\Configs\Generators\Extensions\OutgoingContext;
use MikoPBX\Modules\Config\ConfigClass;
use MikoPBX\Core\System\{MikoPBXConfig, Storage, Util};
use Phalcon\Di;

class ExtensionsConf extends ConfigClass
{
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
        $additionalModules = $this->di->getShared(PBXConfModulesProvider::SERVICE_NAME);
        $conf              = "[globals] \n" .
            "TRANSFER_CONTEXT=internal-transfer; \n";
        if ($this->generalSettings['PBXRecordCalls'] === '1') {
            $conf .= "MONITOR_DIR=" . Storage::getMonitorDir() . " \n";
            $conf .= "MONITOR_STEREO=" . $this->generalSettings['PBXSplitAudioThread'] . " \n";
        }
        foreach ($additionalModules as $appClass) {
            $addition = $appClass->extensionGlobals();
            if ( ! empty($addition)) {
                $conf .= $appClass->confBlockWithComments($addition);
            }
        }
        $conf .= "\n";
        $conf .= "\n";
        $conf .= "[general] \n";

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
        $this->generatePublicContext($conf);

        Util::fileWriteContent($this->config->path('asterisk.astetcdir') . '/extensions.conf', $conf);
    }

    /**
     * Генератор прочих контекстов.
     *
     * @param $conf
     */
    private function generateOtherExten(&$conf): void
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

        $conf .= 'same => n,ExecIf($["${CUT(CHANNEL,\;,2)}" == "2"]?Set(__PT1C_SIP_HEADER=${SIPADDHEADER}))' . " \n\t";
        $conf .= 'same => n,ExecIf($["${peer_mobile}x" != "x"]?Set(ADDITIONAL_PEER=&Local/${peer_mobile}@outgoing/n))' . " \n\t";

        // Описываем возможность прыжка в пользовательский sub контекст.
        $conf .= 'same => n,GosubIf($["${DIALPLAN_EXISTS(${CONTEXT}-custom,${EXTEN},1)}" == "1"]?${CONTEXT}-custom,${EXTEN},1)' . "\n\t";
        $conf .= 'same => n,Dial(Local/${EXTEN}@internal-users/n${ADDITIONAL_PEER},60,TteKkHhb(originate_create_chan,s,1))' . " \n\n";

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
     * Генератор контекста для переадресаций.
     *
     * @param $conf
     */
    private function generateInternalTransfer(&$conf): void
    {
        $additionalModules = $this->di->getShared(PBXConfModulesProvider::SERVICE_NAME);
        $conf              .= "[internal-transfer] \n";

        foreach ($additionalModules as $appClass) {
            $addition = $appClass->getIncludeInternalTransfer();
            if ( ! empty($addition)) {
                $conf .= $appClass->confBlockWithComments($addition);
            }
        }

        foreach ($additionalModules as $appClass) {
            $addition = $appClass->extensionGenInternalTransfer();
            if ( ! empty($addition)) {
                $conf .= $appClass->confBlockWithComments($addition);
            }
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
        $additionalModules = $this->di->getShared(PBXConfModulesProvider::SERVICE_NAME);
        $conf              .= "[internal-hints] \n";
        foreach ($additionalModules as $appClass) {
            $addition = $appClass->extensionGenHints();
            if ( ! empty($addition)) {
                $conf .= $appClass->confBlockWithComments($addition);
            }
        }
        $conf .= "\n\n";
    }

    /**
     * Контекст для входящих внешних звонков без авторизации.
     *
     * @param $conf
     */
    public function generatePublicContext(&$conf): void
    {
        $additionalModules = $this->di->getShared(PBXConfModulesProvider::SERVICE_NAME);
        $conf              .= "\n";
        $conf              .= IncomingContexts::generate('none');
        $conf              .= "[public-direct-dial] \n";
        foreach ($additionalModules as $appClass) {
            if ($appClass instanceof $this) {
                continue;
            }
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

}