<?php
namespace Nats;

/**
 * Class Exception
 *
 * @package Nats
 */
class Exception extends \Exception
{


    /**
     * Creates an Exception for a failed connection.
     *
     * @param string $response The failed error response.
     *
     * @return \Nats\Exception
     */
    public static function forFailedConnection($response)
    {
        return new static(sprintf('Failed to connect: %s', $response));
    }


    /**
     * Creates an Exception for a failed PING response.
     *
     * @param string $response The failed PING response.
     *
     * @return \Nats\Exception
     */
    public static function forFailedPing($response)
    {
        return new static(sprintf('Failed to ping: %s', $response));
    }


    /**
     * Creates an Exception for an invalid Subscription Identifier (sid).
     *
     * @param string $subscription The Subscription Identifier (sid).
     *
     * @return \Nats\Exception
     */
    public static function forSubscriptionNotFound($subscription)
    {
        return new static(sprintf('Subscription not found: %s', $subscription));
    }


    /**
     * Creates an Exception for an invalid Subscription Identifier (sid) callback.
     *
     * @param string $subscription The Subscription Identifier (sid).
     *
     * @return \Nats\Exception
     */
    public static function forSubscriptionCallbackInvalid($subscription)
    {
        return new static(sprintf('Subscription callback is invalid: %s', $subscription));
    }


    /**
     * Creates an Exception for the failed creation of a Stream Socket Client.
     *
     * @param string  $message The system level error message.
     * @param integer $code    The system level error code.
     *
     * @return \Nats\Exception
     */
    public static function forStreamSocketClientError($message, $code)
    {
        return new static(sprintf('A Stream Socket Client could not be created: (%d) %s', $code, $message), $code);
    }
}
