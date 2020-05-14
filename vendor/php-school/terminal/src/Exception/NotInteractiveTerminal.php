<?php

namespace PhpSchool\Terminal\Exception;

/**
 * @author Aydin Hassan <aydin@hotmail.co.uk>
 */
class NotInteractiveTerminal extends \RuntimeException
{
    public static function inputNotInteractive() : self
    {
        return new self('Input stream is not interactive (non TTY)');
    }

    public static function outputNotInteractive() : self
    {
        return new self('Output stream is not interactive (non TTY)');
    }
}
