"use strict";

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

/* global globalTranslate, globalRootUrl, Fail2BanAPI, SemanticLocalization, SecurityUtils */

/**
 * fail2banWhitelist — manages the "Trusted addresses" tab.
 *
 * Single source of truth for the whitelist string lives on the backend in
 * Fail2BanRules.whitelist. This module keeps a parsed in-memory `manual` list,
 * applies add/remove edits locally, and commits via PATCH /fail2ban with the
 * full re-joined string. Auto-trusted entries surfaced from NetworkFilters
 * (newer_block_ip=1) are read-only and link to the originating firewall rule.
 *
 * @module fail2banWhitelist
 */
var fail2banWhitelist = {
  $tableEl: null,
  $input: null,
  $addBtn: null,
  $errorLabel: null,
  $tabSegment: null,
  dataTable: null,
  initialized: false,
  // Parsed lists. Each entry is normalised (lowercase IPv6, trimmed).
  manual: [],
  auto: [],

  /**
   * Wire up DOM handles, build DataTable shell, register events.
   * Called on first activation of the "whitelist" tab.
   */
  initialize: function initialize() {
    if (fail2banWhitelist.initialized) {
      return;
    }

    fail2banWhitelist.initialized = true;
    fail2banWhitelist.$tableEl = $('#whitelist-table');
    fail2banWhitelist.$input = $('#whitelist-input');
    fail2banWhitelist.$addBtn = $('#whitelist-add-btn');
    fail2banWhitelist.$errorLabel = $('#whitelist-input-error');
    fail2banWhitelist.$tabSegment = $('#whitelist-table').closest('.segment');
    fail2banWhitelist.initializeDataTable();
    fail2banWhitelist.$addBtn.on('click', fail2banWhitelist.handleAdd);
    fail2banWhitelist.$input.on('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        fail2banWhitelist.handleAdd();
      }
    }); // The input doubles as a live filter for the table: every keystroke
    // drives DataTable's built-in search engine. We also clear inline
    // errors here so the red label vanishes as soon as the user edits.

    fail2banWhitelist.$input.on('input', function () {
      fail2banWhitelist.clearError();

      if (fail2banWhitelist.dataTable) {
        fail2banWhitelist.dataTable.search(fail2banWhitelist.$input.val() || '').draw();
      }
    }); // Delete-button + auto-row click handler (event delegation — table redraws).

    fail2banWhitelist.$tableEl.on('click', '.whitelist-delete-btn', fail2banWhitelist.handleDelete);
    fail2banWhitelist.$tableEl.on('click', '.whitelist-auto-row', function (e) {
      var filterId = $(e.currentTarget).data('filter-id');

      if (filterId) {
        window.location.href = "".concat(globalRootUrl, "firewall/modify/").concat(filterId);
      }
    });
  },

  /**
   * Build the DataTable shell. Rows are populated by reload().
   */
  initializeDataTable: function initializeDataTable() {
    fail2banWhitelist.dataTable = fail2banWhitelist.$tableEl.DataTable({
      lengthChange: false,
      paging: true,
      pageLength: 15,
      scrollCollapse: true,
      deferRender: true,
      columns: [{
        orderable: true,
        searchable: true
      }, // Address
      {
        orderable: true,
        searchable: true
      }, // Source
      {
        orderable: false,
        searchable: true
      }, // Description
      {
        orderable: false,
        searchable: false
      } // Actions
      ],
      order: [[1, 'asc'], [0, 'asc']],
      language: SemanticLocalization.dataTableLocalisation,
      createdRow: function createdRow(row) {
        $('td', row).eq(3).addClass('collapsing');
      }
    });
  },

  /**
   * Refresh both lists from the API, then redraw.
   * Called on tab activation and after every add/remove.
   */
  reload: function reload() {
    fail2banWhitelist.showLoader();
    Fail2BanAPI.getSettings(function (response) {
      fail2banWhitelist.hideLoader();

      if (!response || !response.result || !response.data) {
        return;
      }

      var whitelistStr = response.data.whitelist || '';
      fail2banWhitelist.manual = fail2banWhitelist.parseManualString(whitelistStr);
      fail2banWhitelist.auto = Array.isArray(response.data.autoWhitelist) ? response.data.autoWhitelist : [];
      fail2banWhitelist.redraw();
    });
  },

  /**
   * Split the stored whitelist string (space/comma/semicolon-separated)
   * into a deduped array of normalised IP/CIDR strings.
   *
   * @param {string} raw
   * @returns {string[]}
   */
  parseManualString: function parseManualString(raw) {
    if (!raw) {
      return [];
    }

    var seen = {};
    var out = [];
    raw.split(/[\s,;]+/).forEach(function (entry) {
      var norm = fail2banWhitelist.normalizeEntry(entry);

      if (norm && !seen[norm]) {
        seen[norm] = true;
        out.push(norm);
      }
    });
    return out;
  },

  /**
   * Rebuild table rows from manual + auto state.
   */
  redraw: function redraw() {
    fail2banWhitelist.dataTable.clear();
    var rows = [];
    fail2banWhitelist.manual.forEach(function (ip) {
      rows.push([fail2banWhitelist.renderAddressCell(ip), "<span class=\"ui basic label\">".concat(SecurityUtils.escapeHtml(globalTranslate.f2b_SourceManual), "</span>"), '', "<button type=\"button\" class=\"ui icon basic mini button right floated whitelist-delete-btn\"\n                         data-ip=\"".concat(SecurityUtils.escapeHtml(ip), "\"\n                         title=\"").concat(SecurityUtils.escapeHtml(globalTranslate.f2b_RemoveFromWhitelist), "\">\n                    <i class=\"icon trash red\"></i>\n                </button>")]);
    });
    fail2banWhitelist.auto.forEach(function (entry) {
      var ip = String(entry.ip || '');
      var desc = String(entry.description || '');
      var filterId = String(entry.filter_id || '');
      rows.push([fail2banWhitelist.renderAddressCell(ip), "<a class=\"ui label whitelist-auto-row\"\n                    data-filter-id=\"".concat(SecurityUtils.escapeHtml(filterId), "\"\n                    title=\"").concat(SecurityUtils.escapeHtml(globalTranslate.f2b_SourceFirewallTooltip), "\"\n                    style=\"cursor:pointer;\">\n                    <i class=\"shield alternate icon\"></i>").concat(SecurityUtils.escapeHtml(globalTranslate.f2b_SourceFirewall), "\n                 </a>"), SecurityUtils.escapeHtml(desc), "<button type=\"button\" class=\"ui icon basic mini button right floated disabled\"\n                         title=\"".concat(SecurityUtils.escapeHtml(globalTranslate.f2b_CannotDeleteAuto), "\">\n                    <i class=\"icon lock grey\"></i>\n                </button>")]);
    });
    fail2banWhitelist.dataTable.rows.add(rows).draw();
  },

  /**
   * Build the first-column cell with a v4/v6 badge.
   *
   * @param {string} ip
   * @returns {string}
   */
  renderAddressCell: function renderAddressCell(ip) {
    var version = ip.indexOf(':') !== -1 ? 'v6' : 'v4';
    var badgeColor = version === 'v6' ? 'teal' : 'blue';
    return "<span class=\"ui mini ".concat(badgeColor, " label\">").concat(version, "</span>&nbsp;").concat(SecurityUtils.escapeHtml(ip));
  },

  /**
   * Parse the input as a delimited list (whitespace, comma, semicolon),
   * triage each token into valid/duplicate/invalid buckets, and commit the
   * batch in one PATCH. Single-address input is just the degenerate case
   * (one token).
   */
  handleAdd: function handleAdd() {
    var raw = (fail2banWhitelist.$input.val() || '').trim();

    if (raw === '') {
      fail2banWhitelist.showError(globalTranslate.f2b_InvalidAddress);
      return;
    }

    var tokens = raw.split(/[\s,;]+/).map(function (s) {
      return s.trim();
    }).filter(function (s) {
      return s.length > 0;
    });
    var blocked = {
      '0.0.0.0': 1,
      '0.0.0.0/0': 1,
      '::': 1,
      '::/0': 1
    };
    var valid = [];
    var rejected = [];
    var duplicates = [];
    var seenInBatch = {};
    tokens.forEach(function (token) {
      var norm = fail2banWhitelist.normalizeEntry(token);

      if (!norm || !fail2banWhitelist.isValidIpOrCidr(norm) || blocked[norm]) {
        rejected.push(token);
        return;
      }

      if (seenInBatch[norm] || fail2banWhitelist.containsEntry(norm)) {
        duplicates.push(token);
        return;
      }

      seenInBatch[norm] = true;
      valid.push(norm);
    });

    if (valid.length === 0) {
      if (rejected.length > 0) {
        fail2banWhitelist.showError(fail2banWhitelist.formatRejected(rejected));
      } else if (duplicates.length > 0) {
        fail2banWhitelist.showError(globalTranslate.f2b_DuplicateAddress);
      } else {
        fail2banWhitelist.showError(globalTranslate.f2b_InvalidAddress);
      }

      return;
    }

    var next = fail2banWhitelist.manual.concat(valid);
    fail2banWhitelist.commit(next, function () {
      if (rejected.length > 0) {
        // Partial success: keep the rejected tokens visible in the
        // input so the admin can fix them, and explain why.
        fail2banWhitelist.$input.val(rejected.join(' '));
        fail2banWhitelist.showError(fail2banWhitelist.formatRejected(rejected)); // Re-apply filter with the leftover text.

        if (fail2banWhitelist.dataTable) {
          fail2banWhitelist.dataTable.search(rejected.join(' ')).draw();
        }
      } else {
        fail2banWhitelist.$input.val('');
        fail2banWhitelist.clearError();

        if (fail2banWhitelist.dataTable) {
          fail2banWhitelist.dataTable.search('').draw();
        }
      }
    });
  },

  /**
   * Render the "rejected entries" message, falling back to a sensible
   * English default if the translation key is missing (older language
   * files may not have f2b_BulkAddRejected yet).
   *
   * @param {string[]} rejectedList
   * @returns {string}
   */
  formatRejected: function formatRejected(rejectedList) {
    var template = globalTranslate.f2b_BulkAddRejected || 'Rejected: %list%';
    return template.replace('%list%', rejectedList.join(', '));
  },

  /**
   * Remove a manual entry on × click.
   *
   * @param {Event} e
   */
  handleDelete: function handleDelete(e) {
    var ip = $(e.currentTarget).data('ip');

    if (!ip) {
      return;
    }

    var target = String(ip);
    var next = fail2banWhitelist.manual.filter(function (entry) {
      return entry !== target;
    });

    if (next.length === fail2banWhitelist.manual.length) {
      return;
    }

    fail2banWhitelist.commit(next);
  },

  /**
   * Send PATCH /fail2ban with the new whitelist string and reload on success.
   *
   * @param {string[]} nextManual
   * @param {function} [onSuccess]
   */
  commit: function commit(nextManual, onSuccess) {
    fail2banWhitelist.showLoader();
    Fail2BanAPI.patch({
      whitelist: nextManual.join(' ')
    }, function (response) {
      if (!response || !response.result) {
        fail2banWhitelist.hideLoader();
        fail2banWhitelist.showError(globalTranslate.f2b_WhitelistSaveError);
        return;
      }

      if (typeof onSuccess === 'function') {
        onSuccess();
      } // reload() handles hideLoader after fresh data arrives.


      fail2banWhitelist.reload();
    });
  },

  /**
   * Check whether an IP/CIDR is already present in either manual or auto list.
   *
   * @param {string} norm
   * @returns {boolean}
   */
  containsEntry: function containsEntry(norm) {
    if (fail2banWhitelist.manual.indexOf(norm) !== -1) {
      return true;
    }

    return fail2banWhitelist.auto.some(function (entry) {
      var autoIp = fail2banWhitelist.normalizeEntry(String(entry.ip || ''));
      return autoIp === norm;
    });
  },

  /**
   * Trim, lowercase IPv6, drop redundant /32 or /128 masks so duplicate detection
   * treats "192.168.1.5" and "192.168.1.5/32" as the same entry.
   *
   * @param {string} raw
   * @returns {string}
   */
  normalizeEntry: function normalizeEntry(raw) {
    var value = String(raw || '').trim();

    if (value === '') {
      return '';
    } // Lowercase only IPv6 (presence of colon); leave IPv4 alone.


    var lowered = value.indexOf(':') !== -1 ? value.toLowerCase() : value; // Strip /32 from IPv4 host, /128 from IPv6 host.

    if (lowered.indexOf(':') === -1 && lowered.endsWith('/32')) {
      return lowered.slice(0, -3);
    }

    if (lowered.indexOf(':') !== -1 && lowered.endsWith('/128')) {
      return lowered.slice(0, -4);
    }

    return lowered;
  },

  /**
   * Client-side validation that mirrors backend canonicalizeEntry() in
   * UpdateSettingsAction. IPv4 is checked via a strict octet regex; IPv6
   * goes through a structural check that accepts "::" compression and
   * CIDR prefixes — the backend re-validates via inet_pton, so the goal
   * here is to catch obvious garbage before issuing the PATCH, not to
   * reproduce inet_pton's exhaustive semantics in JS.
   *
   * @param {string} value
   * @returns {boolean}
   */
  isValidIpOrCidr: function isValidIpOrCidr(value) {
    if (!value) {
      return false;
    } // Split optional CIDR prefix.


    var address = value;
    var prefix = null;
    var slashIdx = value.indexOf('/');

    if (slashIdx !== -1) {
      address = value.substring(0, slashIdx);
      prefix = value.substring(slashIdx + 1);

      if (!/^\d+$/.test(prefix)) {
        return false;
      }
    } // IPv4 literal.


    var ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|1?[0-9]?[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1?[0-9]?[0-9])$/;

    if (ipv4.test(address)) {
      if (prefix === null) return true;
      var p = parseInt(prefix, 10);
      return p >= 0 && p <= 32;
    } // IPv6 literal.


    if (fail2banWhitelist.isLikelyIpv6(address)) {
      if (prefix === null) return true;

      var _p = parseInt(prefix, 10);

      return _p >= 0 && _p <= 128;
    }

    return false;
  },

  /**
   * Lightweight structural check for an IPv6 address. Handles "::"
   * compression — including edge cases where it fills only one zero group
   * at the start or end (`::1:2:3:4:5:6:7`, `1:2:3:4:5:6:7::`) — by
   * counting non-empty groups instead of raw split() length, since edge
   * "::" produces two adjacent empty entries. Not a substitute for
   * inet_pton — the backend is authoritative; the goal here is to filter
   * obvious garbage before issuing the PATCH.
   *
   * @param {string} address
   * @returns {boolean}
   */
  isLikelyIpv6: function isLikelyIpv6(address) {
    if (!address || address.indexOf(':') === -1) return false;
    if (!/^[0-9a-f:]+$/i.test(address)) return false;
    if (address.indexOf(':::') !== -1) return false;
    var doubleColons = address.match(/::/g) || [];
    if (doubleColons.length > 1) return false;
    var groups = address.split(':');
    var nonEmpty = groups.filter(function (g) {
      return g !== '';
    });
    if (!nonEmpty.every(function (g) {
      return /^[0-9a-f]{1,4}$/i.test(g);
    })) return false;

    if (doubleColons.length === 0) {
      // Uncompressed form: exactly 8 hex groups, no empties allowed.
      return groups.length === 8;
    } // Compressed form: "::" must fill at least one zero group, leaving
    // at most 7 explicit groups. (`::` alone -> 0 explicit groups -> valid
    // unspecified address; rejected separately by the blocked-list.)


    return nonEmpty.length <= 7;
  },
  showError: function showError(text) {
    fail2banWhitelist.$errorLabel.text(text).show();
    fail2banWhitelist.$input.closest('.ui.input').addClass('error');
  },
  clearError: function clearError() {
    fail2banWhitelist.$errorLabel.hide().text('');
    fail2banWhitelist.$input.closest('.ui.input').removeClass('error');
  },
  showLoader: function showLoader() {
    if (!fail2banWhitelist.$tabSegment.find('> .ui.dimmer').length) {
      fail2banWhitelist.$tabSegment.append("<div class=\"ui inverted dimmer\">\n                    <div class=\"ui text loader\">".concat(globalTranslate.ex_LoadingData, "</div>\n                </div>"));
    }

    fail2banWhitelist.$tabSegment.find('> .ui.dimmer').addClass('active');
  },
  hideLoader: function hideLoader() {
    fail2banWhitelist.$tabSegment.find('> .ui.dimmer').removeClass('active');
  }
}; // Lazy-init on first activation of the tab. Fomantic UI may restore the
// previously active tab on load (e.g. when the user navigates back), in which
// case the click handler below never fires — so we also check the tab's
// current `active` state at ready-time and initialise immediately if so.

