<?php

declare(strict_types=1);

namespace Tests\Unit\AdminCabinet;

use PHPUnit\Framework\TestCase;

final class CallQueueEmptyMembersValidationTest extends TestCase
{
    public function testEmptyQueueRequiresFallbackBeforeSubmission(): void
    {
        $script = file_get_contents(
            dirname(__DIR__, 3) . '/sites/admin-cabinet/assets/js/src/CallQueues/callqueue-modify.js'
        );

        self::assertIsString($script);
        self::assertStringContainsString(
            "members.length === 0 && !result.data.redirect_to_extension_if_empty",
            $script
        );
        self::assertStringNotContainsString("if (members.length === 0) {", $script);
        self::assertStringContainsString('cq_RedirectToExtensionIfEmtyQueue', $script);

        $compiledScript = file_get_contents(
            dirname(__DIR__, 3) . '/sites/admin-cabinet/assets/js/pbx/CallQueues/callqueue-modify.js'
        );

        self::assertIsString($compiledScript);
        self::assertStringContainsString(
            "members.length === 0 && !result.data.redirect_to_extension_if_empty",
            $compiledScript
        );
    }
}
