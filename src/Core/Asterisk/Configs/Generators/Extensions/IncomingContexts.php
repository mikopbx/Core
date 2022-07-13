<?php


namespace MikoPBX\Core\Asterisk\Configs\Generators\Extensions;


use MikoPBX\Common\Models\IncomingRoutingTable;
use MikoPBX\Core\Asterisk\Configs\AsteriskConfigInterface;
use MikoPBX\Core\Asterisk\Configs\ConferenceConf;
use MikoPBX\Core\Asterisk\Configs\CoreConfigClass;
use MikoPBX\Core\Asterisk\Configs\ExtensionsConf;

class IncomingContexts extends CoreConfigClass
{
    public $provider;
    public $login;
    public string $uniqId;

    private array $dialplan = [];
    private array $rout_data_dial = [];
    private array $confExtensions = [];
    private array $routes = [];
    private string $lang;
    private bool $need_def_rout;

    /**
     * Генератор входящих контекстов.
     *
     * @param string | array $provider
     * @param string | array $login
     * @param string         $uniqId
     *
     * @return string
     */
    public static function generate($provider, $login = '', $uniqId = ''): string
    {
        $generator           = new self();
        $generator->provider = $provider;
        $generator->login    = $login;
        $generator->uniqId   = $uniqId;
        $generator->getSettings();

        return $generator->makeDialplan();
    }

    public function getSettings(): void
    {
        $this->confExtensions = ConferenceConf::getConferenceExtensions();
        $this->routes         = $this->getRoutes();
        $this->lang           = str_replace('_', '-', $this->generalSettings['PBXLanguage']);
        $this->need_def_rout  = $this->checkNeedDefRout();
    }

    /**
     * Возвращает массив входящих маршрутов для провайдера.
     *
     * @return array|string[]
     */
    private function getRoutes(): array
    {
        if ('none' === $this->provider) {
            // Звонки по sip uri.
            $filter = ['provider IS NULL AND priority<>9999', 'order' => 'provider,priority,extension',];
        } elseif (is_array($this->provider)) {
            $filter = [
                'provider IN ({provider:array})',
                'bind'  => ['provider' => array_keys($this->provider),],
                'order' => 'provider,priority,extension',
            ];
        } else {
            // Звонки через провайдера.
            $filter = ["provider = '$this->provider'", 'order' => 'provider,priority,extension',];
        }

        $m_data = IncomingRoutingTable::find($filter);
        $data   = $m_data->toArray();
        uasort($data, ExtensionsConf::class . '::sortArrayByPriority');

        return $data;
    }

    /**
     * Проверка нужен ли дефолтный маршрут для провайдера.
     * Наполнение таблицы маршрутизаци значением по умолчанию.
     *
     * @return bool
     */
    private function checkNeedDefRout(): bool
    {
        $need_def_rout = $this->needDefRout();
        if ($need_def_rout === true && 'none' !== $this->provider) {
            $this->routes[] = ['number' => '', 'extension' => '', 'timeout' => ''];
        }

        return $need_def_rout;
    }

    /**
     * Проверка нужен ли дефолтный маршрут для провайдера.
     *
     * @return bool
     */
    private function needDefRout(): bool
    {
        $needDefRout = true;
        foreach ($this->routes as $rout) {
            $number = trim($rout['number']);
            if ($number === 'X!' || $number === '') {
                $needDefRout = false;
                break;
            }
        }

        return $needDefRout;
    }

    public function makeDialplan(): string
    {
        foreach ($this->routes as $rout) {
            $this->generateRouteDialplan($rout);
            $this->generateDialActions($rout);
        }
        $this->multiplyExtensionsInDialplan();
        $this->trimDialPlan();

        return $this->createSummaryDialplan();
    }

