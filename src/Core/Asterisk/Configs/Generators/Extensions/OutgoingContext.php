<?php


namespace MikoPBX\Core\Asterisk\Configs\Generators\Extensions;


use MikoPBX\Common\Models\Iax;
use MikoPBX\Common\Models\OutgoingRoutingTable;
use MikoPBX\Common\Models\Providers;
use MikoPBX\Common\Models\Sip;
use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Core\Asterisk\Configs\ExtensionsConf;
use MikoPBX\Core\Asterisk\Configs\IAXConf;
use MikoPBX\Core\Asterisk\Configs\SIPConf;
use MikoPBX\Modules\Config\ConfigClass;
use Phalcon\Di;

class OutgoingContext extends ConfigClass {


    private array $additionalModules = [];

    public function getSettings(): void{
        $di = Di::getDefault();
        if ($di !== null) {
            $this->additionalModules = $di->getShared(PBXConfModulesProvider::SERVICE_NAME);
        }
    }

    /**
     * Генератор входящих контекстов. Точка входа.
     * @return string
     */
    public static function generate(): string{
        $generator = new self();
        $generator->getSettings();
        return $generator->makeDialplan();
    }

    public function makeDialplan(): string{
        $conf = "[outgoing] \n";
        $conf .= 'exten => _+.!,1,NoOp(Strip + sign from number and convert it to +)' . " \n\t";
        $conf .= 'same => n,Set(ADDPLUS=+);' . " \n\t";
        $conf .= 'same => n,Goto(${CONTEXT},${EXTEN:1},1);' . " \n\n";
        $conf .= 'exten => _.!,1,ExecIf($[ "${EXTEN}" == "h" ]?Hangup())' . " \n\t";
        $conf .= 'same => n,Ringing()' . " \n\t";

        // Описываем возможность прыжка в пользовательский sub контекст.
        $conf .= 'same => n,GosubIf($["${DIALPLAN_EXISTS(${CONTEXT}-custom,${EXTEN},1)}" == "1"]?${CONTEXT}-custom,${EXTEN},1)' . "\n\t";

        $provider_contexts = $this->generateRegexPatternsContextNames($conf);

        $conf .= 'same => n,ExecIf($["${peer_mobile}x" != "x"]?Hangup())' . " \n\t";
        $conf .= 'same => n,ExecIf($["${DIALSTATUS}" != "ANSWER" && "${BLINDTRANSFER}x" != "x" && "${ISTRANSFER}x" != "x"]?Gosub(${ISTRANSFER}dial_hangup,${EXTEN},1))' . "\n\t";
        $conf .= 'same => n,ExecIf($["${BLINDTRANSFER}x" != "x"]?AGI(check_redirect.php,${BLINDTRANSFER}))' . " \n\t";
        $conf .= 'same => n,ExecIf($["${ROUTFOUND}x" == "x"]?Gosub(dial,${EXTEN},1))' . "\n\t";

        $conf .= 'same => n,Playback(silence/2,noanswer)' . " \n\t";
        $conf .= 'same => n,ExecIf($["${ROUTFOUND}x" != "x"]?Playback(followme/sorry,noanswer):Playback(cannot-complete-as-dialed,noanswer))' . " \n\t";
        $conf .= 'same => n,Hangup()' . " \n\n";
        $conf .= 'exten => h,1,ExecIf($["${ISTRANSFER}x" != "x"]?Gosub(${ISTRANSFER}dial_hangup,${EXTEN},1))' . "\n\t";

        foreach ($provider_contexts as $id_dialplan => $rout) {
            $this->generateProviderContext($conf, $id_dialplan, $rout);
        }
        return $conf;
    }

