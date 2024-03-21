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

namespace MikoPBX\Core\Asterisk\Configs\Generators\Extensions;


use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Core\Asterisk\Configs\AsteriskConfigInterface;
use MikoPBX\Core\Asterisk\Configs\ExtensionsConf;
use MikoPBX\Core\Asterisk\Configs\SIPConf;
use MikoPBX\Core\Asterisk\Configs\AsteriskConfigClass;

/**
 * This class extends the AsteriskConfigClass and is used to generate internal  dialplan configurations.
 *
 * @package MikoPBX\Core\Asterisk\Configs\Generators\Extensions
 */
class InternalContexts extends AsteriskConfigClass
{
    /**
     * The priority of the module hook
     * @var int
     */
    public int $priority = 630;

    /**
     * The technology to be used, fetched from SIPConf
     * @var string
     */
    private string $technology;

    /**
     * The pattern for the extension
     * @var string
     */
    private string $extensionPattern = 'X!';

    /**
     * Generate the dialplan for internal contexts. This is the entry point.
     *
     * @return string The generated dialplan
     */
    public static function generate(): string
    {
        $generator = new self();
        $generator->getSettings();

        return $generator->makeDialplan();
    }

    /**
     * Fetch settings from the SIPConf
     */
    public function getSettings(): void
    {
        $this->technology = SIPConf::getTechnology();
    }

    /**
     * Generates the dialplan configuration.
     *
     * This method assembles various pieces of the dialplan configuration into a single string. It includes
     * sections for handling undefined internal numbers, setting the answer state, setting dial contacts,
     * and more. It also conditionally adds configuration based on whether WebRTC is being used.
     *
     * @return string The assembled dialplan configuration.
     */
    public function makeDialplan(): string
    {

        // Generate additional modules context.
        $conf = $this->generateAdditionalModulesContext();

        // Handle undefined internal numbers.
        $conf .= "[internal-num-undefined] \n";
        $conf .= 'exten => _' . $this->extensionPattern . ',1,ExecIf($["${ISTRANSFER}x" != "x"]?Goto(transfer_dial_hangup,${EXTEN},1))' . "\n\t";
        $conf .= 'same => n,ExecIf($["${BLINDTRANSFER}x" != "x"]?AGI(check_redirect.php,${BLINDTRANSFER}))' . "\n\t";
        $conf .= "same => n,Playback(pbx-invalid,noanswer) \n\n";

        // Set answer state.
        $conf .= "[set-answer-state]".PHP_EOL;
        $conf .= 'exten => _.!,1,ExecIf($["${CHANNEL_EXISTS(${FROM_CHAN})}" == "0"]?return)'.PHP_EOL."\t";
        $conf .= 'same => n,Set(EXPORT(${FROM_CHAN},MASTER_CHANNEL(M_DIALSTATUS))=ANSWER)'.PHP_EOL."\t";
        $conf .= 'same => n,Set(EXPORT(${FROM_CHAN},M_DIALSTATUS)=ANSWER)'.PHP_EOL."\t";
        $conf .= 'same => n,return'.PHP_EOL;
        $conf .= 'exten => _[hit],1,Hangup()'.PHP_EOL.PHP_EOL;

        // Set dial contacts.
        $conf .= '[set-dial-contacts]'.PHP_EOL.
                 'exten => _X!,1,NoOp()'.PHP_EOL."\t";

        // If WebRTC is used, set up SIP and WS contacts. Otherwise, set DST contact.
        if($this->generalSettings[PbxSettingsConstants::USE_WEB_RTC] === '1') {
            $conf .= 'same => n,Set(SIP_CONTACT=${PJSIP_DIAL_CONTACTS(${EXTEN})})'.PHP_EOL."\t".
                     'same => n,Set(WS_CONTACTS=${PJSIP_DIAL_CONTACTS(${EXTEN}-WS)})'.PHP_EOL."\t".
                     'same => n,Set(DST_CONTACT=${SIP_CONTACT}${IF($["${SIP_CONTACT}x" != "x" && "${WS_CONTACTS}x" != "x"]?&)}${WS_CONTACTS})'.PHP_EOL."\t";
        }else{
            $conf .= 'same => n,Set(DST_CONTACT=${PJSIP_DIAL_CONTACTS(${EXTEN})})'.PHP_EOL."\t";
        }
        $conf .= 'same => n,return'.PHP_EOL.PHP_EOL;

        // Generate further dialplan sections.
        $conf .= $this->generateInternalFW();
        $conf .= $this->generateAllPeers();
        $conf .= $this->generateInternal();
        $conf .= $this->generateInternalUsers();

        // Return the assembled dialplan configuration.
        return $conf;
    }

