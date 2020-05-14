<?php

namespace PhpSchool\Terminal;

/**
 * This class takes a terminal and disabled canonical mode. It reads the input
 * and returns characters and control sequences as `InputCharacters` as soon
 * as they are read - character by character.
 *
 * On destruct canonical mode will be enabled if it was when in it was constructed.
 *
 * @author Aydin Hassan <aydin@hotmail.co.uk>
 */
class NonCanonicalReader
{
    /**
     * @var Terminal
     */
    private $terminal;

    /**
     * @var bool
     */
    private $wasCanonicalModeEnabled;

    /**
     * Map of characters to controls.
     * Eg map 'w' to the up control.
     *
     * @var array
     */
    private $mappings = [];

    public function __construct(Terminal $terminal)
    {
        $this->terminal = $terminal;
        $this->wasCanonicalModeEnabled = $terminal->isCanonicalMode();
        $this->terminal->disableCanonicalMode();
    }

    public function addControlMapping(string $character, string $mapToControl) : void
    {
        if (!InputCharacter::controlExists($mapToControl)) {
            throw new \InvalidArgumentException(sprintf('Control "%s" does not exist', $mapToControl));
        }

        $this->mappings[$character] = $mapToControl;
    }

    public function addControlMappings(array $mappings) : void
    {
        foreach ($mappings as $character => $mapToControl) {
            $this->addControlMapping($character, $mapToControl);
        }
    }

    /**
     * This should be ran with the terminal canonical mode disabled.
     *
     * @return InputCharacter
     */
    public function readCharacter() : InputCharacter
    {
        $char = $this->terminal->read(4);

        if (isset($this->mappings[$char])) {
            return InputCharacter::fromControlName($this->mappings[$char]);
        }

        return new InputCharacter($char);
    }

    public function __destruct()
    {
        if ($this->wasCanonicalModeEnabled) {
            $this->terminal->enableCanonicalMode();
        }
    }
}
