<?php

declare(strict_types=1);

namespace MikoPBX\Core\Workers\Libs\WorkerCallEvents;

/**
 * Re-resolves the display name of the extension that answered a picked-up call.
 *
 * The pickup CDR row is cloned from the intercepted party's leg (see
 * {@see \MikoPBX\Core\Workers\Libs\WorkerCallEvents\ActionDialAnswer::fillPickUpCdr()}),
 * so it inherits that party's dst_name. After dst_num/dst_chan are re-pointed to the
 * extension that actually answered the pickup, the display name must be looked up again
 * for that extension; otherwise the CDR shows the intercepted party's name for the agent
 * who picked the call up.
 */
final class PickupDestinationNameResolver
{
    /**
     * Resolves the answering extension's display name.
     *
     * @param string   $dstNum Number of the extension that answered the pickup.
     * @param callable  $lookup fn(string $number): string - resolves a display name from a
     *                          number (e.g. Extensions::getCidByPhoneNumber). By convention it
     *                          returns the number itself when the name is unknown.
     * @return string The answering extension's display name, or '' when it cannot be resolved.
     */
    public static function resolve(string $dstNum, callable $lookup): string
    {
        $dstNum = trim($dstNum);
        if ($dstNum === '') {
            return '';
        }

        $name = trim((string)$lookup($dstNum));

        // An empty result or the bare number back means "no name available": return '' rather
        // than keeping the cloned intercepted party's name or writing the number as a name.
        if ($name === '' || $name === $dstNum) {
            return '';
        }

        return strip_tags($name);
    }
}