    /**
     * Generate dialplan for additional modules.
     *
     * @return string The generated dialplan
     */
    private function generateAdditionalModulesContext(): string
    {
        $conf = $this->hookModulesMethod(AsteriskConfigInterface::EXTENSION_GEN_CONTEXTS);
        $conf .= "\n";

        return $conf;
    }

    /**
     * Generates the internal forwarding dialplan configuration. [internal-fw]
     *
     * This method assembles the internal forwarding dialplan configuration into a string. It includes
     * various scenarios like cancellation, busy, unavailable channel, no answer, and more.
     *
     * @return string The assembled internal forwarding dialplan configuration.
     */
    private function generateInternalFW(): string
    {
        // Start the internal forwarding context.
        $conf = "[internal-fw]\n";

        // Define behavior for different dial statuses.
        $conf .= 'exten => h,1,ExecIf($["${ISTRANSFER}x" != "x"]?Goto(transfer_dial_hangup,${EXTEN},1))' . "\n";
        $conf .= 'exten => _' . $this->extensionPattern . ',1,NoOp(DIALSTATUS - ${DIALSTATUS})' . "\n\t";

        // CANCEL - The call was cancelled, for example *0, no need to look for the recipient further.
        $conf .= 'same => n,ExecIf($["${DIALSTATUS}" == "CANCEL"]?Hangup())' . "\n\t";

        // BUSY - The line is busy. For example, the subscriber has ended the call or is on DND.
        $conf .= 'same => n,ExecIf($["${DIALSTATUS}" == "BUSY"]?Set(dstatus=FW_BUSY))' . "\n\t";

        // CHANUNAVAIL - The channel is unavailable. For example, the phone is not registered or is not responding.
        $conf .= 'same => n,ExecIf($["${DIALSTATUS}" == "CHANUNAVAIL"]?Set(dstatus=FW_UNAV))' . "\n\t";

        // NOANSWER - No response within the timeout period.
        $conf .= 'same => n,ExecIf($["${dstatus}x" == "x"]?Set(dstatus=FW))' . "\n\t";

        // Set forwarding status and handle forwarding if set.
        $conf .= 'same => n,Set(fw=${DB(${dstatus}/${EXTEN})})' . "\n\t";
        $conf .= 'same => n,ExecIf($["${fw}x" != "x"]?Set(__pt1c_UNIQUEID=${UNDEFINED})' . "\n\t";
        $conf .= 'same => n,ExecIf($["${fw}x" != "x"]?Wait(1))' . "\n\t";
        $conf .= 'same => n,ExecIf($["${fw}x" != "x"]?Goto(internal,${fw},1))' . "\n\t";

        // Handle blind transfer.
        $conf .= 'same => n,ExecIf($["${BLINDTRANSFER}x" != "x"]?AGI(check_redirect.php,${BLINDTRANSFER}))' . "\n\t";

        // Handle busy or hangup.
        $conf .= 'same => n,ExecIf($["${DIALSTATUS}" == "BUSY"]?Busy(2):Hangup())' . "\n\n";

        // Return the assembled internal forwarding dialplan configuration.
        return $conf;
    }

