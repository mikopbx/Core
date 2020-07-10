<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 6 2020
 */

namespace MikoPBX\Modules\Config;

use MikoPBX\Core\System\MikoPBXConfig;
use Phalcon\Di;
use ReflectionClass as ReflectionClassAlias;

abstract class ConfigClass implements SystemConfigInterface, AsteriskConfigInterface, RestAPIConfigInterface
{
    /**
     * Dependency injections
     */
    protected $di;

    /**
     * @var \MikoPBX\Core\System\MikoPBXConfig
     */
    protected MikoPBXConfig $mikoPBXConfig;

    /**
     * @var \Phalcon\Config
     */
    protected \Phalcon\Config $config;

    /**
     * @var bool
     */
    protected bool $booting;

    /**
     * Error and Notice messages
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
    protected string $moduleUniqueId;

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
        $this->di            = Di::getDefault();
        $this->config        = $this->di->getShared('config');
        $this->booting       = $this->di->getRegistry()->booting===true;
        $this->mikoPBXConfig = new MikoPBXConfig();
        $this->generalSettings = $this->mikoPBXConfig->getGeneralSettings();

        // Get child class parameters and define module Dir and UniqueID
        $reflector = new ReflectionClassAlias(static::class);
        $partsOfNameSpace = explode('\\', $reflector->getNamespaceName());
        if (count($partsOfNameSpace)===3 && $partsOfNameSpace[0]==='Modules'){
            $modulesDir    = $this->config->path('core.modulesDir');
            $this->moduleUniqueId = $partsOfNameSpace[1];
            $this->moduleDir =  $modulesDir.'/'.$this->moduleUniqueId;
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
     * @param string $addition
     *
     * @return string
     */
    protected function confBlockWithComments(string $addition):string
    {
        $result = '';
        if (empty($addition)){
            return $result;
        }
        if (!empty($this->moduleUniqueId)){
            $result ='; ***** BEGIN BY '.$this->moduleUniqueId.PHP_EOL." *****\t";
            $result .= $addition;
            if (substr($addition, -1)!=="\t"){
                $result .="\t";
            }
            $result .='; ***** END BY '.$this->moduleUniqueId.PHP_EOL." *****\t";
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
        if ($this->booting === true && !empty($this->description)) {
            echo "   |- generate config {$this->description}... ";
        }
    }

    /**
     * Генерация конфигурационного файла asterisk.
     */
    protected function generateConfigProtected():void
    {
    }

    /**
     * Вывод сообщения об окончании генерации.
     */
    protected function echoDone(): void
    {
        if ($this->booting === true && !empty($this->description)) {
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
    public function getIncludeInternalTransfer() :string
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
    public function generatePublicContext(&$conf) :void
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
     * @return array
     */
    public function getModuleWorkers(): array
    {
        return [];
    }

    /**
     * Returns array of additional firewall rules for module
     * @return array
     */
    public function getDefaultFirewallRules(): array
    {
        return [];
    }

    /**
     * Return messages after function or method execution
     * @return array
     */
    public function getMessages(): array
    {
        return  $this->messages;
    }

    /**
     * Process enable action in web interface
     * @return bool
     */
    public function onBeforeModuleEnable(): bool
    {
        return true;
    }

    /**
     * Process disable action in web interface
     * @return bool
     */
    public function onBeforeModuleDisable(): bool
    {
        return true;
    }

    /**
     * Генератор modules.conf
     *
     * @return string
     */
    public function generateModulesConf():string
    {
        return '';
    }

    /**
     *  Process CoreAPI requests under root rights
     *
     * @param array $request
     *
     * @return array
     */
    public function moduleRestAPICallback(array $request): array
    {
        $result = [];
        $action = strtoupper($request['action']);
        switch ($action){
            case 'CHECK':
            case 'RELOAD':
                $result['result']   = 'Success';
                break;
            default:
                $result['result']   = 'ERROR';
                $result['data'] = 'API action not found;';
        }
        return $result;
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
}