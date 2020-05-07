<?php
namespace Icecave\Repr;

use ReflectionClass;

/**
 * Generates string representations of arbitrary values.
 */
class Generator
{
    /**
     * @param integer $maximumLength   The maximum number of characters to display when representing a string.
     * @param integer $maximumDepth    The maximum depth to represent for nested types.
     * @param integer $maximumElements The maximum number of elements to include in representations of container types.
     */
    public function __construct($maximumLength = 50, $maximumDepth = 3, $maximumElements = 3)
    {
        $this->setMaximumLength($maximumLength);
        $this->setMaximumDepth($maximumDepth);
        $this->setMaximumElements($maximumElements);
    }

    /**
     * Generate a string representation for an arbitrary value.
     *
     * @param mixed   $value        The value to represent.
     * @param integer $currentDepth The current depth in the representation string.
     *
     * @return string A short human-readable string representation of the given value.
     */
    public function generate($value, $currentDepth = 0)
    {
        if (is_array($value)) {
            return $this->renderArray($value, $currentDepth);
        } elseif (is_object($value)) {
            return $this->renderObject($value, $currentDepth);
        } elseif (is_resource($value)) {
            return $this->renderResource($value, $currentDepth);
        } elseif (is_string($value)) {
            return $this->renderString($value, $currentDepth);
        } elseif (is_float($value)) {
            return $this->renderFloat($value, $currentDepth);
        } else {
            return $this->renderOther($value, $currentDepth);
        }
    }

    /**
     * @return integer The maximum number of characters to display when representing a string.
     */
    public function maximumLength()
    {
        return $this->maximumLength;
    }

    /**
     * @param integer $maximum The maximum number of characters to display when representing a string.
     */
    public function setMaximumLength($maximum)
    {
        $this->maximumLength = $maximum;
    }

    /**
     * @return integer The maximum depth to represent for nested types.
     */
    public function maximumDepth()
    {
        return $this->maximumDepth;
    }

    /**
     * @param integer $maximum The maximum depth to represent for nested types.
     */
    public function setMaximumDepth($maximum)
    {
        $this->maximumDepth = $maximum;
    }

    /**
     * @return integer The maximum number of elements to include in representations of container types.
     */
    public function maximumElements()
    {
        return $this->maximumElements;
    }

    /**
     * @param integer $maximum The maximum number of elements to include in representations of container types.
     */
    public function setMaximumElements($maximum)
    {
        $this->maximumElements = $maximum;
    }

    /**
     * Render a list of values.
     *
     * @param traversable $value        The traversable containing the elements.
     * @param integer     $currentDepth The current rendering depth.
     * @param string      $separator    The separator to use between elements.
     */
    public function renderValueList($value, $currentDepth = 0, $separator = ', ')
    {
        $elements = array();

        $counter = 0;
        foreach ($value as $element) {
            $elements[] = $this->generate($element, $currentDepth);
        }

        return implode($separator, $elements);
    }

    /**
     * Render a list of keys and values.
     *
     * @param traversable $value        The traversable containing the elements.
     * @param integer     $currentDepth The current rendering depth.
     * @param string      $separator    The separator to use between elements.
     * @param string      $keySeparator The separator to use between key and value.
     */
    public function renderKeyValueList($value, $currentDepth = 0, $separator = ', ', $keySeparator = ' => ')
    {
        $elements = array();

        foreach ($value as $key => $element) {
            $elements[] = $this->generate($key, $currentDepth) . $keySeparator . $this->generate($element, $currentDepth);
        }

        return implode($separator, $elements);
    }

    /**
     * @param array   $value
     * @param integer $currentDepth
     *
     * @return string
     */
    protected function renderArray($value, $currentDepth = 0)
    {
        $size   = count($value);
        $vector = array_keys($value) === range(0, $size - 1);
        $more   = '';

        if (0 === $size) {
            return '[]';
        } elseif ($this->maximumDepth() === $currentDepth) {
            return sprintf('[<%d>]', $size);
        } elseif ($this->maximumElements() < $size) {
            $value = array_slice($value, 0, $this->maximumElements());
            $more  = sprintf(', <+%d>', $size - $this->maximumElements());
        }

        if ($vector) {
            $elements = $this->renderValueList($value, $currentDepth + 1);
        } else {
            $elements = $this->renderKeyValueList($value, $currentDepth + 1);
        }

        return '[' . $elements . $more . ']';
    }

    /**
     * @param object  $value
     * @param integer $currentDepth
     *
     * @return string
     */
    protected function renderObject($value, $currentDepth = 0)
    {
        if ($value instanceof RepresentableInterface) {
            return $value->stringRepresentation($this, $currentDepth);
        }

        $reflector = new ReflectionClass($value);
        if ($reflector->hasMethod('__toString')) {
            $string = ' ' . $this->renderString($value->__toString(), $currentDepth);
        } else {
            $string = '';
        }

        return sprintf(
            '<%s%s @ %s>',
            get_class($value),
            $string,
            spl_object_hash($value)
        );
    }

    /**
     * @param resource $value
     * @param integer  $currentDepth
     *
     * @return string
     */
    protected function renderResource($value, $currentDepth = 0)
    {
        $type = get_resource_type($value);
        if ('stream' === $type) {
            $metaData = stream_get_meta_data($value);
            $info = ' ' . $metaData['mode'];
        } else {
            $info = '';
        }

        return sprintf(
            '<resource: %s #%d%s>',
            $type,
            $value,
            $info
        );
    }

    protected function renderString($value, $currentDepth = 0)
    {
        $length = strlen($value);
        $open   = '"';
        $close  = '"';

        if ($length > $this->maximumLength()) {
            $close = '...';
            $length = $this->maximumLength();
        }

        $repr = '';

        for ($index = 0; $index < $length; ++$index) {
            $ch = $value[$index];

            if ($ch === "\n") {
                $ch = '\n';
            } elseif ($ch === "\r") {
                $ch = '\r';
            } elseif ($ch === "\t") {
                $ch = '\t';
            } elseif ($ch === "\v") {
                $ch = '\v';
            } elseif (version_compare(PHP_VERSION, '5.4.0', '>=') && $ch === "\e") {
                $ch = '\e';
            } elseif ($ch === "\f") {
                $ch = '\f';
            } elseif ($ch === "\\") {
                $ch = '\\\\';
            } elseif ($ch === '$') {
                $ch = '\$';
            } elseif ($ch === '"') {
                $ch = '\"';
            } elseif (!ctype_print($ch)) {
                $ch = sprintf('\x%02x', ord($ch));
            }

            $repr .= $ch;
        }

        return $open . $repr . $close;
    }

    /**
     * @param scalar  $value
     * @param integer $currentDepth
     *
     * @return string
     */
    protected function renderFloat($value, $currentDepth = 0)
    {
        if (0.0 === fmod($value, 1.0)) {
            return $value . '.0';
        }

        return strval($value);
    }

    /**
     * @param scalar  $value
     * @param integer $currentDepth
     *
     * @return string
     */
    protected function renderOther($value, $currentDepth = 0)
    {
        return strtolower(var_export($value, true));
    }

    private $maximumLength;
    private $maximumDepth;
    private $maximumElements;
}
