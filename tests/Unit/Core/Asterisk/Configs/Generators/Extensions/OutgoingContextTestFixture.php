<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Asterisk\Configs\Generators\Extensions;

use MikoPBX\Core\Asterisk\Configs\Generators\Extensions\OutgoingContext;

/**
 * Skips the DI-backed constructor and module hooks; the context body is built from $rout only.
 */
final class OutgoingContextTestFixture extends OutgoingContext
{
    public function __construct()
    {
    }

    public function hookModulesMethod(string $methodName, array $arguments = []): string
    {
        return '';
    }
}
