<?php

declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Lib\Extensions;

/**
 * Resolves the owner of a module extension from its related model classes.
 */
final class ModuleExtensionOwnerResolver
{
    /**
     * @param list<string> $relatedModelClasses
     */
    public static function resolve(array $relatedModelClasses): ?string
    {
        foreach ($relatedModelClasses as $className) {
            $namespaceParts = explode('\\', $className);
            if (
                count($namespaceParts) >= 4
                && $namespaceParts[0] === 'Modules'
                && $namespaceParts[1] !== ''
                && $namespaceParts[2] === 'Models'
                && $namespaceParts[3] !== ''
            ) {
                return $namespaceParts[1];
            }
        }

        return null;
    }
}
