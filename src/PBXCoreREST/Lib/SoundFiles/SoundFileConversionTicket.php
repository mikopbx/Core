<?php

declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Lib\SoundFiles;

final class SoundFileConversionTicket
{
    private const string KEY_PREFIX = 'sound-file-conversion:';
    private const int TTL = 900;

    public function __construct(
        private readonly \Closure $write,
        private readonly \Closure $read,
        private readonly \Closure $delete
    ) {
    }

    public function issue(string $path, string $category): string
    {
        $id = bin2hex(random_bytes(32));
        ($this->write)(self::KEY_PREFIX . $id, json_encode([
            'path' => $path,
            'category' => $category,
        ], JSON_THROW_ON_ERROR), self::TTL);
        return $id;
    }

    public function consume(string $id, string $category): ?string
    {
        if (!preg_match('/^[a-f0-9]{64}$/D', $id)) {
            return null;
        }
        $key = self::KEY_PREFIX . $id;
        $raw = ($this->read)($key);
        if (!is_string($raw) || $raw === '') {
            return null;
        }
        $payload = json_decode($raw, true);
        if (!is_array($payload) || ($payload['category'] ?? null) !== $category || !is_string($payload['path'] ?? null)) {
            return null;
        }
        ($this->delete)($key);
        return $payload['path'];
    }
}
