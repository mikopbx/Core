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

use MikoPBX\Common\Models\CallQueues;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\Core\System\{Processes, Util};

/**
 * Class QueueConf
 *
 * Represents the queues.conf configuration class.
 *
 * @package MikoPBX\Core\Asterisk\Configs
 */
class QueueConf extends AsteriskConfigClass
{
    // The module hook applying priority
    public int $priority = 570;

    protected string $description = 'queues.conf';

    /**
     * Generates queue.conf and restarts the Asterisk queue module.
     */
    public static function queueReload(): void
    {
        $queue = new self();
        $queue->generateConfig();
        $out          = [];
        $asteriskPath = Util::which('asterisk');
        Processes::mwExec("{$asteriskPath} -rx 'queue reload all '", $out);
    }

    /**
     * Generates additional contexts for the queue.
     *
     * @return string The generated extension contexts.
     */
    public function extensionGenContexts(): string
    {
        // Generate internal numbering plan.
        $conf = PHP_EOL."[queue_agent_answer]".PHP_EOL;
        $conf .= 'exten => s,1,Gosub(queue_answer,${EXTEN},1)' . PHP_EOL."\t";
        $conf .= "same => n,Return()".PHP_EOL.PHP_EOL;

        return $conf;
    }

    /**
     * Generates hints for the queue.
     *
     * @return string The generated hints.
     */
    public function extensionGenHints(): string
    {
        $conf    = '';
        $db_data = $this->getQueueData();
        foreach ($db_data as $queue) {
            $conf .= "exten => {$queue['extension']},hint,Custom:{$queue['extension']}".PHP_EOL;
        }

        return $conf;
    }

    /**
     * Generates internal transfer configuration for the queue.
     *
     * @return string The generated internal transfer configuration.
     */
    public function extensionGenInternalTransfer(): string
    {
        $conf    = '';
        $db_data = $this->getQueueData();
        foreach ($db_data as $queue) {
            $conf .= 'exten => _' . $queue['extension'] . ',1,Set(__ISTRANSFER=transfer_)' . PHP_EOL. " \t";
            $conf .= 'same => n,Goto(internal,${EXTEN},1)' . " ".PHP_EOL;
        }
        $conf .= PHP_EOL;

        return $conf;
    }

    /**
     * Generates the extension plan for the internal context.
     *
     * @return string The generated extension plan.
     */
    public function extensionGenInternal(): string
    {
        $queue_ext_conf = '';
        $db_data        = $this->getQueueData();
        foreach ($db_data as $queue) {
            $queue_ext_conf .= "exten => {$queue['extension']},1,NoOp(--- Start Queue ---) \n\t";
            $reservedExtension = trim($queue['redirect_to_extension_if_empty']);
            if(!empty($reservedExtension)){
                // Check if the queue is empty.
                $queue_ext_conf .= 'same => n,Set(mLogged=${QUEUE_MEMBER('.$queue['uniqid'].',logged)})'.PHP_EOL."\t";
                $queue_ext_conf .= 'same => n,ExecIf($["${mLogged}" == "0"]?Set(pt1c_UNIQUEID=${UNDEFINED}))'.PHP_EOL."\t";
                $queue_ext_conf .= 'same => n,GotoIf($["${mLogged}" == "0"]?internal,'.$reservedExtension.',1)'.PHP_EOL."\t";
            }
            // Redirect the call to the queue.
            $queue_ext_conf .= 'same => n,Set(__QUEUE_SRC_CHAN=${CHANNEL})' . "\n\t";
            $queue_ext_conf .= 'same => n,ExecIf($["${CHANNEL(channeltype)}" == "Local"]?Gosub(set_orign_chan,s,1))' . "\n\t";
            $queue_ext_conf .= 'same => n,Set(CHANNEL(hangup_handler_wipe)=hangup_handler,s,1)' . "\n\t";
            $options = '${MQ_OPTIONS}';
            $callerHear = $queue['caller_hear'] ?? '';
            if ($callerHear === 'ringing') {
                $queue_ext_conf .= 'same => n,Set(MQ_OPTIONS=${MQ_OPTIONS}r)'."\n\t";
            }else{
                // We answer if you need MOH
                $queue_ext_conf .= "same => n,Answer() \n\t";
            }
            $queue_ext_conf .= 'same => n,GosubIf($["${DIALPLAN_EXISTS(queue-pre-dial-custom,${EXTEN},1)}" == "1"]?queue-pre-dial-custom,${EXTEN},1)'."\n\t";
            $queue_ext_conf .= 'same => n,Gosub(queue_start,${EXTEN},1)' . "\n\t";
            $cid = preg_replace('/[^a-zA-Zа-яА-Я0-9 ]/ui', '', $queue['callerid_prefix'] ?? '');
            if (!empty($cid)) {
                $queue_ext_conf .= "same => n,Set(CALLERID(name)=$cid:" . '${CALLERID(name)}' . ") \n\t";
            }
            $ringLength = trim($queue['timeout_to_redirect_to_extension']);
            $queue_ext_conf .= "same => n,Queue({$queue['uniqid']},kT$options,,,$ringLength,,,queue_agent_answer) \n\t";
            // Notify about the end of the queue.
            $queue_ext_conf .= 'same => n,Gosub(queue_end,${EXTEN},1)' . "\n\t";
            $timeoutExtension = trim($queue['timeout_extension']);
            if ($timeoutExtension !== '') {
                // If no answer within the timeout, perform redirection.
                $queue_ext_conf .= 'same => n,ExecIf($["${QUEUESTATUS}" == "TIMEOUT"]?Goto(internal,'.$timeoutExtension.',1))' . " \n\t";
            }
            if (!empty($reservedExtension)) {
                // If the queue is empty, perform redirection.
                $exp            = '$["${QUEUESTATUS}" == "JOINEMPTY" || "${QUEUESTATUS}" == "LEAVEEMPTY" ]';
                $queue_ext_conf .= 'same => n,ExecIf('.$exp.'?Goto(internal,'.$reservedExtension.',1))' . " \n\t";
            }
            $queue_ext_conf .= "\n";
        }

        return $queue_ext_conf;
    }

