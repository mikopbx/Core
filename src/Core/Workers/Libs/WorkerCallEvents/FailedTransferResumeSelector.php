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

declare(strict_types=1);

namespace MikoPBX\Core\Workers\Libs\WorkerCallEvents;

/**
 * Picks the operator's conversation row whose recording must be resumed after a failed or
 * cancelled attended transfer.
 *
 * Recording is stopped by ActionTransferCheck when a transfer starts. When the transfer
 * target never answers (e.g. an attended transfer to a queue whose agents are all busy),
 * the caller is handed back to the operator and the recording must resume. The previous
 * "resume only when the linkedid has exactly one open row" rule never held for a transfer
 * to a queue/ring group (which always leaves several open rows), so recording stayed off
 * for the rest of the conversation.
 *
 * The caller has already verified that no unanswered consultation leg is still open, so the
 * only remaining question is whether the operator is really back with the caller. The
 * operator's live BRIDGEPEER must name this conversation's caller channel: while the operator
 * is still consulting it names another channel, and once a transfer actually completes the
 * operator has left (empty/other BRIDGEPEER). In every "not clearly back with the caller"
 * case nothing is resumed and the transfer marker is left intact, so a completed or
 * in-progress transfer can never be mistaken for a return (no false-positive resume).
 */
final class FailedTransferResumeSelector
{
    /**
     * @param iterable $answeredConversations Open, answered rows where the operator is a party.
     * @param string $transferer              Operator channel (TRANSFERERNAME).
     * @param string $bridgePeer              Operator's current BRIDGEPEER, or '' when unknown.
     *
     * @return object|null The conversation row to resume, or null when resuming is unsafe.
     */
    public static function select(iterable $answeredConversations, string $transferer, string $bridgePeer): ?object
    {
        if ($transferer === '' || $bridgePeer === '') {
            return null;
        }

        $selected = null;
        foreach ($answeredConversations as $row) {
            // The operator is one side of this conversation; the other side is the caller.
            $caller = ((string)($row->dst_chan ?? '') === $transferer)
                ? (string)($row->src_chan ?? '')
                : (string)($row->dst_chan ?? '');

            // Resume only when the operator is bridged back to this conversation's caller.
            if ($caller === '' || $caller !== $bridgePeer) {
                continue;
            }

            if ($selected !== null) {
                // More than one candidate — refuse to guess.
                return null;
            }
            $selected = $row;
        }

        return $selected;
    }
}
