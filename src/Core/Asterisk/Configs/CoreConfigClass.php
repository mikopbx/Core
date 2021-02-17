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

namespace MikoPBX\Core\Asterisk\Configs;


use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Core\System\MikoPBXConfig;
use MikoPBX\Core\System\Util;
use Phalcon\Config;
use Phalcon\Di\Injectable;

abstract class CoreConfigClass extends Injectable
{
    public const EXTENSION_GEN_HINTS = 'extensionGenHints';

    public const GENERATE_PUBLIC_CONTEXT = 'generatePublicContext';

    public const EXTENSION_GEN_INTERNAL_TRANSFER = 'extensionGenInternalTransfer';

    public const GET_INCLUDE_INTERNAL_TRANSFER = 'getIncludeInternalTransfer';

    public const EXTENSION_GLOBALS = 'extensionGlobals';

    public const EXTENSION_GEN_CONTEXTS = 'extensionGenContexts';

    public const GET_INCLUDE_INTERNAL = 'getIncludeInternal';

    public const EXTENSION_GEN_INTERNAL = 'extensionGenInternal';

    public const GENERATE_INCOMING_ROUT_BEFORE_DIAL = 'generateIncomingRoutBeforeDial';

    public const GENERATE_INCOMING_ROUT_AFTER_DIAL_CONTEXT = 'generateIncomingRoutAfterDialContext';

    public const GET_FEATURE_MAP = 'getFeatureMap';

    public const GENERATE_MODULES_CONF = 'generateModulesConf';

    public const GENERATE_MANAGER_CONF = 'generateManagerConf';

    public const GENERATE_PEERS_PJ = 'generatePeersPj';

    public const GENERATE_PEER_PJ_ADDITIONAL_OPTIONS = 'generatePeerPjAdditionalOptions';

    public const GENERATE_OUT_ROUT_CONTEXT = 'generateOutRoutContext';

    public const GENERATE_OUT_ROUT_AFTER_DIAL_CONTEXT = 'generateOutRoutAfterDialContext';

    public const OVERRIDE_PJSIP_OPTIONS = 'overridePJSIPOptions';

    public const OVERRIDE_PROVIDER_PJSIP_OPTIONS = 'overrideProviderPJSIPOptions';


    /**
     * Config file name i.e. extensions.conf
     */
    protected string $description;

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
     * ConfigClass constructor.
     */
    public function __construct()
    {
        $this->config          = $this->getDI()->getShared('config');
        $this->booting         = $this->getDI()->getShared('registry')->booting === true;
        $this->mikoPBXConfig   = new MikoPBXConfig();
        $this->generalSettings = $this->mikoPBXConfig->getGeneralSettings();
        $this->messages        = [];
    }

    /**
     * Calls extensions module method by name
     *
     * @param string $name
     * @param array  $arguments
     *
     * @return string
     */
    public function hookModulesMethod(string $name, $arguments = []): string
    {
        $stringResult      = '';
        $additionalModules = $this->di->getShared(PBXConfModulesProvider::SERVICE_NAME);
        foreach ($additionalModules as $configClassObj) {
            if ( ! method_exists($configClassObj, $name)) {
                continue;
            }
            if ($configClassObj instanceof $this) {
                continue;
            }
            try {
                $includeString = call_user_func_array([$configClassObj, $name], $arguments);
            } catch (\Throwable $e) {
                global $errorLogger;
                $errorLogger->captureException($e);
                Util::sysLogMsg(__METHOD__, $e->getMessage(), LOG_ERR);
                continue;
            }
            if ( ! empty($includeString)) {
                $stringResult .= $this->confBlockWithComments($includeString);
            }
        }

        return $stringResult;
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
        return $addition;
    }

    /**
     * Generates core modules config files with cli messages before and after generation
     */
    public function generateConfig(): void
    {
        $this->echoGenerateConfig();
        $this->getSettings();
        $this->generateConfigProtected();
        $this->echoDone();
    }

    /**
     * Shows boot message which module was started
     */
    protected function echoGenerateConfig(): void
    {
        if ($this->booting === true && ! empty($this->description)) {
            echo "   |- generate config {$this->description}... ";
        }
    }

    /**
     * Prepares settings dataset for a PBX module
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
     * Shows boot message which module generator was finished
     */
    protected function echoDone(): void
    {
        if ($this->booting === true && ! empty($this->description)) {
            echo "\033[32;1mdone\033[0m \n";
        }
    }

    /**
     * Prepares additional includes for [internal] context section in the extensions.conf file
     *
     * @return string
     */
    public function getIncludeInternal(): string
    {
        return '';
    }

    /**
     * Prepares additional rules for [internal] context section in the extensions.conf file
     *
     * @return string
     */
    public function extensionGenInternal(): string
    {
        return '';
    }

    /**
     * Prepares additional includes for [internal-transfer] context section in the extensions.conf file
     *
     * @return string
     */
    public function getIncludeInternalTransfer(): string
    {
        return '';
    }

    /**
     * Prepares additional rules for [internal-transfer] context section in the extensions.conf file
     *
     * @return string
     */
    public function extensionGenInternalTransfer(): string
    {
        return '';
    }

    /**
     * Prepares additional contexts sections in the extensions.conf file
     *
     * @return string
     */
    public function extensionGenContexts(): string
    {
        return '';
    }

    /**
     * Prepares additional hints for [internal-hints] context section in the extensions.conf file
     *
     * @return string
     */
    public function extensionGenHints(): string
    {
        return '';
    }

    /**
     * Prepares additional parameters for [globals] section in the extensions.conf file
     *
     * @return string
     */
    public function extensionGlobals(): string
    {
        return '';
    }

    /**
     * Prepares additional parameters for [featuremap] section in the features.conf file
     *
     * @return string returns additional Star codes
     */
    public function getFeatureMap(): string
    {
        return '';
    }

    /**
     * Prepares additional parameters for [public-direct-dial] section in the extensions.conf file
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
     *
     * @return array
     */
    public function getMessages(): array
    {
        return $this->messages;
    }

    /**
     * Returns models list of models which affect the current module settings
     *
     * @return array
     */
    public function dependenceModels(): array
    {
        return [];
    }

    /**
     * Prepares additional parameters for each outgoing route context
     * before dial call in the extensions.conf file
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
     *
     * @return string
     */
    public function generatePeersPj(): string
    {
        return '';
    }

}