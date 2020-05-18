<?php
namespace spec\Nats;

use Nats\Connection;

use PhpSpec\ObjectBehavior;

class MessageSpec extends ObjectBehavior
{
    function let()
    {
        $conn = new Connection();

        $this->beConstructedWith('subject', 'body', 'sid', $conn);
    }

    function it_is_initializable()
    {
        $this->shouldHaveType('Nats\Message');
    }

    function it_has_a_subject()
    {
        $this->getSubject()->shouldBe('subject');
    }

    function it_has_a_body()
    {
        $this->getBody()->shouldBe('body');
    }

    function it_has_a_sid()
    {
        $this->getSid()->shouldBe('sid');
    }

    function it_has_connection()
    {
        $this->getConn()->shouldHaveType('Nats\Connection');
    }
}