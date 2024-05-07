<?php


namespace MikoPBX\Core\Asterisk\Configs\Generators\Extensions;


use MikoPBX\Common\Models\Iax;
use MikoPBX\Common\Models\OutgoingRoutingTable;
use MikoPBX\Common\Models\Providers;
use MikoPBX\Common\Models\Sip;
use MikoPBX\Core\Asterisk\Configs\AsteriskConfigInterface;
use MikoPBX\Core\Asterisk\Configs\ExtensionsConf;
use MikoPBX\Core\Asterisk\Configs\IAXConf;
use MikoPBX\Core\Asterisk\Configs\SIPConf;
use MikoPBX\Core\Asterisk\Configs\AsteriskConfigClass;

class OutgoingContext extends AsteriskConfigClass
{
    // The module hook applying priority
    public int $priority = 640;

    /**
     * Generates the outgoing contexts. Entry point.
     *
     * @return string The generated configuration string.
     */
    public static function generate(): string
    {
        $generator = new self();
        $generator->getSettings();

        return $generator->makeDialplan();
    }

    /**
     * Generates the dialplan for the outgoing context.
     *
     * This function dynamically creates the configuration for the outgoing context, including
     * call handling, routing, dialing, custom sub-contexts, call status, and hangup conditions.
     * The resulting configuration string is returned.
     *
     * @return string The generated configuration string.
     */
    public function makeDialplan(): string
    {
        // Initialize the configuration string
        $conf = "[outgoing] \n";

        // Strip + sign from number
        $conf .= 'exten => _+.!,1,NoOp(Strip + sign from number)' . " \n\t";

        // Jump to custom sub-context
        $conf .= 'same => n,Goto(${CONTEXT},${EXTEN:1},1);' . " \n\n";

        // Ringing for all number extension
        $conf .= 'exten => ' . ExtensionsConf::ALL_NUMBER_EXTENSION . ',1,Ringing()' . " \n\t";

        // Set src_number
        $conf .= 'same => n,Set(src_number=${EXTEN})' . "\n\t";

        // Check if custom sub-context exists and jump to it
        $conf .= 'same => n,GosubIf($["${DIALPLAN_EXISTS(${CONTEXT}-custom,${EXTEN},1)}" == "1"]?${CONTEXT}-custom,${EXTEN},1)' . "\n\t";

        // Generate regex patterns and context names for providers
        $provider_contexts = $this->generateRegexPatternsContextNames($conf);

        // Hangup if peer_mobile is set
        $conf .= 'same => n,ExecIf($["${peer_mobile}x" != "x"]?Hangup())' . " \n\t";

        // Perform blind transfer if dial status is not ANSWER
        $conf .= 'same => n,ExecIf($["${DIALSTATUS}" != "ANSWER" && "${BLINDTRANSFER}x" != "x" && "${ISTRANSFER}x" != "x"]?Gosub(transfer_dial_hangup,${EXTEN},1))' . "\n\t";

        // Check if BLINDTRANSFER is set and execute check_redirect.php
        $conf .= 'same => n,ExecIf($["${BLINDTRANSFER}x" != "x"]?AGI(check_redirect.php,${BLINDTRANSFER}))' . " \n\t";

        // Go to dial if ROUTFOUND is not set
        $conf .= 'same => n,ExecIf($["${ROUTFOUND}x" == "x"]?Gosub(dial,${EXTEN},1))' . "\n\t";

        // Playback silence/2 and handle route not found
        $conf .= 'same => n,Playback(silence/2,noanswer)' . " \n\t";
        $conf .= 'same => n,ExecIf($["${ROUTFOUND}x" != "x"]?Playback(followme/sorry,noanswer):Playback(cannot-complete-as-dialed,noanswer))' . " \n\t";

        // Hangup at the end
        $conf .= 'same => n,Hangup()' . " \n\n";

        // Perform transfer_dial_hangup on hangup
        $conf .= 'exten => h,1,ExecIf($["${ISTRANSFER}x" != "x"]?Goto(transfer_dial_hangup,${EXTEN},1))' . "\n\t";

        // Generate provider contexts
        foreach ($provider_contexts as $id_dialplan => $rout) {
            $this->generateProviderContext($conf, $id_dialplan, $rout);
        }

        // Return the generated configuration
        return $conf;
    }

    /**
     * Generates the regex patterns and context names for outgoing routing.
     *
     * This function generates the configuration for regex patterns and context names
     * based on the outgoing routing table. It sorts the routing table by priority
     * and generates the regex patterns accordingly. The resulting configuration
     * string is added to the $conf parameter and the generated provider contexts
     * are returned as an array.
     *
     * @param string $conf The current configuration string.
     * @return array The generated provider contexts.
     */
    private function generateRegexPatternsContextNames(string &$conf): array
    {

        // Fetch outgoing routing table data ordered by priority
        $routs = OutgoingRoutingTable::find(['order' => 'priority'])->toArray();

        // Sort the routing table data by priority
        uasort($routs, ExtensionsConf::class . '::sortArrayByPriority');

        $provider_contexts = [];

        /** @var OutgoingRoutingTable $rout */
        foreach ($routs as $rout) {
            // Get the technology associated with the provider
            $technology = $this->getTechByID($rout['providerid']);

            // Skip if technology is empty
            if (empty($technology)) {
                continue;
            }

            // Create a copy of the routing data and add technology information
            $rout_data                       = $rout;
            $rout_data['technology']         = $technology;

            // Generate the unique ID for the dialplan
            $id_dialplan                     = $rout_data['providerid'] . '-' . $rout_data['id'] . '-outgoing';

            // Add the dialplan data to the provider contexts array
            $provider_contexts[$id_dialplan] = $rout_data;

            // Generate the outgoing regex pattern and append it to the configuration
            $conf                            .= $this->generateOutgoingRegexPattern($rout_data);
        }

        return $provider_contexts;
    }

