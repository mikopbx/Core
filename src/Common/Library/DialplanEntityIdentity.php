<?php

declare(strict_types=1);

namespace MikoPBX\Common\Library;

/**
 * Identity rules for call queues, IVR menus and conference rooms.
 *
 * Their uniqid and extension number are written verbatim into queues.conf and
 * extensions.conf (section names, exten lines, Queue() arguments), so a value
 * carrying a line break or a bracket injects Asterisk configuration.
 *
 * The ID schema patterns are the OpenAPI `pattern` of each resource's `id` and
 * the rule for an ID a client supplies on create (migrations, imports). They
 * follow the REST routes: queue and IVR routes only match PREFIX-<hex>, the
 * conference route also matches the legacy CONFERENCE-ROOM-xxx / CONFERENCExxx
 * forms, so any other ID would create a record that the API cannot reach.
 */
final class DialplanEntityIdentity
{
    public const string QUEUE_ID_SCHEMA_PATTERN = '^QUEUE-[A-Fa-f0-9]{4,64}$';

    public const string IVR_ID_SCHEMA_PATTERN = '^IVR-[A-Fa-f0-9]{4,64}$';

    public const string CONFERENCE_ID_SCHEMA_PATTERN = '^CONFERENCE[A-Za-z0-9-]{1,100}$';

    /** Extension numbers accepted for a new record or a changed number (OpenAPI `pattern` of `extension`). */
    public const string EXTENSION_SCHEMA_PATTERN = '^[0-9]{2,8}$';

    /** Stored routing destinations (extension numbers, system targets such as hangup or voicemail). */
    private const string STORED_DESTINATION_PATTERN = '/^[A-Za-z0-9*#+_.-]{1,64}$/D';

    /** Stored IVR menu digits. */
    private const string STORED_DIGITS_PATTERN = '/^[0-9*#]{1,10}$/D';

    /** Stored extension numbers that are safe to write into configs (legacy rows may be shorter). */
    private const string STORED_EXTENSION_PATTERN = '/^[0-9]{1,32}$/D';

    /** Stored uniqids that are safe to write into configs. */
    private const string STORED_ID_PATTERN = '/^[A-Za-z0-9_.-]{1,128}$/D';

    /**
     * Checks an ID a client supplies when creating a record.
     *
     * @param mixed $id Client-supplied ID.
     * @param string $schemaPattern One of the *_ID_SCHEMA_PATTERN constants.
     */
    public static function isValidClientId(mixed $id, string $schemaPattern): bool
    {
        return is_string($id) && preg_match('/' . $schemaPattern . '/D', $id) === 1;
    }

    /**
     * Checks an extension number for a new record or a changed number.
     */
    public static function isValidNewExtension(mixed $extension): bool
    {
        return (is_string($extension) || is_int($extension))
            && preg_match('/' . self::EXTENSION_SCHEMA_PATTERN . '/D', (string)$extension) === 1;
    }

    /**
     * Checks a stored extension number before it is written into Asterisk configs.
     */
    public static function isConfigSafeExtension(mixed $extension): bool
    {
        return (is_string($extension) || is_int($extension))
            && preg_match(self::STORED_EXTENSION_PATTERN, (string)$extension) === 1;
    }

    /**
     * Checks a stored routing destination before it is written into Asterisk configs.
     */
    public static function isConfigSafeDestination(mixed $destination): bool
    {
        return (is_string($destination) || is_int($destination))
            && preg_match(self::STORED_DESTINATION_PATTERN, (string)$destination) === 1;
    }

    /**
     * Checks stored IVR menu digits before they are written into Asterisk configs.
     */
    public static function isConfigSafeDigits(mixed $digits): bool
    {
        return (is_string($digits) || is_int($digits))
            && preg_match(self::STORED_DIGITS_PATTERN, (string)$digits) === 1;
    }

    /**
     * Checks a stored record before its uniqid and extension are written into Asterisk configs.
     */
    public static function isConfigSafe(mixed $uniqid, mixed $extension): bool
    {
        return is_string($uniqid)
            && preg_match(self::STORED_ID_PATTERN, $uniqid) === 1
            && self::isConfigSafeExtension($extension);
    }
}
