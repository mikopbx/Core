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

namespace MikoPBX\Core\Asterisk\Configs\Generators\Extensions;


use MikoPBX\Common\Models\IncomingRoutingTable;
use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Common\Models\SoundFiles;
use MikoPBX\Core\Asterisk\Configs\AsteriskConfigInterface;
use MikoPBX\Core\Asterisk\Configs\ConferenceConf;
use MikoPBX\Core\Asterisk\Configs\AsteriskConfigClass;
use MikoPBX\Core\Asterisk\Configs\ExtensionsConf;
use MikoPBX\Core\System\Util;


/**
 * This class generates incoming contexts for Asterisk configuration.
 *
 * @package MikoPBX\Core\Asterisk\Configs\Generators\Extensions
 */
class IncomingContexts extends AsteriskConfigClass
{
    // The module hook applying priority.
    public int $priority = 530;

    // @var array|string $provider Provider information for routing.
    public $provider;

    // @var string $login Login information.
    public string $login;

    // @var string $uniqId Unique ID for the dialplan.
    public string $uniqId;

    // @var array $dialplan Dialplan information.
    private array $dialplan = [];

    // @var array $rout_data_dial Stores the generated dialplan commands.
    private array $rout_data_dial = [];

    // @var array $confExtensions Configuration extensions.
    private array $confExtensions = [];

    // @var array $routes Routes for handling dialplan generation.
    private array $routes = [];

    // The language value.
    private string $lang;

    // @var bool $need_def_rout Flag for needing a default route.
    private bool $need_def_rout;

    /**
     * Generate incoming contexts.
     *
     * @param string|array $provider
     * @param string|array $login
     * @param string $uniqId
     *
     * @return string
     */
    public static function generate($provider, string $login = '', string $uniqId = ''): string
    {
        $generator           = new self();
        $generator->provider = $provider;
        $generator->login    = $login;
        $generator->uniqId   = $uniqId;
        $generator->getSettings();

        return $generator->makeDialplan();
    }


    /**
     * Get the settings for generating incoming contexts.
     *
     * This method retrieves the necessary settings for generating the incoming contexts. It sets the conference
     * extensions, routes, language, and the need for a default route based on the configuration.
     *
     * @return void
     */
    public function getSettings(): void
    {
        $this->confExtensions = ConferenceConf::getConferenceExtensions();
        $this->routes         = $this->getRoutes();
        $this->lang           = str_replace('_', '-', $this->generalSettings[PbxSettingsConstants::PBX_LANGUAGE]);
        $this->need_def_rout  = $this->checkNeedDefRout();
    }

    /**
     * Get the routes for generating incoming contexts.
     *
     * This method retrieves the routes based on the provider configuration. It queries the IncomingRoutingTable
     * model to fetch the relevant routes and orders them by provider, priority, and extension. The resulting data
     * is then sorted using the ExtensionsConf class's sortArrayByPriority method.
     *
     * @return array The array of routes.
     */
    private function getRoutes(): array
    {
        if ('none' === $this->provider) {
            // Calls via SIP URI.
            $filter = ['provider IS NULL AND priority<>9999', 'order' => 'provider,priority,extension',];
        } elseif (is_array($this->provider)) {
            $filter = [
                'provider IN ({provider:array})',
                'bind'  => ['provider' => array_keys($this->provider),],
                'order' => 'provider,priority,extension',
            ];
        } else {
            // Calls via provider.
            $filter = ["provider = '$this->provider'", 'order' => 'provider,priority,extension',];
        }

        $m_data = IncomingRoutingTable::find($filter);
        $data   = $m_data->toArray();
        uasort($data, ExtensionsConf::class . '::sortArrayByPriority');

        return $data;
    }

