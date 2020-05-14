<?php

namespace PhpSchool\TerminalTest;

use PhpSchool\Terminal\InputCharacter;
use PhpSchool\Terminal\Terminal;
use PhpSchool\Terminal\NonCanonicalReader;
use PHPUnit\Framework\TestCase;

/**
 * @author Aydin Hassan <aydin@hotmail.co.uk>
 */
class NonCanonicalReaderTest extends TestCase
{
    public function testExceptionIsThrownIfMappingAddedForNonControlCharacter() : void
    {
        self::expectException(\InvalidArgumentException::class);
        self::expectExceptionMessage('Control "w" does not exist');

        $terminal = $this->createMock(Terminal::class);
        $terminalReader = new NonCanonicalReader($terminal);
        $terminalReader->addControlMapping('p', 'w');
    }

    public function testExceptionIsThrownIfMappingsAddedForNonControlCharacter() : void
    {
        self::expectException(\InvalidArgumentException::class);
        self::expectExceptionMessage('Control "w" does not exist');

        $terminal = $this->createMock(Terminal::class);
        $terminalReader = new NonCanonicalReader($terminal);
        $terminalReader->addControlMappings(['p' => 'w']);
    }

    public function testCustomMappingToUpControl() : void
    {
        $terminal = $this->createMock(Terminal::class);
        $terminal
            ->expects($this->once())
            ->method('read')
            ->with(4)
            ->willReturn('w');

        $terminalReader = new NonCanonicalReader($terminal);
        $terminalReader->addControlMapping('w', InputCharacter::UP);

        $char = $terminalReader->readCharacter();

        self::assertTrue($char->isControl());
        self::assertEquals('UP', $char->getControl());
        self::assertEquals("\033[A", $char->get());
    }

    public function testReadNormalCharacter() : void
    {
        $terminal = $this->createMock(Terminal::class);
        $terminal
            ->expects($this->once())
            ->method('read')
            ->with(4)
            ->willReturn('w');

        $terminalReader = new NonCanonicalReader($terminal);

        $char = $terminalReader->readCharacter();

        self::assertFalse($char->isControl());
        self::assertEquals('w', $char->get());
    }

    public function testReadControlCharacter()
    {
        $terminal = $this->createMock(Terminal::class);
        $terminal
            ->expects($this->once())
            ->method('read')
            ->with(4)
            ->willReturn("\n");

        $terminalReader = new NonCanonicalReader($terminal);

        $char = $terminalReader->readCharacter();

        self::assertTrue($char->isControl());
        self::assertEquals('ENTER', $char->getControl());
        self::assertEquals("\n", $char->get());
    }
}
