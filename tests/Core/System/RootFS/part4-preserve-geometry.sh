#!/bin/bash
#
# MikoPBX - free phone system for small business
# Copyright © 2017-2026 Alexey Portnov and Nikolay Beketov
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
# Regression test for single-disk Storage preservation (GitHub #1077, #1417, #1418).
#
# Replays the pbx_firmware preserve sequence on a sparse loop disk with the
# geometry from #1417 (500118192 sectors of 512 B, Storage at 1228800s) and runs
# the working-tree initial_storage_part_four against it:
#   - Storage ending at 500117503 (old installers, the #1417 report)
#   - Storage ending at 500115455 (current fresh install)
#   - Storage ending at the last usable sector
#   - ext4 larger than the partition -> must stop with exit 11
#
# #1418 delivery check: the same scenarios must also pass through the copy of
# the script embedded in pbx_firmware, because during a real update that
# embedded copy — not /sbin/initial_storage_part_four from the OLD initramfs —
# is what runs.
#
# Host usage (needs Docker; the disk stays sparse, a few hundred MB are written):
#   tests/Core/System/RootFS/part4-preserve-geometry.sh <mikopbx-*-x86_64.img> [docker-image]
# The IMG is the gzip-compressed firmware image from a GitHub release. The
# docker image only supplies parted/sgdisk/e2fsprogs/busybox and defaults to the
# latest mikopbx/mikopbx-arm64 or -x86-64 tag matching the host architecture.
#

set -u

REPO_ROOT=$(cd "$(dirname "$0")/../../../.." && pwd)
PART4_SCRIPT=src/Core/System/RootFS/sbin/initial_storage_part_four
PBX_FIRMWARE=src/Core/System/RootFS/sbin/pbx_firmware

if [ "${1:-}" != "--inside" ]; then
    IMG=${1:-}
    if [ -z "$IMG" ] || [ ! -f "$IMG" ]; then
        echo "Usage: $0 <mikopbx-*-x86_64.img> [docker-image]" >&2
        exit 2
    fi
    IMG=$(cd "$(dirname "$IMG")" && pwd)/$(basename "$IMG")
    case "$(uname -m)" in
        arm64|aarch64) DEFAULT_IMAGE=mikopbx/mikopbx-arm64:latest ;;
        *) DEFAULT_IMAGE=ghcr.io/mikopbx/mikopbx-x86-64:latest ;;
    esac
    exec docker run --rm --privileged \
        -v "$IMG:/test/firmware.img:ro" \
        -v "$REPO_ROOT/$PART4_SCRIPT:/sbin/initial_storage_part_four:ro" \
        -v "$REPO_ROOT/$PBX_FIRMWARE:/test/pbx_firmware:ro" \
        -v "$REPO_ROOT/tests/Core/System/RootFS/part4-preserve-geometry.sh:/test/run.sh:ro" \
        --entrypoint /bin/bash "${2:-$DEFAULT_IMAGE}" /test/run.sh --inside
fi

IMG=/test/firmware.img
DISK=/tmp/part4-disk.raw
DISK_SECTORS=500118192
START=1228800
MNT=/tmp/part4-mnt
FAILED=0

# The container has no udev: re-create /dev/<loop>pN from sysfs after every
# blockdev call, the way udev would after a partition table reread.
install_udev_standin() {
    local name=$1
    cp /sbin/blockdev /tmp/blockdev.real
    cat > /tmp/blockdev.wrap <<EOF
#!/bin/sh
/tmp/blockdev.real "\$@"; rc=\$?
rm -f /dev/${name}p*
for s in /sys/block/${name}/${name}p*; do
    [ -e "\$s/dev" ] || continue
    mm=\$(cat "\$s/dev")
    mknod "/dev/\${s##*/}" b "\${mm%:*}" "\${mm#*:}"
done
exit \$rc
EOF
    chmod +x /tmp/blockdev.wrap
    mount --bind /tmp/blockdev.wrap /sbin/blockdev
}

write_image() {
    /bin/busybox gunzip -c "$IMG" | dd of="$1" bs=4M 2>/dev/null
}

reread() {
    /sbin/blockdev --rereadpt "$1" >/dev/null 2>&1
    sleep 1
}

