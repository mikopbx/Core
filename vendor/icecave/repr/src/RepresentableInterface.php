<?php
namespace Icecave\Repr;

/**
 * Interface for objects that provide their own string representation.
 */
interface RepresentableInterface
{
    /**
     * Generate this object's string representation.
     *
     * @param Generator $generator    The object being used to generate the string representation.
     * @param integer   $currentDepth The current depth in the object hierarchy.
     *
     * @return string The string representation of $this.
     */
    public function stringRepresentation(Generator $generator, $currentDepth = 0);
}
