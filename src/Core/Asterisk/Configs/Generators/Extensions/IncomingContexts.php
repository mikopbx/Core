<?php


namespace MikoPBX\Core\Asterisk\Configs\Generators\Extensions;


use MikoPBX\Common\Models\IncomingRoutingTable;
use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Core\Asterisk\Configs\ConferenceConf;
use MikoPBX\Core\System\MikoPBXConfig;
use MikoPBX\Modules\Config\ConfigClass;
use Phalcon\Di;

class IncomingContexts extends ConfigClass{
    /**
     * Генератор входящих контекстов.
     *
     * @param string | array $provider
     * @param string | array $login
     * @param string         $uniqid
     *
     * @return string
     */
    public static function generate($provider, $login = '', $uniqid = ''): string
    {
        $conf     = '';
        $dialplan = [];
        $di       = Di::getDefault();
        if ($di === null) {
            return '';
        }
        $additionalModules = $di->getShared(PBXConfModulesProvider::SERVICE_NAME);
        $confExtensions    = ConferenceConf::getConferenceExtensions();

        $filter = self::getRoutesFilter($provider);

        /** @var IncomingRoutingTable $default_action */
        $default_action = IncomingRoutingTable::findFirst('priority = 9999');
        /** @var IncomingRoutingTable $m_data */
        $m_data = IncomingRoutingTable::find($filter);
        $data   = $m_data->toArray();
        uasort($data, __CLASS__ . '::sortArrayByPriority');

        $need_def_rout = self::checkNeedDefRout($provider, $data);
        $config = new MikoPBXConfig();
        $lang   = str_replace('_', '-', $config->getGeneralSettings('PBXLanguage'));

        $rout_data_dial = [];
        foreach ($data as $rout) {
            $number      = trim($rout['number']);
            $timeout     = trim($rout['timeout']);
            $rout_number = ($number === '') ? 'X!' : $number;
            $rout_data   = &$dialplan[$rout_number];
            if (empty($rout_data)) {
                self::generateRouteDialplan($rout_data, $provider, $rout, $lang, $additionalModules);
            }
            self::generateDialActions($rout_data_dial, $rout, $rout_number, $confExtensions, $timeout, $provider, $number);
        }

        self::multiplyExtensionsInDialplan($dialplan, $rout_data_dial, $login, $data, $need_def_rout, $provider);
        self::trimDialplans($dialplan, $rout_data_dial);
        self::createSummaryDialplan($conf, $provider, $uniqid, $dialplan, $default_action, $confExtensions, $additionalModules);

        return $conf;
    }

    /**
     * @param array|string $provider
     * @return array|string[]
     */
    private static function getRoutesFilter($provider): array{
        if ('none' === $provider) {
            // Звонки по sip uri.
            $filter = ['provider IS NULL AND priority<>9999', 'order' => 'provider,priority,extension',];
        } elseif (is_array($provider)) {
            $filter = ['provider IN ({provider:array})', 'bind' => ['provider' => array_keys($provider),], 'order' => 'provider,priority,extension',];
        } else {
            // Звонки через провайдера.
            $filter = ["provider = '$provider'", 'order' => 'provider,priority,extension',];
        }
        return $filter;
    }

    /**
     * Проверка нужен ли дефолтный маршрут для провайдера.
     * @param $provider
     * @param array $data
     * @return bool
     */
    private static function checkNeedDefRout($provider, array &$data): bool{
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
        return $need_def_rout;
    }

