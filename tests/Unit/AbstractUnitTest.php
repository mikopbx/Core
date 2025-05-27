<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit;

use MikoPBX\Core\Config\RegisterDIServices;
use Phalcon\Di\Di;
use Phalcon\Di\FactoryDefault;
use MikoPBX\Tests\Unit\Incubator\PHPUnit\UnitTestCase;

abstract class AbstractUnitTest extends UnitTestCase
{
    private bool $loaded = false;

    public function setUp(): void
    {
        parent::setUp();
        $di = new FactoryDefault\Cli();
        Di::reset();
        Di::setDefault($di);
        require_once __DIR__ . '/../../src/Common/Config/ClassLoader.php';
        RegisterDIServices::init();
        $this->loaded = true;
    }


    /**
     * Call protected/private method of a class.
     *
     * @param object &$object     Instantiated object that we will run method on.
     * @param string  $methodName Method name to call
     * @param array   $parameters Array of parameters to pass into method.
     *
     * @return mixed Method return.
     * @throws \ReflectionException
     */
    public function invokeMethod(&$object, $methodName, array $parameters = array())
    {
        $reflection = new \ReflectionClass(get_class($object));
        $method = $reflection->getMethod($methodName);
        $method->setAccessible(true);

        return $method->invokeArgs($object, $parameters);
    }
}