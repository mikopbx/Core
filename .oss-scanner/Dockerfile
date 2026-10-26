# MikoPBX Core, built the way the Anthropic OSS Scanner builds it.
#
# /src                           the Core git checkout (the repository named in project.yaml)
# /offload/rootfs/usr/www        the webroot the running PBX serves. Its src, sites, tests and vendor are
#                                symlinks into /src, so a patch written there is the code that runs.
#                                Everything else in the rootfs — nginx and its Lua, /etc/rc, /sbin, php.d —
#                                comes from the base image, NOT from /src. threat_model.md says so too.
#
# The base image is the appliance MikoPBX actually ships (Docker Hub mikopbx/mikopbx), so nginx, php-fpm,
# Asterisk, SQLite, Redis and Beanstalkd are the production builds.
# Start the PBX with `mikopbx-start`; it serves http://127.0.0.1/ and https://127.0.0.1/.
FROM mikopbx/mikopbx:dev

# The scanner's own layer runs `ln -sf /root/.local/bin/claude /usr/local/bin/claude`. The appliance rootfs
# (T2/Linux) ships no /usr/local/bin, which makes that step — and so the whole scan — fail. PATH already has it.
RUN mkdir -p /usr/local/bin

# Pin the container verdict. System::isDocker() is file_exists('/.dockerenv'), and that file is created by the
# Docker runtime, not baked into the image. If the scanner boots this image as a plain VM instead, isDocker()
# turns false and the PBX then manages real iptables and network interfaces, and an API reboot call really
# reboots the machine the scan is running on. Creating the file here makes the Docker path the only path;
# a Docker runtime simply reuses it.
RUN touch /.dockerenv

# Offline-friendly defaults. Nothing here sets an administrator credential: the appliance comes up with the
# product's own first-run login, admin / admin (PbxSettingsDefaultValuesTrait.php), which the agent needs for
# post-auth reproductions and which is already public in this repository. Setting a password here would either
# publish a new fixed credential or hide a generated one in the image, and neither buys anything.
#
# Firewall and fail2ban are deliberately NOT switched off: PBX_FIREWALL_ENABLED / PBX_FAIL2BAN_ENABLED would be
# overwritten anyway, because markProvisioningCompleteDirect() force-enables both on first boot. threat_model.md
# tells the agent that fail2ban is live and how to lift a ban on itself.
ENV SEND_METRICS=0 \
    AUTO_UPDATE_EXTERNAL_IP=0

# scanner contract: the checkout lives inside the image, at /src
COPY . /src
WORKDIR /src

# The shipped image carries a production vendor/ with no dev dependencies, and T2/Linux has no package manager,
# so fetch composer here while the network is still available. ext-zip is present, which is what composer needs
# to unpack dists (the image has neither unzip nor git).
RUN curl -fsSL https://getcomposer.org/download/latest-stable/composer.phar -o /usr/local/bin/composer \
    && chmod +x /usr/local/bin/composer \
    && composer --version
#
# One property of the repository shapes this step:
#   - composer.lock is gitignored, so this resolves dependencies to latest rather than installing a lock,
#     and the resulting vendor/ can differ from the one a released image ships.
RUN COMPOSER_ALLOW_SUPERUSER=1 COMPOSER_NO_INTERACTION=1 \
      composer install --no-progress --prefer-dist --working-dir=/src

# Serve the checkout instead of the code baked into the image.
RUN for d in src sites tests vendor; do \
      rm -rf "/offload/rootfs/usr/www/$d" \
      && ln -s "/src/$d" "/offload/rootfs/usr/www/$d"; \
    done

# mikopbx-start boots the PBX the way /sbin/docker-entrypoint does, minus the signal/cleanup wrapper that an
# interactive shell does not want. Safe to run again; the boot log is /tmp/mikopbx-boot.log.
#
# Readiness is NOT nginx answering: nginx is started in the middle of the boot sequence, while the REST API
# workers are spawned later by WorkerSafeScriptsCore. So wait for a reply from the API itself, and require a
# JSON body carrying "result" — an nginx 502, 403 or 429 page is a non-empty body but not a ready API.
# The boot is detached with setsid so it survives the caller's process group being killed on a tool timeout,
# and a boot already in flight is awaited instead of started a second time.
#
# This script does NOT restart a running PBX. To pick up edited backend code, restart the workers:
#   php -f /offload/rootfs/usr/www/src/Core/Workers/Cron/WorkerSafeScriptsCore.php restart
RUN printf '%s\n' \
      '#!/bin/sh' \
      'api_ready() {' \
      '  out=$(curl -s --max-time 10 -X POST http://127.0.0.1/pbxcore/api/v3/auth:login \' \
      '          -H "Content-Type: application/json" -d "{}" 2>/dev/null)' \
      '  case "$out" in *"result"*) return 0 ;; esac' \
      '  return 1' \
      '}' \
      'if api_ready; then echo "PBX already up"; exit 0; fi' \
      'if pgrep -f ContainerEntrypoint.php >/dev/null 2>&1; then' \
      '  echo "a boot is already in flight; waiting for it"' \
      'else' \
      '  setsid nohup php -f /offload/rootfs/usr/www/src/Core/System/ContainerEntrypoint.php \' \
      '    >/tmp/mikopbx-boot.log 2>&1 &' \
      'fi' \
      'i=0' \
      'until api_ready; do' \
      '  i=$((i+1))' \
      '  if [ "$i" -gt 100 ]; then' \
      '    echo "REST API did not answer; see /tmp/mikopbx-boot.log and /storage/usbdisk1/mikopbx/log/system/messages"' \
      '    exit 1' \
      '  fi' \
      '  sleep 3' \
      'done' \
      'echo "PBX up on http://127.0.0.1/ and https://127.0.0.1/ (login admin / admin)"' \
      > /usr/local/bin/mikopbx-start \
    && chmod +x /usr/local/bin/mikopbx-start

# Check the build without booting the PBX: ContainerEntrypoint.php remounts /offload and starts daemons, which an
# unprivileged `docker build` cannot do. `mikopbx-start` belongs in the shell, where the container is privileged.
RUN php -l /src/src/Core/System/ContainerEntrypoint.php \
    && php -r 'require "/src/vendor/autoload.php"; echo "autoload ok\n";' \
    && (/src/vendor/bin/phpunit -c /src/tests/Unit/phpunit.xml /src/tests/Unit/Common/Library \
          || echo "WARNING: unit tests reported failures")