    /**
     * Generates the dialplan configuration for all peers.
     *
     * [all_peers]
     *
     * This method assembles the dialplan configuration for all peers into a string. It includes
     * various scenarios like hangup, channel redirection, call ID setting, channel type checks and more.
     *
     * @return string The assembled dialplan configuration for all peers.
     */
    private function generateAllPeers(): string
    {
        // Start the all peers context.

        $conf = "[all_peers]\n";

        // Include internal hints and handle failed extensions.
        $conf .= 'include => internal-hints' . "\n";
        $conf .= 'exten => failed,1,Hangup()' . "\n";

        // Handle originate source channel if it exists.
        $conf .= 'exten => ' . ExtensionsConf::ALL_EXTENSION . ',1,ExecIf($[ "${ORIGINATE_SRC_CHANNEL}x" != "x" ]?Wait(0.2))' . PHP_EOL . "\t";
        $conf .= 'same => n,ExecIf($[ "${ORIGINATE_SRC_CHANNEL}x" != "x" ]?ChannelRedirect(${ORIGINATE_SRC_CHANNEL},${CONTEXT},${ORIGINATE_DST_EXTEN},1))' . PHP_EOL . "\t";
        $conf .= 'same => n,ExecIf($[ "${ORIGINATE_SRC_CHANNEL}x" != "x" ]?Set(EXPORT(${ORIGINATE_SRC_CHANNEL},__ORIG_CALLID)=${CHANNEL(callid)}))' . PHP_EOL . "\t";
        $conf .= 'same => n,ExecIf($[ "${ORIGINATE_SRC_CHANNEL}x" != "x" ]?Hangup())' . PHP_EOL . "\t";

        // Filter special characters. Only allow digits.
        $conf .= 'same => n,Set(cleanNumber=${FILTER(\*\#\+1234567890,${EXTEN})})' . "\n\t";
        $conf .= 'same => n,ExecIf($["${EXTEN}" != "${cleanNumber}"]?Goto(${CONTEXT},${cleanNumber},$[${PRIORITY} + 1]))' . "\n\t";

        // Include additional modules and set up various channel and call parameters.
        $conf .= $this->generateAdditionalModulesAllPeersContext();
        $conf .= 'same => n,Set(__FROM_CHAN=${CHANNEL})' . "\n\t";
        $conf .= 'same => n,Set(__M_CALLID=${CHANNEL(callid)})' . "\n\t";
        $conf .= 'same => n,ExecIf($["${OLD_LINKEDID}x" == "x"]?Set(__OLD_LINKEDID=${CHANNEL(linkedid)}))' . "\n\t";
        $conf .= 'same => n,ExecIf($["${CHANNEL(channeltype)}" != "Local"]?Gosub(set_from_peer,s,1))' . "\n\t";
        $conf .= 'same => n,ExecIf($["${CHANNEL(channeltype)}" == "Local"]?Gosub(set_orign_chan,s,1))' . "\n\t";

        // Set caller ID if not already set.
        $conf .= 'same => n,ExecIf($["${CALLERID(num)}x" == "x"]?Set(CALLERID(num)=${FROM_PEER}))' . "\n\t";
        $conf .= 'same => n,ExecIf($["${CALLERID(num)}x" == "x"]?Set(CALLERID(name)=${FROM_PEER}))' . "\n\t";

        // Set FROM_PEER variable if channel type is Local and FROM_PEER is not set.
        $conf .= 'same => n,ExecIf($["${CHANNEL(channeltype)}" == "Local" && "${FROM_PEER}x" == "x"]?Set(__FROM_PEER=${CALLERID(num)}))' . "\n\t";
        $conf .= 'same => n,Set(CHANNEL(hangup_handler_wipe)=hangup_handler,s,1)' . "\n\t";

        // Set hangup handler and go to ISTRANSFER dial extension.
        $conf .= 'same => n,Gosub(${ISTRANSFER}dial,${EXTEN},1)' . "\n\t";

        // Go to custom context if it exists, else go to existing contexts if they exist.
        $conf          .= 'same => n,GosubIf($["${DIALPLAN_EXISTS(${CONTEXT}-custom,${EXTEN},1)}" == "1"]?${CONTEXT}-custom,${EXTEN},1)' . "\n\t";
        $dialplanNames = ['applications', 'internal', 'outgoing'];
        foreach ($dialplanNames as $name) {
            $conf .= 'same => n,GosubIf($["${DIALPLAN_EXISTS(' . $name . ',${EXTEN},1)}" == "1"]?' . $name . ',${EXTEN},1)' . " \n\t";
        }

        // Hangup and handle [hit] extensions.
        $conf .= 'same => n,Hangup()' . " \n";
        $conf .= 'exten => _[hit],1,Hangup()' . " \n";

        // Handle pickup extension if it exists.
        $pickupExtension = $this->generalSettings[PbxSettingsConstants::PBX_FEATURE_PICKUP_EXTEN];
        if(!empty($pickupExtension)){
            $conf            .= 'exten => _' . $pickupExtension . $this->extensionPattern . ',1,Set(PICKUPEER=' . $this->technology . '/${FILTER(0-9,${EXTEN:2})})' . "\n\t";
            $conf            .= 'same => n,Set(pt1c_dnid=${EXTEN})' . "\n\t";
            $conf            .= 'same => n,PickupChan(${PICKUPEER})' . "\n\t";
            $conf            .= 'same => n,Hangup()' . "\n\n";
        }

        // Return the assembled dialplan configuration for all peers.
        return $conf;
    }

