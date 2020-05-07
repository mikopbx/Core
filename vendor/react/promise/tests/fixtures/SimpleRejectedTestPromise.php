<?php

namespace React\Promise;

use Exception;
use Throwable;

class SimpleRejectedTestPromise implements PromiseInterface
{
    public function then(callable $onFulfilled = null, callable $onRejected = null, callable $onProgress = null)
    {
        try {
            if ($onRejected) {
                $onRejected('foo');
            }

            return new self();
        } catch (Throwable $exception) {
            return new RejectedPromise($exception);
        } catch (Exception $exception) {
            return new RejectedPromise($exception);
        }
    }
}
