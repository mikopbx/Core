<?php

declare(strict_types=1);

namespace MikoPBX\Core\Asterisk\Configs;

use MikoPBX\Common\Models\Sip;

final class ProviderIncomingContextResolver
{
    /**
     * @param array<int,array<string,mixed>> $providers
     * @return array<string,string>
     */
    public static function sharedGroupMembers(array $providers, string $contextId): array
    {
        $members = [];
        foreach ($providers as $provider) {
            if (($provider['context_id'] ?? '') !== $contextId
                || ($provider['registration_type'] ?? '') === Sip::REG_TYPE_INBOUND) {
                continue;
            }
            $members[(string)($provider['uniqid'] ?? '')] = (string)($provider['username'] ?? '');
        }
        return $members;
    }

    public static function usesDedicatedContext(array $provider, int $groupSize): bool
    {
        return ($provider['registration_type'] ?? '') === Sip::REG_TYPE_INBOUND
            || $groupSize === 1;
    }

    public static function resolveId(array $provider, int $groupSize): string
    {
        if (self::usesDedicatedContext($provider, $groupSize)) {
            return (string)($provider['uniqid'] ?? '');
        }

        return str_replace('-incoming', '', (string)($provider['context_id'] ?? ''));
    }
}