    /**
     * Check if a default route is needed for the provider.
     * Populate the routes table with the default value.
     *
     * This method checks if a default route is required for the provider. If the need for a default route is true
     * and the provider is not 'none', a default route entry with empty values for number, extension, and timeout
     * is added to the routes array.
     *
     * @return bool The flag indicating if a default route is needed.
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
     * Check if a default route is needed for the provider.
     *
     * This method checks if a default route is needed for the provider by iterating through the routes array
     * and examining the 'number' field of each route. If any route has a number value of 'X!' or an empty string,
     * it indicates that a default route is not needed.
     *
     * @return bool The flag indicating if a default route is needed.
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

    /**
     * Generate the dialplan for incoming contexts.
     *
     * This method generates the dialplan for incoming contexts by iterating through the routes and invoking
     * the necessary methods to generate the route dialplan and dial actions. It then multiplies extensions
     * in the dialplan, trims the dialplan, and creates the summary dialplan.
     *
     * @return string The generated dialplan for incoming contexts.
     */
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
     * Generates the first part (header) of an incoming context.
     *
     * @param array $rout Array containing route information.
     */
    private function generateRouteDialplan(array $rout): void
    {
        // Prepare the route number.
        $number      = trim($rout['number']);
        $rout_number = ($number === '') ? 'X!' : $number;
        $rout_data   = &$this->dialplan[$rout_number];

        // If route data is not empty, exit the function.
        if ( ! empty($rout_data)) {
            return;
        }

        // Determine extension prefix based on the route number.
        if(mb_strpos($rout_number, '_') === 0){
            $ext_prefix = '';
        }elseif(preg_match_all('/^[.|!|N|X|Z|0-9|\[|\]|\-]+$/m', $rout_number, $matches, PREG_SET_ORDER) === 1){
            // Likely an EXTEN template.
            $ext_prefix = '_';
        }else{
            $ext_prefix = '';
        }

        // Generate dialplan strings.
        $rout_data .= "exten => {$ext_prefix}{$rout_number},1,NoOp(--- Incoming call ---)\n\t";
        $rout_data .= 'same => n,Set(CHANNEL(language)=' . $this->lang . ')' . "\n\t";
        $rout_data .= 'same => n,Set(CHANNEL(hangup_handler_wipe)=hangup_handler,s,1)' . "\n\t";
        $rout_data .= 'same => n,Set(__FROM_DID=${EXTEN})' . "\n\t";
        $rout_data .= 'same => n,Set(__FROM_CHAN=${CHANNEL})' . "\n\t";
        $rout_data .= 'same => n,Set(__M_CALLID=${CHANNEL(callid)})' . "\n\t";

        // Set peer name.
        $rout_data .= 'same => n,ExecIf($["${CHANNEL(channeltype)}" != "Local"]?Gosub(set_from_peer,s,1))' . "\n\t";
        $rout_data .= 'same => n,ExecIf($["${CHANNEL(channeltype)}" == "Local"]?Set(__FROM_PEER=${CALLERID(num)}))' . "\n\t";
        $rout_data .= 'same => n,Gosub(add-trim-prefix-clid,${EXTEN},1)' . "\n\t";

        // Prohibit caller redirection.
        $rout_data .= 'same => n,Set(__TRANSFER_OPTIONS=t)' . "\n";
        $rout_data .= $this->hookModulesMethod(AsteriskConfigInterface::GENERATE_INCOMING_ROUT_BEFORE_DIAL_PRE_SYSTEM, [$rout_number]);
        $rout_data .= $this->hookModulesMethod(AsteriskConfigInterface::GENERATE_INCOMING_ROUT_BEFORE_DIAL_SYSTEM, [$rout_number]);
        $rout_data .= $this->hookModulesMethod(AsteriskConfigInterface::GENERATE_INCOMING_ROUT_BEFORE_DIAL, [$rout_number]);

        // Describe the ability to jump into the custom sub context.
        $rout_data .= " \n\t" . 'same => n,GosubIf($["${DIALPLAN_EXISTS(${CONTEXT}-custom,${EXTEN},1)}" == "1"]?${CONTEXT}-custom,${EXTEN},1)';

        if ( ! empty($rout['extension'])) {
            $rout_data = rtrim($rout_data);
        }
    }

    /**
     * Generates dial commands (goto dial) in the Dialplan.
     *
     * @param array $rout Array containing route information.
     *
     * @return void
     */
    private function generateDialActions(array $rout): void
    {
        // If the route doesn't have an extension, exit the function.
        if (empty($rout['extension'])) {
            return;
        }
        // Prepare the route number.
        $number      = trim($rout['number']);
        $rout_number = ($number === '') ? 'X!' : $number;

        // Generate dial actions based on route number.
        $this->generateDialActionsRoutNumber($rout, $rout_number, $number);
    }