    /**
     * @param        $rout_data
     * @param  $provider
     * @param array $rout
     * @param string  $lang
     * @param        $additionalModules
     */
    private static function generateRouteDialplan(?string &$rout_data, $provider, array $rout, string $lang, $additionalModules): void{

        $number      = trim($rout['number']);
        $rout_number = ($number === '') ? 'X!' : $number;

        $ext_prefix = ('none' === $provider) ? '' : '_';
        $rout_data .= "exten => {$ext_prefix}{$rout_number},1,NoOp(--- Incoming call ---)\n\t";
        $rout_data .= 'same => n,Set(CHANNEL(language)=' . $lang . ')' . "\n\t";
        $rout_data .= 'same => n,Set(CHANNEL(hangup_handler_wipe)=hangup_handler,s,1)' . "\n\t";
        $rout_data .= 'same => n,Set(__FROM_DID=${EXTEN})' . "\n\t";
        $rout_data .= 'same => n,Set(__FROM_CHAN=${CHANNEL})' . "\n\t";
        // Установка имени пира.
        $rout_data .= 'same => n,ExecIf($["${CHANNEL(channeltype)}" != "Local"]?Gosub(set_from_peer,s,1))' . "\n\t";
        $rout_data .= 'same => n,ExecIf($["${CHANNEL(channeltype)}" == "Local"]?Set(__FROM_PEER=${CALLERID(num)}))' . "\n\t";
        $rout_data .= 'same => n,Gosub(add-trim-prefix-clid,${EXTEN},1)' . "\n\t";

        foreach ($additionalModules as $appClass) {
            $addition = $appClass->generateIncomingRoutBeforeDial($rout_number);
            if (!empty($addition)) {
                $rout_data .= $appClass->confBlockWithComments($addition);
            }
        }
        // Описываем возможность прыжка в пользовательский sub контекст.
        $rout_data .= " \n\t" . 'same => n,GosubIf($["${DIALPLAN_EXISTS(${CONTEXT}-custom,${EXTEN},1)}" == "1"]?${CONTEXT}-custom,${EXTEN},1)';

        if (!empty($rout['extension'])) {
            $rout_data = rtrim($rout_data);
        }
    }

    /**
     * @param array  $rout_data_dial
     * @param        $rout
     * @param string $rout_number
     * @param array  $confExtensions
     * @param string $timeout
     * @param  $provider
     * @param string $number
     * @return void
     */
    private static function generateDialActions(array &$rout_data_dial, $rout, string $rout_number, array $confExtensions, string $timeout, $provider, string $number): void{
        if (empty($rout['extension'])) {
            return;
        }
        // Обязательно проверяем "DIALSTATUS", в случае с парковой через AMI вызова это необходимо.
        // При ответе может отработать следующий приоритет.
        if (!isset($rout_data_dial[$rout_number])) {
            $rout_data_dial[$rout_number] = '';
        }

        if (in_array($rout['extension'], $confExtensions, true)) {
            // Это конференция. Тут не требуется обработка таймаута ответа.
            // Вызов будет отвечен сразу конференцией.
            $dial_command = " \n\t" . 'same => n,' . 'ExecIf($["${M_DIALSTATUS}" != "ANSWER"]?' . "Goto(internal,{$rout['extension']},1));";
            $rout_data_dial[$rout_number] .= "";
        } else {
            $dial_command = " \n\t" . 'same => n,' . 'ExecIf($["${M_DIALSTATUS}" != "ANSWER"]?' . "Dial(Local/{$rout['extension']}@internal-incoming/n,{$timeout},TKg));";
            $rout_data_dial[$rout_number] .= " \n\t" . "same => n,Set(M_TIMEOUT={$timeout})";
        }
        $rout_data_dial[$rout_number] .= $dial_command;

        if (!is_array($provider)) {
            return;
        }

        $key = $provider[$rout['provider']] ?? '';
        if (!isset($rout_data_dial[$key])) {
            $rout_data_dial[$key] = '';
        }
        if (empty($number)) {
            $rout_data_dial[$key] .= $dial_command;
        }
    }

    /**
     * @param array $dialplans
     * @param array $rout_data_dial
     */
    private static function trimDialplans(array $dialplans, array $rout_data_dial):void{
        foreach ($dialplans as $key => &$dialplan) {
            if (!array_key_exists($key, $rout_data_dial)) {
                continue;
            }
            $dialplan = rtrim($dialplan);
            $dialplan .= $rout_data_dial[$key];
        }
    }


    /**
     * Добавление дополнительных exten в Dialplan
     * @param array $dialplan
     * @param array $rout_data_dial
     * @param       $login
     * @param array $data
     * @param bool  $need_def_rout
     * @param $provider
     */
    private static function multiplyExtensionsInDialplan(array &$dialplan, array &$rout_data_dial, $login, array $data, bool $need_def_rout, $provider): void{
        if (is_string($login)) {
            self::multiplyExtensionsInDialplanStringLogin($login, $data, $rout_data_dial, $dialplan, $need_def_rout);
        }
        if (is_array($provider)) {
            foreach (array_values($provider) as $_login) {
                $dialplan[$_login] = str_replace('_X!,1', "{$_login},1", $dialplan['X!']);
            }
        }
    }

