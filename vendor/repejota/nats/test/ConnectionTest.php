<?php
namespace Nats\tests\Unit;

use Nats;
use Nats\Connection;
use Nats\ConnectionOptions;

/**
 * Class ConnectionTest.
 */
class ConnectionTest extends \PHPUnit_Framework_TestCase
{

    /**
     * Client.
     *
     * @var Nats\Connection Client
     */
    private $c;


    /**
     * SetUp test suite.
     *
     * @return void
     */
    public function setUp()
    {
        $options = new ConnectionOptions();
        $this->c = new Connection($options);
        $this->c->connect();
    }


    /**
     * Test Connection.
     *
     * @return void
     */
    public function testConnection()
    {
        // Connect.
        $this->c->connect();
        $this->assertTrue($this->c->isConnected());

        // Disconnect.
        $this->c->close();
        $this->assertFalse($this->c->isConnected());
    }


    /**
     * Test Ping command.
     *
     * @return void
     */
    public function testPing()
    {
        $this->c->ping();
        $count = $this->c->pingsCount();
        $this->assertInternalType('int', $count);
        $this->assertGreaterThan(0, $count);
        $this->c->close();
    }


    /**
     * Test Publish command.
     *
     * @return void
     */
    public function testPublish()
    {
        $this->c->ping();
        $this->c->publish('foo', 'bar');
        $count = $this->c->pubsCount();
        $this->assertInternalType('int', $count);
        $this->assertGreaterThan(0, $count);
        $this->c->close();
    }


    /**
     * Test Reconnect command.
     *
     * @return void
     */
    public function testReconnect()
    {
        $this->c->reconnect();
        $count = $this->c->reconnectsCount();
        $this->assertInternalType('int', $count);
        $this->assertGreaterThan(0, $count);
        $this->c->close();
    }


    /**
     * Test Request command.
     *
     * @return void
     */
    public function testRequest()
    {
        $i = 0;
        do {
            $this->c->subscribe(
                'sayhello'.$i,
                function ($res) {
                    $res->reply('Hello, '.$res->getBody().' !!!');
                }
            );

            $this->c->request(
                'sayhello'.$i,
                'McFly',
                function ($res) {
                    $this->assertEquals('Hello, McFly !!!', $res->getBody());
                }
            );

            $i++;
        } while ($i < 100);
    }


    /**
     * Test Request command with large payload.
     *
     * @return void
     */
    public function testLargeRequest()
    {
        $content = substr(str_shuffle('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'), 0, 51200);

        $contentLen = strlen($content);

        $contentSum = md5($content);

        $i = 0;
        do {
            $this->c->subscribe(
                'saybighello'.$i,
                function ($res) use ($contentLen, $contentSum) {
                    $gotLen = strlen($res->getBody());
                    $gotSum = md5($res->getBody());
                    $this->assertEquals($contentLen, $gotLen);
                    $this->assertEquals($contentSum, $gotSum);
                    $res->reply($gotLen);
                }
            );

            $this->c->request(
                'saybighello'.$i,
                $content,
                function ($res) {
                }
            );

            $i++;
        } while ($i < 100);
    }


    /**
     * Test setting a timeout on the stream
     *
     * @return void
     */
    public function testSetStreamTimeout()
    {
        $this->c->setStreamTimeout(1);
        $before = time();
        $this->c->request(
            'nonexistantsubject',
            'test',
            function ($res) {
            }
        );
        $timeTaken = (time() - $before);

        $this->assertGreaterThan(0, $timeTaken);
        $this->assertLessThan(3, $timeTaken);

        $meta = stream_get_meta_data($this->c->getStreamSocket());

        $this->assertTrue($meta['timed_out']);
    }


    /**
     * Test Unsubscribe command.
     *
     * @return void
     */
    public function testUnsubscribe()
    {
        $sid = $this->c->subscribe(
            'unsub',
            function ($res) {
                $this->assertTrue(false);
            }
        );
        $this->c->unsubscribe($sid);
        $this->c->publish('unsub', 'bar');

        $this->assertTrue(true);
    }


    /**
     * Test Connecting when nats server is not available
     *
     * @return void
     */
    public function testRefusedConnection()
    {
        $this->setExpectedException(\Exception::class);

        $options = new ConnectionOptions();
        $options->setHost('localhost');
        $options->setPort(4223);

        $c = new Connection($options);
        $c->connect();
        $this->assertFalse($this->c->isConnected());
    }
}
