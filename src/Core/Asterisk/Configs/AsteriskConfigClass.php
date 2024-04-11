<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2021 Alexey Portnov and Nikolay Beketov
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


use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use MikoPBX\Common\Providers\ConfigProvider;
use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Common\Providers\RegistryProvider;
use MikoPBX\Core\Providers\AsteriskConfModulesProvider;
use MikoPBX\Core\System\MikoPBXConfig;
use MikoPBX\Core\System\SystemMessages;
use Phalcon\Config;
use Phalcon\Di\Injectable;

/**
 * Base class for AsteriskConfig children
 *
 * @package MikoPBX\Core\Asterisk\Configs
 */
class AsteriskConfigClass extends Injectable implements AsteriskConfigInterface
{
    // The module hook applying priority
    protected int $priority = 1000;

    // Config file name i.e. extensions.conf
    protected string $description;
    private string $stageMessage = '';

    /**
     * Easy way to get or set the PbxSettings values
     *
     * @var \MikoPBX\Core\System\MikoPBXConfig
     */
    protected MikoPBXConfig $mikoPBXConfig;

    /**
     * Access to the /etc/inc/mikopbx-settings.json values
     *
     * @var \Phalcon\Config
     */
    protected Config $config;

    /**
     * Shows if it is boot process now or usual work
     *
     * @var bool
     */
    protected bool $booting;

    /**
     * Error and notice messages
     *
     * @var array
     */
    protected array $messages;

    /**
     * Array of PbxSettings values
     */
    protected array $generalSettings;

    /**
     * AsteriskConfigClass constructor.
     */
    public function __construct()
    {
        $this->config = $this->getDI()->getShared(ConfigProvider::SERVICE_NAME);
        $this->booting = false;
        $this->mikoPBXConfig = new MikoPBXConfig();
        $this->generalSettings = $this->mikoPBXConfig->getGeneralSettings();
        $this->messages = [];

        if ($this->getDI()->has(RegistryProvider::SERVICE_NAME)){
            $this->booting = $this->getDI()->getShared(RegistryProvider::SERVICE_NAME)->booting === true;
        }
    }

    /**
     * Calls the specified method on each module object and returns the concatenated results as a string.
     *
     * @param string $methodName The name of the method to call.
     * @param array $arguments The arguments to pass to the method.
     *
     * @return string The concatenated results as a string.
     */
    public function hookModulesMethod(string $methodName, array $arguments = []): string
    {
        $stringResult = '';
        $internalModules = $this->di->getShared(AsteriskConfModulesProvider::SERVICE_NAME);
        $externalModules = $this->di->getShared(PBXConfModulesProvider::SERVICE_NAME);
        $arrObjects = array_merge($internalModules, $externalModules);

        // Sort the merged array based on the priority value
        usort($arrObjects, function ($a, $b) use ($methodName) {
            return $a->getMethodPriority($methodName) - $b->getMethodPriority($methodName);
        });

        foreach ($arrObjects as $configClassObj) {
            if (!method_exists($configClassObj, $methodName)) {
                continue;
            }
            if (get_class($configClassObj) === get_class($this)) {
                continue; //prevent recursion
            }
            try {
                $includeString = call_user_func_array([$configClassObj, $methodName], $arguments);
                if (!empty($includeString)) {
                    if (property_exists($configClassObj, 'moduleUniqueId')) {
                        $includeString = $this->confBlockWithComments($includeString, $configClassObj->moduleUniqueId);
                    } else {
                        $includeString = $this->confBlockWithComments($includeString);
                    }
                    if (
                        substr($stringResult, -1) !== "\t"
                        &&
                        substr($includeString, 0, 4) === 'same'
                    ) {
                        $stringResult .= "\t" . $includeString;
                    } else {
                        $stringResult .= $includeString;
                    }
                }
            } catch (\Throwable $e) {
                CriticalErrorsHandler::handleExceptionWithSyslog($e);
                continue;
            }
        }
        return $stringResult;
    }

