# Repr

[![Build Status](http://img.shields.io/travis/icecave/repr/master.svg?style=flat-square)](https://travis-ci.org/icecave/repr)
[![Code Coverage](https://img.shields.io/codecov/c/github/icecave/repr/master.svg?style=flat-square)](https://codecov.io/github/icecave/repr)
[![Latest Version](http://img.shields.io/packagist/v/icecave/repr.svg?style=flat-square&label=semver)](https://semver.org)

**Repr** provides a way to generate informational string representations of any value, inspired by Python's
[reprlib](http://docs.python.org/release/3.1.5/library/reprlib.html) library.

    composer require icecave/repr

## Example

Use the ```Repr::repr()``` method to obtain a string representation for any type.

```php
use Icecave\Repr\Repr;

echo Repr::repr(array(1, 2, 3));
```

The output from the example above is:

```
[1, 2, 3]
```

### Arrays

Arrays are represented using PHP 5.4 style short array notation. By default a maximum of 3 elements are shown along with
a count of any additional elements. Nested arrays are represented up to 3 levels deep by default, with any arrays nested
deeper than this showing only the element count.

### Numeric Values

Numbers are represented naturally, floating point values will always display a decimal point even if representing a
whole number.

### Strings

Strings are represented enclosed in double quotes up to a default maximum length of 50 characters. Any control
characters are shown as escape sequences.

### Objects

Objects are represented as a class name and SPL object hash enclosed in angle brackets. If the object has a `__toString`
method, the result of this is shown after the class name according to the rules of string representations specified
above.

If an object implements [RepresentableInterface](src/Icecave/Repr/RepresentableInterface.php),
the result of its stringRepresentation() method is used instead.

### Resources

Resources are represented as a resource type and ID enclosed in angle brackets. Stream resources will also display the
stream mode.

### Other Types

All other types are represented by the result of [var_export()](http://php.net/manual/en/function.var-export.php) in
lowercase.