    /**
     * Генерация Первой части (заголовка) входящего контекста.
     *
     * @param array $rout
     */
    private function generateRouteDialplan(array $rout): void
    {
        $number      = trim($rout['number']);
        $rout_number = ($number === '') ? 'X!' : $number;
        $rout_data   = &$this->dialplan[$rout_number];
        if ( ! empty($rout_data)) {
            return;
        }
        $ext_prefix = ('none' === $this->provider) ? '' : '_';

        $rout_data .= "exten => {$ext_prefix}{$rout_number},1,NoOp(--- Incoming call ---)\n\t";
        $rout_data .= 'same => n,Set(CHANNEL(language)=' . $this->lang . ')' . "\n\t";
        $rout_data .= 'same => n,Set(CHANNEL(hangup_handler_wipe)=hangup_handler,s,1)' . "\n\t";
        $rout_data .= 'same => n,Set(__FROM_DID=${EXTEN})' . "\n\t";
        $rout_data .= 'same => n,Set(__FROM_CHAN=${CHANNEL})' . "\n\t";
        // Установка имени пира.
        $rout_data .= 'same => n,ExecIf($["${CHANNEL(channeltype)}" != "Local"]?Gosub(set_from_peer,s,1))' . "\n\t";
        $rout_data .= 'same => n,ExecIf($["${CHANNEL(channeltype)}" == "Local"]?Set(__FROM_PEER=${CALLERID(num)}))' . "\n\t";
        $rout_data .= 'same => n,Gosub(add-trim-prefix-clid,${EXTEN},1)' . "\n\t";
        // Запрещаем звонящему переадресацию.
        $rout_data .= 'same => n,Set(__TRANSFER_OPTIONS=t)' . "\n";

        $rout_data .= $this->hookModulesMethod(AsteriskConfigInterface::GENERATE_INCOMING_ROUT_BEFORE_DIAL, [$rout_number]);
        $rout_data .= $this->hookModulesMethod(AsteriskConfigInterface::GENERATE_INCOMING_ROUT_BEFORE_DIAL_SYSTEM, [$rout_number]);
        // Описываем возможность прыжка в пользовательский sub контекст.
        $rout_data .= " \n\t" . 'same => n,GosubIf($["${DIALPLAN_EXISTS(${CONTEXT}-custom,${EXTEN},1)}" == "1"]?${CONTEXT}-custom,${EXTEN},1)';

        if ( ! empty($rout['extension'])) {
            $rout_data = rtrim($rout_data);
        }
    }

    /**
     * Формирует в Dialplan команды-действия goto dial.
     *
     * @param        $rout
     *
     * @return void
     */
    private function generateDialActions($rout): void
    {
        if (empty($rout['extension'])) {
            return;
        }
        $number      = trim($rout['number']);
        $rout_number = ($number === '') ? 'X!' : $number;
        $this->generateDialActionsRoutNumber($rout, $rout_number, $number);
    }

    /**
     * Генерация dialplan. Набор команд Dial()
     * @param $rout
     * @param $rout_number
     * @param $number
     */
    private function generateDialActionsRoutNumber($rout, $rout_number, $number): void
    {
        $timeout = trim($rout['timeout']);
        // Обязательно проверяем "DIALSTATUS", в случае с парковой через AMI вызова это необходимо.
        // При ответе может отработать следующий приоритет.
        if ( ! isset($this->rout_data_dial[$rout_number])) {
            $this->rout_data_dial[$rout_number] = '';
        }
        if (in_array($rout['extension'], $this->confExtensions, true)) {
            // Это конференция. Тут не требуется обработка таймаута ответа.
            // Вызов будет отвечен сразу конференцией.
            $dialplanCommands = " \n\t".'same => n,ExecIf($["${M_DIALSTATUS}" != "ANSWER"]?'."Goto(internal,{$rout['extension']},1));";
        } else {
            $dialplanCommands = " \n\t"."same => n,Set(M_TIMEOUT={$timeout})".
                                " \n\t".'same => n,ExecIf($["${M_DIALSTATUS}" != "ANSWER"]?'."Dial(Local/{$rout['extension']}@internal-incoming,{$timeout},".'${TRANSFER_OPTIONS}'."Kg));";
        }
        $this->rout_data_dial[$rout_number] .= $dialplanCommands;
        $this->duplicateDialActionsRoutNumber($rout, $dialplanCommands, $number);
    }

    /**
     * Правило добавляется для exten = login.
     * @param $rout
     * @param $dial_command
     * @param $number
     */
    private function duplicateDialActionsRoutNumber($rout, $dial_command, $number): void
    {
        if ( ! is_array($this->provider)) {
            return;
        }
        $key = $this->provider[$rout['provider']] ?? '';
        if ( ! isset($this->rout_data_dial[$key])) {
            $this->rout_data_dial[$key] = '';
        }
        if (empty($number)) {
            $this->rout_data_dial[$key] .= $dial_command;
        }
    }

    /**
     * Добавление дополнительных exten в Dialplan
     */
    private function multiplyExtensionsInDialplan(): void
    {
        if (is_string($this->login)) {
            $this->multiplyExtensionsInDialplanStringLogin();
        }
        if (is_array($this->provider)) {
            foreach (array_values($this->provider) as $_login) {
                if(empty($_login)){
                    continue;
                }
                $this->dialplan[$_login] = str_replace('_X!,1', "{$_login},1", $this->dialplan['X!']);
            }
        }
    }

    /**
     * Добавляет extensions для dialplan.
     */
    private function multiplyExtensionsInDialplanStringLogin(): void
    {
        $add_login_pattern = $this->needAddLoginExtension();
        if ($this->isMultipleRoutes($add_login_pattern)) {
            $this->dialplan[$this->login]       = str_replace('_X!,1', "{$this->login},1", $this->dialplan['X!']);
            $this->rout_data_dial[$this->login] = $this->rout_data_dial['X!'];
        } elseif ($this->defaultRouteOnly($add_login_pattern)) {
            // Только маршрут "По умолчанию".
            $this->dialplan[$this->login] = str_replace('_X!,1', "{$this->login},1", $this->dialplan['X!']);
        }
    }

