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
     */
    public function generateConfig(): void;


    /**
     * Prepares settings dataset for a PBX module
     */
    public function getSettings(): void;


    /**
     * Prepares additional includes for [internal] context section in the extensions.conf file
     *
     * @return string
     */
    public function getIncludeInternal(): string;

    /**
     * Prepares additional rules for [internal] context section in the extensions.conf file
     *
     * @return string
     */
    public function extensionGenInternal(): string;

    /**
     * Prepares additional rules for [internal-users] context section in the extensions.conf file
     *
     * @return string
     */
    public function extensionGenInternalUsersPreDial(): string;

    /**
     * Prepares additional rules for [all_peers] context section in the extensions.conf file
     *
     * @return string
     */
    public function extensionGenAllPeersContext(): string;

    /**
     * Prepares additional includes for [internal-transfer] context section in the extensions.conf file
     *
     * @return string
     */
    public function getIncludeInternalTransfer(): string;

    /**
     * Prepares additional rules for [internal-transfer] context section in the extensions.conf file
     *
     * @return string
     */
    public function extensionGenInternalTransfer(): string;

    /**
     * Prepares additional contexts sections in the extensions.conf file
     *
     * @return string
     */
    public function extensionGenContexts(): string;

    /**
     * Prepares additional hints for [internal-hints] context section in the extensions.conf file
     *
     * @return string
     */
    public function extensionGenHints(): string;

    /**
     * Prepares additional parameters for [globals] section in the extensions.conf file
     *
     * @return string
     */
    public function extensionGlobals(): string;

    /**
     * Prepares additional parameters for [featuremap] section in the features.conf file
     *
     * @return string returns additional Star codes
     */
    public function getFeatureMap(): string;

    /**
     * Prepares additional parameters for [public-direct-dial] section in the extensions.conf file
     *
     * @return string
     */
    public function generatePublicContext(): string;

    /**
     * Prepares additional parameters for each incoming context for each incoming route before dial in the
     * extensions.conf file
     *
     * @param string $rout_number
     *
     * @return string
     */
    public function generateIncomingRoutBeforeDialPreSystem(string $rout_number): string;
    /**
     * Prepares additional parameters for each incoming context for each incoming route before dial in the
     * extensions.conf file
     *
     * @param string $rout_number
     *
     * @return string
     */
    public function generateIncomingRoutBeforeDialSystem(string $rout_number): string;

    /**
     * Prepares additional parameters for each incoming context for each incoming route before dial in the
     * extensions.conf file
     *
     * @param string $rout_number
     *
     * @return string
     */
    public function generateIncomingRoutBeforeDial(string $rout_number): string;

    /**
     * Returns the messages variable
     *
     * @return array
     */
    public function getMessages(): array;

    /**
     * Returns models list of models which affect the current module settings
     *
     * @return array
     */
    public function getDependenceModels(): array;

    /**
     * Prepares additional parameters for each outgoing route context
     * before dial call in the extensions.conf file
     *
     * @param array $rout
     *
     * @return string
     */
    public function generateOutRoutContext(array $rout): string;

    /**
     * Override pjsip options for provider in the pjsip.conf file
     *
     * @param string $uniqid  the provider unique identifier
     * @param array  $options list of pjsip options
     *
     * @return array
     */
    public function overrideProviderPJSIPOptions(string $uniqid, array $options): array;

    /**
     * Override pjsip options for peer in the pjsip.conf file
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
     *
     * @param array $rout
     *
     * @return string
     */
    public function generateOutRoutAfterDialContext(array $rout): string;

    /**
     * Prepares additional pjsip options on endpoint section in the pjsip.conf file for peer
     *
     * @param array $peer information about peer
     *
     * @return string
     */
    public function generatePeerPjAdditionalOptions(array $peer): string;

    /**
     * Prepares additional AMI users data in the manager.conf file
     *
     * @return string
     */
    public function generateManagerConf(): string;

    /**
     * Prepares additional parameters for each incoming context
     * and incoming route after dial command in an extensions.conf file
     *
     * @param string $uniqId
     *
     * @return string
     */
    public function generateIncomingRoutAfterDialContext(string $uniqId): string;

    /**
     * Prepares additional peers data in the pjsip.conf file
     *
     * @return string
     */
    public function generatePeersPj(): string;

}