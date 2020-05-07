<?php
namespace Icecave\Repr;

/**
 * Facade class for generating string representations of arbitrary values.
 */
class Repr
{
    /**
    * Generate a string representation for an arbitrary value.
    *
     * @param mixed $value The value for which a string reprsentation should be generated.
     *
     * @return string The string representation of $value.
     */
    public static function repr($value)
    {
        return self::instance()->generate($value);
    }

    /**
     * Install a custom generator.
     *
     * @param Generator $generator
     */
    public static function install(Generator $generator)
    {
        self::$generator = $generator;
    }

    /**
     * Fetch the currently installed Generator instance.
     *
     * If no instance was previously installed, a default constructed instance of {@see Generator} is installed and returned.
     *
     * @return Generator
     */
    public static function instance()
    {
        if (null === self::$generator) {
            self::install(new Generator());
        }

        return self::$generator;
    }

    private static $generator;
}
