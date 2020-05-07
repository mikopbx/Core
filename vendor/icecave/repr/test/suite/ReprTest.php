<?php
namespace Icecave\Repr;

use PHPUnit\Framework\TestCase;

class ReprTest extends TestCase
{
    public function testFacade()
    {
        $this->assertSame('"foo"', Repr::repr('foo'));
    }
}