    /**
     * Adds comments and separators around the provided addition to create a configuration block.
     *
     * @param string $addition The content to add within the block.
     * @param string $externalModuleUniqueId The unique identifier of the external module (optional).
     *
     * @return string The content wrapped in a configuration block with comments.
     */
    protected function confBlockWithComments(string $addition, string $externalModuleUniqueId = ''): string
    {
        if (empty($externalModuleUniqueId)) {
            return rtrim($addition) . PHP_EOL;
        }
        $result = PHP_EOL . '; ***** BEGIN BY ' . $externalModuleUniqueId . PHP_EOL;
        $result .= rtrim($addition);
        $result .= PHP_EOL . '; ***** END BY ' . $externalModuleUniqueId . PHP_EOL;
        return $result;
    }

    /**
     * Generates core modules config files with cli messages before and after generation
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#generateconfig
     *
     * @return void
     */
    public function generateConfig(): void
    {
        $this->echoGenerateConfig(); // Display "Generating configuration" message
        $this->getSettings(); // Retrieve the required settings
        $this->generateConfigProtected(); // Generate the protected configuration content
        $this->echoDone(); // Display "Configuration generated successfully" message
    }

    /**
     * Displays a message indicating the start of the configuration generation process.
     */
    protected function echoGenerateConfig(): void
    {
        if ($this->booting === true && !empty($this->description)) {
            $this->stageMessage = "   |- generate config {$this->description}...";
            SystemMessages::echoWithSyslog($this->stageMessage);  // Output the message and log it in syslog
            SystemMessages::echoToTeletype($this->stageMessage); // Output to TTY
        }
    }

    /**
     * Prepares settings dataset for a PBX module
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#other
     *
     * @return void
     */
    public function getSettings(): void
    {
    }

    /**
     * Generates core modules config files
     */
    protected function generateConfigProtected(): void
    {
    }

    /**
     * Displays a message indicating the successful completion of the configuration generation process.
     */
    protected function echoDone(): void
    {
        if ($this->booting === true && !empty($this->description)) {
            // Output the completion message
            SystemMessages::echoResult($this->stageMessage);
            SystemMessages::teletypeEchoResult($this->stageMessage);
            $this->stageMessage = '';
        }
    }

    /**
     * Prepares additional includes for [internal] context section in the extensions.conf file
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#getincludeinternal
     *
     * @return string
     */
    public function getIncludeInternal(): string
    {
        return '';
    }

    /**
     * Generates the modules.conf file.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#generatemodulesconf
     *
     * @return string The generated modules.conf file content.
     */
    public function generateModulesConf(): string
    {
        return '';
    }

    /**
     * Prepares additional rules for [internal] context section in the extensions.conf file
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#extensiongeninternal
     *
     * @return string
     */
    public function extensionGenInternal(): string
    {
        return '';
    }

    /**
     * Prepares additional rules for [internal-users] context section in the extensions.conf file
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#extensiongeninternaluserspredial
     *
     * @return string
     */
    public function extensionGenInternalUsersPreDial(): string
    {
        return '';
    }

    /**
     * Prepares additional rules for [all_peers] context section in the extensions.conf file
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#extensiongenallpeerscontext
     *
     * @return string
     */
    public function extensionGenAllPeersContext(): string
    {
        return '';
    }

    /**
     * Prepares additional includes for [internal-transfer] context section in the extensions.conf file
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#getincludeinternaltransfer
     *
     * @return string
     */
    public function getIncludeInternalTransfer(): string
    {
        return '';
    }

    /**
     * Prepares additional rules for [internal-transfer] context section in the extensions.conf file
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#extensiongeninternaltransfer
     *
     * @return string
     */
    public function extensionGenInternalTransfer(): string
    {
        return '';
    }

    /**
     * Prepares additional contexts sections in the extensions.conf file
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#extensiongencontexts
     *
     * @return string
     */
    public function extensionGenContexts(): string
    {
        return '';
    }

    /**
     * Prepares additional hints for [internal-hints] context section in the extensions.conf file
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#extensiongenhints
     *
     * @return string
     */
    public function extensionGenHints(): string
    {
        return '';
    }

    /**
     * Adds priorities for [dial_create_chan] context section in the extensions.conf file
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#extensiongencreatechanneldialplan
     *
     * @return string
     */
    public function extensionGenCreateChannelDialplan(): string
    {
        return '';
    }

    /**
     * Prepares additional parameters for [globals] section in the extensions.conf file
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#extensionglobals
     *
     * @return string
     */
    public function extensionGlobals(): string
    {
        return '';
    }