    /**
     * Если логин не числовой, то нужно добавить такой Exten.
     *
     * @return bool
     */
    private function needAddLoginExtension(): bool
    {
        $add_login_pattern = ! empty($this->login);
        foreach ($this->routes as $rout) {
            if ( ! $add_login_pattern) {
                break;
            } // Логин не заполнен, обработка не требуется.
            $is_num = preg_match_all('/^\d+$/m', $this->login, $matches, PREG_SET_ORDER);
            if ($is_num === 1) {
                // Это числовой номер, потому, не требуется дополнительно описывать exten.
                $add_login_pattern = false;
                break;
            }
            if (trim($rout['number']) !== $this->login) {
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
     * Несколько возможных входящих маршрутов "Каскад".
     *
     * @param bool $add_login_pattern
     *
     * @return bool
     */
    private function isMultipleRoutes(bool $add_login_pattern): bool
    {
        return $add_login_pattern && array_key_exists('X!', $this->rout_data_dial) && isset($this->dialplan['X!']);
    }

    /**
     * Проверка. Нужен только маршрут по умолчанию.
     *
     * @param bool $add_login_pattern
     *
     * @return bool
     */
    private function defaultRouteOnly(bool $add_login_pattern): bool
    {
        return $add_login_pattern === true && $this->need_def_rout === true && count($this->routes) === 1;
    }

    /**
     * Отрезает пробелы справа для dialplan.
     */
    private function trimDialPlan(): void
    {
        foreach ($this->dialplan as $key => &$dialplan) {
            if ( ! array_key_exists($key, $this->rout_data_dial)) {
                continue;
            }
            $dialplan = rtrim($dialplan);
            $dialplan .= $this->rout_data_dial[$key];
        }
    }

    /**
     * Формирование итогового dialplan.
     *
     * @return string
     */
    private function createSummaryDialplan(): string
    {
        /** @var IncomingRoutingTable $default_action */
        $default_action = IncomingRoutingTable::findFirst('priority = 9999');

        $id = is_string($this->provider) ? $this->provider : $this->uniqId;
        $conf = "\n" . "[{$id}-incoming]\n";
        foreach ($this->dialplan as $dpln) {
            $conf .= $dpln . "\n";
            if (null !== $default_action) {
                $conf .= $this->createSummaryDialplanDefAction($default_action, $id);
            }
            $conf .= "\t" . "same => n,Hangup()" . "\n";
        }

        return $conf;
    }

    /**
     * Формирование действия по умолчанию в dialplan.
     *
     * @param IncomingRoutingTable $default_action
     * @param string               $uniqId
     *
     * @return string
     */
    private function createSummaryDialplanDefAction(IncomingRoutingTable $default_action, string $uniqId): string
    {
        $conf = '';
        if ('extension' === $default_action->action) {
            $conf = $this->createSummaryDialplanGoto($conf, $default_action, $uniqId);
            $conf .= " \t" . 'same => n,GosubIf($["${DIALPLAN_EXISTS(${CONTEXT}-after-dial-custom,${EXTEN},1)}" == "1"]?${CONTEXT}-after-dial-custom,${EXTEN},1)' . "\n";
        } elseif ('busy' === $default_action->action) {
            $conf .= "\t" . "same => n,Busy(2)" . "\n";
        }
        return $conf;
    }

    /**
     * Формирование Goto действия для итогового dialplan.
     *
     * @param string               $conf
     * @param IncomingRoutingTable $default_action
     * @param string               $uniqId
     *
     * @return string
     */
    private function createSummaryDialplanGoto(
        string $conf,
        IncomingRoutingTable $default_action,
        string $uniqId
    ): string {
        // Обязательно проверяем "DIALSTATUS", в случае с парковой через AMI вызова это необходимо.
        // При ответе может отработать следующий приоритет.
        $conf .= "\t" . 'same => n,Set(M_TIMEOUT=0)' . "\n";
        if (in_array($default_action->extension, $this->confExtensions, true)) {
            // Это конференция. Тут не требуется обработка таймаута ответа.
            // Вызов будет отвечен сразу конференцией.
            $conf .= "\t" . "same => n," . 'ExecIf($["${M_DIALSTATUS}" != "ANSWER"]?' . "Goto(internal,{$default_action->extension},1)); default action" . "\n";
        } else {
            $conf .= "\t" . "same => n," . 'ExecIf($["${M_DIALSTATUS}" != "ANSWER"]?' . "Dial(Local/{$default_action->extension}@internal,,".'${TRANSFER_OPTIONS}'."Kg)); default action" . "\n";
        }
        $conf .= $this->hookModulesMethod(CoreConfigClass::GENERATE_INCOMING_ROUT_AFTER_DIAL_CONTEXT, [$uniqId]);

        return $conf;
    }

}