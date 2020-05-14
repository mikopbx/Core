<?php

namespace PhpSchool\TerminalTest;

use PhpSchool\Terminal\Exception\NotInteractiveTerminal;
use PhpSchool\Terminal\IO\BufferedOutput;
use PhpSchool\Terminal\IO\InputStream;
use PhpSchool\Terminal\IO\OutputStream;
use PhpSchool\Terminal\IO\ResourceInputStream;
use PhpSchool\Terminal\IO\ResourceOutputStream;
use PhpSchool\Terminal\UnixTerminal;
use PHPUnit\Framework\TestCase;

class UnixTerminalTest extends TestCase
{
    public function testIsInteractiveReturnsTrueIfInputAndOutputAreTTYs() : void
    {
        $input  = $this->createMock(InputStream::class);
        $output = $this->createMock(OutputStream::class);

        $input
            ->expects($this->once())
            ->method('isInteractive')
            ->willReturn(true);
        $output
            ->expects($this->once())
            ->method('isInteractive')
            ->willReturn(true);

        $terminal = new UnixTerminal($input, $output);

        self::assertTrue($terminal->isInteractive());
    }

    public function testIsInteractiveReturnsFalseIfInputNotTTY() : void
    {
        $input  = $this->createMock(InputStream::class);
        $output = $this->createMock(OutputStream::class);

        $input
            ->expects($this->once())
            ->method('isInteractive')
            ->willReturn(false);
        $output
            ->expects($this->any())
            ->method('isInteractive')
            ->willReturn(true);

        $terminal = new UnixTerminal($input, $output);

        self::assertFalse($terminal->isInteractive());
    }

    public function testIsInteractiveReturnsFalseIfOutputNotTTY() : void
    {
        $input  = $this->createMock(InputStream::class);
        $output = $this->createMock(OutputStream::class);

        $input
            ->expects($this->once())
            ->method('isInteractive')
            ->willReturn(true);
        $output
            ->expects($this->once())
            ->method('isInteractive')
            ->willReturn(false);

        $terminal = new UnixTerminal($input, $output);

        self::assertFalse($terminal->isInteractive());
    }

    public function testIsInteractiveReturnsFalseIfInputAndOutputNotTTYs() : void
    {
        $input  = $this->createMock(InputStream::class);
        $output = $this->createMock(OutputStream::class);

        $input
            ->expects($this->once())
            ->method('isInteractive')
            ->willReturn(false);
        $output
            ->expects($this->any())
            ->method('isInteractive')
            ->willReturn(false);

        $terminal = new UnixTerminal($input, $output);

        self::assertFalse($terminal->isInteractive());
    }

    public function testMustBeInteractiveThrowsExceptionIfInputNotTTY() : void
    {
        self::expectException(NotInteractiveTerminal::class);
        self::expectExceptionMessage('Input stream is not interactive (non TTY)');

        $input  = $this->createMock(InputStream::class);
        $output = $this->createMock(OutputStream::class);

        $input
            ->expects($this->once())
            ->method('isInteractive')
            ->willReturn(false);

        $terminal = new UnixTerminal($input, $output);
        $terminal->mustBeInteractive();
    }

    public function testMustBeInteractiveThrowsExceptionIfOutputNotTTY() : void
    {
        self::expectException(NotInteractiveTerminal::class);
        self::expectExceptionMessage('Output stream is not interactive (non TTY)');

        $input  = $this->createMock(InputStream::class);
        $output = $this->createMock(OutputStream::class);

        $input
            ->expects($this->once())
            ->method('isInteractive')
            ->willReturn(true);

        $output
            ->expects($this->once())
            ->method('isInteractive')
            ->willReturn(false);

        $terminal = new UnixTerminal($input, $output);
        $terminal->mustBeInteractive();
    }

    public function testClear() : void
    {
        $input  = $this->createMock(InputStream::class);
        $output = new BufferedOutput;

        $terminal = new UnixTerminal($input, $output);
        $terminal->clear();

        self::assertEquals("\033[2J", $output->fetch());
    }

    public function testClearLine() : void
    {
        $input  = $this->createMock(InputStream::class);
        $output = new BufferedOutput;

        $terminal = new UnixTerminal($input, $output);
        $terminal->clearLine();

        self::assertEquals("\033[2K", $output->fetch());
    }

