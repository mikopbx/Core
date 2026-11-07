<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Asterisk\Configs\Generators\Extensions;

use MikoPBX\Core\Asterisk\Configs\Generators\Extensions\OutgoingContext;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;

/**
 * Issue #1382 (B-003): every DIALPLAN_EXISTS() in a provider context must receive
 * context, extension and priority; a misplaced bracket made the after-dial-custom
 * check always false.
 */
final class OutgoingContextAfterDialTest extends TestCase
{
    public function testProviderContextChecksCustomSubcontextsWithPriority(): void
    {
        $conf = $this->renderProviderContext();

        self::assertStringContainsString(
            'GosubIf($["${DIALPLAN_EXISTS(SIP-TRUNK-A-outgoing-after-dial-custom,${EXTEN},1)}" == "1"]?'
            . 'SIP-TRUNK-A-outgoing-after-dial-custom,${EXTEN},1)',
            $conf
        );

        preg_match_all('/DIALPLAN_EXISTS\(([^)]*)\)/', $conf, $matches);
        self::assertNotEmpty($matches[1]);
        foreach ($matches[1] as $arguments) {
            self::assertMatchesRegularExpression('/^[^,]+,\$\{EXTEN},1$/', $arguments);
        }
    }

    private function renderProviderContext(): string
    {
        $generator = new OutgoingContextTestFixture();
        $method = new ReflectionMethod(OutgoingContext::class, 'generateProviderContext');
        $method->setAccessible(true);

        $conf = '';
        $rout = [
            'providerid' => 'SIP-TRUNK-A',
            'technology' => 'PJSIP',
            'prepend' => '',
            'trimfrombegin' => '0',
        ];
        $method->invokeArgs($generator, [&$conf, 'SIP-TRUNK-A-outgoing', $rout]);

        return $conf;
    }
}

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
