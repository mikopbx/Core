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

namespace MikoPBX\Modules\Config;

use MikoPBX\Core\System\MikoPBXConfig;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Config;
use Phalcon\Di\Injectable;
use ReflectionClass as ReflectionClassAlias;

abstract class ConfigClass extends Injectable implements SystemConfigInterface, AsteriskConfigInterface,
                                                         RestAPIConfigInterface
{

    /**
     * ID Config class
     */
    public const ID_CONFIG_CLASS = 'InternalConfigModule';


    /**
     * @var \MikoPBX\Core\System\MikoPBXConfig
     */
    protected MikoPBXConfig $mikoPBXConfig;

    /**
     * @var \Phalcon\Config
     */
    protected Config $config;

    /**
     * @var bool
     */
    protected bool $booting;

    /**
     * Error and Notice messages
     *
     * @var array
     */
    protected array $messages;

    /**
     * Array of PbxSettings values
     */
    protected array $generalSettings;

    /**
     * Asterisk config file name
     */
    protected string $description;

    /**
     * Additional module UniqueID
     */
    public string $moduleUniqueId;

    /**
     * Additional module directory
     */
    protected string $moduleDir;


    /**
     * ConfigClass constructor.
     *
     */
    public function __construct()
    {
        $this->config          = $this->getDI()->getShared('config');
        $this->booting         = $this->getDI()->getShared('registry')->booting === true;
        $this->mikoPBXConfig   = new MikoPBXConfig();
        $this->generalSettings = $this->mikoPBXConfig->getGeneralSettings();
        $this->moduleUniqueId  = ConfigClass::ID_CONFIG_CLASS;
        // Get child class parameters and define module Dir and UniqueID
        $reflector        = new ReflectionClassAlias(static::class);
        $partsOfNameSpace = explode('\\', $reflector->getNamespaceName());
        if (count($partsOfNameSpace) === 3 && $partsOfNameSpace[0] === 'Modules') {
            $modulesDir           = $this->config->path('core.modulesDir');
            $this->moduleUniqueId = $partsOfNameSpace[1];
            $this->moduleDir      = $modulesDir . '/' . $this->moduleUniqueId;
        }

        $this->messages = [];
    }

    public function getSettings(): void
    {
    }

    public function generateConfig(): void
    {
        // Генерация конфигурационных файлов.
        $this->echoGenerateConfig();
        $this->getSettings();
        $this->generateConfigProtected();
        $this->echoDone();
    }


    /**
     * Makes pretty module text block into config file
     *
     * @param string $addition
     *
     * @return string
     */
    protected function confBlockWithComments(string $addition): string
    {
        $result = '';
        if (empty($addition)) {
            return $result;
        }
        if ( ! empty($this->moduleUniqueId) && ConfigClass::ID_CONFIG_CLASS !== $this->moduleUniqueId) {
            $result = PHP_EOL . '; ***** BEGIN BY ' . $this->moduleUniqueId . PHP_EOL;
            $result .= $addition;
            if (substr($addition, -1) !== "\t") {
                $result .= "\t";
            }
            $result .= PHP_EOL . '; ***** END BY ' . $this->moduleUniqueId . PHP_EOL;
        } else {
            $result .= $addition;
        }

        return $result;
    }

    /**
     * Вывод сообщения о генерации конфига.
     *
     */
    protected function echoGenerateConfig(): void
    {
        if ($this->booting === true && ! empty($this->description)) {
            echo "   |- generate config {$this->description}... ";
        }
    }

    /**
     * Генерация конфигурационного файла asterisk.
     */
    protected function generateConfigProtected(): void
    {
    }

    /**
     * Вывод сообщения об окончании генерации.
     */
    protected function echoDone(): void
    {
        if ($this->booting === true && ! empty($this->description)) {
            echo "\033[32;1mdone\033[0m \n";
        }
    }

    // Получаем строки include для секции internal.

    public function getIncludeInternal(): string
    {
        // Генерация внутреннего номерного плана.
        return '';
    }

    // Получаем строки include для секции internal-transfer.
    public function getIncludeInternalTransfer(): string
    {
        // Генерация внутреннего номерного плана.
        return '';
    }

    // Генератор extension для контекста internal.
    public function extensionGenInternal(): string
    {
        // Генерация внутреннего номерного плана.
        return '';
    }

    // Генератор extension для контекста internal.
    public function extensionGenInternalTransfer(): string
    {
        // Генерация внутреннего номерного плана.
        return '';
    }


    // Генератор extension для контекста peers.
    public function extensionGenPeerContexts()
    {
        // Генерация внутреннего номерного плана.
        return '';
    }

    // Генератор extensions, дополнительные контексты.
    public function extensionGenContexts(): string
    {
        return '';
    }

    // Генератор хинтов для контекста internal-hints
    public function extensionGenHints(): string
    {
        // Генерация хинтов.
        return '';
    }

    // Секция global для extensions.conf.
    public function extensionGlobals(): string
    {
        // Генерация хинтов.
        return '';
    }

    // Секция featuremap для features.conf
    public function getFeatureMap(): string
    {
        // Возвращает старкоды.
        return '';
    }

    /**
     * Генерация контекста для публичных звонков.
     *
     * @param $conf
     *
     * @return void
     */
    public function generatePublicContext(&$conf): void
    {
    }


    /**
     * Будет вызван после старта asterisk.
     */
    public function onAfterPbxStarted(): void
    {
    }

    /**
     * Добавление задач в crond.
     *
     * @param $tasks
     */
    public function createCronTasks(&$tasks): void
    {
    }


    /**
     * Генератор сеции пиров для sip.conf
     *
     * @return string
     */
    public function generatePeersPj(): string
    {
        return '';
    }

    /**
     * Генератор сеции пиров для manager.conf
     *
     */
    public function generateManagerConf(): string
    {
        return '';
    }

    /**
     * Дополнительные параметры для
     *
     * @param $peer
     *
     * @return string
     */
    public function generatePeerPjAdditionalOptions($peer): string
    {
        return '';
    }

    /**
     * Переопределение опций Endpoint в pjsip.conf
     * @param string $id
     * @param array $options
     * @return array
     */
    public function overridePJSIPOptions(/** @scrutinizer ignore-unused */ string $id, array $options):array
    {
        return $options;
    }

    /**
     * Кастомизация исходящего контекста для конкретного маршрута.
     *
     * @param $rout
     *
     * @return string
     */
    public function generateOutRoutContext($rout): string
    {
        return '';
    }

    /**
     * Кастомизация исходящего контекста для конкретного маршрута.
     *
     * @param $rout
     *
     * @return string
     */
    public function generateOutRoutAfterDialContext($rout): string
    {
        return '';
    }

    /**
     * Кастомизация входящего контекста для конкретного маршрута.
     *
     * @param $id
     *
     * @return string
     */
    public function generateIncomingRoutAfterDialContext($id): string
    {
        return '';
    }

    /**
     * Кастомизация входящего контекста для конкретного маршрута.
     *
     * @param $rout_number
     *
     * @return string
     */
    public function generateIncomingRoutBeforeDial($rout_number): string
    {
        return '';
    }

    /**
     * Обработчик события изменения данных в базе настроек mikopbx.db.
     *
     * @param $data
     */
    public function modelsEventChangeData($data): void
    {
    }

    /**
     * Обработчик события изменения данных в базе настроек mikopbx.db.
     *
     * @param $modified_tables
     */
    public function modelsEventNeedReload($modified_tables): void
    {
    }

    /**
     * Returns array of workers classes for WorkerSafeScripts from module
     *
     * @return array
     */
    public function getModuleWorkers(): array
    {
        return [];
    }

    /**
     * Returns array of additional firewall rules for module
     *
     * @return array
     */
    public function getDefaultFirewallRules(): array
    {
        return [];
    }

    /**
     * Return messages after function or method execution
     *
     * @return array
     */
    public function getMessages(): array
    {
        return $this->messages;
    }

    /**
     * Process enable action in web interface
     *
     * @return bool
     */
    public function onBeforeModuleEnable(): bool
    {
        return true;
    }

    /**
     * Process after enable action in web interface
     *
     * @return void
     */
    public function onAfterModuleEnable(): void
    {
    }

    /**
     * Process disable action in web interface
     *
     * @return bool
     */
    public function onBeforeModuleDisable(): bool
    {
        return true;
    }

    /**
     * Process after disable action in web interface
     *
     * @return void
     */
    public function onAfterModuleDisable(): void
    {
    }

    /**
     * Генератор modules.conf
     *
     * @return string
     */
    public function generateModulesConf(): string
    {
        return '';
    }

    /**
     *  Process CoreAPI requests under root rights
     *
     * @param array $request
     *
     * @return \MikoPBX\PBXCoreREST\Lib\PBXApiResult
     */
    public function moduleRestAPICallback(array $request): PBXApiResult
    {
        $res            = new PBXApiResult();
        $res->processor = __METHOD__;
        $action         = strtoupper($request['action']);
        switch ($action) {
            case 'CHECK':
                $res->success = true;
                break;
            default:
                $res->success    = false;
                $res->messages[] = 'API action not found in moduleRestAPICallback';
        }

        return $res;
    }

    /**
     * Returns array of additional routes for PBXCoreREST interface from module
     *
     * @return array
     */
    public function getPBXCoreRESTAdditionalRoutes(): array
    {
        return [];
    }

    /**
     * Create additional Nginx locations from modules
     *
     */
    public function createNginxLocations(): string
    {
        return '';
    }

    /**
     * Generates additional fail2ban jail conf rules from modules
     *
     * @return string
     */
    public function generateFail2BanJails(): string
    {
        return '';
    }

    /**
     *
     * @return array
     */
    public function dependenceModels(): array
    {
        return [];
    }

}