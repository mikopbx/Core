<?php


namespace MikoPBX\Core\Asterisk\Configs\Generators\Extensions;


use MikoPBX\Common\Models\Iax;
use MikoPBX\Common\Models\OutgoingRoutingTable;
use MikoPBX\Common\Models\Providers;
use MikoPBX\Common\Models\Sip;
use MikoPBX\Core\Asterisk\Configs\AsteriskConfigInterface;
use MikoPBX\Core\Asterisk\Configs\ExtensionsConf;
use MikoPBX\Core\Asterisk\Configs\IAXConf;
use MikoPBX\Core\Asterisk\Configs\SIPConf;
use MikoPBX\Core\Asterisk\Configs\AsteriskConfigClass;

class OutgoingContext extends AsteriskConfigClass
{
    // The module hook applying priority
    public int $priority = 640;

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

    public function makeDialplan(): string
    {
        $conf = "[outgoing] \n";
        $conf .= 'exten => _+.!,1,NoOp(Strip + sign from number)' . " \n\t";
        $conf .= 'same => n,Goto(${CONTEXT},${EXTEN:1},1);' . " \n\n";
        $conf .= 'exten => ' . ExtensionsConf::ALL_NUMBER_EXTENSION . ',1,Ringing()' . " \n\t";
        $conf .= 'same => n,Set(src_number=${EXTEN})' . "\n\t";
        // Описываем возможность прыжка в пользовательский sub контекст.
        $conf .= 'same => n,GosubIf($["${DIALPLAN_EXISTS(${CONTEXT}-custom,${EXTEN},1)}" == "1"]?${CONTEXT}-custom,${EXTEN},1)' . "\n\t";

        $provider_contexts = $this->generateRegexPatternsContextNames($conf);

        $conf .= 'same => n,ExecIf($["${peer_mobile}x" != "x"]?Hangup())' . " \n\t";
        $conf .= 'same => n,ExecIf($["${DIALSTATUS}" != "ANSWER" && "${BLINDTRANSFER}x" != "x" && "${ISTRANSFER}x" != "x"]?Gosub(transfer_dial_hangup,${EXTEN},1))' . "\n\t";
        $conf .= 'same => n,ExecIf($["${BLINDTRANSFER}x" != "x"]?AGI(check_redirect.php,${BLINDTRANSFER}))' . " \n\t";
        $conf .= 'same => n,ExecIf($["${ROUTFOUND}x" == "x"]?Gosub(dial,${EXTEN},1))' . "\n\t";

        $conf .= 'same => n,Playback(silence/2,noanswer)' . " \n\t";
        $conf .= 'same => n,ExecIf($["${ROUTFOUND}x" != "x"]?Playback(followme/sorry,noanswer):Playback(cannot-complete-as-dialed,noanswer))' . " \n\t";
        $conf .= 'same => n,Hangup()' . " \n\n";
        $conf .= 'exten => h,1,ExecIf($["${ISTRANSFER}x" != "x"]?Goto(transfer_dial_hangup,${EXTEN},1))' . "\n\t";

        foreach ($provider_contexts as $id_dialplan => $rout) {
            $this->generateProviderContext($conf, $id_dialplan, $rout);
        }

        return $conf;
    }

    /**
     * Формирует имена конткестов провайдеров и шаблоны Regex для проверки номера.
     *
     * @param string $conf
     *
     * @return array
     */
    private function generateRegexPatternsContextNames(string &$conf): array
    {
        $routs = OutgoingRoutingTable::find(['order' => 'priority'])->toArray();
        uasort($routs, ExtensionsConf::class . '::sortArrayByPriority');

        $provider_contexts = [];
        /** @var OutgoingRoutingTable $routs */
        /** @var OutgoingRoutingTable $rout */
        foreach ($routs as $rout) {
            $technology = $this->getTechByID($rout['providerid']);
            if (empty($technology)) {
                continue;
            }
            $rout_data                       = $rout;
            $rout_data['technology']         = $technology;
            $id_dialplan                     = $rout_data['providerid'] . '-' . $rout_data['id'] . '-outgoing';
            $provider_contexts[$id_dialplan] = $rout_data;
            $conf                            .= $this->generateOutgoingRegexPattern($rout_data);
        }

        return $provider_contexts;
    }

    /**
     * Генератор extension для контекста outgoing.
     *
     * @param string $uniqueID
     *
     * @return null|string
     */
    public function getTechByID(string $uniqueID): string
    {
        $technology = '';
        $provider   = Providers::findFirstByUniqid($uniqueID);
        if ($provider !== null) {
            if ($provider->type === 'SIP') {
                $account    = Sip::findFirst('disabled="0" AND uniqid = "' . $uniqueID . '"');
                $technology = ($account === null) ? '' : SIPConf::getTechnology();
            } elseif ($provider->type === 'IAX') {
                $account    = Iax::findFirst('disabled="0" AND uniqid = "' . $uniqueID . '"');
                $technology = ($account === null) ? '' : 'IAX2';
            }
        }

        return $technology;
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
        $conf         = '';
        $regexPattern = '';

        $restNumbers = (int)($rout['restnumbers'] ?? 0);
        if ($restNumbers > 0) {
            $regexPattern = "[0-9]{" . $rout['restnumbers'] . "}$";
        } elseif ($restNumbers === 0) {
            $regexPattern = "$";
        } elseif ($restNumbers === -1) {
            $regexPattern = "";
        }
        $numberBeginsWith = $rout['numberbeginswith'] ?? '';
        $numberBeginsWith = str_replace(['*', '+'], ['\\\\*', '\\\\+'], $numberBeginsWith);
        $conf             .= 'same => n,ExecIf($["${REGEX("^' . $numberBeginsWith . $regexPattern . '" ${EXTEN})}" == "1"]?Gosub(' . $rout['providerid'] . '-' . $rout['id'] . '-outgoing,${EXTEN},1))' . " \n\t";

        return $conf;
    }

