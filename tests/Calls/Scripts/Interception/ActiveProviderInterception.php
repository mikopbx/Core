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
        $matches = self::collectChannels($groupedChannels, $providerId);

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
     * All active channels of the provider, keyed by channel name. Unlike selectChannel() this
     * does not fail when the provider carries several calls: a caller may need to make its own
     * deterministic choice between them.
     *
     * @param array<string, array<int, string>> $groupedChannels
     * @param string $providerId Provider uniqid, or '*' for any provider channel (the outgoing
     *                           route decides which provider a test call leaves through).
     * @return array<string, array{channel: string, linkedid: string}>
     */
    public static function collectChannels(array $groupedChannels, string $providerId): array
    {
        if ($providerId === '*') {
            // Provider endpoints are named SIP-<uniqid>; internal extensions are numeric.
            $providerChannelPattern = '/^PJSIP\/SIP-[A-Za-z0-9_-]+-[0-9A-Fa-f]+$/';
        } else {
            if (!preg_match('/^[A-Za-z0-9_-]+$/', $providerId)) {
                throw new RuntimeException('Invalid provider ID');
            }
            $providerChannelPattern = sprintf(
                '/^PJSIP\/%s-[0-9A-Fa-f]+$/',
                preg_quote($providerId, '/')
            );
        }
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

        return $matches;
    }

    /**
     * @param array{channel: string, linkedid: string} $selectedChannel
     * @param string $origCidName Display name of the original caller, passed as origCidName the
     *                            way the CTI client does. The interception CDR leg takes its
     *                            src_name from it. Empty disables the variable.
     * @param string $callerName  Display name for the AMI CallerID - the operator who performs
     *                            the interception. Kept different from $origCidName so a test
     *                            can assert the names do not swap places. Empty keeps the bare
     *                            extension number.
     *
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
        string $callerNumber,
        string $origCidName = '',
        string $callerName = ''
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
        foreach (['origCidName' => $origCidName, 'callerName' => $callerName] as $field => $name) {
            // A comma would split the AMI Variable list, quotes break CallerID and .call headers.
            if ($name !== '' && preg_match('/^[^",\r\n]+$/D', trim($name)) !== 1) {
                throw new RuntimeException("Invalid $field: no quotes, commas or line breaks allowed");
            }
        }

        $callerId = $internalExtension;
        if ($callerName !== '') {
            $callerId = '"' . trim($callerName) . '" <' . $internalExtension . '>';
        }
        $variables = "pt1c_cid=$callerNumber,ALLOW_MULTY_ANSWER=1";
        if ($origCidName !== '') {
            $variables .= ',origCidName=' . trim($origCidName);
        }
        $variables .= ','
            . "_INTECEPTION_CNANNEL={$selectedChannel['channel']},"
            . "_OLD_LINKEDID={$selectedChannel['linkedid']}";

        return [
            'channel' => "Local/$internalExtension@internal-originate",
            'exten' => $callerNumber,
            'context' => 'interception-bridge',
            'priority' => 1,
            'callerId' => $callerId,
            'variables' => $variables,
        ];
    }
}
