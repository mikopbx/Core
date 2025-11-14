# Changelog

All notable changes to MikoPBX will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### QEMU Guest Agent Support for KVM-based Cloud Environments

**Feature Overview:**
- Full support for QEMU Guest Agent (qemu-ga) in KVM/QEMU virtualized environments
- Automatic detection and activation in cloud platforms (AWS EC2, GCP, DigitalOcean, Yandex Cloud, etc.)
- Enhanced virtual machine integration for graceful shutdowns, time synchronization, and consistent snapshots

**New Components:**
- `src/Core/System/Configs/QEMUGuestAgentConf.php` - Configuration class for QEMU Guest Agent management
  - Automatic binary detection via `Util::which()`
  - Daemon process management with PID file support
  - Monit integration for process monitoring
  - Graceful degradation when qemu-ga binary is not available

**Enhanced Components:**
- `src/Core/System/Configs/VmToolsConf.php` - Improved hypervisor detection
  - New method `getHypervisor()`: 4-level cascading detection strategy
    1. systemd-detect-virt (most accurate)
    2. lscpu "Hypervisor vendor" field
    3. virtio device presence check (/dev/vd*)
    4. CPU vendor fallback (legacy compatibility)
  - New constants: `KVM` and `QEMU`
  - Extended hypervisor mapping to support KVM/QEMU → QEMUGuestAgentConf
  - Full backward compatibility with existing VMWare Tools integration

**Documentation:**
- `docs/vm-tools.md` - Comprehensive user documentation
  - Supported platforms and cloud providers (13+ major providers)
  - Feature descriptions and capabilities
  - Verification and troubleshooting guides
  - Configuration examples and best practices
  - Security considerations

**Features Enabled:**
- **Graceful Shutdown:** Proper shutdown sequence initiated from hypervisor console
- **Time Synchronization:** Automatic clock sync with host, critical for call logging accuracy
- **Consistent Snapshots:** Filesystem freeze/thaw (fsfreeze) for application-consistent backups
- **System Information Reporting:** VM provides IP addresses, OS version, and status to hypervisor
- **Cloud Integration:** Enhanced compatibility with cloud management platforms

**Supported Cloud Providers:**
- **Global:** AWS (EC2 Nitro), Google Cloud (GCE), Oracle Cloud, Alibaba Cloud, DigitalOcean, Linode, Vultr, Hetzner Cloud, OVHcloud
- **Russian:** Yandex Cloud, VK Cloud, SberCloud
- **OpenStack-based:** Rackspace, DreamHost, and private cloud deployments

**Technical Details:**
- Hypervisor detection priority: systemd-detect-virt → lscpu → virtio devices → CPU vendor
- Process monitoring via Monit with automatic restart on failure
- PID file: `/var/run/qemu-ga.pid`
- Monit config: `/etc/monit.d/050_vm-tools.cfg`
- Zero overhead in non-virtualized environments (Docker, physical servers)
- Automatic disable in Docker containers

**Backward Compatibility:**
- ✅ Full compatibility with existing VMWare Tools integration
- ✅ No breaking changes to existing functionality
- ✅ Graceful degradation when qemu-ga binary is unavailable
- ✅ Existing VMWare deployments continue to work unchanged
- ✅ Physical servers and Docker containers unaffected

**Code Quality:**
- ✅ PHPStan level 5 compliance (no errors)
- ✅ PSR-1, PSR-4, PSR-12 coding standards
- ✅ PHP 8.3 typed properties and constants
- ✅ Complete PHPDoc documentation
- ✅ Proper error handling and graceful degradation

**Files Added:**
- `src/Core/System/Configs/QEMUGuestAgentConf.php`
- `docs/vm-tools.md`

**Files Modified:**
- `src/Core/System/Configs/VmToolsConf.php`

**Migration Notes:**
- No manual migration required
- Automatic detection and activation on first boot after update
- Users in KVM environments will automatically benefit from QEMU Guest Agent integration
- Ensure `qemu-guest-agent` package is installed in base OS for full functionality

---

## Release History

*Previous releases will be documented here*