    /**
     * Generate dialplan commands for the given route and route number.
     *
     * This function creates the dialplan commands for routing calls to different
     * extensions based on the provided route configuration and route number.
     *
     * @param array $rout The route configuration.
     * @param string $rout_number The route number.
     * @param string $number The number to dial.
     * @return void
     */
    private function generateDialActionsRoutNumber(array $rout, string $rout_number, string $number): void
    {
        // Set the timeout for the route based on the configuration.
        $timeout = trim($rout['timeout']);

        // Check for the existence of the dial status in the route data.
        // This is required for handling parking calls through AMI.
        if ( ! isset($this->rout_data_dial[$rout_number])) {
            $this->rout_data_dial[$rout_number] = '';
        }

        // Check if the extension is a conference extension.
        if (in_array($rout['extension'], $this->confExtensions, true)) {
            // For conference extensions, there's no need to handle answer timeout.
            // The call will be answered immediately by the conference.
            $dialplanCommands = " \n\t".'same => n,ExecIf($["${M_DIALSTATUS}" != "ANSWER" && "${M_DIALSTATUS}" != "BUSY"]?'."Goto(internal,{$rout['extension']},1));";
        } else {
            // For other extensions, handle the answer timeout and generate the appropriate dial command.
            $dialplanCommands = " \n\t"."same => n,Set(M_TIMEOUT={$timeout})".
                                " \n\t".'same => n,ExecIf($["${M_DIALSTATUS}" != "ANSWER" && "${M_DIALSTATUS}" != "BUSY"]?'."Dial(Local/{$rout['extension']}@internal-incoming,{$timeout},".'${TRANSFER_OPTIONS}'."Kg));";
        }

        $mediaFile = $this->getSoundFilePath($rout);
        if(!empty($mediaFile)){
            $this->rout_data_dial[$rout_number] .= " \n\t" . 'same => n,ExecIf($["${M_DIALSTATUS}" != "ANSWER"]?Playback('.$mediaFile.'));' . PHP_EOL;
        }

        // Add the generated commands to the route data.
        $this->rout_data_dial[$rout_number] .= $dialplanCommands;

        // Handle duplicate dial actions for the route.
        $this->duplicateDialActionsRoutNumber($rout, $dialplanCommands, $number);
    }

    /**
     * Get path ro sound file
     * @param array $rout
     * @return string
     */
    public function getSoundFilePath(array $rout):string
    {
        if(empty($rout['audio_message_id'])){
            return '';
        }
        $res           = SoundFiles::findFirst($rout['audio_message_id']);
        $audio_message = $res === null ? '' : (string)$res->path;
        if(file_exists($audio_message)){
            return Util::trimExtensionForFile($audio_message);
        }
        return '';
    }

    /**
     * Handle duplicate dial actions for the given route.
     *
     * This function adds the generated dialplan commands for routing calls to different
     * extensions based on the provided route configuration. It handles specifically the
     * case where the extension is 'login'.
     *
     * @param array $rout The route configuration.
     * @param string $dial_command The dial command to be added.
     * @param string $number The number to dial.
     * @return void
     */
    private function duplicateDialActionsRoutNumber(array $rout, string $dial_command, string $number): void
    {
        // Check if the provider array is properly set.
        if ( ! is_array($this->provider)) {
            return;
        }

        // Get the provider key from the route configuration.
        $key = $this->provider[$rout['provider']] ?? '';

        // Check for the existence of the dial status in the route data.
        if ( ! isset($this->rout_data_dial[$key])) {
            $this->rout_data_dial[$key] = '';
        }

        // If the number is empty, add the dial command to the route data.
        if (empty($number)) {
            $this->rout_data_dial[$key] .= $dial_command;
        }
    }

    /**
     * Add additional extensions to the dialplan.
     *
     * This function modifies the dialplan to handle multiple extensions based on the
     * provider information. If the login is a string, it calls a separate function to handle it.
     *
     * @return void
     */
    private function multiplyExtensionsInDialplan(): void
    {
        // If the login is a string, call the specific function to handle it.
        if (!empty($this->login)) {
            $this->multiplyExtensionsInDialplanStringLogin();
        }

        // If the provider is an array, iterate over it and add each provider to the dialplan.
        if (is_array($this->provider)) {
            foreach (array_values($this->provider) as $_login) {
                // If the login is empty, skip to the next iteration.
                if(empty($_login)){
                    continue;
                }

                // Replace the '_X!,1' with the login in the dialplan and assign it to the login key.
                $this->dialplan[$_login] = str_replace('_X!,1', "{$_login},1", $this->dialplan['X!']);
            }
        }
    }

