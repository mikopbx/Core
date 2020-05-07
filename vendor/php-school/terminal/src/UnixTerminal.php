<?php

namespace PhpSchool\Terminal;

use PhpSchool\Terminal\Exception\NotInteractiveTerminal;
use PhpSchool\Terminal\IO\InputStream;
use PhpSchool\Terminal\IO\OutputStream;

/**
 * @author Michael Woodward <mikeymike.mw@gmail.com>
 * @author Aydin Hassan <aydin@hotmail.co.uk>
 */
class UnixTerminal implements Terminal
{
    /**
     * @var bool
     */
    private $isCanonical;

    /**
     * Whether terminal echo back is enabled or not.
     * Eg. user key presses and the terminal immediately shows it.
     *
     * @var bool
     */
    private $echoBack = true;

    /**
     * @var int
     */
    private $width;

    /**
     * @var int
     */
    private $height;
    
    /**
     * @var int;
     */
    private $colourSupport;

    /**
     * @var string
     */
    private $originalConfiguration;

    /**
     * @var InputStream
     */
    private $input;

    /**
     * @var OutputStream
     */
    private $output;

    public function __construct(InputStream $input, OutputStream $output)
    {
        $this->getOriginalConfiguration();
        $this->getOriginalCanonicalMode();
        $this->input = $input;
        $this->output = $output;
    }

    private function getOriginalCanonicalMode() : void
    {
        exec('stty -a', $output);
        $this->isCanonical = (strpos(implode("\n", $output), ' icanon') !== false);
    }

    public function getWidth() : int
    {
        return $this->width ?: $this->width = (int) exec('tput cols');
    }

    public function getHeight() : int
    {
        return $this->height ?: $this->height = (int) exec('tput lines');
    }

    public function getColourSupport() : int
    {
        return $this->colourSupport ?: $this->colourSupport = (int) exec('tput colors');
    }

    private function getOriginalConfiguration() : string
    {
        return $this->originalConfiguration ?: $this->originalConfiguration = exec('stty -g');
    }

    /**
     * Disables echoing every character back to the terminal. This means
     * we do not have to clear the line when reading.
     */
    public function disableEchoBack() : void
    {
        exec('stty -echo');
        $this->echoBack = false;
    }

    /**
     * Enable echoing back every character input to the terminal.
     */
    public function enableEchoBack() : void
    {
        exec('stty echo');
        $this->echoBack = true;
    }

    /**
     * Is echo back mode enabled
     */
    public function isEchoBack() : bool
    {
        return $this->echoBack;
    }

    /**
     * Disable canonical input (allow each key press for reading, rather than the whole line)
     *
     * @see https://www.gnu.org/software/libc/manual/html_node/Canonical-or-Not.html
     */
    public function disableCanonicalMode() : void
    {
        if ($this->isCanonical) {
            exec('stty -icanon');
            $this->isCanonical = false;
        }
    }

    /**
     * Enable canonical input - read input by line
     *
     * @see https://www.gnu.org/software/libc/manual/html_node/Canonical-or-Not.html
     */
    public function enableCanonicalMode() : void
    {
        if (!$this->isCanonical) {
            exec('stty icanon');
            $this->isCanonical = true;
        }
    }

    /**
     * Is canonical mode enabled or not
     */
    public function isCanonicalMode() : bool
    {
        return $this->isCanonical;
    }

    /**
     * Restore the original terminal configuration
     */
    public function restoreOriginalConfiguration() : void
    {
        exec('stty ' . $this->getOriginalConfiguration());
    }

    /**
     * Check if the Input & Output streams are interactive. Eg - they are
     * connected to a terminal.
     *
     * @return bool
     */
    public function isInteractive() : bool
    {
        return $this->input->isInteractive() && $this->output->isInteractive();
    }

    /**
     * Assert that both the Input & Output streams are interactive. Throw
     * `NotInteractiveTerminal` if not.
     */
    public function mustBeInteractive() : void
    {
        if (!$this->input->isInteractive()) {
            throw NotInteractiveTerminal::inputNotInteractive();
        }

        if (!$this->output->isInteractive()) {
            throw NotInteractiveTerminal::outputNotInteractive();
        }
    }

    /**
     * @see https://github.com/symfony/Console/blob/master/Output/StreamOutput.php#L95-L102
     */
    public function supportsColour() : bool
    {
        if (DIRECTORY_SEPARATOR === '\\') {
            return false !== getenv('ANSICON') || 'ON' === getenv('ConEmuANSI') || 'xterm' === getenv('TERM');
        }

        return $this->isInteractive();
    }

    public function clear() : void
    {
        $this->output->write("\033[2J");
    }

    public function clearLine() : void
    {
        $this->output->write("\033[2K");
    }

    /**
     * Erase screen from the current line down to the bottom of the screen
     */
    public function clearDown() : void
    {
        $this->output->write("\033[J");
    }

    public function clean() : void
    {
        foreach (range(0, $this->getHeight()) as $rowNum) {
            $this->moveCursorToRow($rowNum);
            $this->clearLine();
        }
    }

    public function enableCursor() : void
    {
        $this->output->write("\033[?25h");
    }

    public function disableCursor() : void
    {
        $this->output->write("\033[?25l");
    }

    public function moveCursorToTop() : void
    {
        $this->output->write("\033[H");
    }

    public function moveCursorToRow(int $rowNumber) : void
    {
        $this->output->write(sprintf("\033[%d;0H", $rowNumber));
    }

    public function moveCursorToColumn(int $column) : void
    {
        $this->output->write(sprintf("\033[%dC", $column));
    }

    public function showSecondaryScreen() : void
    {
        $this->output->write("\033[?47h");
    }

    public function showPrimaryScreen() : void
    {
        $this->output->write("\033[?47l");
    }

    /**
     * Read bytes from the input stream
     */
    public function read(int $bytes): string
    {
        $buffer = '';
        $this->input->read($bytes, function ($data) use (&$buffer) {
            $buffer .= $data;
        });
        return $buffer;
    }

    /**
     * Write to the output stream
     */
    public function write(string $buffer): void
    {
        $this->output->write($buffer);
    }

    /**
     * Restore the original terminal configuration on shutdown.
     */
    public function __destruct()
    {
        $this->restoreOriginalConfiguration();
    }
}
