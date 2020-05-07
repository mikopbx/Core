<?php

namespace PhpSchool\TerminalTest\Exception;

use PhpSchool\Terminal\Exception\NotInteractiveTerminal;
use PHPUnit\Framework\TestCase;

/**
 * @author Aydin Hassan <aydin@hotmail.co.uk>
 */
class NotInteractiveTerminalTest extends TestCase
{
    public function testInputNotInteractive() : void
    {
        $e = NotInteractiveTerminal::inputNotInteractive();

        self::assertEquals('Input stream is not interactive (non TTY)', $e->getMessage());
    }

    public function testOutputNotInteractive() : void
    {
        $e = NotInteractiveTerminal::outputNotInteractive();

        self::assertEquals('Output stream is not interactive (non TTY)', $e->getMessage());
    }
}
