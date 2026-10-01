<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Calls\Scripts\Interception;

use RuntimeException;

final class ActiveProviderInterception
{
    /**
     * @param array<string, array<int, string>> $groupedChannels
     * @return array{channel: string, linkedid: string}
     */
    public static function selectChannel(
        array $groupedChannels,
        string $providerId,
        ?string $requestedChannel = null
    ): array {
        if (!preg_match('/^[A-Za-z0-9_-]+$/', $providerId)) {
            throw new RuntimeException('Invalid provider ID');
        }

        $providerChannelPattern = sprintf(
            '/^PJSIP\/%s-[0-9A-Fa-f]+$/',
            preg_quote($providerId, '/')
        );
        $matches = [];

        foreach ($groupedChannels as $linkedId => $channels) {
            foreach ($channels as $channel) {
                if (preg_match($providerChannelPattern, $channel) !== 1) {
                    continue;
                }

                $matches[$channel] = [
                    'channel' => $channel,
                    'linkedid' => (string)$linkedId,
                ];
            }
        }

        if ($requestedChannel !== null) {
            if (!isset($matches[$requestedChannel])) {
                throw new RuntimeException(
                    "Requested channel '$requestedChannel' is not an active channel of provider '$providerId'"
                );
            }

            return $matches[$requestedChannel];
        }

        if ($matches === []) {
            throw new RuntimeException("No active channel found for provider '$providerId'");
        }

        if (count($matches) > 1) {
            throw new RuntimeException(
                "Several active channels found. Select one with --channel:\n  "
                . implode("\n  ", array_keys($matches))
            );
        }

        return array_values($matches)[0];
    }

    /**
     * @param array{channel: string, linkedid: string} $selectedChannel
     * @return array{
     *     channel: string,
     *     exten: string,
     *     context: string,
     *     priority: int,
     *     callerId: string,
     *     variables: string
     * }
     */
    public static function buildOriginateRequest(
        array $selectedChannel,
        string $internalExtension,
        string $callerNumber
    ): array {
        if (!preg_match('/^[0-9A-Za-z*#+_-]+$/', $internalExtension)) {
            throw new RuntimeException('Invalid internal extension');
        }
        if (!preg_match('/^[0-9A-Za-z*#+_-]+$/', $callerNumber)) {
            throw new RuntimeException('Invalid caller number');
        }
        if (!preg_match('/^PJSIP\/[A-Za-z0-9_.:@;+\/-]+$/', $selectedChannel['channel'])) {
            throw new RuntimeException('Invalid provider channel');
        }
        if (!preg_match('/^[A-Za-z0-9_.:-]+$/', $selectedChannel['linkedid'])) {
            throw new RuntimeException('Invalid linkedid');
        }

        return [
            'channel' => "Local/$internalExtension@internal-originate",
            'exten' => $callerNumber,
            'context' => 'interception-bridge',
            'priority' => 1,
            'callerId' => $internalExtension,
            'variables' => "pt1c_cid=$callerNumber,ALLOW_MULTY_ANSWER=1,"
                . "_INTECEPTION_CNANNEL={$selectedChannel['channel']},"
                . "_OLD_LINKEDID={$selectedChannel['linkedid']}",
        ];
    }
}