    /**
     * Gets the technology by unique ID.
     *
     * This function retrieves the technology (e.g., SIP or IAX2) based on the unique ID
     * provided. It checks the provider's type and fetches the corresponding account
     * to determine the technology. The technology is returned as a string.
     *
     * @param string $uniqueID The unique ID of the provider.
     * @return string The technology associated with the unique ID.
     */
    public function getTechByID(string $uniqueID): string
    {
        $technology = '';
        $provider   = Providers::findFirstByUniqid($uniqueID);
        if ($provider !== null) {
            if ($provider->type === 'SIP') {
                $account    = Sip::findFirst('disabled="0" AND uniqid = "' . $uniqueID . '"');
                $technology = ($account === null) ? '' : SIPConf::getTechnology();
            } elseif ($provider->type === 'IAX') {
                $account    = Iax::findFirst('disabled="0" AND uniqid = "' . $uniqueID . '"');
                $technology = ($account === null) ? '' : 'IAX2';
            }
        }

        return $technology;
    }

    /**
     * Generates the outgoing regex pattern for a given routing.
     *
     * This function generates the configuration for the outgoing regex pattern
     * based on the routing data provided. It builds the regex pattern based on
     * the rest numbers and number begins with values. The resulting configuration
     * string is returned.
     *
     * @param array $rout The routing data.
     * @return string The generated configuration string.
     */
    private function generateOutgoingRegexPattern($rout): string
    {
        $conf         = '';
        $regexPattern = '';

        $restNumbers = (int)($rout['restnumbers'] ?? 0);
        if ($restNumbers > 0) {
            $regexPattern = "[0-9]{" . $rout['restnumbers'] . "}$";
        } elseif ($restNumbers === 0) {
            $regexPattern = "$";
        } elseif ($restNumbers === -1) {
            $regexPattern = "";
        }
        $numberBeginsWith = $rout['numberbeginswith'] ?? '';
        $numberBeginsWith = str_replace(['*', '+'], ['\\\\*', '\\\\+'], $numberBeginsWith);
        $conf             .= 'same => n,ExecIf($["${REGEX("^' . $numberBeginsWith . $regexPattern . '" ${EXTEN})}" == "1"]?Gosub(' . $rout['providerid'] . '-' . $rout['id'] . '-outgoing,${EXTEN},1))' . " \n\t";

        return $conf;
    }

