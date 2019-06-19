<?php

namespace Http\Client\Exception;

use Http\Client\Exception;
use RuntimeException;

/**
 * Base exception for transfer related exceptions.
 *
 * @author Márk Sági-Kazár <mark.sagikazar@gmail.com>
 */
class TransferException extends RuntimeException implements Exception
{
}