    /**
     * Формирует имена конткестов провайдеров и шаблоны Regex для проверки номера.
     * @param string $conf
     * @return array
     */
    private function generateRegexPatternsContextNames(string &$conf): array{
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
            $rout_data = $rout;
            $rout_data['technology'] = $technology;
            $id_dialplan = $rout_data['providerid'] . '-' . $rout_data['id'] . '-outgoing';
            $provider_contexts[$id_dialplan] = $rout_data;
            $conf .= $this->generateOutgoingRegexPattern($rout_data);
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
    public function getTechByID(string $uniqueID): string{
        $technology = '';
        $provider = Providers::findFirstByUniqid($uniqueID);
        if ($provider !== null) {
            if ($provider->type === 'SIP') {
                $account = Sip::findFirst('disabled="0" AND uniqid = "' . $uniqueID . '"');
                $technology = ($account === null) ? '' : SIPConf::getTechnology();
            } elseif ($provider->type === 'IAX') {
                $account = Iax::findFirst('disabled="0" AND uniqid = "' . $uniqueID . '"');
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
    private function generateOutgoingRegexPattern($rout): string{
        $conf = '';
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
        $numberBeginsWith = str_replace(array('*', '+'), array('\\\\*', '\\\\+'), $numberBeginsWith);
        $conf .= 'same => n,ExecIf($["${REGEX("^' . $numberBeginsWith . $regexPattern . '" ${EXTEN})}" == "1"]?Gosub(' . $rout['providerid'] . '-' . $rout['id'] . '-outgoing,${EXTEN},1))' . " \n\t";

        return $conf;
    }

    /**
     * @param string $conf
     * @param        $id_dialplan
     * @param        $rout
     */
    private function generateProviderContext(string &$conf, $id_dialplan, $rout): void{
        $conf .= "\n[{$id_dialplan}]\n";
        [$extensionVar, $changeExtension] = $this->initTrimVariables($rout);

        $conf .= 'exten => _.!,1,ExecIf($[ "${EXTEN}" == "h" ]?Hangup())' . " \n\t";
        $conf .= 'same => n,Set(number=' . $rout['prepend'] . $extensionVar . ')' . "\n\t";
        $conf .= 'same => n,Set(number=${FILTER(\*\#\+1234567890,${number})})' . "\n\t";
        $conf .= $changeExtension;

        $conf .= $this->generateProviderContextOutRoutModules($rout);
        $conf .= 'same => n,ExecIf($["${number}x" == "x"]?Hangup())' . "\n\t";
        $conf .= 'same => n,Set(ROUTFOUND=1)' . "\n\t";
        $conf .= 'same => n,Gosub(${ISTRANSFER}dial,${EXTEN},1)' . "\n\t";

        $conf .= 'same => n,ExecIf($["${EXTERNALPHONE}" == "${EXTEN}"]?Set(DOPTIONS=tk))' . "\n\t";

        // Описываем возможность прыжка в пользовательский sub контекст.
        $conf .= 'same => n,GosubIf($["${DIALPLAN_EXISTS(' . $rout['providerid'] . '-outgoing-custom,${EXTEN},1)}" == "1"]?' . $rout['providerid'] . '-outgoing-custom,${EXTEN},1)' . "\n\t";

        $conf .= $this->getDialCommand($rout);
        $conf .= $this->generateProviderContextAfterDialModules($rout);

        $conf .= 'same => n,GosubIf($["${DIALPLAN_EXISTS(' . $rout['providerid'] . '-outgoing-after-dial-custom,${EXTEN}),1}" == "1"]?' . $rout['providerid'] . '-outgoing-after-dial-custom,${EXTEN},1)' . "\n\t";

        $conf .= 'same => n,ExecIf($["${ISTRANSFER}x" != "x"]?Gosub(${ISTRANSFER}dial_hangup,${EXTEN},1))' . "\n\t";
        $conf .= 'same => n,ExecIf($["${DIALSTATUS}" = "ANSWER"]?Hangup())' . "\n\t";
        $conf .= 'same => n,Set(pt1c_UNIQUEID=${EMPTY_VALUE})' . "\n\t";
        $conf .= 'same => n,return' . "\n";
    }

    /**
     * Формирование исходящего dialplan доп. модулей;. Переопределение dialplan маршрута.
     * @param $rout
     * @return string
     */
    private function generateProviderContextOutRoutModules($rout): string{
        $conf = '';
        foreach ($this->additionalModules as $appClass) {
            $addition = $appClass->generateOutRoutContext($rout);
            if (!empty($addition)) {
                $conf .= $appClass->confBlockWithComments($addition);
            }
        }
        return $conf;
    }

    /**
     * Формирование dialplan доп. модулей после команды Dial.
     * @param $rout
     * @return string
     */
    private function generateProviderContextAfterDialModules($rout): string
    {
        $conf = '';
        foreach ($this->additionalModules as $appClass) {
            $addition = $appClass->generateOutRoutAfterDialContext($rout);
            if (!empty($addition)) {
                $conf .= $appClass->confBlockWithComments($addition);
            }
        }
        return $conf;
    }

    /**
     * Формирует Dial команду для технологии PJSIP / IAX2
     * @param        $rout
     * @return string
     */
    private function getDialCommand($rout): string{
        $conf = '';
        if ($rout['technology'] === IAXConf::TYPE_IAX2) {
            $conf .= 'same => n,Dial(' . $rout['technology'] . '/' . $rout['providerid'] . '/${number},600,${DOPTIONS}TKU(${ISTRANSFER}dial_answer)b(dial_create_chan,s,1))' . "\n\t";
        } else {
            $conf .= 'same => n,Dial(' . $rout['technology'] . '/${number}@' . $rout['providerid'] . ',600,${DOPTIONS}TKU(${ISTRANSFER}dial_answer)b(dial_create_chan,s,1))' . "\n\t";
        }
        return $conf;
    }

    /**
     * Проверка на необходимость обрезать номер телефона перед набором.
     * @param     $rout
     * @return string[]
     */
    private function initTrimVariables($rout): array{
        $trimFromBegin = (int)($rout['trimfrombegin'] ?? 0);
        if ($trimFromBegin > 0) {
            $extensionVar = '${ADDPLUS}${EXTEN:' . $rout['trimfrombegin'] . '}';
            $changeExtension = 'same => n,ExecIf($["${EXTEN}" != "${number}"]?Goto(${CONTEXT},${number},$[${PRIORITY} + 1]))' . "\n\t";
        } else {
            $extensionVar = '${ADDPLUS}${EXTEN}';
            $changeExtension = '';
        }
        return array($extensionVar, $changeExtension);
    }
}