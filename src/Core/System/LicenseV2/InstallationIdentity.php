<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2026 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

declare(strict_types=1);

namespace MikoPBX\Core\System\LicenseV2;

use RuntimeException;

/**
 * Ed25519 key pair of this installation. The private key never leaves the PBX,
 * the public key is registered on the licensing server at activation.
 *
 * The private key is readable by root only: requests are built by root workers.
 * The web server user needs just the public half to check that a token belongs here.
 *
 * ponytail: root can copy the private key to a clone; cloning is detected server-side
 * (one installation active from several addresses), not here.
 */
class InstallationIdentity
{
    private const string PRIVATE_KEY_FILE = 'installation-private.pem';
    private const string PUBLIC_KEY_FILE = 'installation-public.pem';

    private string $publicKeyPem;

    /**
     * @throws RuntimeException When the key pair is missing and can not be created by this user.
     */
    public function __construct(private readonly string $dir)
    {
        $publicKeyFile = "$dir/" . self::PUBLIC_KEY_FILE;
        if (!is_file($publicKeyFile)) {
            $this->generate();
        }
        $this->publicKeyPem = (string)file_get_contents($publicKeyFile);
        if (openssl_pkey_get_public($this->publicKeyPem) === false) {
            throw new RuntimeException("Installation public key $publicKeyFile is unreadable or corrupted");
        }
    }

    public function getPublicKeyPem(): string
    {
        return $this->publicKeyPem;
    }

    /**
     * Installation id is derived from the public key, so it can not be claimed without the private key.
     */
    public function getInstallId(): string
    {
        return substr(hash('sha256', $this->publicKeyPem), 0, 32);
    }

    /**
     * @throws RuntimeException When called by a user that can not read the private key.
     */
    public function sign(string $data): string
    {
        $privateKeyPem = (string)@file_get_contents("$this->dir/" . self::PRIVATE_KEY_FILE);
        if (!openssl_sign($data, $signature, $privateKeyPem, 0)) {
            throw new RuntimeException('Can not sign the request with the installation key');
        }
        return $signature;
    }

    /**
     * @throws RuntimeException
     */
    private function generate(): void
    {
        $key = openssl_pkey_new(['private_key_type' => OPENSSL_KEYTYPE_ED25519]);
        if ($key === false || !openssl_pkey_export($key, $privateKeyPem)) {
            throw new RuntimeException('Can not generate the installation key pair');
        }
        if (!is_dir($this->dir) && !@mkdir($this->dir, 0755, true) && !is_dir($this->dir)) {
            throw new RuntimeException("Can not create $this->dir");
        }
        // The private key is owner-only from the first byte; the public key is written last,
        // so an interrupted run is simply repeated.
        $previousMask = umask(0077);
        $written = @file_put_contents("$this->dir/" . self::PRIVATE_KEY_FILE, $privateKeyPem);
        umask($previousMask);
        $publicKeyPem = openssl_pkey_get_details($key)['key'];
        if ($written === false || @file_put_contents("$this->dir/" . self::PUBLIC_KEY_FILE, $publicKeyPem) === false) {
            throw new RuntimeException("Can not write the installation key pair to $this->dir");
        }
    }
}