    /**
     * Prepares additional parameters for [featuremap] section in the features.conf file
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#getfeaturemap
     *
     * @return string returns additional Star codes
     */
    public function getFeatureMap(): string
    {
        return '';
    }

    /**
     * Prepares additional parameters for [public-direct-dial] section in the extensions.conf file
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#generatepubliccontext
     *
     * @return string
     */
    public function generatePublicContext(): string
    {
        return '';
    }

    /**
     * Prepares additional parameters for each incoming context for each incoming route before dial in the
     * extensions.conf file
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#generateincomingroutbeforedialpresystem
     *
     * @param string $rout_number
     *
     * @return string
     */
    public function generateIncomingRoutBeforeDialPreSystem(string $rout_number): string
    {
        return '';
    }

    /**
     * Prepares additional parameters for each incoming context for each incoming route before dial in the
     * extensions.conf file
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#generateincomingroutbeforedialsystem
     *
     * @param string $rout_number
     *
     * @return string
     */
    public function generateIncomingRoutBeforeDialSystem(string $rout_number): string
    {
        return '';
    }

    /**
     * Prepares additional parameters for each incoming context for each incoming route before dial in the
     * extensions.conf file
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#generateincomingroutbeforedial
     *
     * @param string $rout_number
     *
     * @return string
     */
    public function generateIncomingRoutBeforeDial(string $rout_number): string
    {
        return '';
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
     * Returns models list of models which affect the current module settings
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#other
     *
     * @return array
     */
    public function getDependenceModels(): array
    {
        return [];
    }

    /**
     * Prepares additional parameters for each outgoing route context
     * before dial call in the extensions.conf file
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#generateoutroutcontext
     *
     * @param array $rout
     *
     * @return string
     */
    public function generateOutRoutContext(array $rout): string
    {
        return '';
    }

    /**
     * Override pjsip options for provider in the pjsip.conf file
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#overrideproviderpjsipoptions
     *
     * @param string $uniqid  the provider unique identifier
     * @param array  $options list of pjsip options
     *
     * @return array
     */
    public function overrideProviderPJSIPOptions(string $uniqid, array $options): array
    {
        return $options;
    }

    /**
     * Override pjsip options for peer in the pjsip.conf file
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#overridepjsipoptions
     *
     * @param string $extension the endpoint extension
     * @param array  $options   list of pjsip options
     *
     * @return array
     */
    public function overridePJSIPOptions(string $extension, array $options): array
    {
        return $options;
    }

    /**
     * Prepares additional parameters for each outgoing route context
     * after dial call in the extensions.conf file
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#generateoutroutafterdialcontext
     *
     * @param array $rout
     *
     * @return string
     */
    public function generateOutRoutAfterDialContext(array $rout): string
    {
        return '';
    }

    /**
     * Prepares additional pjsip options on endpoint section in the pjsip.conf file for peer
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#generatepeerpjadditionaloptions
     *
     * @param array $peer information about peer
     *
     * @return string
     */
    public function generatePeerPjAdditionalOptions(array $peer): string
    {
        return '';
    }

    /**
     * Prepares additional AMI users data in the manager.conf file
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#generatemanagerconf
     *
     * @return string
     */
    public function generateManagerConf(): string
    {
        return '';
    }

    /**
     * Prepares additional parameters for each incoming context
     * and incoming route after dial command in an extensions.conf file
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#generateincomingroutafterdialcontext
     *
     *
     * @param string $uniqId
     *
     * @return string
     */
    public function generateIncomingRoutAfterDialContext(string $uniqId): string
    {
        return '';
    }

    /**
     * Prepares additional peers data in the pjsip.conf file
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#generatepeerspj
     *
     * @return string
     */
    public function generatePeersPj(): string
    {
        return '';
    }

    /**
     * Allows overriding the execution priority of a method when called through hookModulesMethod.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#getmethodpriority
     *
     * @param string $methodName
     *
     * @return int
     */
    public function getMethodPriority(string $methodName = ''): int
    {
        switch ($methodName) {
            case AsteriskConfigInterface::GENERATE_CONFIG:
            default:
                $result = $this->priority;
        }
        return $result;
    }

}