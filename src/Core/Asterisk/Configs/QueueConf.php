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
use MikoPBX\Core\System\Configs\PbxConf;

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
     *
     * @deprecated Use reload() instead for consistency with other config classes
     * @see reload()
     */
    public static function queueReload(): void
    {
        self::reload();
    }

    /**
     * Reloads the Asterisk queue module using a two-step process.
     *
     * Asterisk has two limitations that prevent simple 'queue reload all':
     *
     * 1. Strategy container type: LINEAR uses ao2_container_alloc_list (preserves insertion order),
     *    other strategies use ao2_container_alloc_hash. Switching TO linear is explicitly rejected
     *    during reload (app_queue.c ~line 3720: "requires asterisk to be restarted").
     *
     * 2. Member ordering: existing static members preserve their queuepos during reload
     *    (app_queue.c ~line 10087: newm->queuepos = cur->queuepos), ignoring config file order.
     *
     * Fix: write empty config → reload (destroys queues) → write full config → reload (recreates fresh).
     *
     * @see https://community.asterisk.org/t/queue-order-on-queue-reload-all/93833
     */
    public static function reload(): void
    {
        $queue = new self();
        $asterisk = Util::which(PbxConf::PROC_NAME);

        // Step 1: Write empty config and reload to fully destroy existing queues.
        // This forces Asterisk to release the old ao2_container (hash or list)
        // so the queue can be recreated with the correct container type for its strategy.
        $queue->saveConfig('', $queue->description);
        Processes::mwExec("{$asterisk} -rx 'queue reload all'");

        // Step 2: Write full config and reload to create queues fresh
        // with correct container type and member ordering.
        $queue->generateConfig();
        Processes::mwExec("{$asterisk} -rx 'queue reload all'");
    }

    /**
     * Generates additional contexts for the queue.
     *
     * @return string The generated extension contexts.
     */
    public function extensionGenContexts(): string
    {
        // Generate internal numbering plan.
        $conf = PHP_EOL . "[queue_agent_answer]" . PHP_EOL;
        $conf .= 'exten => s,1,Gosub(queue_answer,${EXTEN},1)' . PHP_EOL . "\t";
        $conf .= "same => n,Return()" . PHP_EOL . PHP_EOL;

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
            $conf .= "exten => {$queue['extension']},hint,Custom:{$queue['extension']}" . PHP_EOL;
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
            $conf .= 'exten => _' . $queue['extension'] . ',1,Set(__ISTRANSFER=transfer_)' . PHP_EOL . " \t";
            $conf .= 'same => n,Goto(internal,${EXTEN},1)' . " " . PHP_EOL;
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
            $reservedExtension = trim($queue['redirect_to_extension_if_empty'] ?? '');
            if (!empty($reservedExtension)) {
                // Check if the queue is empty.
                $queue_ext_conf .= 'same => n,Set(mLogged=${QUEUE_MEMBER(' . $queue['uniqid'] . ',logged)})' . PHP_EOL . "\t";
                $queue_ext_conf .= 'same => n,ExecIf($["${mLogged}" == "0"]?Set(pt1c_UNIQUEID=${UNDEFINED}))' . PHP_EOL . "\t";
                $queue_ext_conf .= 'same => n,GotoIf($["${mLogged}" == "0"]?internal,' . $reservedExtension . ',1)' . PHP_EOL . "\t";
            }
            // Redirect the call to the queue.
            $queue_ext_conf .= 'same => n,Set(__QUEUE_SRC_CHAN=${CHANNEL})' . "\n\t";
            $queue_ext_conf .= 'same => n,ExecIf($["${CHANNEL(channeltype)}" == "Local"]?Gosub(set_orign_chan,s,1))' . "\n\t";
            $queue_ext_conf .= 'same => n,Set(CHANNEL(hangup_handler_wipe)=hangup_handler,s,1)' . "\n\t";
            $options = '${MQ_OPTIONS}';
            $callerHear = $queue['caller_hear'] ?? '';
            if ($callerHear === 'ringing') {
                $queue_ext_conf .= 'same => n,Set(MQ_OPTIONS=${MQ_OPTIONS}r)' . "\n\t";
            } else {
                // We answer if you need MOH
                $queue_ext_conf .= "same => n,Answer() \n\t";
            }
            $queue_ext_conf .= 'same => n,GosubIf($["${DIALPLAN_EXISTS(queue-pre-dial-custom,${EXTEN},1)}" == "1"]?queue-pre-dial-custom,${EXTEN},1)' . "\n\t";
            $queue_ext_conf .= 'same => n,Gosub(queue_start,${EXTEN},1)' . "\n\t";
            $cid = preg_replace('/[^a-zA-Zа-яА-Я0-9 ]/ui', '', $queue['callerid_prefix'] ?? '');
            if (!empty($cid)) {
                $queue_ext_conf .= "same => n,Set(CALLERID(name)=$cid:" . '${CALLERID(name)}' . ") \n\t";
            }

            $ringLength = trim($queue['timeout_to_redirect_to_extension'] ?? '');
            $timeoutExtension = trim($queue['timeout_extension'] ?? '');

            // Timeout=0 causes immediate queue exit without ringing any agent.
            // Timeout without a redirect extension causes caller disconnection after wait.
            // In both cases, omit the timeout parameter so the caller waits indefinitely.
            if ($ringLength === '0' || $timeoutExtension === '') {
                $ringLength = '';
            }

            // Queue() argument layout in Asterisk 21+ (after the `macro` slot was removed):
            //   Queue(queuename, options, URL, announceoverride, timeout, AGI, gosub, rule, position)
            // The historical MikoPBX format `,,,queue_agent_answer)` (one extra comma)
            // pushed `queue_agent_answer` into the `rule` slot, which silently broke
            // both the gosub-on-answer hook AND any defaultrule lookup (Asterisk
            // searched queuerules.conf for `[queue_agent_answer]` and gave up).
            // Correct layout: 6 commas to reach the gosub slot.
            // No rule arg for linear_progressive — see comment above queues.conf
            // section. Ramp-up is done via dialplan Wait(), not penaltychange.
            $ruleArg = '';

            // linear_progressive ramp-up via dialplan staggering:
            //
            // Asterisk's `app_queue` evaluates `penaltychange` rules only while
            // the caller is in `wait_our_turn()`. Once `try_calling()` begins
            // ringing a member, `qe->max_penalty` is frozen and rules can no
            // longer add new members to the in-flight call. So we can't use
            // penaltychange for accumulating ringing pool.
            //
            // Workaround: pre-set per-member delay variables Q_TIMEOUT_<EXT>
            // before Queue(). Asterisk's `ringall` strategy then immediately
            // dials all members via Local channels in parallel — but each
            // Local channel hits `[internal-users]` first, where the dialplan
            // sleeps for Q_TIMEOUT_<EXT> seconds before dialing the actual
            // SIP endpoint. Result: all members "ring" simultaneously from
            // app_queue's POV, but the actual phones light up staggered.
            //
            // Inheritance: `__` (double-underscore) prefix makes the variable
            // propagate into the Local/<EXT>@internal channel that app_queue
            // creates per member.
            if ($queue['strategy'] === 'linear_progressive' && !empty($queue['agents'])) {
                $stepSeconds = (int)($queue['seconds_to_ring_each_member'] ?? 0);
                if ($stepSeconds < 1) {
                    $stepSeconds = 15;
                }
                $msetPairs = [];
                foreach ($queue['agents'] as $agent) {
                    $delay = (int)($agent['priority'] ?? 0) * $stepSeconds;
                    $msetPairs[] = "__Q_TIMEOUT_{$agent['agent']}={$delay}";
                }
                if (!empty($msetPairs)) {
                    $queue_ext_conf .= 'same => n,MSet(' . implode(',', $msetPairs) . ") \n\t";
                }
            }
            $queue_ext_conf .= "same => n,Queue({$queue['uniqid']},kT$options,,,$ringLength,,queue_agent_answer$ruleArg) \n\t";
            $queue_ext_conf .= 'same => n,Set(__QUEUE_SRC_CHAN=${EMPTY})' . "\n\t";
            // Notify about the end of the queue.
            $queue_ext_conf .= 'same => n,Gosub(queue_end,${EXTEN},1)' . "\n\t";
            if ($timeoutExtension !== '') {
                // If no answer within the timeout, perform redirection.
                $queue_ext_conf .= 'same => n,ExecIf($["${QUEUESTATUS}" == "TIMEOUT"]?Goto(internal,' . $timeoutExtension . ',1))' . " \n\t";
            }
            if (!empty($reservedExtension)) {
                // If the queue is empty, perform redirection.
                $exp            = '$["${QUEUESTATUS}" == "JOINEMPTY" || "${QUEUESTATUS}" == "LEAVEEMPTY" ]';
                $queue_ext_conf .= 'same => n,ExecIf(' . $exp . '?Goto(internal,' . $reservedExtension . ',1))' . " \n\t";
            }
            $queue_ext_conf .= "\n";
        }

        return $queue_ext_conf;
    }

    /**
     * Generates the configuration for queues and writes it to queues.conf.
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
            // For linear_progressive the per-attempt timeout must cover the full
            // ramp-up window, otherwise Asterisk's ringall would hang up every
            // member at `timeout` seconds (= seconds_to_ring_each_member) and
            // restart the round, making accumulation impossible.
            //
            // Note on semantics: `timeout_to_redirect_to_extension` is the
            // MikoPBX-level "queue overall timeout before redirect" budget,
            // while Asterisk's `timeout` is per-attempt. We reuse the former
            // as the latter because for linear_progressive a single attempt
            // is enough to ring every member (penaltychange grows the pool
            // inside one attempt), and there is no logical reason for the
            // attempt to be shorter than the user-visible queue timeout.
            //
            // Fallback: if the overall timeout is unset, use the actual
            // ramp-up duration = seconds_to_ring × member_count, with a
            // 60-second floor for empty/single-member queues.
            if ($queue_data['strategy'] === 'linear_progressive') {
                $overallTimeout = (int)($queue_data['timeout_to_redirect_to_extension'] ?? 0);
                if ($overallTimeout < 1) {
                    $memberCount = max(1, count($queue_data['agents'] ?? []));
                    $overallTimeout = max(60, (int)$timeout * $memberCount);
                }
                $timeout = (string)$overallTimeout;
            }
            $wrapuptime        = empty($queue_data['seconds_for_wrapup']) ? '3' : $queue_data['seconds_for_wrapup'];

            // Check if periodic announce is set
            $periodic_announce = '';
            if (trim($queue_data['periodic_announce'] ?? '') !== '') {
                $announce_file     = Util::trimExtensionForFile($queue_data['periodic_announce']);
                $periodic_announce = "periodic-announce=$announce_file \n";
            }

            // Check if periodic announce frequency is set
            $periodic_announce_frequency = '';
            if (trim($queue_data['periodic_announce_frequency'] ?? '') !== '') {
                $periodic_announce_frequency = "periodic-announce-frequency={$queue_data['periodic_announce_frequency']} \n";
            }

            // Check if announce frequency should be set
            $announce_frequency = '';
            if ($announceposition !== 'no' || $announceholdtime !== 'no') {
                $announce_frequency .= "announce-frequency=30 \n";
            }

            $mohClass = empty($queue_data['moh_sound']) ? 'default' : $queue_data['moh_sound'];

            // linear_progressive maps to Asterisk's plain `ringall` — but with
            // a dialplan-level staggered ramp-up (see queue extension and
            // [internal-users] Wait(${Q_TIMEOUT_<EXTEN>})). All members get
            // penalty=0 so Asterisk's app_queue doesn't filter any of them out;
            // every Local channel starts in parallel, and `Wait()` inside each
            // member's leg defers the actual SIP dial to the right moment.
            $isProgressive = ($queue_data['strategy'] === 'linear_progressive');
            $strategy = $isProgressive ? 'ringall' : $queue_data['strategy'];

            // Build the queue configuration string
            // Queue names are comments in queues.conf. Keep legacy database values
            // on one line so a stored CR/LF cannot open another Asterisk section.
            $queueName = trim((string)preg_replace('/[\\x00-\\x1F\\x7F]+/', ' ', (string)$queue_data['name']));
            $q_conf .= "[{$queue_data['uniqid']}]; $queueName\n";
            $q_conf .= "musicclass=$mohClass \n";
            $q_conf .= "strategy=$strategy \n";
            // No defaultrule for linear_progressive — penaltychange is unusable
            // (see CR#19): app_queue freezes qe->max_penalty when try_calling()
            // starts, so dynamic raising of MAX_PENALTY can't add members to
            // an in-flight call. We use dialplan staggering instead.
            $q_conf .= "timeout=$timeout \n";
            $q_conf .= "retry=1 \n";
            $q_conf .= "wrapuptime=$wrapuptime \n";
            $q_conf .= "ringinuse=$ringinuse \n";
            $q_conf .= $periodic_announce;
            $q_conf .= $periodic_announce_frequency;
            // When a redirect extension for empty queue is configured, use Asterisk's
            // built-in empty detection so Queue() returns JOINEMPTY/LEAVEEMPTY statuses.
            // "unavailable,invalid" means "empty" only when ALL agents' phones are offline
            // or invalid — callers still wait when agents are busy/paused/ringing.
            $hasEmptyRedirect = !empty(trim($queue_data['redirect_to_extension_if_empty'] ?? ''));
            $emptyPolicy = $hasEmptyRedirect ? 'unavailable,invalid' : 'no';
            $q_conf .= "joinempty=$emptyPolicy \n";
            $q_conf .= "leavewhenempty=$emptyPolicy \n";
            $q_conf .= "announce-position=$announceposition \n";
            $q_conf .= "announce-holdtime=$announceholdtime \n";
            $q_conf .= "relative-periodic-announce=yes \n";
            $q_conf .= $announce_frequency;

            // Iterate through the agents in the queue
            foreach ($queue_data['agents'] as $agent) {
                $hint = '';

                // Check if the agent is internal or external
                if ($agent['isExternal'] === false) {
                    $hint = ",hint:{$agent['agent']}@internal-hints";
                }

                // All members get penalty=0 — including linear_progressive. We
                // can't use penalty to gate accumulation (see CR#19) because
                // app_queue would skip non-zero-penalty members entirely from
                // the ringall fan-out. Staggering happens in [internal-users]
                // via Wait(${Q_TIMEOUT_<EXTEN>}).
                $penalty = 0;

                // Add the member to the queue configuration
                $q_conf .= "member => Local/{$agent['agent']}@internal/n,$penalty,\"{$agent['agent']}\"$hint \n";
            }
            $q_conf .= "\n";
        }

        // Write the configuration content to the file
        $this->saveConfig($q_conf, $this->description);
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
            // Explicit ORDER BY priority (defense-in-depth): linear and
            // linear_progressive both depend on member order matching the
            // priority field. The CallQueues hasMany relation already sets
            // this order, but pinning it here too prevents silent regressions
            // if the relation is ever overridden by a module hook.
            $agents = $queue->getRelated('CallQueueMembers', ['order' => 'priority ASC']);
            foreach ($agents as $agent) {
                $arrAgents[] =
                    [
                        'agent'      => $agent->extension,
                        'priority'   => $agent->priority,
                        'isExternal' => ($agent->Extensions?->type === Extensions::TYPE_EXTERNAL),
                    ];
            }
            $arrResult[$queueUniqId]['agents'] = $arrAgents;
            $arrResult[$queueUniqId]['periodic_announce'] = ($queue->SoundFiles) ? $queue->SoundFiles->path : '';
            $arrResult[$queueUniqId]['moh_sound']         = ($queue->MohSoundFiles) ? "moh-{$queue->MohSoundFiles->id}" : '';

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
