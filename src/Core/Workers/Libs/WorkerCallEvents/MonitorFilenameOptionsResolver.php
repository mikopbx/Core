<?php

declare(strict_types=1);

namespace MikoPBX\Core\Workers\Libs\WorkerCallEvents;

/** Resolves a safe recording basename and MixMonitor options. */
final class MonitorFilenameOptionsResolver
{
    /**
     * @return array{0: string, 1: string, 2: string}|null
     */
    public static function resolve(
        string $fullNameBase,
        string $generatedBase,
        string $preferredExtension,
        bool $splitAudio
    ): ?array {
        $base = trim($fullNameBase) !== '' ? $fullNameBase : $generatedBase;
        if (trim($base) === '') {
            return null;
        }

        foreach (['wav48', 'wav16', 'wav'] as $existingExtension) {
            if (
                file_exists("{$base}_in.$existingExtension")
                && file_exists("{$base}_out.$existingExtension")
            ) {
                return [
                    $base,
                    "abr({$base}_in.$existingExtension)t({$base}_out.$existingExtension)",
                    $existingExtension,
                ];
            }
        }

        $options = $splitAudio
            ? "abr({$base}_in.$preferredExtension)t({$base}_out.$preferredExtension)"
            : 'ab';

        return [$base, $options, $preferredExtension];
    }
}