# run_case <name> <original end sector> <extra ext4 blocks> <expected exit code> [script]
run_case() {
    local name=$1 origEnd=$2 extraBlocks=$3 expectRc=$4 script=${5:-/sbin/initial_storage_part_four}
    local loop blocks rc newEnd marker

    rm -f "$DISK"
    truncate -s $((DISK_SECTORS * 512)) "$DISK"
    loop=$(losetup -fP --show "$DISK")
    if [ -z "$loop" ] || [ ! -b "$loop" ]; then
        echo "FAIL $name: could not attach $DISK to a loop device"
        FAILED=1
        [ -n "$loop" ] && losetup -d "$loop" 2>/dev/null
        rm -f "$DISK"
        return
    fi
    install_udev_standin "${loop#/dev/}"

    # Existing installation: firmware image + Storage ending at origEnd.
    write_image "$loop"
    /sbin/sgdisk -e "$loop" >/dev/null 2>&1
    echo fix | /sbin/parted "$loop" print ---pretend-input-tty >/dev/null 2>&1
    # Without udev parted may print a "bug" banner while syncing the kernel view.
    /sbin/parted -s --align none "$loop" "mkpart primary ext4 ${START}s ${origEnd}s" 2>/dev/null
    reread "$loop"
    if [ "$extraBlocks" -gt 0 ]; then
        blocks=$(( $(/sbin/blockdev --getsize64 "${loop}p4") / 4096 + extraBlocks ))
        # mke2fs complains about zeroing past the device end but still writes the
        # oversized superblock; confirm it did, so the exit-11 case is meaningful.
        /sbin/mke2fs -q -F -F -t ext4 -b 4096 "${loop}p4" "$blocks" 2>/dev/null
        if ! /sbin/dumpe2fs -h "${loop}p4" 2>/dev/null | grep -q "^Block count: *${blocks}$"; then
            echo "FAIL $name: could not build an ext4 of $blocks blocks on ${loop}p4"
            FAILED=1
            umount /sbin/blockdev
            losetup -d "$loop"
            rm -f "$DISK"
            return
        fi
    else
        /sbin/mke2fs -q -F -t ext4 "${loop}p4"
    fi
    mkdir -p "$MNT"
    if mount "${loop}p4" "$MNT" 2>/dev/null; then
        echo "storage-1417" > "$MNT/marker"
        umount "$MNT"
    fi
    export STORAGE_UUID
    STORAGE_UUID=$(/sbin/blkid -o value -s UUID "${loop}p4")

    # pbx_firmware: back up the superblock, capture the start, wipe, write, sgdisk -e.
    cd /tmp || exit 1
    export FS_BACKUP_PART4=fs-backup-part4.img
    dd if="${loop}p4" of="$FS_BACKUP_PART4" bs=1M count=1 2>/dev/null
    export PART4_PRESERVE=1
    export PART4_START
    PART4_START=$(/sbin/parted -s "$loop" unit s print | awk '$1=="4"{gsub(/s/,"",$2); print $2}')
    /sbin/sgdisk -Z "$loop" >/dev/null 2>&1
    write_image "$loop"
    reread "$loop"
    /sbin/sgdisk -e "$loop" >/dev/null 2>&1

    # The repository keeps rootfs scripts without the exec bit; the build sets it.
    /bin/sh "$script" update "$loop" > /tmp/part4.log 2>&1
    rc=$?

    reread "$loop"
    newEnd=$(/sbin/parted -s "$loop" unit s print 2>/dev/null | awk '$1=="4"{gsub(/s/,"",$3); print $3}')
    marker=''
    if mount "${loop}p4" "$MNT" 2>/dev/null; then
        marker=$(cat "$MNT/marker" 2>/dev/null)
        umount "$MNT"
    fi

    if [ "$rc" = "$expectRc" ] && { [ "$expectRc" != "0" ] || [ "$marker" = "storage-1417" ]; }; then
        echo "PASS $name: end ${origEnd} -> ${newEnd}, exit $rc"
    else
        echo "FAIL $name: end ${origEnd} -> ${newEnd}, exit $rc (expected $expectRc), marker '${marker}'"
        sed 's/^/    | /' /tmp/part4.log
        FAILED=1
    fi

    umount /sbin/blockdev
    losetup -d "$loop"
    rm -f "$DISK" "$FS_BACKUP_PART4"
}

# The container /dev only has the loop nodes Docker copied at start; loop devices
# left attached by other containers in the same VM make losetup -f pick a number
# without a node here. Create the missing nodes (block major 7).
for i in $(seq 0 63); do
    [ -e "/dev/loop$i" ] || mknod "/dev/loop$i" b 7 "$i"
done

# #1418: extract the script embedded in pbx_firmware the way a consumer of the
# heredoc would, and prove it is the very copy that will run during a real
# update — not the (old) /sbin one from the system being upgraded.
EMBEDDED=/tmp/initial_storage_part_four.embedded
sed -n "/<<'MIKOPBX_PART4_SCRIPT_EOF'/,/^MIKOPBX_PART4_SCRIPT_EOF$/p" /test/pbx_firmware \
    | sed '1d;$d' > "$EMBEDDED"
if cmp -s "$EMBEDDED" /sbin/initial_storage_part_four; then
    echo "PASS embedded-copy-matches-rootfs-script"
else
    echo "FAIL embedded-copy-matches-rootfs-script: heredoc in pbx_firmware differs from initial_storage_part_four"
    FAILED=1
fi

run_case "old-installer-layout" 500117503 0 0
run_case "fresh-install-layout" 500115455 0 0
run_case "end-at-last-usable" 500118158 0 0
run_case "ext4-larger-than-partition" 500118158 300 11
run_case "embedded-old-installer-layout" 500117503 0 0 "$EMBEDDED"
run_case "embedded-ext4-larger-than-partition" 500118158 300 11 "$EMBEDDED"

exit "$FAILED"
