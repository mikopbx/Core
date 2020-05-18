<?php
namespace Nats\tests\Unit;

use Nats\Connection;
use Nats\Message;

/**
 * Class MessageTest
 */
class MessageTest extends \PHPUnit_Framework_TestCase
{


    /**
     * Tests Message getters and setters. Only necessary for code coverage.
     *
     * @return void
     */
    public function testSettersAndGetters()
    {
        $conn = new Connection();

        $msg = new Message('subject', 'body', 'sid', $conn);

        $this->assertEquals('subject', $msg->getSubject());
        $this->assertEquals('body', $msg->getBody());
        $this->assertEquals('sid', $msg->getSid());
        $this->assertEquals($conn, $msg->getConn());

        $msg->setSubject('subject2')->setBody('body2')->setSid('sid2');

        $this->assertEquals('subject2', $msg->getSubject());
        $this->assertEquals('body2', $msg->getBody());
        $this->assertEquals('sid2', $msg->getSid());
    }


    /**
     * Tests Message string representation.
     *
     * @return void
     */
    public function testMessageStringRepresentation()
    {
        $conn = new Connection();

        $msg = new Message('subject', 'body', 'sid', $conn);

        $this->assertEquals('body', $msg->__toString());
    }
}
