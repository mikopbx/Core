<?php

namespace PhpSchool\Terminal;

use function in_array;

/**
 * @author Aydin Hassan <aydin@hotmail.co.uk>
 */
class InputCharacter
{
    /**
     * @var string
     */
    private $data;

    public const UP = 'UP';
    public const DOWN = 'DOWN';
    public const RIGHT = 'RIGHT';
    public const LEFT = 'LEFT';
    public const CTRLA = 'CTRLA';
    public const CTRLB = 'CTRLB';
    public const CTRLE = 'CTRLE';
    public const CTRLF = 'CTRLF';
    public const BACKSPACE = 'BACKSPACE';
    public const CTRLW = 'CTRLW';
    public const ENTER = 'ENTER';
    public const TAB = 'TAB';
    public const ESC = 'ESC';

    private static $controls = [
        "\033[A" => self::UP,
        "\033[B" => self::DOWN,
        "\033[C" => self::RIGHT,
        "\033[D" => self::LEFT,
        "\001"   => self::CTRLA,
        "\002"   => self::CTRLB,
        "\005"   => self::CTRLE,
        "\006"   => self::CTRLF,
        "\010"   => self::BACKSPACE,
        "\177"   => self::BACKSPACE,
        "\027"   => self::CTRLW,
        "\n"     => self::ENTER,
        "\t"     => self::TAB,
        "\e"     => self::ESC,
    ];

    public function __construct(string $data)
    {
        $this->data = $data;
    }

    public function isHandledControl() : bool
    {
        return isset(static::$controls[$this->data]);
    }

    /**
     * Is this character a control sequence?
     */
    public function isControl() : bool
    {
        return preg_match('/[\x00-\x1F\x7F]/', $this->data);
    }

    /**
     * Is this character a normal character?
     */
    public function isNotControl() : bool
    {
        return ! $this->isControl();
    }

    /**
     * Get the raw character or control sequence
     */
    public function get() : string
    {
        return $this->data;
    }

    /**
     * Get the actual control name that this sequence represents.
     * One of the class constants. Eg. self::UP.
     *
     * Throws an exception if the character is not actually a control sequence
     */
    public function getControl() : string
    {
        if (!isset(static::$controls[$this->data])) {
            throw new \RuntimeException(sprintf('Character "%s" is not a control', $this->data));
        }

        return static::$controls[$this->data];
    }

    /**
     * Get the raw character or control sequence
     */
    public function __toString() : string
    {
        return $this->get();
    }

    /**
     * Does the given control name exist? eg self::UP.
     */
    public static function controlExists(string $controlName) : bool
    {
        return in_array($controlName, static::$controls, true);
    }

    /**
     * Get all of the available control names
     */
    public static function getControls() : array
    {
        return array_values(array_unique(static::$controls));
    }

    /**
     * Create a instance from a given control name. Throws an exception if the
     * control name does not exist.
     */
    public static function fromControlName(string $controlName) : self
    {
        if (!static::controlExists($controlName)) {
            throw new \InvalidArgumentException(sprintf('Control "%s" does not exist', $controlName));
        }

        return new static(array_search($controlName, static::$controls, true));
    }
}
