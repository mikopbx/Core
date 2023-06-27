<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

use MikoPBX\Common\Providers\ConfigProvider;
use MikoPBX\Core\Asterisk\Configs\AsteriskConfigClass;
use MikoPBX\Core\Asterisk\Configs\AsteriskConfigInterface;
use MikoPBX\Core\System\MikoPBXConfig;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Acl\Adapter\Memory as AclList;
use Phalcon\Assets\Manager;
use Phalcon\Config;
use Phalcon\Forms\Form;
use Phalcon\Mvc\Controller;
use Phalcon\Mvc\Router;
use Phalcon\Mvc\View;
use ReflectionClass as ReflectionClassAlias;

/**
 * Abstract class ConfigClass
 *
 * Define all possible functions to make system hooks
 *
 * @package MikoPBX\Modules\Config
 */
abstract class ConfigClass extends AsteriskConfigClass implements
                             SystemConfigInterface,
                             RestAPIConfigInterface,
                             WebUIConfigInterface,
                             AsteriskConfigInterface
{
    // The module hook applying priority
    protected int $priority = 10000;

    /**
     * Config file name i.e. extensions.conf
     */
    protected string $description;

    /**
     * Easy way to get or set the PbxSettings values.
     *
     * @var \MikoPBX\Core\System\MikoPBXConfig
     */
    protected MikoPBXConfig $mikoPBXConfig;

    /**
     * Access to the /etc/inc/mikopbx-settings.json values.
     *
     * @var \Phalcon\Config
     */
    protected Config $config;

    /**
     * Error and notice messages.
     *
     * @var array
     */
    protected array $messages;

    /**
     * Array of PbxSettings values.
     */
    protected array $generalSettings;


    /**
     * External module UniqueID.
     */
    public string $moduleUniqueId;

    /**
     * Additional module directory.
     */
    protected string $moduleDir;

    /**
     * ConfigClass constructor.
     *
     */
    public function __construct()
    {

        $this->config          = $this->di->getShared(ConfigProvider::SERVICE_NAME);
        $this->mikoPBXConfig   = new MikoPBXConfig();
        $this->generalSettings = $this->mikoPBXConfig->getGeneralSettings();
        $this->messages        = [];

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

    /**
     * This method allows overriding the execution priority of a method when called through hookModulesMethod.
     * By defining this method in the Conf class of a module, you can flexibly control
     * the execution priority of HOOK methods.
     * This provides the ability to specify a high priority for a method that generates CRON tasks
     * in an external module, and a low priority for a method that generates peers for pjsip.conf.
     *
     * By changing the priority, you can control the order in which module methods are applied.
     *
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#getmethodpriority
     *
     * @param string $methodName
     * @return int
     */
    public function getMethodPriority(string $methodName=''):int
    {
        return $this->priority;
    }

    /**
     * Returns the messages variable
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#other
     *
     * @return array
     */
    public function getMessages(): array
    {
        return $this->messages;
    }

    /**
     * Returns array of additional routes for PBXCoreREST interface from module
     * [ControllerClass, ActionMethod, RequestTemplate, HttpMethod, RootUrl, NoAuth ]
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#getpbxcorerestadditionalroutes
     *
     * @RoutePrefix("/pbxcore/api/someendpoint")
     * @Get("/something1")
     * @Get("/something2")
     * @Post("/something3")
     *
     * @return array
     * @example
     *  [[GetController::class, 'callAction', '/pbxcore/api/someendpoint/{actionName}', 'get', '/', false],
     *  [PostController::class, 'callAction', '/pbxcore/api/someendpoint/{actionName}', 'post', '/', false]]
     *
     */
    public function getPBXCoreRESTAdditionalRoutes(): array
    {
        return [];
    }

    /**
     * Process PBXCoreREST requests under root rights
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#modulerestapicallback
     *
     * @param array $request GET/POST parameters
     *
     * @return PBXApiResult An object containing the result of the API call.
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
     * This method is called in the WorkerModelsEvents after each model change.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#modelseventchangedata
     *
     * @param mixed $data The data related to the model change.
     *
     * @return void
     */
    public function modelsEventChangeData($data): void
    {
    }

    /**
     * This method is called in the WorkerModelsEvents after the models changing process is finished.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#modelseventneedreload
     *
     * @param array $modified_tables The list of modified models.
     *
     * @return void
     */
    public function modelsEventNeedReload(array $modified_tables): void
    {
    }

    /**
     * Returns an array of worker classes for WorkerSafeScripts.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#getmoduleworkers
     *
     * @return array The array of worker classes.
     */
    public function getModuleWorkers(): array
    {
        return [];
    }

    /**
     * Returns an array of additional firewall rules for the module.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#getdefaultfirewallrules
     *
     * @return array The array of firewall rules.
     */
    public function getDefaultFirewallRules(): array
    {
        return [];
    }

    /**
     * Processes actions before enabling the module in the web interface.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#onbeforemoduleenable
     *
     * @return bool Whether the module can be enabled.
     */
    public function onBeforeModuleEnable(): bool
    {
        return true;
    }

    /**
     * Processes actions after enabling the module in the web interface
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#onaftermoduleenable
     *
     * @return void
     */
    public function onAfterModuleEnable(): void
    {
    }

    /**
     * Processes actions before disabling the module in the web interface.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#onbeforemoduledisable
     *
     * @return bool Whether the module can be disabled.
     */
    public function onBeforeModuleDisable(): bool
    {
        return true;
    }

    /**
     * Processes actions after disabling the module in the web interface.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#onaftermoduledisable
     *
     * @return void
     */
    public function onAfterModuleDisable(): void
    {
    }

    /**
     * Creates additional Nginx locations from modules.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#createnginxlocations
     *
     * @return string The generated Nginx locations.
     */
    public function createNginxLocations(): string
    {
        return '';
    }

    /**
     * Generates additional fail2ban jail conf rules.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#generatefail2banjails
     *
     * @return string The generated fail2ban jail conf rules.
     */
    public function generateFail2BanJails(): string
    {
        return '';
    }

    /**
     * Adds cron tasks.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#createcrontasks
     *
     * @param array $tasks The array of cron tasks.
     *
     * @return void
     */
    public function createCronTasks(&$tasks): void
    {
    }

    /**
     * The callback function will execute after PBX started.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#onafterpbxstarted
     *
     * @return void
     */
    public function onAfterPbxStarted(): void
    {
    }

    /**
     * Authenticates a user over an external module.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#authenticateuser
     *
     * @param string $login The user login entered on the login page.
     * @param string $password The user password entered on the login page.
     *
     * @return array The session data.
     */
    public function authenticateUser(string $login, string $password): array
    {
        return [];
    }

    /**
     * Prepares a list of additional ACL roles and rules.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#onafteraclprepared
     *
     * @param AclList $aclList The ACL list for modifications.
     *
     * @return void
     */
    public function onAfterACLPrepared(AclList $aclList): void
    {
    }

    /**
     * Modifies the system menu.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#onbeforeheadermenushow
     *
     * @param array $menuItems The menu items for modifications.
     *
     * @return void
     */
    public function onBeforeHeaderMenuShow(array &$menuItems):void
    {
    }

    /**
     * Modifies the system routes.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#onafterroutesprepared
     *
     * @param Router $router The router ready for extra routes from modules.
     *
     * @return void
     */
    public function onAfterRoutesPrepared(Router $router):void
    {
    }

    /**
     * Modifies the system assets.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#onafterassetsprepared
     *
     * @param Manager $assets The assets manager for additional modifications from module.
     *
     * @return void
     */
    public function onAfterAssetsPrepared(Manager $assets):void
    {
    }

    /**
     * Prepares the include block within a Volt template.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#onvoltblockcompile
     *
     * @param string $controller The called controller name.
     * @param string $blockName The named in volt template block name.
     * @param View $view The view instance.
     *
     * @return string the volt partial file path without extension.
     */
    public function onVoltBlockCompile(string $controller, string $blockName, View $view):string
    {
        return '';
    }

    /**
     * Called from BaseForm before the form is initialized.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#onbeforeforminitialize
     *
     * @param Form $form The called form instance.
     * @param mixed $entity The called form entity.
     * @param mixed $options The called form options.
     *
     * @return void
     */
    public function onBeforeFormInitialize(Form $form, $entity, $options):void
    {
    }

    /**
     * Called from BaseController before executing a route.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#onbeforeexecuteroute
     *
     * @param Controller $controller The called controller instance.
     *
     * @return void
     */
    public function onBeforeExecuteRoute(Controller $controller):void
    {
    }

    /**
     * Called from BaseController after executing a route.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#onafterexecuteroute
     *
     * @param Controller $controller The called controller instance.
     *
     * @return void
     */
    public function onAfterExecuteRoute(Controller $controller):void
    {
    }

    /**
     * Adds an extra filters before execute request to CDR table.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#applyaclfilterstocdrquery
     *
     * @param array $parameters The array of parameters prepared for execute query.
     *
     * @return void
     */
    public function applyACLFiltersToCDRQuery(array &$parameters): void
    {
        // Implement $parameters modifications
    }
}