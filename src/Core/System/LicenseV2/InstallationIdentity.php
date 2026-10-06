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
        $this->reclaim();
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
        $privateKeyFile = "$this->dir/" . self::PRIVATE_KEY_FILE;
        $privateKeyPem = is_readable($privateKeyFile) ? (string)file_get_contents($privateKeyFile) : '';
        if ($privateKeyPem === '' || !openssl_sign($data, $signature, $privateKeyPem, 0)) {
            throw new RuntimeException('Can not sign the request with the installation key');
        }
        return $signature;
    }

    /**
     * Takes the directory back for root: the private key must stay root-only, and only root workers may
     * write the state. The web side keeps reading the public key, the token and the state.
     * Storage::saveFstab() skips this directory when it gives /cf to the web server user; this repairs
     * stations whose directory was handed over before that, or by any other wholesale rights change.
     *
     * ponytail: a directory handed over stays readable and replaceable by the web server user until
     * a root process builds the identity.
     */
    private function reclaim(): void
    {
        if (posix_getuid() !== 0 || is_link($this->dir)) {
            return;
        }
        // The directory first: once it is root's and not writable by others, its entries can not be swapped.
        if (fileowner($this->dir) !== 0) {
            chown($this->dir, 0);
        }
        if ((fileperms($this->dir) & 0022) !== 0) {
            chmod($this->dir, 0755);
        }
        // Links are left alone: the web server user may have planted one while it owned the directory, and
        // chown/chmod would follow it. Temporary files are root's own and may vanish mid-loop (writeAtomically).
        foreach (glob("$this->dir/*") ?: [] as $path) {
            if (!is_link($path) && !str_ends_with($path, '.tmp') && fileowner($path) !== 0) {
                chown($path, 0);
            }
        }
        $privateKeyFile = "$this->dir/" . self::PRIVATE_KEY_FILE;
        if (!is_link($privateKeyFile) && is_file($privateKeyFile) && (fileperms($privateKeyFile) & 0777) !== 0600) {
            chmod($privateKeyFile, 0600);
        }
    }

    /**
     * @throws RuntimeException
     */
    private function generate(): void
    {
        // Asked beforehand instead of "@": the web server user gets here first on a fresh PBX
        // and must fail quietly, the key pair is created by the next root worker.
        // Writable is not enough: the T2SDE boot hands /cf/conf to the web server user.
        if (posix_getuid() !== 0 || !is_writable(is_dir($this->dir) ? $this->dir : dirname($this->dir))) {
            throw new RuntimeException("Installation key pair is not created yet and $this->dir is not writable");
        }
        if (!is_dir($this->dir) && !mkdir($this->dir, 0755, true) && !is_dir($this->dir)) {
            throw new RuntimeException("Can not create $this->dir");
        }
        // Two root workers may get here together on the first boot; a mixed pair of their keys
        // would be rejected by the server forever, so only the first one generates.
        $lock = fopen("$this->dir/" . self::PUBLIC_KEY_FILE . '.lock', 'c');
        if ($lock === false || !flock($lock, LOCK_EX)) {
            throw new RuntimeException("Can not lock $this->dir");
        }
        try {
            if (!is_file("$this->dir/" . self::PUBLIC_KEY_FILE)) {
                $this->writeKeyPair();
            }
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }

    /**
     * @throws RuntimeException
     */
    private function writeKeyPair(): void
    {
        $key = openssl_pkey_new(['private_key_type' => OPENSSL_KEYTYPE_ED25519]);
        if ($key === false || !openssl_pkey_export($key, $privateKeyPem)) {
            throw new RuntimeException('Can not generate the installation key pair');
        }
        // The private key is owner-only from the first byte; the public key is written last,
        // so an interrupted run is simply repeated.
        $previousMask = umask(0077);
        $written = file_put_contents("$this->dir/" . self::PRIVATE_KEY_FILE, $privateKeyPem);
        umask($previousMask);
        $publicKeyPem = openssl_pkey_get_details($key)['key'];
        if ($written === false || file_put_contents("$this->dir/" . self::PUBLIC_KEY_FILE, $publicKeyPem) === false) {
            throw new RuntimeException("Can not write the installation key pair to $this->dir");
        }
    }
}
