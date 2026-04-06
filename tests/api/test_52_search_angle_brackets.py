#!/usr/bin/env python3
"""
Test search functionality with numbers in angle brackets

This test verifies the fix for bug where numbers in angle brackets like <000064>
were removed by strip_tags(), making them unsearchable.

Bug: strip_tags() removed both HTML tags AND numbers in angle brackets
Fix: Use regex that removes only HTML tags (starting with letters)
"""

import pytest
from conftest import assert_api_success


class TestSearchAngleBrackets:
    """Test search with extension numbers in angle brackets"""

    def test_search_finds_numbers_in_angle_brackets(self, api_client):
        """
        Test that numbers in angle brackets are searchable

        In getRepresent(), many entities use format like:
        - Extensions: "Name <200>"
        - DialplanApplications: "App: Name <000064>"
        - CallQueues: "Queue <300>"

        Before fix: strip_tags() removed <000064> thinking it was an HTML tag
        After fix: preg_replace() only removes HTML tags (starting with letters)
        """
        # Get all items to find one with number in angle brackets
        response = api_client.get('search:getSearchItems', params={'query': '0000'})
        assert_api_success(response, "Failed to search")

        data = response['data']

        # Find items with DIALPLANAPPLICATIONS type (they use <number> format)
        dialplan_items = [item for item in data if item.get('type') == 'DIALPLANAPPLICATIONS']

        if len(dialplan_items) > 0:
            print(f"\n✓ Found {len(dialplan_items)} dialplan applications matching '0000'")

            for item in dialplan_items[:3]:
                name = item.get('name', '')
                sorter = item.get('sorter', '')

                print(f"\nItem details:")
                print(f"  Name: {name[:80]}")
                print(f"  Sorter: {sorter[:80]}")

                # Check that sorter contains numbers from angle brackets
                # Example: "<i class='icon'></i> App: 0000MILLI <000064>"
                # Sorter should be: " App: 0000MILLI <000064>" (with angle brackets preserved)

                # If name contains <digits>, sorter should also contain <digits>
                import re
                angle_numbers_in_name = re.findall(r'<(\d+)>', name)
                angle_numbers_in_sorter = re.findall(r'<(\d+)>', sorter)

                if angle_numbers_in_name:
                    assert len(angle_numbers_in_sorter) > 0, \
                        f"Numbers in angle brackets should be preserved in sorter! " \
                        f"Name has {angle_numbers_in_name}, but sorter has {angle_numbers_in_sorter}"

                    assert angle_numbers_in_name == angle_numbers_in_sorter, \
                        f"Numbers should match: name={angle_numbers_in_name}, sorter={angle_numbers_in_sorter}"

                    print(f"  ✓ Angle bracket numbers preserved: {angle_numbers_in_sorter}")
        else:
            print("\n✓ No dialplan applications found (test skipped)")

    def test_html_tags_removed_but_numbers_preserved(self, api_client):
        """
        Verify that HTML tags are removed but angle bracket numbers are kept

        Example input: '<i class="php icon"></i> App: Name <000064>'
        Expected sorter: ' App: Name <000064>' (icon removed, number kept)
        """
        response = api_client.get('search:getSearchItems', params={'query': '00'})
        assert_api_success(response, "Failed to search")

        data = response['data']

        for item in data[:10]:  # Check first 10 items
            name = item.get('name', '')
            sorter = item.get('sorter', '')

            # HTML icon tags should be removed from sorter
            assert '<i class=' not in sorter, \
                f"HTML icon tags should be removed from sorter: {sorter}"

            assert '</i>' not in sorter, \
                f"Closing HTML tags should be removed from sorter: {sorter}"

            # If name contains <digits>, sorter should preserve them
            import re
            if re.search(r'<\d+>', name):
                assert re.search(r'<\d+>', sorter), \
                    f"Numbers in angle brackets should be in sorter! name={name}, sorter={sorter}"

        print(f"\n✓ Verified {min(10, len(data))} items: HTML removed, numbers preserved")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