    /**
     * Adds extensions to the dialplan for a string login.
     *
     * This function modifies the dialplan and routing data based on the login and add_login_pattern flag.
     * It checks if multiple routes are possible or if only a default route is required.
     *
     * @return void
     */
    private function multiplyExtensionsInDialplanStringLogin(): void
    {
        $add_login_pattern = $this->needAddLoginExtension();
        if ($this->isMultipleRoutes($add_login_pattern)) {
            $this->dialplan[$this->login]       = str_replace('_X!,1', "{$this->login},1", $this->dialplan['X!']);
            $this->rout_data_dial[$this->login] = $this->rout_data_dial['X!'];
        } elseif ($this->defaultRouteOnly($add_login_pattern)) {
            // Only default route required.
            $this->dialplan[$this->login] = str_replace('_X!,1', "{$this->login},1", $this->dialplan['X!']);
        }
    }

    /**
     * Determines if a login extension needs to be added
     *
     * This method checks if the login is not empty and is not a numeric value.
     * If the login is a numeric value or matches with any of the route numbers,
     * no additional login extension is required, so it returns false.
     * If the login is not empty, and doesn't match with any of the route numbers,
     * it implies an additional login extension is needed, so it returns true.
     *
     * @return bool Indicates if an additional login extension is needed
     */
    private function needAddLoginExtension(): bool
    {
        // Check if the login is not empty
        $add_login_pattern = ! empty($this->login);

        // Iterate through the routes
        foreach ($this->routes as $rout) {

            // If the login is empty, no additional login extension is required
            if ( ! $add_login_pattern) {
                break;
            }

            // Check if the login is a numeric value
            $is_num = preg_match_all('/^\d+$/m', $this->login, $matches, PREG_SET_ORDER);
            if ($is_num === 1) {
                // If the login is a numeric value, no additional login extension is required
                $add_login_pattern = false;
                break;
            }

            // If the route number does not match with the login, continue to the next route
            if (trim($rout['number']) !== $this->login) {
                continue;
            }

            // If the route number matches with the login, no additional login extension is required
            $add_login_pattern = false;
            break;
        }

        // Return whether an additional login extension is needed
        return $add_login_pattern;
    }

    /**
     * Check if multiple routes are possible.
     *
     * @param bool $add_login_pattern Flag indicating if an additional extension is required.
     *
     * @return bool Returns true if multiple routes are possible, false otherwise.
     */
    private function isMultipleRoutes(bool $add_login_pattern): bool
    {
        return $add_login_pattern && array_key_exists('X!', $this->rout_data_dial) && isset($this->dialplan['X!']);
    }

    /**
     * Check if only a default route is required.
     *
     * @param bool $add_login_pattern Flag indicating if an additional extension is required.
     *
     * @return bool Returns true if only a default route is required, false otherwise.
     */
    private function defaultRouteOnly(bool $add_login_pattern): bool
    {
        return $add_login_pattern === true && $this->need_def_rout === true && count($this->routes) === 1;
    }

    /**
     * Trim spaces on the right of the dialplan.
     *
     * This function trims spaces from the
     * right of each dialplan and appends the corresponding routing data.
     *
     * @return void
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
     * * Creates a summary dialplan
     *
     * This method constructs a summary dialplan by retrieving the default action from the incoming routing table.
     * It creates an ID based on the provider or unique ID, initializes the dialplan with the ID, and
     * iterates through the dialplan to generate each line of the dialplan. If a default action is found,
     * it is also included in the dialplan. The dialplan ends with a 'Hangup' action.
     *
     * @return string The constructed dialplan
     */
    private function createSummaryDialplan(): string
    {
        // Find the default action in the incoming routing table
        /** @var IncomingRoutingTable $default_action */
        $default_action = IncomingRoutingTable::findFirst('priority = 9999');

        // Create an ID based on the provider or unique ID
        $id = is_string($this->provider) ? $this->provider : $this->uniqId;

        // Initialize the dialplan with the ID
        $conf = "\n" . "[{$id}-incoming]\n";

        // Iterate through the dialplan
        foreach ($this->dialplan as $dpln) {
            // Add each line of the dialplan
            $conf .= $dpln . "\n";

            // If a default action is found, include it in the dialplan
            if (null !== $default_action) {
                $conf .= $this->createSummaryDialplanDefAction($default_action, $id);
            }

            // End the dialplan with a 'Hangup' action
            $conf .= "\t" . "same => n,Hangup()" . "\n";
        }

        // Return the constructed dialplan
        return $conf;
    }

