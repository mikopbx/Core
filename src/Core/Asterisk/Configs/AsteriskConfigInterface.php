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

namespace MikoPBX\Core\Asterisk\Configs;


/**
 * Base interface for AsteriskConfig children
 *
 * @package MikoPBX\Core\Asterisk\Configs
 */
interface AsteriskConfigInterface
{
    public const EXTENSION_GEN_HINTS = 'extensionGenHints';

    public const EXTENSIONS_GEN_CREATE_CHANNEL_DIALPLAN = 'extensionGenCreateChannelDialplan';

    public const GENERATE_PUBLIC_CONTEXT = 'generatePublicContext';

    public const EXTENSION_GEN_INTERNAL_TRANSFER = 'extensionGenInternalTransfer';

    public const GET_INCLUDE_INTERNAL_TRANSFER = 'getIncludeInternalTransfer';

    public const EXTENSION_GLOBALS = 'extensionGlobals';

    public const EXTENSION_GEN_CONTEXTS = 'extensionGenContexts';

    public const GET_INCLUDE_INTERNAL = 'getIncludeInternal';

    public const EXTENSION_GEN_INTERNAL = 'extensionGenInternal';
    public const EXTENSION_GEN_INTERNAL_USERS_PRE_DIAL = 'extensionGenInternalUsersPreDial';
    public const EXTENSION_GEN_ALL_PEERS_CONTEXT = 'extensionGenAllPeersContext';

    public const GENERATE_INCOMING_ROUT_BEFORE_DIAL_PRE_SYSTEM = 'generateIncomingRoutBeforeDialPreSystem';
    public const GENERATE_INCOMING_ROUT_BEFORE_DIAL = 'generateIncomingRoutBeforeDial';
    public const GENERATE_INCOMING_ROUT_BEFORE_DIAL_SYSTEM = 'generateIncomingRoutBeforeDialSystem';

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

    public const GENERATE_CONFIG = 'generateConfig';

    public const GET_DEPENDENCE_MODELS = 'getDependenceModels';

    public const GET_SETTINGS = 'getSettings';


    /**
     * Generates core modules config files with cli messages before and after generation
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#generateconfig
     *
     * @return void
     */
    public function generateConfig(): void;


    /**
     * Prepares settings dataset for a PBX module
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#other
     *
     * @return void
     */
    public function getSettings(): void;


    /**
     * Prepares additional includes for [internal] context section in the extensions.conf file
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#getincludeinternal
     *
     * @return string
     */
    public function getIncludeInternal(): string;

    /**
     * Generates the modules.conf file.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#generatemodulesconf
     *
     * @return string The generated modules.conf file content.
     */
    public function generateModulesConf(): string;

    /**
     * Prepares additional rules for [internal] context section in the extensions.conf file
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#extensiongeninternal
     *
     * @return string
     */
    public function extensionGenInternal(): string;

    /**
     * Prepares additional rules for [internal-users] context section in the extensions.conf file
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#extensiongeninternaluserspredial
     *
     * @return string
     */
    public function extensionGenInternalUsersPreDial(): string;

    /**
     * Prepares additional rules for [all_peers] context section in the extensions.conf file
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#extensiongenallpeerscontext
     *
     * @return string
     */
    public function extensionGenAllPeersContext(): string;

    /**
     * Prepares additional includes for [internal-transfer] context section in the extensions.conf file
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#getincludeinternaltransfer
     *
     * @return string
     */
    public function getIncludeInternalTransfer(): string;

    /**
     * Prepares additional rules for [internal-transfer] context section in the extensions.conf file
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#extensiongeninternaltransfer
     *
     * @return string
     */
    public function extensionGenInternalTransfer(): string;

    /**
     * Prepares additional contexts sections in the extensions.conf file
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#extensiongencontexts
     *
     * @return string
     */
    public function extensionGenContexts(): string;

    /**
     * Prepares additional hints for [internal-hints] context section in the extensions.conf file
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#extensiongenhints
     *
     * @return string
     */
    public function extensionGenHints(): string;