    /**
     * Generates a string representation of a configuration for internal use.
     *
     * [internal]
     *
     * This function dynamically creates the configuration for internal calls, additional modules,
     * invalid number handling, hangup conditions, status setting, busy signal handling, and
     * number extension. The resulting configuration string is returned.
     *
     * @return string The generated configuration string.
     */
    private function generateInternal(): string
    {
        // Initialize internal call context
        $conf = "[internal] \n";

        // Generate additional modules internal context
        $conf .= $this->generateAdditionalModulesInternalContext();
        // Handle invalid numbers
        $conf .= 'exten => i,1,NoOp(-- INVALID NUMBER --)' . PHP_EOL."\t";
        $conf .= 'same => n,Set(DIALSTATUS=INVALID_NUMBER)' . PHP_EOL."\t";
        $conf .= 'same => n,Playback(privacy-incorrect,noanswer)' . PHP_EOL."\t";
        $conf .= 'same => n,Hangup()' . PHP_EOL;

        // Handle hangup conditions during transfer
        $conf .= 'exten => h,1,ExecIf($["${ISTRANSFER}x" != "x"]?Goto(transfer_dial_hangup,${EXTEN},1))' . PHP_EOL . PHP_EOL;

        // Handle hangup, busy signals and direct inward dialing to user
        $conf .= 'exten => hangup,1,Set(MASTER_CHANNEL(M_DIALSTATUS)=ANSWER)'.PHP_EOL."\t";
        $conf .= 'same => n,Hangup()'.PHP_EOL;
        $conf .= 'exten => busy,1,Set(MASTER_CHANNEL(M_DIALSTATUS)=BUSY)'.PHP_EOL."\t";
        $conf .= 'same => n,Busy(2)'.PHP_EOL;
        $conf .= 'exten => did2user,1,ExecIf($["${FROM_DID}x" != "x" && ${DIALPLAN_EXISTS(internal,${FROM_DID},1)} ]?Goto(internal,${FROM_DID},1))'.PHP_EOL."\t";
        $conf .= 'same => n,Hangup()'.PHP_EOL.PHP_EOL;

        // Define internal incoming call context
        $conf .= "[internal-incoming]".PHP_EOL;
        $conf .= 'exten => ' . ExtensionsConf::ALL_EXTENSION. ',1,ExecIf($["${MASTER_CHANNEL(M_TIMEOUT)}x" != "x"]?Set(TIMEOUT(absolute)=${MASTER_CHANNEL(M_TIMEOUT)}))' . PHP_EOL."\t";
        $conf .= 'same => n,Set(MASTER_CHANNEL(M_TIMEOUT_CHANNEL)=${CHANNEL})' . PHP_EOL."\t";
        $conf .= 'same => n,Set(MASTER_CHANNEL(M_TIMEOUT)=${EMPTY_VAR})' . PHP_EOL."\t";
        $conf .= 'same => n,Goto(internal,${EXTEN},1)' . PHP_EOL;
        $conf .= 'exten => _[hit],1,Hangup()' . PHP_EOL . PHP_EOL;

        // Return the generated configuration string
        return $conf;
    }