    /**
     * Creates a summary dialplan with default action
     *
     * This method constructs the dialplan depending on the default action provided.
     * If the action is an 'extension', the method sets the dialplan to go to a different extension and checks
     * if the 'after-dial-custom' exists in the dialplan. If the action is 'busy', the dialplan is set to busy.
     *
     * @param IncomingRoutingTable $default_action The default action for the dialplan
     * @param string $uniqId Unique ID for identification
     *
     * @return string The constructed dialplan
     */
    private function createSummaryDialplanDefAction(IncomingRoutingTable $default_action, string $uniqId): string
    {
        // Initialize the dialplan
        $conf = '';
        // If the action is an 'extension', modify the dialplan accordingly
        if ('extension' === $default_action->action) {
            // Set the dialplan to go to a different extension
            $conf = $this->createSummaryDialplanGoto($conf, $default_action, $uniqId);

            // Check if the 'after-dial-custom' exists in the dialplan
            $conf .= " \t" . 'same => n,GosubIf($["${DIALPLAN_EXISTS(${CONTEXT}-after-dial-custom,${EXTEN},1)}" == "1"]?${CONTEXT}-after-dial-custom,${EXTEN},1)' . "\n";

            // Check if the dial status is 'busy'
            $conf .= " \t" . 'same => n,ExecIf($["${M_DIALSTATUS}" == "BUSY"]?Busy(2));' . PHP_EOL;

        // If the action is 'playback', hangup call
        } elseif (IncomingRoutingTable::ACTION_PLAYBACK === $default_action->action) {
            $mediaFile = $this->getSoundFilePath($default_action->toArray());
            if(!empty($mediaFile)){
                $conf .= " \n\t" . 'same => n,ExecIf($["${M_DIALSTATUS}" != "ANSWER"]?Playback('.$mediaFile.'));' . PHP_EOL;
            }
        // If the action is 'busy', set the dialplan to busy
        } elseif (IncomingRoutingTable::ACTION_BUSY === $default_action->action) {
            $conf .= "\t" . "same => n,Busy(2)" . PHP_EOL;
        }

        // Return the constructed dialplan
        return $conf;
    }

    /**
     * This function generates a part of an Asterisk dialplan. It handles the Goto action for the dialplan,
     * checking the DIALSTATUS, and if necessary, redirects the call to a conference or dials the extension.
     *
     * @param string $conf The existing dialplan configuration string, which will be appended to.
     * @param IncomingRoutingTable $default_action The default action of the routing table, which provides the
     *                                             extension that should be dialed or the conference that should be joined.
     * @param string $uniqId Unique identifier for the provider or incoming route.
     *
     * @return string Returns the updated dialplan configuration.
     */
    private function createSummaryDialplanGoto(
        string $conf,
        IncomingRoutingTable $default_action,
        string $uniqId
    ): string {
        // DIALSTATUS must be checked, especially when dealing with parking lot calls through AMI.
        // The next priority might be executed upon answering.
        $conf .= "\t" . 'same => n,Set(M_TIMEOUT=0)' . "\n";
        if (in_array($default_action->extension, $this->confExtensions, true)) {
            // This is a conference. No need to handle answer timeout here.
            // The call will be immediately answered by the conference.
            $conf .= "\t" . "same => n," . 'ExecIf($["${M_DIALSTATUS}" != "ANSWER" && "${M_DIALSTATUS}" != "BUSY"]?' . "Goto(internal,{$default_action->extension},1)); default action" . "\n";
        } else {
            // Dial the local extension if the DIALSTATUS is not ANSWER or BUSY.
            $conf .= "\t" . "same => n," . 'ExecIf($["${M_DIALSTATUS}" != "ANSWER" && "${M_DIALSTATUS}" != "BUSY"]?' . "Dial(Local/{$default_action->extension}@internal,,".'${TRANSFER_OPTIONS}'."Kg)); default action" . "\n";
        }

        // Execute the hook method for generating the context after the dial.
        $conf .= $this->hookModulesMethod(AsteriskConfigInterface::GENERATE_INCOMING_ROUT_AFTER_DIAL_CONTEXT, [$uniqId]);

        return $conf;
    }

}