    /**
     * Generates the provider context for a given routing.
     *
     * This function generates the configuration for the provider context based on the
     * routing data provided. It handles extension variables, dial commands, custom
     * sub-contexts, and other call-related settings. The resulting configuration is
     * appended to the $conf parameter.
     *
     * @param string $conf The current configuration string.
     * @param string $id_dialplan The ID of the dialplan.
     * @param array $rout The routing data.
     */
    private function generateProviderContext(string &$conf, $id_dialplan, array $rout): void
    {
        // Add context header
        $conf .= "\n[{$id_dialplan}]\n";

        // Initialize variables for extensionVar and changeExtension
        [$extensionVar, $changeExtension] = $this->initTrimVariables($rout);


        // Set number variable with prepend and extensionVar
        $conf .= 'exten => ' . ExtensionsConf::ALL_NUMBER_EXTENSION . ',1,Set(number=' . $rout['prepend'] . $extensionVar . ')' . "\n\t";

        // Filter number using regex pattern
        $conf .= 'same => n,Set(number=${FILTER(\*\#\+1234567890,${number})})' . "\n\t";

        $conf .= $changeExtension;

        // Hangup if number is empty
        $conf .= 'same => n,ExecIf($["${number}x" == "x"]?Hangup())' . "\n\t";

        // Set ROUTFOUND and PROVIDER_ID variables
        $conf .= 'same => n,Set(ROUTFOUND=1)' . "\n\t";
        $conf .= "same => n,Set(_PROVIDER_ID={$rout['providerid']})" . "\n\t";

        // Set DOPTIONS based on EXTERNALPHONE and src_number
        $conf .= 'same => n,ExecIf($["${EXTERNALPHONE}" == "${src_number}"]?Set(DOPTIONS=tk))' . "\n\t";

        // Get dial command based on routing data
        $dialCommand = $this->getDialCommand($rout);

        // Set DIAL_COMMAND variable
        $conf .= 'same => n,Set(DIAL_COMMAND='.$dialCommand.')' . "\n\t";
        $conf .= 'same => n,ExecIf($["${DEF_DIAL_COMMAND}x" != "x"]?Set(DIAL_COMMAND=${DEF_DIAL_COMMAND}))' . "\n\t";

        // Customize all-outgoing context
        $conf .= 'same => n,GosubIf($["${DIALPLAN_EXISTS(all-outgoing-custom,${EXTEN},1)}" == "1"]?all-outgoing-custom,${EXTEN},1)' . "\n\t";

        // Describing the ability to jump to a custom sub-context.
        // Customize provider-specific outgoing context
        $conf .= 'same => n,GosubIf($["${DIALPLAN_EXISTS(' . $rout['providerid'] . '-outgoing-custom,${EXTEN},1)}" == "1"]?' . $rout['providerid'] . '-outgoing-custom,${EXTEN},1)' . "\n\t";

        // Return if NEED_RETURN is set
        $conf .= 'same => n,ExecIf($["${NEED_RETURN}" == "1"]?return)' . "\n\t";

        // Generating outgoing dialplan for additional modules; overriding the route's dialplan.
        $confModules = $this->hookModulesMethod(AsteriskConfigInterface::GENERATE_OUT_ROUT_CONTEXT, [$rout]);
        if ( !empty($confModules)) {
            $conf .= trim($confModules)."\n\t";
        }
        // Execute dial based on ISTRANSFER
        $conf .= 'same => n,Gosub(${ISTRANSFER}dial,${EXTEN},1)' . "\n\t";

        $conf .= 'same => n,ExecIf($["${OFF_ANSWER_SUB}" != "1"]?Set(DIAL_OUT_ANSWER_OPTIONS=U(${ISTRANSFER}dial_answer)))' . "\n\t";
        $conf .= 'same => n,Dial(${DIAL_COMMAND},600,${DOPTIONS}TK${DIAL_OUT_ANSWER_OPTIONS}b(dial_create_chan,s,1))' . "\n\t";
        // Generate outgoing dialplan for additional modules
        $confModules = $this->hookModulesMethod(AsteriskConfigInterface::GENERATE_OUT_ROUT_AFTER_DIAL_CONTEXT, [$rout]);
        if ( !empty($confModules)) {
            $conf .= trim($confModules)."\n\t";
        }

        // Customize provider-specific outgoing context after Dial command
        $conf .= 'same => n,GosubIf($["${DIALPLAN_EXISTS(' . $rout['providerid'] . '-outgoing-after-dial-custom,${EXTEN}),1}" == "1"]?' . $rout['providerid'] . '-outgoing-after-dial-custom,${EXTEN},1)' . "\n\t";

        // Perform transfer_dial_hangup if ISTRANSFER is set
        $conf .= 'same => n,ExecIf($["${ISTRANSFER}x" != "x"]?Gosub(transfer_dial_hangup,${EXTEN},1))' . "\n\t";

        // Hangup if DIALSTATUS is ANSWER
        $conf .= 'same => n,ExecIf($["${DIALSTATUS}" = "ANSWER"]?Hangup())' . "\n\t";

        // Handle BUSY condition
        $conf .= 'same => n,ExecIf($["${DIALSTATUS}" = "BUSY"]?Busy(2))' . "\n\t";

        // Set pt1c_UNIQUEID to empty value
        $conf .= 'same => n,Set(pt1c_UNIQUEID=${EMPTY_VALUE})' . "\n\t";

        $conf .= 'same => n,return' . "\n";
    }

    /**
     * Initializes the variables for trimming the phone number before dialing.
     *
     * This function checks if the phone number should be trimmed before dialing
     * based on the routing data. It sets the extension variable and change
     * extension configuration accordingly. The variables are returned as an array.
     *
     * @param array $rout The routing data.
     * @return string[] The extension variable and change extension configuration.
     */
    private function initTrimVariables(array $rout): array
    {
        $trimFromBegin = (int)($rout['trimfrombegin'] ?? 0);
        if ($trimFromBegin > 0) {
            $extensionVar    = '${EXTEN:' . $rout['trimfrombegin'] . '}';
            $changeExtension = 'same => n,ExecIf($["${EXTEN}" != "${number}"]?Goto(${CONTEXT},${number},$[${PRIORITY} + 1]))' . "\n\t";
        } else {
            $extensionVar    = '${EXTEN}';
            $changeExtension = '';
        }

        return [$extensionVar, $changeExtension];
    }

    /**
     * Gets the dial command for the given routing.
     *
     * This function determines the dial command based on the routing data.
     * It checks the technology and provider ID to construct the dial command.
     * The dial command is returned as a string.
     *
     * @param array $rout The routing data.
     * @return string The dial command for the routing.
     */
    private function getDialCommand(array $rout): string
    {
        if ($rout['technology'] === IAXConf::TYPE_IAX2) {
            $command = $rout['technology'] . '/' . $rout['providerid'] . '/${number}';
        } else {
            $command = $rout['technology'] . '/${number}@' . $rout['providerid'];
        }
        return $command;
    }
}