    /**
     * Adds priorities for [dial_create_chan] context section in the extensions.conf file
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#extensiongencreatechanneldialplan
     *
     * @return string
     */
    public function extensionGenCreateChannelDialplan(): string;

    /**
     * Prepares additional parameters for [globals] section in the extensions.conf file
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#extensionglobals
     *
     * @return string
     */
    public function extensionGlobals(): string;

    /**
     * Prepares additional parameters for [featuremap] section in the features.conf file
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#getfeaturemap
     *
     * @return string returns additional Star codes
     */
    public function getFeatureMap(): string;

    /**
     * Prepares additional parameters for [public-direct-dial] section in the extensions.conf file
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#generatepubliccontext
     *
     * @return string
     */
    public function generatePublicContext(): string;

    /**
     * Prepares additional parameters for each incoming context for each incoming route before dial in the
     * extensions.conf file
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#generateincomingroutbeforedialpresystem
     *
     * @param string $rout_number
     *
     * @return string
     */
    public function generateIncomingRoutBeforeDialPreSystem(string $rout_number): string;

    /**
     * Prepares additional parameters for each incoming context for each incoming route before dial in the
     * extensions.conf file
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#generateincomingroutbeforedialsystem
     *
     * @param string $rout_number
     *
     * @return string
     */
    public function generateIncomingRoutBeforeDialSystem(string $rout_number): string;

    /**
     * Prepares additional parameters for each incoming context for each incoming route before dial in the
     * extensions.conf file
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#generateincomingroutbeforedial
     *
     * @param string $rout_number
     *
     * @return string
     */
    public function generateIncomingRoutBeforeDial(string $rout_number): string;

    /**
     * Returns the messages variable
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#other
     *
     * @return array
     */
    public function getMessages(): array;

    /**
     * Returns models list of models which affect the current module settings
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#other
     *
     * @return array
     */
    public function getDependenceModels(): array;

    /**
     * Prepares additional parameters for each outgoing route context
     * before dial call in the extensions.conf file
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#generateoutroutcontext
     *
     * @param array $rout
     *
     * @return string
     */
    public function generateOutRoutContext(array $rout): string;

    /**
     * Override pjsip options for provider in the pjsip.conf file
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#overrideproviderpjsipoptions
     *
     * @param string $uniqid  the provider unique identifier
     * @param array  $options list of pjsip options
     *
     * @return array
     */
    public function overrideProviderPJSIPOptions(string $uniqid, array $options): array;

    /**
     * Override pjsip options for peer in the pjsip.conf file
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#overridepjsipoptions
     *
     * @param string $extension the endpoint extension
     * @param array  $options   list of pjsip options
     *
     * @return array
     */
    public function overridePJSIPOptions(string $extension, array $options): array;

    /**
     * Prepares additional parameters for each outgoing route context
     * after dial call in the extensions.conf file
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#generateoutroutafterdialcontext
     *
     * @param array $rout
     *
     * @return string
     */
    public function generateOutRoutAfterDialContext(array $rout): string;

    /**
     * Prepares additional pjsip options on endpoint section in the pjsip.conf file for peer
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#generatepeerpjadditionaloptions
     *
     * @param array $peer information about peer
     *
     * @return string
     */
    public function generatePeerPjAdditionalOptions(array $peer): string;

    /**
     * Prepares additional AMI users data in the manager.conf file
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#generatemanagerconf
     *
     * @return string
     */
    public function generateManagerConf(): string;

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
    public function generateIncomingRoutAfterDialContext(string $uniqId): string;

    /**
     * Prepares additional peers data in the pjsip.conf file
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#generatepeerspj
     *
     * @return string
     */
    public function generatePeersPj(): string;

    /**
     * Allows overriding the execution priority of a method when called through hookModulesMethod.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#getmethodpriority
     *
     * @param string $methodName
     *
     * @return int
     */
    public function getMethodPriority(string $methodName = ''): int;

}