    /**
     * Overrides the internal dialplan from additional modules.
     * [internal]
     *
     * This function generates the configuration string by hooking into methods
     * defined in the AsteriskConfigInterface. These methods provide the internal
     * context for additional modules.
     *
     * @return string The generated configuration string.
     */
    private function generateAdditionalModulesInternalContext(): string
    {
        // Initialize configuration string by hooking into modules methods
        $conf = $this->hookModulesMethod(AsteriskConfigInterface::GET_INCLUDE_INTERNAL);
        $conf .= $this->hookModulesMethod(AsteriskConfigInterface::EXTENSION_GEN_INTERNAL);

        // Return the generated configuration string
        return $conf;
    }

    /**
     * Generates the internal users context from additional modules.
     *
     * This function generates the configuration string for internal users
     * by hooking into a method defined in the AsteriskConfigInterface.
     *
     * @return string The generated configuration string.
     */
    private function generateAdditionalModulesInternalUsersContext():string
    {
        return $this->hookModulesMethod(AsteriskConfigInterface::EXTENSION_GEN_INTERNAL_USERS_PRE_DIAL);
    }


    /**
     * Generates the all peers context from additional modules.
     *
     * This function generates the configuration string for all peers
     * by hooking into a method defined in the AsteriskConfigInterface.
     *
     * @return string The generated configuration string.
     */
    private function generateAdditionalModulesAllPeersContext():string
    {
        return $this->hookModulesMethod(AsteriskConfigInterface::EXTENSION_GEN_ALL_PEERS_CONTEXT);
    }


