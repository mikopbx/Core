<?php
namespace spec\Nats;

use PhpSpec\ObjectBehavior;
use Prophecy\Argument;

class ConnectionSpec extends ObjectBehavior
{
    function it_is_initializable()
    {
        $this->shouldHaveType('Nats\Connection');
    }

    function it_has_ping_count_to_zero()
    {
        $this->pingsCount()->shouldBe(0);
    }

    function it_has_pubs_count_to_zero()
    {
        $this->pubsCount()->shouldBe(0);
    }

    function it_has_reconnects_count_to_zero()
    {
        $this->reconnectsCount()->shouldBe(0);
    }

    function it_has_subscriptions_count_to_zero()
    {
        $this->subscriptionsCount()->shouldBe(0);
    }

    function it_subscriptions_array_is_empty()
    {
        $this->getSubscriptions()->shouldHaveCount(0);
    }

    function it_is_disconnected()
    {
        $this->isConnected()->shouldBe(false);
    }

    function it_connects_and_disconnects_with_default_options()
    {
        $this->connect();
        $this->shouldHaveType('Nats\Connection');
        $this->isConnected()->shouldBe(true);
        $this->close();
        $this->isConnected()->shouldBe(false);
    }

    function it_increases_reconnects_count_on_each_reconnection()
    {
        $this->connect();
        $this->reconnect();
        $this->reconnectsCount()->shouldBe(1);
        $this->isConnected()->shouldBe(true);
        $this->close();
    }

    function it_sends_ping_after_a_successful_connection()
    {
        $this->connect();
        $this->pingsCount()->shouldBe(1);
        $this->close();
    }

    function it_increases_pubs_after_publishing_a_message()
    {
        $this->connect();
        $this->publish("foo");
        $this->pubsCount()->shouldBe(1);
        $this->close();
    }

    function it_increases_subscriptions_after_subscribing_to_a_topic()
    {
        $this->connect();
        $callback = function($payload) {};
        $sid = $this->subscribe("foo", $callback);
        $this->subscriptionsCount()->shouldBe(1);
        $this->unsubscribe($sid);
        $this->close();
    }

    function it_decreases_subscriptions_after_unsubscribing_to_a_topic()
    {
        $this->connect();
        $callback = function($payload) {};
        $sid = $this->subscribe("foo", $callback);
        $this->unsubscribe($sid);
        $this->subscriptionsCount()->shouldBe(0);
        $this->close();
    }

    function it_sends_a_message_with_a_1024c_subject()
    {
        $this->connect();
        $subject = str_pad("", 1024*1, "x");
        $this->publish($subject);
        $this->pubsCount()->shouldBe(1);
        $this->close();
    }

    function it_sends_a_message_with_a_1024x10c_subject()
    {
        $this->connect();
        $subject = str_pad("", 1024*10, "x");
        $this->publish($subject);
        $this->pubsCount()->shouldBe(1);
        $this->close();
    }

    function it_sends_a_message_with_a_1024x100c_subject()
    {
        $this->connect();
        $subject = str_pad("", 1024*100, "x");
        $this->publish($subject);
        $this->pubsCount()->shouldBe(1);
        $this->close();
    }
}