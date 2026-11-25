#!/bin/bash
#
# MikoPBX - free phone system for small business
# Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation; either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License along with this program.
# If not, see <https://www.gnu.org/licenses/>.
#

#
# WARNING!!!
# This script is used solely for system updates.
# It must not rely on external dependencies not packaged with it.
#
# Внимание!!!
# Этот скрипт используется только для обновления системы.
# Он не должен зависеть от внешних зависимостей и других скриптов,
# которых может не быть в исходной системе.

# Setup console output - redirect to /dev/console only if accessible
# Serial output is handled independently by pbx_firmware and pbx-message
# Write actual content to test console (empty writes may succeed on broken devices)
if [ -w /dev/console ] && { echo "  - MikoPBX firmware upgrade" > /dev/console; } 2>/dev/null; then
    exec </dev/console >/dev/console 2>/dev/console
fi

detect_upgrade_serial_port() {
    local _DEV _serialInfo _SETSERIAL

    # Match pbx-env-detect: never open ttyS* directly. Phantom serial devices can
    # be writable but fail or block on write/open in VMs and VPS environments.
    _SETSERIAL="setserial"
    command -v setserial >/dev/null 2>&1 || _SETSERIAL="busybox setserial"
    for _DEV in /dev/ttyS0 /dev/ttyS1 /dev/ttyS2 /dev/ttyS3 /dev/ttyS4 /dev/ttyS5; do
        [ -c "$_DEV" ] || continue
        _serialInfo=$($_SETSERIAL -g "$_DEV" 2>/dev/null)
        [ -z "$_serialInfo" ] && continue
        case "$_serialInfo" in
            *unknown*) continue ;;
        esac
        # Bound the wait of a last close() for unsent output to 1 s (default 30 s, #1412)
        $_SETSERIAL "$_DEV" closing_wait 100 >/dev/null 2>&1
        echo "$_DEV"
        return 0
    done

    for _DEV in /dev/ttyAMA0 /dev/ttyAMA1 /dev/ttyAMA2 /dev/ttyAMA3; do
        [ -c "$_DEV" ] || continue
        [ -e "/sys/class/tty/${_DEV#/dev/}/device" ] || continue
        $_SETSERIAL "$_DEV" closing_wait 100 >/dev/null 2>&1
        echo "$_DEV"
        return 0
    done

    return 0
}

# Detect serial port for this script's own messages (self-contained, no external deps)
_SERIAL=$(detect_upgrade_serial_port)

# Arguments of a 1 s SIGKILL timeout for this busybox: before 2020.3 it only knew
# "-t SECS". SIGKILL because a caller that ignores SIGTERM passes SIG_IGN on.
# Without a usable timeout the serial port is not written at all.
if /bin/busybox timeout -s KILL 1 true >/dev/null 2>&1; then
    _SERIAL_TIMEOUT="-s KILL 1"
elif /bin/busybox timeout -t 1 -s KILL true >/dev/null 2>&1; then
    _SERIAL_TIMEOUT="-t 1 -s KILL"
else
    _SERIAL=""
fi

# Echo to both console (stdout) and serial port. The serial write runs under a
# 1 s timeout: a port whose output does not drain blocks it forever (#1412).
# A port that timed out is dropped for the rest of the upgrade and flagged as
# disabled until reboot, the same flag pbx-message and SerialConsole.php honour.
_echo() {
    local _msg="  - $*" _rc _flag
    echo "$_msg" 2>/dev/null || true
    [ -n "$_SERIAL" ] || return 0
    _flag="/var/run/pbx-serial-disabled/${_SERIAL##*/}"
    if [ -e "$_flag" ]; then
        _SERIAL=""
        return 0
    fi
    # Unquoted on purpose: _SERIAL_TIMEOUT holds several arguments
    /bin/busybox timeout $_SERIAL_TIMEOUT /bin/sh -c 'printf "%s\n" "$1" > "$2"' _ "$_msg" "$_SERIAL" >/dev/null 2>&1
    _rc=$?
    # busybox timeout exits 128 + the signal number (137) when it had to kill the writer
    if [ "$_rc" -eq 137 ]; then
        /bin/busybox mkdir -p /var/run/pbx-serial-disabled 2>/dev/null
        if ( set -C; printf 'reason=%s\ntime=%s\nby=%s\n' "write timed out" "$(/bin/busybox date +%s)" "firmware_upgrade" \
            > "$_flag" ) 2>/dev/null; then
            /bin/busybox logger -t pbx-serial -p daemon.warning \
                "Serial console $_SERIAL disabled until reboot: write timed out." 2>/dev/null
        fi
        _SERIAL=""
    fi
    return 0
}

# Global variables
ENV_FILE=".env"
if [ -f "$ENV_FILE" ]; then
    export $(xargs < "$ENV_FILE");
fi

# mountDiskPart: Mounts a disk partition by UUID.
# Args:
#   $1: UUID of the disk partition.
#   $2: Mount point.
mountDiskPart()
{
  uuid="$1";
  mountpoint="$2";
  if [ '1' = "$(/sbin/blkid | /bin/busybox grep "$uuid" > /dev/null)" ]; then
    _echo " - Storage disk with UUID=${uuid} not found..."
    exit 1;
  fi

  mkdir -p "$mountpoint";
  mount -rw UUID="$uuid" "$mountpoint" 2> /dev/null;
  MOUNT_RESULT=$?;
  if [ ! "${MOUNT_RESULT}" = "0" ] ; then
    _echo " - Fail mount storage with UUID=${uuid} to ${mountpoint} ..."
    exit 1;
  fi
}

# Mounts storage and configuration partitions
mountPartitions() {
    umount "/system" 2>/dev/null
    mountDiskPart "$STORAGE_UUID" '/storage/usbdisk1' || return 1
    mountDiskPart "$CF_UUID" '/cf' || return 1
}

# Executes the pbx_firmware update from the current script directory
executeFirmwareUpdate() {
    local systemDevice=$(lsblk -o UUID,PKNAME | grep "$CF_UUID" | cut -d ' ' -f 2)
    if [ -b "/dev/${systemDevice}" ]; then
      mkdir -p /var/etc
      echo '/storage/usbdisk1' > /var/etc/storage_device
      echo "$systemDevice" > /var/etc/cfdevice
      /bin/bash pbx_firmware "$UPDATE_IMG_FILE" "$systemDevice"
    else
      _echo ' - System disk not found...'
      return 1
    fi
}

# Starts the upgrade process
startUpgrade() {
    # Extract version from firmware image filename (e.g. mikopbx-2026.1.159-dev-x86_64.img)
    local versionNumber=""
    if [ -n "$UPDATE_IMG_FILE" ]; then
      versionNumber=$(echo "$UPDATE_IMG_FILE" | sed -n 's/.*mikopbx-\([0-9][0-9.]*[a-z-]*\)-.*/\1/p')
    fi
    # Fallback to version file (upgrade script version)
    if [ -z "$versionNumber" ] && [ -f "version" ]; then
      versionNumber=$(cat "version")
    fi

    if [ -n "$versionNumber" ]; then
      _echo "Starting upgrade to version $versionNumber..."
    else
      _echo "Starting upgrade..."
    fi

    mountPartitions && executeFirmwareUpdate
}

# Start the upgrade process
startUpgrade
