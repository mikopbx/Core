<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit;

use MikoPBX\Core\Config\RegisterDIServices;
use Phalcon\Di;
use Phalcon\Di\FactoryDefault;
use Phalcon\Incubator\Test\PHPUnit\UnitTestCase;
use PHPUnit\Framework\IncompleteTestError;

abstract class AbstractUnitTest extends UnitTestCase
{
    private bool $loaded = false;

    protected function setUp(): void
    {
        parent::setUp();
        $di = new FactoryDefault\Cli();
        Di::reset();
        Di::setDefault($di);
        require_once __DIR__ . '/../../src/Common/Config/ClassLoader.php';
        RegisterDIServices::init();
        $this->loaded = true;
    }

    public function __destruct()
    {
        if (!$this->loaded) {
            throw new IncompleteTestError(
                "Please run parent::setUp()."
            );
        }
    }
}