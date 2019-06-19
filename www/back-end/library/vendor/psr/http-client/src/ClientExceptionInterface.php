<?php

namespace Psr\Http\Client;

use Throwable;

/**
 * Every HTTP client related exception MUST implement this interface.
 */
interface ClientExceptionInterface extends Throwable
{
}