$(document).ready(function () {
  if ($('#whitelist-table').length === 0) {
    return;
  }

  var $tab = $('#fail2ban-tab-menu .item[data-tab="whitelist"]');
  $tab.on('click', function () {
    fail2banWhitelist.initialize();
    fail2banWhitelist.reload();
  });

  if ($tab.hasClass('active')) {
    fail2banWhitelist.initialize();
    fail2banWhitelist.reload();
  }
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GYWlsMkJhbi9mYWlsMmJhbi13aGl0ZWxpc3QuanMiXSwibmFtZXMiOlsiZmFpbDJiYW5XaGl0ZWxpc3QiLCIkdGFibGVFbCIsIiRpbnB1dCIsIiRhZGRCdG4iLCIkZXJyb3JMYWJlbCIsIiR0YWJTZWdtZW50IiwiZGF0YVRhYmxlIiwiaW5pdGlhbGl6ZWQiLCJtYW51YWwiLCJhdXRvIiwiaW5pdGlhbGl6ZSIsIiQiLCJjbG9zZXN0IiwiaW5pdGlhbGl6ZURhdGFUYWJsZSIsIm9uIiwiaGFuZGxlQWRkIiwiZSIsImtleSIsInByZXZlbnREZWZhdWx0IiwiY2xlYXJFcnJvciIsInNlYXJjaCIsInZhbCIsImRyYXciLCJoYW5kbGVEZWxldGUiLCJmaWx0ZXJJZCIsImN1cnJlbnRUYXJnZXQiLCJkYXRhIiwid2luZG93IiwibG9jYXRpb24iLCJocmVmIiwiZ2xvYmFsUm9vdFVybCIsIkRhdGFUYWJsZSIsImxlbmd0aENoYW5nZSIsInBhZ2luZyIsInBhZ2VMZW5ndGgiLCJzY3JvbGxDb2xsYXBzZSIsImRlZmVyUmVuZGVyIiwiY29sdW1ucyIsIm9yZGVyYWJsZSIsInNlYXJjaGFibGUiLCJvcmRlciIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJjcmVhdGVkUm93Iiwicm93IiwiZXEiLCJhZGRDbGFzcyIsInJlbG9hZCIsInNob3dMb2FkZXIiLCJGYWlsMkJhbkFQSSIsImdldFNldHRpbmdzIiwicmVzcG9uc2UiLCJoaWRlTG9hZGVyIiwicmVzdWx0Iiwid2hpdGVsaXN0U3RyIiwid2hpdGVsaXN0IiwicGFyc2VNYW51YWxTdHJpbmciLCJBcnJheSIsImlzQXJyYXkiLCJhdXRvV2hpdGVsaXN0IiwicmVkcmF3IiwicmF3Iiwic2VlbiIsIm91dCIsInNwbGl0IiwiZm9yRWFjaCIsImVudHJ5Iiwibm9ybSIsIm5vcm1hbGl6ZUVudHJ5IiwicHVzaCIsImNsZWFyIiwicm93cyIsImlwIiwicmVuZGVyQWRkcmVzc0NlbGwiLCJTZWN1cml0eVV0aWxzIiwiZXNjYXBlSHRtbCIsImdsb2JhbFRyYW5zbGF0ZSIsImYyYl9Tb3VyY2VNYW51YWwiLCJmMmJfUmVtb3ZlRnJvbVdoaXRlbGlzdCIsIlN0cmluZyIsImRlc2MiLCJkZXNjcmlwdGlvbiIsImZpbHRlcl9pZCIsImYyYl9Tb3VyY2VGaXJld2FsbFRvb2x0aXAiLCJmMmJfU291cmNlRmlyZXdhbGwiLCJmMmJfQ2Fubm90RGVsZXRlQXV0byIsImFkZCIsInZlcnNpb24iLCJpbmRleE9mIiwiYmFkZ2VDb2xvciIsInRyaW0iLCJzaG93RXJyb3IiLCJmMmJfSW52YWxpZEFkZHJlc3MiLCJ0b2tlbnMiLCJtYXAiLCJzIiwiZmlsdGVyIiwibGVuZ3RoIiwiYmxvY2tlZCIsInZhbGlkIiwicmVqZWN0ZWQiLCJkdXBsaWNhdGVzIiwic2VlbkluQmF0Y2giLCJ0b2tlbiIsImlzVmFsaWRJcE9yQ2lkciIsImNvbnRhaW5zRW50cnkiLCJmb3JtYXRSZWplY3RlZCIsImYyYl9EdXBsaWNhdGVBZGRyZXNzIiwibmV4dCIsImNvbmNhdCIsImNvbW1pdCIsImpvaW4iLCJyZWplY3RlZExpc3QiLCJ0ZW1wbGF0ZSIsImYyYl9CdWxrQWRkUmVqZWN0ZWQiLCJyZXBsYWNlIiwidGFyZ2V0IiwibmV4dE1hbnVhbCIsIm9uU3VjY2VzcyIsInBhdGNoIiwiZjJiX1doaXRlbGlzdFNhdmVFcnJvciIsInNvbWUiLCJhdXRvSXAiLCJ2YWx1ZSIsImxvd2VyZWQiLCJ0b0xvd2VyQ2FzZSIsImVuZHNXaXRoIiwic2xpY2UiLCJhZGRyZXNzIiwicHJlZml4Iiwic2xhc2hJZHgiLCJzdWJzdHJpbmciLCJ0ZXN0IiwiaXB2NCIsInAiLCJwYXJzZUludCIsImlzTGlrZWx5SXB2NiIsImRvdWJsZUNvbG9ucyIsIm1hdGNoIiwiZ3JvdXBzIiwibm9uRW1wdHkiLCJnIiwiZXZlcnkiLCJ0ZXh0Iiwic2hvdyIsImhpZGUiLCJyZW1vdmVDbGFzcyIsImZpbmQiLCJhcHBlbmQiLCJl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SixNQUE5QixpR0FFc0N4RSxlQUFlLENBQUN5RSxjQUZ0RDtBQUtIOztBQUNEdEosSUFBQUEsaUJBQWlCLENBQUNLLFdBQWxCLENBQThCK0ksSUFBOUIsQ0FBbUMsY0FBbkMsRUFBbURyRyxRQUFuRCxDQUE0RCxRQUE1RDtBQUNILEdBN2JxQjtBQStidEJNLEVBQUFBLFVBL2JzQix3QkErYlQ7QUFDVHJELElBQUFBLGlCQUFpQixDQUFDSyxXQUFsQixDQUE4QitJLElBQTlCLENBQW1DLGNBQW5DLEVBQW1ERCxXQUFuRCxDQUErRCxRQUEvRDtBQUNIO0FBamNxQixDQUExQixDLENBb2NBO0FBQ0E7QUFDQTtBQUNBOztBQUNBeEksQ0FBQyxDQUFDNEksUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQixNQUFJN0ksQ0FBQyxDQUFDLGtCQUFELENBQUQsQ0FBc0J1RixNQUF0QixLQUFpQyxDQUFyQyxFQUF3QztBQUNwQztBQUNIOztBQUNELE1BQU11RCxJQUFJLEdBQUc5SSxDQUFDLENBQUMsZ0RBQUQsQ0FBZDtBQUNBOEksRUFBQUEsSUFBSSxDQUFDM0ksRUFBTCxDQUFRLE9BQVIsRUFBaUIsWUFBTTtBQUNuQmQsSUFBQUEsaUJBQWlCLENBQUNVLFVBQWxCO0FBQ0FWLElBQUFBLGlCQUFpQixDQUFDZ0QsTUFBbEI7QUFDSCxHQUhEOztBQUlBLE1BQUl5RyxJQUFJLENBQUNDLFFBQUwsQ0FBYyxRQUFkLENBQUosRUFBNkI7QUFDekIxSixJQUFBQSxpQkFBaUIsQ0FBQ1UsVUFBbEI7QUFDQVYsSUFBQUEsaUJBQWlCLENBQUNnRCxNQUFsQjtBQUNIO0FBQ0osQ0FiRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI2IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxUcmFuc2xhdGUsIGdsb2JhbFJvb3RVcmwsIEZhaWwyQmFuQVBJLCBTZW1hbnRpY0xvY2FsaXphdGlvbiwgU2VjdXJpdHlVdGlscyAqL1xuXG4vKipcbiAqIGZhaWwyYmFuV2hpdGVsaXN0IOKAlCBtYW5hZ2VzIHRoZSBcIlRydXN0ZWQgYWRkcmVzc2VzXCIgdGFiLlxuICpcbiAqIFNpbmdsZSBzb3VyY2Ugb2YgdHJ1dGggZm9yIHRoZSB3aGl0ZWxpc3Qgc3RyaW5nIGxpdmVzIG9uIHRoZSBiYWNrZW5kIGluXG4gKiBGYWlsMkJhblJ1bGVzLndoaXRlbGlzdC4gVGhpcyBtb2R1bGUga2VlcHMgYSBwYXJzZWQgaW4tbWVtb3J5IGBtYW51YWxgIGxpc3QsXG4gKiBhcHBsaWVzIGFkZC9yZW1vdmUgZWRpdHMgbG9jYWxseSwgYW5kIGNvbW1pdHMgdmlhIFBBVENIIC9mYWlsMmJhbiB3aXRoIHRoZVxuICogZnVsbCByZS1qb2luZWQgc3RyaW5nLiBBdXRvLXRydXN0ZWQgZW50cmllcyBzdXJmYWNlZCBmcm9tIE5ldHdvcmtGaWx0ZXJzXG4gKiAobmV3ZXJfYmxvY2tfaXA9MSkgYXJlIHJlYWQtb25seSBhbmQgbGluayB0byB0aGUgb3JpZ2luYXRpbmcgZmlyZXdhbGwgcnVsZS5cbiAqXG4gKiBAbW9kdWxlIGZhaWwyYmFuV2hpdGVsaXN0XG4gKi9cbmNvbnN0IGZhaWwyYmFuV2hpdGVsaXN0ID0ge1xuICAgICR0YWJsZUVsOiBudWxsLFxuICAgICRpbnB1dDogbnVsbCxcbiAgICAkYWRkQnRuOiBudWxsLFxuICAgICRlcnJvckxhYmVsOiBudWxsLFxuICAgICR0YWJTZWdtZW50OiBudWxsLFxuICAgIGRhdGFUYWJsZTogbnVsbCxcbiAgICBpbml0aWFsaXplZDogZmFsc2UsXG5cbiAgICAvLyBQYXJzZWQgbGlzdHMuIEVhY2ggZW50cnkgaXMgbm9ybWFsaXNlZCAobG93ZXJjYXNlIElQdjYsIHRyaW1tZWQpLlxuICAgIG1hbnVhbDogW10sXG4gICAgYXV0bzogW10sXG5cbiAgICAvKipcbiAgICAgKiBXaXJlIHVwIERPTSBoYW5kbGVzLCBidWlsZCBEYXRhVGFibGUgc2hlbGwsIHJlZ2lzdGVyIGV2ZW50cy5cbiAgICAgKiBDYWxsZWQgb24gZmlyc3QgYWN0aXZhdGlvbiBvZiB0aGUgXCJ3aGl0ZWxpc3RcIiB0YWIuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgaWYgKGZhaWwyYmFuV2hpdGVsaXN0LmluaXRpYWxpemVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgZmFpbDJiYW5XaGl0ZWxpc3QuaW5pdGlhbGl6ZWQgPSB0cnVlO1xuXG4gICAgICAgIGZhaWwyYmFuV2hpdGVsaXN0LiR0YWJsZUVsID0gJCgnI3doaXRlbGlzdC10YWJsZScpO1xuICAgICAgICBmYWlsMmJhbldoaXRlbGlzdC4kaW5wdXQgPSAkKCcjd2hpdGVsaXN0LWlucHV0Jyk7XG4gICAgICAgIGZhaWwyYmFuV2hpdGVsaXN0LiRhZGRCdG4gPSAkKCcjd2hpdGVsaXN0LWFkZC1idG4nKTtcbiAgICAgICAgZmFpbDJiYW5XaGl0ZWxpc3QuJGVycm9yTGFiZWwgPSAkKCcjd2hpdGVsaXN0LWlucHV0LWVycm9yJyk7XG4gICAgICAgIGZhaWwyYmFuV2hpdGVsaXN0LiR0YWJTZWdtZW50ID0gJCgnI3doaXRlbGlzdC10YWJsZScpLmNsb3Nlc3QoJy5zZWdtZW50Jyk7XG5cbiAgICAgICAgZmFpbDJiYW5XaGl0ZWxpc3QuaW5pdGlhbGl6ZURhdGFUYWJsZSgpO1xuXG4gICAgICAgIGZhaWwyYmFuV2hpdGVsaXN0LiRhZGRCdG4ub24oJ2NsaWNrJywgZmFpbDJiYW5XaGl0ZWxpc3QuaGFuZGxlQWRkKTtcbiAgICAgICAgZmFpbDJiYW5XaGl0ZWxpc3QuJGlucHV0Lm9uKCdrZXlkb3duJywgKGUpID0+IHtcbiAgICAgICAgICAgIGlmIChlLmtleSA9PT0gJ0VudGVyJykge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICBmYWlsMmJhbldoaXRlbGlzdC5oYW5kbGVBZGQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIC8vIFRoZSBpbnB1dCBkb3VibGVzIGFzIGEgbGl2ZSBmaWx0ZXIgZm9yIHRoZSB0YWJsZTogZXZlcnkga2V5c3Ryb2tlXG4gICAgICAgIC8vIGRyaXZlcyBEYXRhVGFibGUncyBidWlsdC1pbiBzZWFyY2ggZW5naW5lLiBXZSBhbHNvIGNsZWFyIGlubGluZVxuICAgICAgICAvLyBlcnJvcnMgaGVyZSBzbyB0aGUgcmVkIGxhYmVsIHZhbmlzaGVzIGFzIHNvb24gYXMgdGhlIHVzZXIgZWRpdHMuXG4gICAgICAgIGZhaWwyYmFuV2hpdGVsaXN0LiRpbnB1dC5vbignaW5wdXQnLCAoKSA9PiB7XG4gICAgICAgICAgICBmYWlsMmJhbldoaXRlbGlzdC5jbGVhckVycm9yKCk7XG4gICAgICAgICAgICBpZiAoZmFpbDJiYW5XaGl0ZWxpc3QuZGF0YVRhYmxlKSB7XG4gICAgICAgICAgICAgICAgZmFpbDJiYW5XaGl0ZWxpc3QuZGF0YVRhYmxlLnNlYXJjaChmYWlsMmJhbldoaXRlbGlzdC4kaW5wdXQudmFsKCkgfHwgJycpLmRyYXcoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRGVsZXRlLWJ1dHRvbiArIGF1dG8tcm93IGNsaWNrIGhhbmRsZXIgKGV2ZW50IGRlbGVnYXRpb24g4oCUIHRhYmxlIHJlZHJhd3MpLlxuICAgICAgICBmYWlsMmJhbldoaXRlbGlzdC4kdGFibGVFbC5vbignY2xpY2snLCAnLndoaXRlbGlzdC1kZWxldGUtYnRuJywgZmFpbDJiYW5XaGl0ZWxpc3QuaGFuZGxlRGVsZXRlKTtcbiAgICAgICAgZmFpbDJiYW5XaGl0ZWxpc3QuJHRhYmxlRWwub24oJ2NsaWNrJywgJy53aGl0ZWxpc3QtYXV0by1yb3cnLCAoZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgZmlsdGVySWQgPSAkKGUuY3VycmVudFRhcmdldCkuZGF0YSgnZmlsdGVyLWlkJyk7XG4gICAgICAgICAgICBpZiAoZmlsdGVySWQpIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IGAke2dsb2JhbFJvb3RVcmx9ZmlyZXdhbGwvbW9kaWZ5LyR7ZmlsdGVySWR9YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEJ1aWxkIHRoZSBEYXRhVGFibGUgc2hlbGwuIFJvd3MgYXJlIHBvcHVsYXRlZCBieSByZWxvYWQoKS5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGF0YVRhYmxlKCkge1xuICAgICAgICBmYWlsMmJhbldoaXRlbGlzdC5kYXRhVGFibGUgPSBmYWlsMmJhbldoaXRlbGlzdC4kdGFibGVFbC5EYXRhVGFibGUoe1xuICAgICAgICAgICAgbGVuZ3RoQ2hhbmdlOiBmYWxzZSxcbiAgICAgICAgICAgIHBhZ2luZzogdHJ1ZSxcbiAgICAgICAgICAgIHBhZ2VMZW5ndGg6IDE1LFxuICAgICAgICAgICAgc2Nyb2xsQ29sbGFwc2U6IHRydWUsXG4gICAgICAgICAgICBkZWZlclJlbmRlcjogdHJ1ZSxcbiAgICAgICAgICAgIGNvbHVtbnM6IFtcbiAgICAgICAgICAgICAgICB7IG9yZGVyYWJsZTogdHJ1ZSwgc2VhcmNoYWJsZTogdHJ1ZSB9LCAgIC8vIEFkZHJlc3NcbiAgICAgICAgICAgICAgICB7IG9yZGVyYWJsZTogdHJ1ZSwgc2VhcmNoYWJsZTogdHJ1ZSB9LCAgIC8vIFNvdXJjZVxuICAgICAgICAgICAgICAgIHsgb3JkZXJhYmxlOiBmYWxzZSwgc2VhcmNoYWJsZTogdHJ1ZSB9LCAgLy8gRGVzY3JpcHRpb25cbiAgICAgICAgICAgICAgICB7IG9yZGVyYWJsZTogZmFsc2UsIHNlYXJjaGFibGU6IGZhbHNlIH0sIC8vIEFjdGlvbnNcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBvcmRlcjogW1sxLCAnYXNjJ10sIFswLCAnYXNjJ11dLFxuICAgICAgICAgICAgbGFuZ3VhZ2U6IFNlbWFudGljTG9jYWxpemF0aW9uLmRhdGFUYWJsZUxvY2FsaXNhdGlvbixcbiAgICAgICAgICAgIGNyZWF0ZWRSb3cocm93KSB7XG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDMpLmFkZENsYXNzKCdjb2xsYXBzaW5nJyk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVmcmVzaCBib3RoIGxpc3RzIGZyb20gdGhlIEFQSSwgdGhlbiByZWRyYXcuXG4gICAgICogQ2FsbGVkIG9uIHRhYiBhY3RpdmF0aW9uIGFuZCBhZnRlciBldmVyeSBhZGQvcmVtb3ZlLlxuICAgICAqL1xuICAgIHJlbG9hZCgpIHtcbiAgICAgICAgZmFpbDJiYW5XaGl0ZWxpc3Quc2hvd0xvYWRlcigpO1xuICAgICAgICBGYWlsMkJhbkFQSS5nZXRTZXR0aW5ncygocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGZhaWwyYmFuV2hpdGVsaXN0LmhpZGVMb2FkZXIoKTtcbiAgICAgICAgICAgIGlmICghcmVzcG9uc2UgfHwgIXJlc3BvbnNlLnJlc3VsdCB8fCAhcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IHdoaXRlbGlzdFN0ciA9IHJlc3BvbnNlLmRhdGEud2hpdGVsaXN0IHx8ICcnO1xuICAgICAgICAgICAgZmFpbDJiYW5XaGl0ZWxpc3QubWFudWFsID0gZmFpbDJiYW5XaGl0ZWxpc3QucGFyc2VNYW51YWxTdHJpbmcod2hpdGVsaXN0U3RyKTtcbiAgICAgICAgICAgIGZhaWwyYmFuV2hpdGVsaXN0LmF1dG8gPSBBcnJheS5pc0FycmF5KHJlc3BvbnNlLmRhdGEuYXV0b1doaXRlbGlzdClcbiAgICAgICAgICAgICAgICA/IHJlc3BvbnNlLmRhdGEuYXV0b1doaXRlbGlzdFxuICAgICAgICAgICAgICAgIDogW107XG4gICAgICAgICAgICBmYWlsMmJhbldoaXRlbGlzdC5yZWRyYXcoKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNwbGl0IHRoZSBzdG9yZWQgd2hpdGVsaXN0IHN0cmluZyAoc3BhY2UvY29tbWEvc2VtaWNvbG9uLXNlcGFyYXRlZClcbiAgICAgKiBpbnRvIGEgZGVkdXBlZCBhcnJheSBvZiBub3JtYWxpc2VkIElQL0NJRFIgc3RyaW5ncy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSByYXdcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nW119XG4gICAgICovXG4gICAgcGFyc2VNYW51YWxTdHJpbmcocmF3KSB7XG4gICAgICAgIGlmICghcmF3KSB7XG4gICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgc2VlbiA9IHt9O1xuICAgICAgICBjb25zdCBvdXQgPSBbXTtcbiAgICAgICAgcmF3LnNwbGl0KC9bXFxzLDtdKy8pLmZvckVhY2goKGVudHJ5KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBub3JtID0gZmFpbDJiYW5XaGl0ZWxpc3Qubm9ybWFsaXplRW50cnkoZW50cnkpO1xuICAgICAgICAgICAgaWYgKG5vcm0gJiYgIXNlZW5bbm9ybV0pIHtcbiAgICAgICAgICAgICAgICBzZWVuW25vcm1dID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBvdXQucHVzaChub3JtKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBvdXQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlYnVpbGQgdGFibGUgcm93cyBmcm9tIG1hbnVhbCArIGF1dG8gc3RhdGUuXG4gICAgICovXG4gICAgcmVkcmF3KCkge1xuICAgICAgICBmYWlsMmJhbldoaXRlbGlzdC5kYXRhVGFibGUuY2xlYXIoKTtcbiAgICAgICAgY29uc3Qgcm93cyA9IFtdO1xuXG4gICAgICAgIGZhaWwyYmFuV2hpdGVsaXN0Lm1hbnVhbC5mb3JFYWNoKChpcCkgPT4ge1xuICAgICAgICAgICAgcm93cy5wdXNoKFtcbiAgICAgICAgICAgICAgICBmYWlsMmJhbldoaXRlbGlzdC5yZW5kZXJBZGRyZXNzQ2VsbChpcCksXG4gICAgICAgICAgICAgICAgYDxzcGFuIGNsYXNzPVwidWkgYmFzaWMgbGFiZWxcIj4ke1NlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChnbG9iYWxUcmFuc2xhdGUuZjJiX1NvdXJjZU1hbnVhbCl9PC9zcGFuPmAsXG4gICAgICAgICAgICAgICAgJycsXG4gICAgICAgICAgICAgICAgYDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwidWkgaWNvbiBiYXNpYyBtaW5pIGJ1dHRvbiByaWdodCBmbG9hdGVkIHdoaXRlbGlzdC1kZWxldGUtYnRuXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWlwPVwiJHtTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoaXApfVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU9XCIke1NlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChnbG9iYWxUcmFuc2xhdGUuZjJiX1JlbW92ZUZyb21XaGl0ZWxpc3QpfVwiPlxuICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gdHJhc2ggcmVkXCI+PC9pPlxuICAgICAgICAgICAgICAgIDwvYnV0dG9uPmAsXG4gICAgICAgICAgICBdKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZmFpbDJiYW5XaGl0ZWxpc3QuYXV0by5mb3JFYWNoKChlbnRyeSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgaXAgPSBTdHJpbmcoZW50cnkuaXAgfHwgJycpO1xuICAgICAgICAgICAgY29uc3QgZGVzYyA9IFN0cmluZyhlbnRyeS5kZXNjcmlwdGlvbiB8fCAnJyk7XG4gICAgICAgICAgICBjb25zdCBmaWx0ZXJJZCA9IFN0cmluZyhlbnRyeS5maWx0ZXJfaWQgfHwgJycpO1xuICAgICAgICAgICAgcm93cy5wdXNoKFtcbiAgICAgICAgICAgICAgICBmYWlsMmJhbldoaXRlbGlzdC5yZW5kZXJBZGRyZXNzQ2VsbChpcCksXG4gICAgICAgICAgICAgICAgYDxhIGNsYXNzPVwidWkgbGFiZWwgd2hpdGVsaXN0LWF1dG8tcm93XCJcbiAgICAgICAgICAgICAgICAgICAgZGF0YS1maWx0ZXItaWQ9XCIke1NlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChmaWx0ZXJJZCl9XCJcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU9XCIke1NlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChnbG9iYWxUcmFuc2xhdGUuZjJiX1NvdXJjZUZpcmV3YWxsVG9vbHRpcCl9XCJcbiAgICAgICAgICAgICAgICAgICAgc3R5bGU9XCJjdXJzb3I6cG9pbnRlcjtcIj5cbiAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJzaGllbGQgYWx0ZXJuYXRlIGljb25cIj48L2k+JHtTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZ2xvYmFsVHJhbnNsYXRlLmYyYl9Tb3VyY2VGaXJld2FsbCl9XG4gICAgICAgICAgICAgICAgIDwvYT5gLFxuICAgICAgICAgICAgICAgIFNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChkZXNjKSxcbiAgICAgICAgICAgICAgICBgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJ1aSBpY29uIGJhc2ljIG1pbmkgYnV0dG9uIHJpZ2h0IGZsb2F0ZWQgZGlzYWJsZWRcIlxuICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlPVwiJHtTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZ2xvYmFsVHJhbnNsYXRlLmYyYl9DYW5ub3REZWxldGVBdXRvKX1cIj5cbiAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIGxvY2sgZ3JleVwiPjwvaT5cbiAgICAgICAgICAgICAgICA8L2J1dHRvbj5gLFxuICAgICAgICAgICAgXSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGZhaWwyYmFuV2hpdGVsaXN0LmRhdGFUYWJsZS5yb3dzLmFkZChyb3dzKS5kcmF3KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEJ1aWxkIHRoZSBmaXJzdC1jb2x1bW4gY2VsbCB3aXRoIGEgdjQvdjYgYmFkZ2UuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaXBcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfVxuICAgICAqL1xuICAgIHJlbmRlckFkZHJlc3NDZWxsKGlwKSB7XG4gICAgICAgIGNvbnN0IHZlcnNpb24gPSBpcC5pbmRleE9mKCc6JykgIT09IC0xID8gJ3Y2JyA6ICd2NCc7XG4gICAgICAgIGNvbnN0IGJhZGdlQ29sb3IgPSB2ZXJzaW9uID09PSAndjYnID8gJ3RlYWwnIDogJ2JsdWUnO1xuICAgICAgICByZXR1cm4gYDxzcGFuIGNsYXNzPVwidWkgbWluaSAke2JhZGdlQ29sb3J9IGxhYmVsXCI+JHt2ZXJzaW9ufTwvc3Bhbj4mbmJzcDske1NlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChpcCl9YDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUGFyc2UgdGhlIGlucHV0IGFzIGEgZGVsaW1pdGVkIGxpc3QgKHdoaXRlc3BhY2UsIGNvbW1hLCBzZW1pY29sb24pLFxuICAgICAqIHRyaWFnZSBlYWNoIHRva2VuIGludG8gdmFsaWQvZHVwbGljYXRlL2ludmFsaWQgYnVja2V0cywgYW5kIGNvbW1pdCB0aGVcbiAgICAgKiBiYXRjaCBpbiBvbmUgUEFUQ0guIFNpbmdsZS1hZGRyZXNzIGlucHV0IGlzIGp1c3QgdGhlIGRlZ2VuZXJhdGUgY2FzZVxuICAgICAqIChvbmUgdG9rZW4pLlxuICAgICAqL1xuICAgIGhhbmRsZUFkZCgpIHtcbiAgICAgICAgY29uc3QgcmF3ID0gKGZhaWwyYmFuV2hpdGVsaXN0LiRpbnB1dC52YWwoKSB8fCAnJykudHJpbSgpO1xuICAgICAgICBpZiAocmF3ID09PSAnJykge1xuICAgICAgICAgICAgZmFpbDJiYW5XaGl0ZWxpc3Quc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5mMmJfSW52YWxpZEFkZHJlc3MpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgdG9rZW5zID0gcmF3LnNwbGl0KC9bXFxzLDtdKy8pXG4gICAgICAgICAgICAubWFwKChzKSA9PiBzLnRyaW0oKSlcbiAgICAgICAgICAgIC5maWx0ZXIoKHMpID0+IHMubGVuZ3RoID4gMCk7XG4gICAgICAgIGNvbnN0IGJsb2NrZWQgPSB7ICcwLjAuMC4wJzogMSwgJzAuMC4wLjAvMCc6IDEsICc6Oic6IDEsICc6Oi8wJzogMSB9O1xuXG4gICAgICAgIGNvbnN0IHZhbGlkID0gW107XG4gICAgICAgIGNvbnN0IHJlamVjdGVkID0gW107XG4gICAgICAgIGNvbnN0IGR1cGxpY2F0ZXMgPSBbXTtcbiAgICAgICAgY29uc3Qgc2VlbkluQmF0Y2ggPSB7fTtcblxuICAgICAgICB0b2tlbnMuZm9yRWFjaCgodG9rZW4pID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG5vcm0gPSBmYWlsMmJhbldoaXRlbGlzdC5ub3JtYWxpemVFbnRyeSh0b2tlbik7XG4gICAgICAgICAgICBpZiAoIW5vcm0gfHwgIWZhaWwyYmFuV2hpdGVsaXN0LmlzVmFsaWRJcE9yQ2lkcihub3JtKSB8fCBibG9ja2VkW25vcm1dKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0ZWQucHVzaCh0b2tlbik7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHNlZW5JbkJhdGNoW25vcm1dIHx8IGZhaWwyYmFuV2hpdGVsaXN0LmNvbnRhaW5zRW50cnkobm9ybSkpIHtcbiAgICAgICAgICAgICAgICBkdXBsaWNhdGVzLnB1c2godG9rZW4pO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNlZW5JbkJhdGNoW25vcm1dID0gdHJ1ZTtcbiAgICAgICAgICAgIHZhbGlkLnB1c2gobm9ybSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICh2YWxpZC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGlmIChyZWplY3RlZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgZmFpbDJiYW5XaGl0ZWxpc3Quc2hvd0Vycm9yKFxuICAgICAgICAgICAgICAgICAgICBmYWlsMmJhbldoaXRlbGlzdC5mb3JtYXRSZWplY3RlZChyZWplY3RlZClcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChkdXBsaWNhdGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBmYWlsMmJhbldoaXRlbGlzdC5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLmYyYl9EdXBsaWNhdGVBZGRyZXNzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZmFpbDJiYW5XaGl0ZWxpc3Quc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5mMmJfSW52YWxpZEFkZHJlc3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbmV4dCA9IGZhaWwyYmFuV2hpdGVsaXN0Lm1hbnVhbC5jb25jYXQodmFsaWQpO1xuICAgICAgICBmYWlsMmJhbldoaXRlbGlzdC5jb21taXQobmV4dCwgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlamVjdGVkLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAvLyBQYXJ0aWFsIHN1Y2Nlc3M6IGtlZXAgdGhlIHJlamVjdGVkIHRva2VucyB2aXNpYmxlIGluIHRoZVxuICAgICAgICAgICAgICAgIC8vIGlucHV0IHNvIHRoZSBhZG1pbiBjYW4gZml4IHRoZW0sIGFuZCBleHBsYWluIHdoeS5cbiAgICAgICAgICAgICAgICBmYWlsMmJhbldoaXRlbGlzdC4kaW5wdXQudmFsKHJlamVjdGVkLmpvaW4oJyAnKSk7XG4gICAgICAgICAgICAgICAgZmFpbDJiYW5XaGl0ZWxpc3Quc2hvd0Vycm9yKGZhaWwyYmFuV2hpdGVsaXN0LmZvcm1hdFJlamVjdGVkKHJlamVjdGVkKSk7XG4gICAgICAgICAgICAgICAgLy8gUmUtYXBwbHkgZmlsdGVyIHdpdGggdGhlIGxlZnRvdmVyIHRleHQuXG4gICAgICAgICAgICAgICAgaWYgKGZhaWwyYmFuV2hpdGVsaXN0LmRhdGFUYWJsZSkge1xuICAgICAgICAgICAgICAgICAgICBmYWlsMmJhbldoaXRlbGlzdC5kYXRhVGFibGUuc2VhcmNoKHJlamVjdGVkLmpvaW4oJyAnKSkuZHJhdygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZmFpbDJiYW5XaGl0ZWxpc3QuJGlucHV0LnZhbCgnJyk7XG4gICAgICAgICAgICAgICAgZmFpbDJiYW5XaGl0ZWxpc3QuY2xlYXJFcnJvcigpO1xuICAgICAgICAgICAgICAgIGlmIChmYWlsMmJhbldoaXRlbGlzdC5kYXRhVGFibGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZmFpbDJiYW5XaGl0ZWxpc3QuZGF0YVRhYmxlLnNlYXJjaCgnJykuZHJhdygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlbmRlciB0aGUgXCJyZWplY3RlZCBlbnRyaWVzXCIgbWVzc2FnZSwgZmFsbGluZyBiYWNrIHRvIGEgc2Vuc2libGVcbiAgICAgKiBFbmdsaXNoIGRlZmF1bHQgaWYgdGhlIHRyYW5zbGF0aW9uIGtleSBpcyBtaXNzaW5nIChvbGRlciBsYW5ndWFnZVxuICAgICAqIGZpbGVzIG1heSBub3QgaGF2ZSBmMmJfQnVsa0FkZFJlamVjdGVkIHlldCkuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ1tdfSByZWplY3RlZExpc3RcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfVxuICAgICAqL1xuICAgIGZvcm1hdFJlamVjdGVkKHJlamVjdGVkTGlzdCkge1xuICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IGdsb2JhbFRyYW5zbGF0ZS5mMmJfQnVsa0FkZFJlamVjdGVkIHx8ICdSZWplY3RlZDogJWxpc3QlJztcbiAgICAgICAgcmV0dXJuIHRlbXBsYXRlLnJlcGxhY2UoJyVsaXN0JScsIHJlamVjdGVkTGlzdC5qb2luKCcsICcpKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVtb3ZlIGEgbWFudWFsIGVudHJ5IG9uIMOXIGNsaWNrLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtFdmVudH0gZVxuICAgICAqL1xuICAgIGhhbmRsZURlbGV0ZShlKSB7XG4gICAgICAgIGNvbnN0IGlwID0gJChlLmN1cnJlbnRUYXJnZXQpLmRhdGEoJ2lwJyk7XG4gICAgICAgIGlmICghaXApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB0YXJnZXQgPSBTdHJpbmcoaXApO1xuICAgICAgICBjb25zdCBuZXh0ID0gZmFpbDJiYW5XaGl0ZWxpc3QubWFudWFsLmZpbHRlcigoZW50cnkpID0+IGVudHJ5ICE9PSB0YXJnZXQpO1xuICAgICAgICBpZiAobmV4dC5sZW5ndGggPT09IGZhaWwyYmFuV2hpdGVsaXN0Lm1hbnVhbC5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBmYWlsMmJhbldoaXRlbGlzdC5jb21taXQobmV4dCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNlbmQgUEFUQ0ggL2ZhaWwyYmFuIHdpdGggdGhlIG5ldyB3aGl0ZWxpc3Qgc3RyaW5nIGFuZCByZWxvYWQgb24gc3VjY2Vzcy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nW119IG5leHRNYW51YWxcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBbb25TdWNjZXNzXVxuICAgICAqL1xuICAgIGNvbW1pdChuZXh0TWFudWFsLCBvblN1Y2Nlc3MpIHtcbiAgICAgICAgZmFpbDJiYW5XaGl0ZWxpc3Quc2hvd0xvYWRlcigpO1xuICAgICAgICBGYWlsMkJhbkFQSS5wYXRjaCh7IHdoaXRlbGlzdDogbmV4dE1hbnVhbC5qb2luKCcgJykgfSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAoIXJlc3BvbnNlIHx8ICFyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICBmYWlsMmJhbldoaXRlbGlzdC5oaWRlTG9hZGVyKCk7XG4gICAgICAgICAgICAgICAgZmFpbDJiYW5XaGl0ZWxpc3Quc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5mMmJfV2hpdGVsaXN0U2F2ZUVycm9yKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodHlwZW9mIG9uU3VjY2VzcyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIG9uU3VjY2VzcygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gcmVsb2FkKCkgaGFuZGxlcyBoaWRlTG9hZGVyIGFmdGVyIGZyZXNoIGRhdGEgYXJyaXZlcy5cbiAgICAgICAgICAgIGZhaWwyYmFuV2hpdGVsaXN0LnJlbG9hZCgpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgd2hldGhlciBhbiBJUC9DSURSIGlzIGFscmVhZHkgcHJlc2VudCBpbiBlaXRoZXIgbWFudWFsIG9yIGF1dG8gbGlzdC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBub3JtXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgY29udGFpbnNFbnRyeShub3JtKSB7XG4gICAgICAgIGlmIChmYWlsMmJhbldoaXRlbGlzdC5tYW51YWwuaW5kZXhPZihub3JtKSAhPT0gLTEpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWlsMmJhbldoaXRlbGlzdC5hdXRvLnNvbWUoKGVudHJ5KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBhdXRvSXAgPSBmYWlsMmJhbldoaXRlbGlzdC5ub3JtYWxpemVFbnRyeShTdHJpbmcoZW50cnkuaXAgfHwgJycpKTtcbiAgICAgICAgICAgIHJldHVybiBhdXRvSXAgPT09IG5vcm07XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUcmltLCBsb3dlcmNhc2UgSVB2NiwgZHJvcCByZWR1bmRhbnQgLzMyIG9yIC8xMjggbWFza3Mgc28gZHVwbGljYXRlIGRldGVjdGlvblxuICAgICAqIHRyZWF0cyBcIjE5Mi4xNjguMS41XCIgYW5kIFwiMTkyLjE2OC4xLjUvMzJcIiBhcyB0aGUgc2FtZSBlbnRyeS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSByYXdcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfVxuICAgICAqL1xuICAgIG5vcm1hbGl6ZUVudHJ5KHJhdykge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IFN0cmluZyhyYXcgfHwgJycpLnRyaW0oKTtcbiAgICAgICAgaWYgKHZhbHVlID09PSAnJykge1xuICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICB9XG4gICAgICAgIC8vIExvd2VyY2FzZSBvbmx5IElQdjYgKHByZXNlbmNlIG9mIGNvbG9uKTsgbGVhdmUgSVB2NCBhbG9uZS5cbiAgICAgICAgY29uc3QgbG93ZXJlZCA9IHZhbHVlLmluZGV4T2YoJzonKSAhPT0gLTEgPyB2YWx1ZS50b0xvd2VyQ2FzZSgpIDogdmFsdWU7XG4gICAgICAgIC8vIFN0cmlwIC8zMiBmcm9tIElQdjQgaG9zdCwgLzEyOCBmcm9tIElQdjYgaG9zdC5cbiAgICAgICAgaWYgKGxvd2VyZWQuaW5kZXhPZignOicpID09PSAtMSAmJiBsb3dlcmVkLmVuZHNXaXRoKCcvMzInKSkge1xuICAgICAgICAgICAgcmV0dXJuIGxvd2VyZWQuc2xpY2UoMCwgLTMpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChsb3dlcmVkLmluZGV4T2YoJzonKSAhPT0gLTEgJiYgbG93ZXJlZC5lbmRzV2l0aCgnLzEyOCcpKSB7XG4gICAgICAgICAgICByZXR1cm4gbG93ZXJlZC5zbGljZSgwLCAtNCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGxvd2VyZWQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENsaWVudC1zaWRlIHZhbGlkYXRpb24gdGhhdCBtaXJyb3JzIGJhY2tlbmQgY2Fub25pY2FsaXplRW50cnkoKSBpblxuICAgICAqIFVwZGF0ZVNldHRpbmdzQWN0aW9uLiBJUHY0IGlzIGNoZWNrZWQgdmlhIGEgc3RyaWN0IG9jdGV0IHJlZ2V4OyBJUHY2XG4gICAgICogZ29lcyB0aHJvdWdoIGEgc3RydWN0dXJhbCBjaGVjayB0aGF0IGFjY2VwdHMgXCI6OlwiIGNvbXByZXNzaW9uIGFuZFxuICAgICAqIENJRFIgcHJlZml4ZXMg4oCUIHRoZSBiYWNrZW5kIHJlLXZhbGlkYXRlcyB2aWEgaW5ldF9wdG9uLCBzbyB0aGUgZ29hbFxuICAgICAqIGhlcmUgaXMgdG8gY2F0Y2ggb2J2aW91cyBnYXJiYWdlIGJlZm9yZSBpc3N1aW5nIHRoZSBQQVRDSCwgbm90IHRvXG4gICAgICogcmVwcm9kdWNlIGluZXRfcHRvbidzIGV4aGF1c3RpdmUgc2VtYW50aWNzIGluIEpTLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgaXNWYWxpZElwT3JDaWRyKHZhbHVlKSB7XG4gICAgICAgIGlmICghdmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNwbGl0IG9wdGlvbmFsIENJRFIgcHJlZml4LlxuICAgICAgICBsZXQgYWRkcmVzcyA9IHZhbHVlO1xuICAgICAgICBsZXQgcHJlZml4ID0gbnVsbDtcbiAgICAgICAgY29uc3Qgc2xhc2hJZHggPSB2YWx1ZS5pbmRleE9mKCcvJyk7XG4gICAgICAgIGlmIChzbGFzaElkeCAhPT0gLTEpIHtcbiAgICAgICAgICAgIGFkZHJlc3MgPSB2YWx1ZS5zdWJzdHJpbmcoMCwgc2xhc2hJZHgpO1xuICAgICAgICAgICAgcHJlZml4ID0gdmFsdWUuc3Vic3RyaW5nKHNsYXNoSWR4ICsgMSk7XG4gICAgICAgICAgICBpZiAoIS9eXFxkKyQvLnRlc3QocHJlZml4KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIElQdjQgbGl0ZXJhbC5cbiAgICAgICAgY29uc3QgaXB2NCA9IC9eKD86KD86MjVbMC01XXwyWzAtNF1bMC05XXwxP1swLTldP1swLTldKVxcLil7M30oPzoyNVswLTVdfDJbMC00XVswLTldfDE/WzAtOV0/WzAtOV0pJC87XG4gICAgICAgIGlmIChpcHY0LnRlc3QoYWRkcmVzcykpIHtcbiAgICAgICAgICAgIGlmIChwcmVmaXggPT09IG51bGwpIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgY29uc3QgcCA9IHBhcnNlSW50KHByZWZpeCwgMTApO1xuICAgICAgICAgICAgcmV0dXJuIHAgPj0gMCAmJiBwIDw9IDMyO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSVB2NiBsaXRlcmFsLlxuICAgICAgICBpZiAoZmFpbDJiYW5XaGl0ZWxpc3QuaXNMaWtlbHlJcHY2KGFkZHJlc3MpKSB7XG4gICAgICAgICAgICBpZiAocHJlZml4ID09PSBudWxsKSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIGNvbnN0IHAgPSBwYXJzZUludChwcmVmaXgsIDEwKTtcbiAgICAgICAgICAgIHJldHVybiBwID49IDAgJiYgcCA8PSAxMjg7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExpZ2h0d2VpZ2h0IHN0cnVjdHVyYWwgY2hlY2sgZm9yIGFuIElQdjYgYWRkcmVzcy4gSGFuZGxlcyBcIjo6XCJcbiAgICAgKiBjb21wcmVzc2lvbiDigJQgaW5jbHVkaW5nIGVkZ2UgY2FzZXMgd2hlcmUgaXQgZmlsbHMgb25seSBvbmUgemVybyBncm91cFxuICAgICAqIGF0IHRoZSBzdGFydCBvciBlbmQgKGA6OjE6MjozOjQ6NTo2OjdgLCBgMToyOjM6NDo1OjY6Nzo6YCkg4oCUIGJ5XG4gICAgICogY291bnRpbmcgbm9uLWVtcHR5IGdyb3VwcyBpbnN0ZWFkIG9mIHJhdyBzcGxpdCgpIGxlbmd0aCwgc2luY2UgZWRnZVxuICAgICAqIFwiOjpcIiBwcm9kdWNlcyB0d28gYWRqYWNlbnQgZW1wdHkgZW50cmllcy4gTm90IGEgc3Vic3RpdHV0ZSBmb3JcbiAgICAgKiBpbmV0X3B0b24g4oCUIHRoZSBiYWNrZW5kIGlzIGF1dGhvcml0YXRpdmU7IHRoZSBnb2FsIGhlcmUgaXMgdG8gZmlsdGVyXG4gICAgICogb2J2aW91cyBnYXJiYWdlIGJlZm9yZSBpc3N1aW5nIHRoZSBQQVRDSC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBhZGRyZXNzXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgaXNMaWtlbHlJcHY2KGFkZHJlc3MpIHtcbiAgICAgICAgaWYgKCFhZGRyZXNzIHx8IGFkZHJlc3MuaW5kZXhPZignOicpID09PSAtMSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBpZiAoIS9eWzAtOWEtZjpdKyQvaS50ZXN0KGFkZHJlc3MpKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGlmIChhZGRyZXNzLmluZGV4T2YoJzo6OicpICE9PSAtMSkgcmV0dXJuIGZhbHNlO1xuXG4gICAgICAgIGNvbnN0IGRvdWJsZUNvbG9ucyA9IGFkZHJlc3MubWF0Y2goLzo6L2cpIHx8IFtdO1xuICAgICAgICBpZiAoZG91YmxlQ29sb25zLmxlbmd0aCA+IDEpIHJldHVybiBmYWxzZTtcblxuICAgICAgICBjb25zdCBncm91cHMgPSBhZGRyZXNzLnNwbGl0KCc6Jyk7XG4gICAgICAgIGNvbnN0IG5vbkVtcHR5ID0gZ3JvdXBzLmZpbHRlcigoZykgPT4gZyAhPT0gJycpO1xuXG4gICAgICAgIGlmICghbm9uRW1wdHkuZXZlcnkoKGcpID0+IC9eWzAtOWEtZl17MSw0fSQvaS50ZXN0KGcpKSkgcmV0dXJuIGZhbHNlO1xuXG4gICAgICAgIGlmIChkb3VibGVDb2xvbnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAvLyBVbmNvbXByZXNzZWQgZm9ybTogZXhhY3RseSA4IGhleCBncm91cHMsIG5vIGVtcHRpZXMgYWxsb3dlZC5cbiAgICAgICAgICAgIHJldHVybiBncm91cHMubGVuZ3RoID09PSA4O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ29tcHJlc3NlZCBmb3JtOiBcIjo6XCIgbXVzdCBmaWxsIGF0IGxlYXN0IG9uZSB6ZXJvIGdyb3VwLCBsZWF2aW5nXG4gICAgICAgIC8vIGF0IG1vc3QgNyBleHBsaWNpdCBncm91cHMuIChgOjpgIGFsb25lIC0+IDAgZXhwbGljaXQgZ3JvdXBzIC0+IHZhbGlkXG4gICAgICAgIC8vIHVuc3BlY2lmaWVkIGFkZHJlc3M7IHJlamVjdGVkIHNlcGFyYXRlbHkgYnkgdGhlIGJsb2NrZWQtbGlzdC4pXG4gICAgICAgIHJldHVybiBub25FbXB0eS5sZW5ndGggPD0gNztcbiAgICB9LFxuXG4gICAgc2hvd0Vycm9yKHRleHQpIHtcbiAgICAgICAgZmFpbDJiYW5XaGl0ZWxpc3QuJGVycm9yTGFiZWwudGV4dCh0ZXh0KS5zaG93KCk7XG4gICAgICAgIGZhaWwyYmFuV2hpdGVsaXN0LiRpbnB1dC5jbG9zZXN0KCcudWkuaW5wdXQnKS5hZGRDbGFzcygnZXJyb3InKTtcbiAgICB9LFxuXG4gICAgY2xlYXJFcnJvcigpIHtcbiAgICAgICAgZmFpbDJiYW5XaGl0ZWxpc3QuJGVycm9yTGFiZWwuaGlkZSgpLnRleHQoJycpO1xuICAgICAgICBmYWlsMmJhbldoaXRlbGlzdC4kaW5wdXQuY2xvc2VzdCgnLnVpLmlucHV0JykucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgfSxcblxuICAgIHNob3dMb2FkZXIoKSB7XG4gICAgICAgIGlmICghZmFpbDJiYW5XaGl0ZWxpc3QuJHRhYlNlZ21lbnQuZmluZCgnPiAudWkuZGltbWVyJykubGVuZ3RoKSB7XG4gICAgICAgICAgICBmYWlsMmJhbldoaXRlbGlzdC4kdGFiU2VnbWVudC5hcHBlbmQoXG4gICAgICAgICAgICAgICAgYDxkaXYgY2xhc3M9XCJ1aSBpbnZlcnRlZCBkaW1tZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRleHQgbG9hZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUuZXhfTG9hZGluZ0RhdGF9PC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+YFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICBmYWlsMmJhbldoaXRlbGlzdC4kdGFiU2VnbWVudC5maW5kKCc+IC51aS5kaW1tZXInKS5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgfSxcblxuICAgIGhpZGVMb2FkZXIoKSB7XG4gICAgICAgIGZhaWwyYmFuV2hpdGVsaXN0LiR0YWJTZWdtZW50LmZpbmQoJz4gLnVpLmRpbW1lcicpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICB9LFxufTtcblxuLy8gTGF6eS1pbml0IG9uIGZpcnN0IGFjdGl2YXRpb24gb2YgdGhlIHRhYi4gRm9tYW50aWMgVUkgbWF5IHJlc3RvcmUgdGhlXG4vLyBwcmV2aW91c2x5IGFjdGl2ZSB0YWIgb24gbG9hZCAoZS5nLiB3aGVuIHRoZSB1c2VyIG5hdmlnYXRlcyBiYWNrKSwgaW4gd2hpY2hcbi8vIGNhc2UgdGhlIGNsaWNrIGhhbmRsZXIgYmVsb3cgbmV2ZXIgZmlyZXMg4oCUIHNvIHdlIGFsc28gY2hlY2sgdGhlIHRhYidzXG4vLyBjdXJyZW50IGBhY3RpdmVgIHN0YXRlIGF0IHJlYWR5LXRpbWUgYW5kIGluaXRpYWxpc2UgaW1tZWRpYXRlbHkgaWYgc28uXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgaWYgKCQoJyN3aGl0ZWxpc3QtdGFibGUnKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCAkdGFiID0gJCgnI2ZhaWwyYmFuLXRhYi1tZW51IC5pdGVtW2RhdGEtdGFiPVwid2hpdGVsaXN0XCJdJyk7XG4gICAgJHRhYi5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgIGZhaWwyYmFuV2hpdGVsaXN0LmluaXRpYWxpemUoKTtcbiAgICAgICAgZmFpbDJiYW5XaGl0ZWxpc3QucmVsb2FkKCk7XG4gICAgfSk7XG4gICAgaWYgKCR0YWIuaGFzQ2xhc3MoJ2FjdGl2ZScpKSB7XG4gICAgICAgIGZhaWwyYmFuV2hpdGVsaXN0LmluaXRpYWxpemUoKTtcbiAgICAgICAgZmFpbDJiYW5XaGl0ZWxpc3QucmVsb2FkKCk7XG4gICAgfVxufSk7XG4iXX0=