    /**
     * Generates a string representation of a configuration for internal users.
     * [internal-users]
     *
     *
     * This function dynamically creates the configuration for internal users, including
     * setting up the channel hangup handler, checking transfer conditions, handling busy status,
     * determining call length, custom dialplan execution, initiating the call, performing
     * redirection, and hangup handling. The resulting configuration string is returned.
     *
     * @return string The generated configuration string.
     */
    private function generateInternalUsers(): string
    {
        // Initialize internal users context
        $conf = "[internal-users] \n";

        // Set channel hangup handler and execute other operations
        $conf .= 'exten => _' . $this->extensionPattern . ',1,Set(CHANNEL(hangup_handler_wipe)=hangup_handler,s,1)' . " \n\t";
        $conf .= 'same => n,ExecIf($["${ISTRANSFER}x" != "x"]?Set(SIPADDHEADER01=${EMPTY_VAR})' . " \n\t";
        $conf .= 'same => n,ExecIf($["${CHANNEL(channeltype)}" == "Local"]?Gosub(set_orign_chan,s,1))' . " \n\t";

        // Execute dial and check for valid peer
        $conf .= 'same => n,Gosub(${ISTRANSFER}dial,${EXTEN},1)' . "\n\t";
        $conf .= 'same => n,ExecIf($["${PJSIP_ENDPOINT(${EXTEN},auth)}x" == "x"]?Goto(internal-num-undefined,${EXTEN},1))' . " \n\t";

        // Generate additional modules internal users context
        $conf .= $this->generateAdditionalModulesInternalUsersContext();
        $conf .= 'same => n,ExecIf($["${DEVICE_STATE(' . $this->technology . '/${EXTEN})}" == "BUSY" || "${DEVICE_STATE(' . $this->technology . '/${EXTEN}-WS)}" == "BUSY"]?Set(IS_BUSY=1))' . " \n\t";
        $conf .= 'same => n,ExecIf($["${IS_BUSY}" == "1"]?Set(DIALSTATUS=BUSY))' . " \n\t";
        $conf .= 'same => n,GotoIf($["${IS_BUSY}" == "1" && "${QUEUE_SRC_CHAN}x" == "x"]?fw_start)' . " \n\t";

        // Determine call length and handle custom dialplan execution
        $conf .= 'same => n,Set(ringlength=${DB(FW_TIME/${EXTEN})})' . " \n\t";
        $conf .= 'same => n,ExecIf($["${ringlength}x" == "x"]?Set(ringlength=600))' . " \n\t";
        $conf .= 'same => n,ExecIf($["${QUEUE_SRC_CHAN}x" != "x" && "${ISTRANSFER}x" == "x"]?Set(ringlength=600))' . " \n\t";

        $conf .= 'same => n,GosubIf($["${DIALPLAN_EXISTS(${CONTEXT}-custom,${EXTEN},1)}" == "1"]?${CONTEXT}-custom,${EXTEN},1) ' . " \n\t";

        // Perform dial and handle SIP headers, transfers, and dial status
        $conf .= 'same => n,Gosub(set-dial-contacts,${EXTEN},1)' . " \n\t";
        $conf .= 'same => n,ExecIf($["${FIELDQTY(DST_CONTACT,&)}" != "1"]?Set(__PT1C_SIP_HEADER=${EMPTY_VAR}))' . " \n\t";
        $conf .= 'same => n,ExecIf($["${TRANSFER_OPTIONS}x" == "x" || "${ISTRANSFER}x" != "x"]?Set(TRANSFER_OPTIONS=Tt))' . " \n\t";
        $conf .= 'same => n,ExecIf($["${DST_CONTACT}x" != "x"]?Dial(${DST_CONTACT},${ringlength},${TRANSFER_OPTIONS}ekKHhU(${ISTRANSFER}dial_answer)b(dial_create_chan,s,1)):Set(DIALSTATUS=CHANUNAVAIL))' . " \n\t";
        $conf .= 'same => n,ExecIf($["${DST_CONTACT}x" == "x"]?Gosub(dial_end,${EXTEN},1))' . " \n\t";
        $conf .= 'same => n(fw_start),NoOp()' . " \n\t";
        // Redirection can be disabled for internal with the FW_DISABLE_ATRANSFER / FW_DISABLE_INTERNAL option
        $conf .= 'same => n,ExecIf($["${ATTENDEDTRANSFER}x" != "x" && "${FW_DISABLE_ATRANSFER}" == "1"]?Set(FW_DISABLE=1))' . " \n\t";
        $conf .= 'same => n,ExecIf($["${ISTRANSFER}x" != "x" && "${FW_DISABLE_TRANSFER}" == "1"]?Set(FW_DISABLE=1))' . " \n\t";
        $conf .= 'same => n,ExecIf($["${FW_DISABLE}" == "1" && "${FW_DISABLE_INTERNAL}" == "1"]?Goto(${EXTEN},fw_end))' . " \n\t";
        $conf .= 'same => n,ExecIf($["${FROM_DID}${TO_CHAN}x" == "x" && "${FW_DISABLE_INTERNAL}" == "1"]?Goto(${EXTEN},fw_end))' . " \n\t";
        // QUEUE_SRC_CHAN - set if the call is a server action to an agent in the queue.
        // Checking if call forwarding is needed.
        $conf .= 'same => n,ExecIf($["${DIALSTATUS}" != "ANSWER" && "${ISTRANSFER}x" != "x"]?Goto(internal-fw,${EXTEN},1))' . " \n\t";
        $conf .= 'same => n,ExecIf($["${DIALSTATUS}" != "ANSWER" && "${QUEUE_SRC_CHAN}x" == "x"]?Goto(internal-fw,${EXTEN},1))' . " \n\t";
        $conf .= 'same => n(fw_end),ExecIf($["${BLINDTRANSFER}x" != "x"]?AGI(check_redirect.php,${BLINDTRANSFER}))' . " \n\t";
        $conf .= 'same => n,Hangup()' . "\n\n";

        // Handle hangup conditions during transfer
        $conf .= 'exten => h,1,ExecIf($["${ISTRANSFER}x" != "x"]?Goto(transfer_dial_hangup,${EXTEN},1))' . "\n\n";

        // Return the generated configuration string
        return $conf;
    }

}