    public function testClearDown() : void
    {
        $input  = $this->createMock(InputStream::class);
        $output = new BufferedOutput;

        $terminal = new UnixTerminal($input, $output);
        $terminal->clearDown();

        self::assertEquals("\033[J", $output->fetch());
    }

    public function testClean() : void
    {
        $input  = $this->createMock(InputStream::class);
        $output = new BufferedOutput;

        $terminal = new UnixTerminal($input, $output);
        $rf = new \ReflectionObject($terminal);
        $rp = $rf->getProperty('width');
        $rp->setAccessible(true);
        $rp->setValue($terminal, 23);
        $rp = $rf->getProperty('height');
        $rp->setAccessible(true);
        $rp->setValue($terminal, 2);

        $terminal->clean();

        self::assertEquals("\033[0;0H\033[2K\033[1;0H\033[2K\033[2;0H\033[2K", $output->fetch());
    }

    public function testEnableCursor() : void
    {
        $input  = $this->createMock(InputStream::class);
        $output = new BufferedOutput;

        $terminal = new UnixTerminal($input, $output);
        $terminal->enableCursor();

        self::assertEquals("\033[?25h", $output->fetch());
    }

    public function testDisableCursor() : void
    {
        $input  = $this->createMock(InputStream::class);
        $output = new BufferedOutput;

        $terminal = new UnixTerminal($input, $output);
        $terminal->disableCursor();

        self::assertEquals("\033[?25l", $output->fetch());
    }

    public function testMoveCursorToTop() : void
    {
        $input  = $this->createMock(InputStream::class);
        $output = new BufferedOutput;

        $terminal = new UnixTerminal($input, $output);
        $terminal->moveCursorToTop();

        self::assertEquals("\033[H", $output->fetch());
    }

    public function testMoveCursorToRow() : void
    {
        $input  = $this->createMock(InputStream::class);
        $output = new BufferedOutput;

        $terminal = new UnixTerminal($input, $output);
        $terminal->moveCursorToRow(2);

        self::assertEquals("\033[2;0H", $output->fetch());
    }

    public function testMoveCursorToColumn() : void
    {
        $input  = $this->createMock(InputStream::class);
        $output = new BufferedOutput;

        $terminal = new UnixTerminal($input, $output);
        $terminal->moveCursorToColumn(10);

        self::assertEquals("\033[10C", $output->fetch());
    }

    public function testShowAlternateScreen() : void
    {
        $input  = $this->createMock(InputStream::class);
        $output = new BufferedOutput;

        $terminal = new UnixTerminal($input, $output);
        $terminal->showSecondaryScreen();

        self::assertEquals("\033[?47h", $output->fetch());
    }

    public function testShowMainScreen() : void
    {
        $input  = $this->createMock(InputStream::class);
        $output = new BufferedOutput;

        $terminal = new UnixTerminal($input, $output);
        $terminal->showPrimaryScreen();

        self::assertEquals("\033[?47l", $output->fetch());
    }

    public function testRead() : void
    {
        $tempStream = fopen('php://temp', 'r+');
        fwrite($tempStream, 'mystring');
        rewind($tempStream);

        $input  = new ResourceInputStream($tempStream);
        $output = $this->createMock(OutputStream::class);

        $terminal = new UnixTerminal($input, $output);

        self::assertEquals('myst', $terminal->read(4));
        self::assertEquals('ring', $terminal->read(4));

        fclose($tempStream);
    }

    public function testWriteForwardsToOutput() : void
    {
        $input  = $this->createMock(InputStream::class);
        $output = new BufferedOutput;

        $terminal = new UnixTerminal($input, $output);
        $terminal->write('My awesome string');

        self::assertEquals('My awesome string', $output->fetch());
    }

    public function testGetColourSupport() : void
    {
        $input  = $this->createMock(InputStream::class);
        $output = new BufferedOutput;

        $terminal = new UnixTerminal($input, $output);

        // Travis terminal supports 8 colours, but just in case
        // in ever changes I'll add the 256 colors possibility too
        self::assertTrue($terminal->getColourSupport() === 8 || $terminal->getColourSupport() === 256);
    }
}