    /**
     * Generates the configuration for queues.
     */
    protected function generateConfigProtected(): void
    {
        $q_conf  = '';

        $db_data = $this->getQueueData();

        // Iterate through the queue data
        foreach ($db_data as $queue_data) {
            $ringinuse        = ($queue_data['recive_calls_while_on_a_call'] === '1') ? 'yes' : 'no';
            $announceposition = ($queue_data['announce_position'] === '1') ? 'yes' : 'no';
            $announceholdtime = ($queue_data['announce_hold_time'] === '1') ? 'yes' : 'no';

            $timeout           = empty($queue_data['seconds_to_ring_each_member']) ? '60' : $queue_data['seconds_to_ring_each_member'];
            $wrapuptime        = empty($queue_data['seconds_for_wrapup']) ? '3' : $queue_data['seconds_for_wrapup'];

            // Check if periodic announce is set
            $periodic_announce = '';
            if (trim($queue_data['periodic_announce']) !== '') {
                $announce_file     = Util::trimExtensionForFile($queue_data['periodic_announce']);
                $periodic_announce = "periodic-announce={$announce_file} \n";
            }

            // Check if periodic announce frequency is set
            $periodic_announce_frequency = '';
            if (trim($queue_data['periodic_announce_frequency']) !== '') {
                $periodic_announce_frequency = "periodic-announce-frequency={$queue_data['periodic_announce_frequency']} \n";
            }

            // Check if announce frequency should be set
            $announce_frequency = '';
            if ($announceposition !== 'no' || $announceholdtime !== 'no') {
                $announce_frequency .= "announce-frequency=30 \n";
            }

            $mohClass = empty($queue_data['moh_sound'])?'default':$queue_data['moh_sound'];

            $strategy = $queue_data['strategy'];

            // Build the queue configuration string
            $q_conf .= "[{$queue_data['uniqid']}]; {$queue_data['name']}\n";
            $q_conf .= "musicclass=$mohClass \n";
            $q_conf .= "strategy={$strategy} \n";
            $q_conf .= "timeout={$timeout} \n";
            $q_conf .= "retry=1 \n";
            $q_conf .= "wrapuptime={$wrapuptime} \n";
            $q_conf .= "ringinuse={$ringinuse} \n";
            $q_conf .= $periodic_announce;
            $q_conf .= $periodic_announce_frequency;
            $q_conf .= "joinempty=no \n";
            $q_conf .= "leavewhenempty=no \n";
            $q_conf .= "announce-position={$announceposition} \n";
            $q_conf .= "announce-holdtime={$announceholdtime} \n";
            $q_conf .= "relative-periodic-announce=yes \n";
            $q_conf .= $announce_frequency;

            $penalty = 0;

            // Iterate through the agents in the queue
            foreach ($queue_data['agents'] as $agent) {
                $hint = '';

                // Check if the agent is internal or external
                if ($agent['isExternal'] === false) {
                    $hint = ",hint:{$agent['agent']}@internal-hints";
                }

                // Add the member to the queue configuration
                $q_conf .= "member => Local/{$agent['agent']}@internal/n,{$penalty},\"{$agent['agent']}\"{$hint} \n";
            }
            $q_conf .= "\n";
        }

        // Write the configuration content to the file
        Util::fileWriteContent($this->config->path('asterisk.astetcdir') . '/queues.conf', $q_conf);
    }

    /**
     * Retrieves queue settings.
     *
     * @return array The array containing queue data.
     */
    public function getQueueData(): array
    {
        $arrResult = [];
        $queues    = CallQueues::find();
        foreach ($queues as $queue) {
            $queueUniqId = $queue->uniqid; // Queue identifier

            $arrAgents = [];
            $agents    = $queue->CallQueueMembers;
            foreach ($agents as $agent) {
                $arrAgents[] =
                    [
                        'agent'      => $agent->extension,
                        'priority'   => $agent->priority,
                        'isExternal' => ($agent->Extensions->type === Extensions::TYPE_EXTERNAL),
                    ];
            }
            $arrResult[$queueUniqId]['agents'] = $arrAgents;
            $arrResult[$queueUniqId]['periodic_announce'] = ($queue->SoundFiles)?$queue->SoundFiles->path:'';
            $arrResult[$queueUniqId]['moh_sound']         = ($queue->MohSoundFiles)?"moh-{$queue->MohSoundFiles->id}":'';

            foreach ($queue as $key => $value) {
                if ($key === 'callqueuemembers' || $key === "soundfiles") {
                    continue;
                } // We collected these parameters separately
                $arrResult[$queueUniqId][$key] = $value;
            }
        }

        return $arrResult; // JSON_PRETTY_PRINT
    }
}