    /**
     * @param string $conf
     * @param        $id_dialplan
     * @param array  $rout
     */
    private function generateProviderContext(string &$conf, $id_dialplan, array $rout): void
    {
        $conf .= "\n[{$id_dialplan}]\n";
        [$extensionVar, $changeExtension] = $this->initTrimVariables($rout);

        $conf .= 'exten => ' . ExtensionsConf::ALL_NUMBER_EXTENSION . ',1,Set(number=' . $rout['prepend'] . $extensionVar . ')' . "\n\t";
        $conf .= 'same => n,Set(number=${FILTER(\*\#\+1234567890,${number})})' . "\n\t";
        $conf .= $changeExtension;

        $conf .= 'same => n,ExecIf($["${number}x" == "x"]?Hangup())' . "\n\t";
        $conf .= 'same => n,Set(ROUTFOUND=1)' . "\n\t";
        $conf .= "same => n,Set(PROVIDER_ID={$rout['providerid']})" . "\n\t";
        $conf .= 'same => n,Gosub(${ISTRANSFER}dial,${EXTEN},1)' . "\n\t";

        $conf .= 'same => n,ExecIf($["${EXTERNALPHONE}" == "${src_number}"]?Set(DOPTIONS=tk))' . "\n\t";

        $dialCommand = $this->getDialCommand($rout);
        $conf .= 'same => n,Set(DIAL_COMMAND='.$dialCommand.')' . "\n\t";
        // Добавляем возможность отменить обработку этого контекста через кастомизацию.
        $conf .= 'same => n,GosubIf($["${DIALPLAN_EXISTS(all-outgoing-custom,${EXTEN},1)}" == "1"]?all-outgoing-custom,${EXTEN},1)' . "\n\t";
        // Описываем возможность перехода в пользовательский sub контекст.
        $conf .= 'same => n,GosubIf($["${DIALPLAN_EXISTS(' . $rout['providerid'] . '-outgoing-custom,${EXTEN},1)}" == "1"]?' . $rout['providerid'] . '-outgoing-custom,${EXTEN},1)' . "\n\t";
        $conf .= 'same => n,ExecIf($["${NEED_RETURN}" == "1"]?return)' . "\n\t";

        // Формирование исходящего dialplan доп. модулей;. Переопределение dialplan маршрута.
        $confModules = $this->hookModulesMethod(AsteriskConfigInterface::GENERATE_OUT_ROUT_CONTEXT, [$rout]);
        if ( !empty($confModules)) {
            $conf .= trim($confModules)."\n\t";
        }
        $conf .= 'same => n,Dial(${DIAL_COMMAND},600,${DOPTIONS}TKU(${ISTRANSFER}dial_answer)b(dial_create_chan,s,1))' . "\n\t";
        // Формирование dialplan доп. модулей после команды Dial.
        $confModules = $this->hookModulesMethod(AsteriskConfigInterface::GENERATE_OUT_ROUT_AFTER_DIAL_CONTEXT, [$rout]);
        if ( !empty($confModules)) {
            $conf .= trim($confModules)."\n\t";
        }
        $conf .= 'same => n,GosubIf($["${DIALPLAN_EXISTS(' . $rout['providerid'] . '-outgoing-after-dial-custom,${EXTEN}),1}" == "1"]?' . $rout['providerid'] . '-outgoing-after-dial-custom,${EXTEN},1)' . "\n\t";
        $conf .= 'same => n,ExecIf($["${ISTRANSFER}x" != "x"]?Gosub(transfer_dial_hangup,${EXTEN},1))' . "\n\t";
        $conf .= 'same => n,ExecIf($["${DIALSTATUS}" = "ANSWER"]?Hangup())' . "\n\t";
        $conf .= 'same => n,ExecIf($["${DIALSTATUS}" = "BUSY"]?Busy(2))' . "\n\t";
        $conf .= 'same => n,Set(pt1c_UNIQUEID=${EMPTY_VALUE})' . "\n\t";
        $conf .= 'same => n,return' . "\n";
    }

    /**
     * Проверка на необходимость обрезать номер телефона перед набором.
     *
     * @param array $rout
     *
     * @return string[]
     */
    private function initTrimVariables(array $rout): array
    {
        $trimFromBegin = (int)($rout['trimfrombegin'] ?? 0);
        if ($trimFromBegin > 0) {
            $extensionVar    = '${EXTEN:' . $rout['trimfrombegin'] . '}';
            $changeExtension = 'same => n,ExecIf($["${EXTEN}" != "${number}"]?Goto(${CONTEXT},${number},$[${PRIORITY} + 1]))' . "\n\t";
        } else {
            $extensionVar    = '${EXTEN}';
            $changeExtension = '';
        }

        return [$extensionVar, $changeExtension];
    }

    /**
     * Формирует Dial команду для технологии PJSIP / IAX2
     *
     * @param array $rout
     *
     * @return string
     */
    private function getDialCommand(array $rout): string
    {
        if ($rout['technology'] === IAXConf::TYPE_IAX2) {
            $command = $rout['technology'] . '/' . $rout['providerid'] . '/${number}';
        } else {
            $command = $rout['technology'] . '/${number}@' . $rout['providerid'];
        }
        return $command;
    }
}