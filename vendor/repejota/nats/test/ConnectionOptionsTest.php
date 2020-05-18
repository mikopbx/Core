<?php
namespace Nats\Test;

use Nats\ConnectionOptions;

/**
 * Class ConnectionOptionsTest
 */
class ConnectionOptionsTest extends \PHPUnit_Framework_TestCase
{


    /**
     * Tests Connection Options getters and setters.
     *
     * @return void
     */
    public function testSettersAndGetters()
    {
        $options = new ConnectionOptions();
        $options->setHost('host')->setPort(4222)->setUser('user')->setPass('password')->setLang('lang')->setVersion('version')->setVerbose(true)->setPedantic(true)->setReconnect(true);

        $this->assertEquals('host', $options->getHost());
        $this->assertEquals(4222, $options->getPort());
        $this->assertEquals('user', $options->getUser());
        $this->assertEquals('password', $options->getPass());
        $this->assertNull($options->getToken());
        $this->assertEquals('lang', $options->getLang());
        $this->assertEquals('version', $options->getVersion());
        $this->assertTrue($options->isVerbose());
        $this->assertTrue($options->isPedantic());
        $this->assertTrue($options->isReconnect());
    }

    /**
     * Test Connection Options getters and setters using auth token.
     *
     * @return void
     */
    public function testAuthToken()
    {
        $options = new ConnectionOptions();
        $options->setHost('host')->setPort(4222)->setToken('token')->setLang('lang')->setVersion('version')->setVerbose(true)->setPedantic(true)->setReconnect(true);

        $this->assertEquals('host', $options->getHost());
        $this->assertEquals(4222, $options->getPort());
        $this->assertEquals('token', $options->getToken());
        $this->assertNull($options->getUser());
        $this->assertNull($options->getPass());
        $this->assertEquals('lang', $options->getLang());
        $this->assertEquals('version', $options->getVersion());
        $this->assertTrue($options->isVerbose());
        $this->assertTrue($options->isPedantic());
        $this->assertTrue($options->isReconnect());
    }


    /**
     * Tests Connection Options getters and setters without setting user and password.
     *
     * @return void
     */
    public function testSettersAndGettersWithoutCredentials()
    {
        $options = new ConnectionOptions();
        $options->setHost('host')->setPort(4222)->setLang('lang')->setVersion('version')->setVerbose(true)->setPedantic(true)->setReconnect(true);

        $this->assertEquals('host', $options->getHost());
        $this->assertEquals(4222, $options->getPort());
        $this->assertNull($options->getUser());
        $this->assertNull($options->getPass());
        $this->assertEquals('lang', $options->getLang());
        $this->assertEquals('version', $options->getVersion());
        $this->assertTrue($options->isVerbose());
        $this->assertTrue($options->isPedantic());
        $this->assertTrue($options->isReconnect());
    }
}
