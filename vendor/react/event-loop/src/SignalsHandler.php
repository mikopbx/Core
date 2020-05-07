<?php

namespace React\EventLoop;

use function array_search;
use function call_user_func;
use function count;
use function in_array;

/**
 * @internal
 */
final class SignalsHandler
{
    private $signals = array();

    public function add($signal, $listener)
    {
        if (!isset($this->signals[$signal])) {
            $this->signals[$signal] = array();
        }

        if (in_array($listener, $this->signals[$signal])) {
            return;
        }

        $this->signals[$signal][] = $listener;
    }

    public function remove($signal, $listener)
    {
        if (!isset($this->signals[$signal])) {
            return;
        }

        $index = array_search($listener, $this->signals[$signal], true);
        unset($this->signals[$signal][$index]);

        if (isset($this->signals[$signal]) && count($this->signals[$signal]) === 0) {
            unset($this->signals[$signal]);
        }
    }

    public function call($signal)
    {
        if (!isset($this->signals[$signal])) {
            return;
        }

        foreach ($this->signals[$signal] as $listener) {
            call_user_func($listener, $signal);
        }
    }

    public function count($signal)
    {
        if (!isset($this->signals[$signal])) {
            return 0;
        }

        return count($this->signals[$signal]);
    }

    public function isEmpty()
    {
        return !$this->signals;
    }
}