    /**
     * @param string $login
     * @param array  $data
     * @param array  $rout_data_dial
     * @param array  $dialplan
     * @param bool   $need_def_rout
     */
    private static function multiplyExtensionsInDialplanStringLogin(string $login, array $data, array &$rout_data_dial, array &$dialplan, bool $need_def_rout): void{
        $add_login_pattern = self::needAddLoginExtension($login, $data);
        if ($add_login_pattern && array_key_exists('X!', $rout_data_dial) && isset($dialplan['X!'])) {
            $dialplan[$login] = str_replace('_X!,1', "{$login},1", $dialplan['X!']);
            $rout_data_dial[$login] = $rout_data_dial['X!'];
        } elseif ($add_login_pattern === true && $need_def_rout === true && count($data) === 1) {
            // Только маршрут "По умолчанию".
            $dialplan[$login] = str_replace('_X!,1', "{$login},1", $dialplan['X!']);
        }
    }

    /**
     * Если логин не числовой, то нужно добавить такой Exten.
     * @param string $login
     * @param array  $data
     * @return bool
     */
    private static function needAddLoginExtension(string $login, array $data): bool{
        $add_login_pattern = !empty($login);
        foreach ($data as $rout) {
            if (!$add_login_pattern) {
                break;
            } // Логин не заполнен, обработка не требуется.
            $is_num = preg_match_all('/^\d+$/m', $login, $matches, PREG_SET_ORDER);
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
        return $add_login_pattern;
    }

    /**
     * Формирование итогового dialplan.
     * @param string               $conf
     * @param                      $provider
     * @param string               $uniqId
     * @param array                $dialplan
     * @param IncomingRoutingTable $default_action
     * @param array                $confExtensions
     * @param                      $additionalModules
     * @return string
     */
    private static function createSummaryDialplan(string & $conf, $provider, string $uniqId, array $dialplan, IncomingRoutingTable $default_action, array $confExtensions, $additionalModules): string{
        $uniqId = is_string($provider) ? $provider : $uniqId;
        $conf .= "\n" . "[{$uniqId}-incoming]\n";
        foreach ($dialplan as $dpln) {
            $conf .= $dpln . "\n";
            if (null === $default_action && 'none' !== $provider) {
                continue;
            }
            if ('extension' === $default_action->action) {
                $conf = self::createSummaryDialplanGoto($conf, $default_action, $confExtensions, $additionalModules, $uniqId);
                $conf .= " \t" . 'same => n,GosubIf($["${DIALPLAN_EXISTS(${CONTEXT}-after-dial-custom,${EXTEN},1)}" == "1"]?${CONTEXT}-after-dial-custom,${EXTEN},1)' . "\n";
            } elseif ('busy' === $default_action->action) {
                $conf .= "\t" . "same => n,Busy()" . "\n";
            }
            $conf .= "\t" . "same => n,Hangup()" . "\n";
        }
        return $conf;
    }

    /**
     * @param string               $conf
     * @param IncomingRoutingTable $default_action
     * @param array                $confExtensions
     * @param                      $additionalModules
     * @param string               $uniqId
     * @return string
     */
    private static function createSummaryDialplanGoto(string $conf, IncomingRoutingTable $default_action, array $confExtensions, $additionalModules, string $uniqId): string{
        // Обязательно проверяем "DIALSTATUS", в случае с парковой через AMI вызова это необходимо.
        // При ответе может отработать следующий приоритет.
        $conf .= "\t" . 'same => n,Set(M_TIMEOUT=0)' . "\n";
        if (in_array($default_action->extension, $confExtensions, true)) {
            // Это конференция. Тут не требуется обработка таймаута ответа.
            // Вызов будет отвечен сразу конференцией.
            $conf .= "\t" . "same => n," . 'ExecIf($["${M_DIALSTATUS}" != "ANSWER"]?' . "Goto(internal,{$default_action->extension},1)); default action" . "\n";
        } else {
            $conf .= "\t" . "same => n," . 'ExecIf($["${M_DIALSTATUS}" != "ANSWER"]?' . "Dial(Local/{$default_action->extension}@internal/n,,TKg)); default action" . "\n";
        }
        foreach ($additionalModules as $appClass) {
            $addition = $appClass->generateIncomingRoutAfterDialContext($uniqId);
            if (!empty($addition)) {
                $conf .= $appClass->confBlockWithComments($addition);
            }
        }
        return $conf;
    }

}