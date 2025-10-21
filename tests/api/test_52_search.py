#!/usr/bin/env python3
"""
Test suite for Global Search operations

Tests the /pbxcore/api/v3/search:getSearchItems endpoint for:
- Getting all searchable items
- Filtering by query parameter
- Search by number (extensions, providers, etc.)
- Search by name (users, menu items, etc.)
- Multilingual search (Russian, English)
- Case-insensitive search
- Partial match search

Global Search provides unified access to all system entities (users, providers, queues, IVR menus, etc.)
and static menu pages. It supports server-side filtering with incremental loading as user types.

The search supports:
- Database entities: Users, Providers, CallQueues, IvrMenu, Extensions, etc.
- Static menu items: Settings, Network, Mail Settings, etc.
- Search by: number, name, or any text in representation
- Multilingual: works with Cyrillic, Latin, and other UTF-8 characters
"""

import pytest
from conftest import assert_api_success


class TestSearchBasic:
    """Basic tests for Global Search functionality"""

    def test_01_get_all_items_no_filter(self, api_client):
        """Test GET /search:getSearchItems - Get all searchable items without filter"""
        response = api_client.get('search:getSearchItems')
        assert_api_success(response, "Failed to get search items")

        data = response['data']
        assert isinstance(data, list), "Response data should be a list"
        assert len(data) > 0, "Should return at least some items"

        # Verify structure of first item
        if len(data) > 0:
            item = data[0]
            assert 'name' in item, "Item should have 'name' field"
            assert 'value' in item, "Item should have 'value' field (URL)"
            assert 'type' in item, "Item should have 'type' field"
            assert 'typeLocalized' in item, "Item should have 'typeLocalized' field"
            assert 'sorter' in item, "Item should have 'sorter' field"

            print(f"✓ Retrieved {len(data)} searchable items")
            print(f"  Sample item: {item['sorter'][:50]} (type: {item['type']})")

    def test_02_search_item_structure_validation(self, api_client):
        """Test GET /search:getSearchItems - Validate all items have correct structure"""
        response = api_client.get('search:getSearchItems')
        assert_api_success(response, "Failed to get search items")

        data = response['data']
        required_fields = ['name', 'value', 'type', 'typeLocalized', 'sorter']

        # Check all items
        for item in data:
            for field in required_fields:
                assert field in item, f"Item missing required field '{field}': {item}"

            # Validate field types
            assert isinstance(item['name'], str), "name should be string"
            assert isinstance(item['value'], str), "value should be string"
            assert isinstance(item['type'], str), "type should be string"
            assert isinstance(item['typeLocalized'], str), "typeLocalized should be string"
            assert isinstance(item['sorter'], str), "sorter should be string"

            # Validate value is a URL path
            assert item['value'].startswith('/') or item['value'].startswith('http'), \
                f"value should be a URL: {item['value']}"

        print(f"✓ All {len(data)} items have valid structure")

    def test_03_verify_item_categories(self, api_client):
        """Test GET /search:getSearchItems - Verify different item categories exist"""
        response = api_client.get('search:getSearchItems')
        assert_api_success(response, "Failed to get search items")

        data = response['data']

        # Collect all unique types
        types = set(item['type'] for item in data)

        # Expected categories (at least some should exist)
        expected_categories = [
            'USERS',           # From Users model
            'PROVIDERS',       # From Providers model
            'CALL_QUEUES',     # From CallQueues model
            'IVR_MENU',        # From IvrMenu model
            'MENUITEMS',       # Static menu items
        ]

        found_categories = []
        for category in expected_categories:
            if category in types:
                found_categories.append(category)

        assert len(found_categories) > 0, \
            f"Should find at least some expected categories. Found types: {types}"

        print(f"✓ Found {len(types)} item categories: {sorted(types)}")
        print(f"  Expected categories found: {found_categories}")


class TestSearchFiltering:
    """Tests for search filtering by query parameter"""

    def test_01_search_by_number(self, api_client):
        """Test GET /search:getSearchItems?query=201 - Search by extension number"""
        # First, get all items to check if we have extensions
        all_response = api_client.get('search:getSearchItems')
        assert_api_success(all_response, "Failed to get all items")

        # Now search for a number
        response = api_client.get('search:getSearchItems', params={'query': '201'})
        assert_api_success(response, "Failed to search by number")

        data = response['data']
        assert isinstance(data, list), "Response should be a list"

        # If we have results, verify they match the query
        if len(data) > 0:
            for item in data:
                # The sorter field should contain '201' (case-insensitive)
                assert '201' in item['sorter'].lower(), \
                    f"Search result should contain '201': {item['sorter']}"

            print(f"✓ Found {len(data)} items matching '201'")
            print(f"  Sample matches: {[item['sorter'][:40] for item in data[:3]]}")
        else:
            # It's OK if no extensions exist yet
            print(f"✓ No items match '201' (extension may not exist yet)")

    def test_02_search_by_name_latin(self, api_client):
        """Test GET /search:getSearchItems?query=admin - Search by name in Latin"""
        response = api_client.get('search:getSearchItems', params={'query': 'admin'})
        assert_api_success(response, "Failed to search by name")

        data = response['data']
        assert isinstance(data, list), "Response should be a list"

        # Should find at least admin user or admin-related items
        if len(data) > 0:
            for item in data:
                # The sorter field should contain 'admin' (case-insensitive)
                assert 'admin' in item['sorter'].lower(), \
                    f"Search result should contain 'admin': {item['sorter']}"

            print(f"✓ Found {len(data)} items matching 'admin'")
            print(f"  Sample matches: {[item['sorter'][:40] for item in data[:5]]}")
        else:
            print(f"✓ No items match 'admin'")

    def test_03_search_menu_items(self, api_client):
        """Test GET /search:getSearchItems?query=settings - Search for menu items"""
        response = api_client.get('search:getSearchItems', params={'query': 'settings'})
        assert_api_success(response, "Failed to search menu items")

        data = response['data']
        assert isinstance(data, list), "Response should be a list"

        # Should find settings-related menu items
        menu_items = [item for item in data if item['type'] == 'MENUITEMS']

        if len(menu_items) > 0:
            print(f"✓ Found {len(menu_items)} menu items matching 'settings'")
            print(f"  Sample menu items: {[item['sorter'][:40] for item in menu_items[:3]]}")
        else:
            # Might not match if translations are in Russian
            print(f"✓ No menu items match 'settings' in English")

    def test_04_search_case_insensitive(self, api_client):
        """Test GET /search:getSearchItems - Case-insensitive search"""
        # Search with lowercase
        response_lower = api_client.get('search:getSearchItems', params={'query': 'admin'})
        assert_api_success(response_lower, "Failed lowercase search")

        # Search with uppercase
        response_upper = api_client.get('search:getSearchItems', params={'query': 'ADMIN'})
        assert_api_success(response_upper, "Failed uppercase search")

        # Search with mixed case
        response_mixed = api_client.get('search:getSearchItems', params={'query': 'AdMiN'})
        assert_api_success(response_mixed, "Failed mixed case search")

        # All should return same results
        count_lower = len(response_lower['data'])
        count_upper = len(response_upper['data'])
        count_mixed = len(response_mixed['data'])

        assert count_lower == count_upper == count_mixed, \
            f"Case-insensitive search failed: lower={count_lower}, upper={count_upper}, mixed={count_mixed}"

        print(f"✓ Case-insensitive search works: all queries returned {count_lower} items")

    def test_05_search_partial_match(self, api_client):
        """Test GET /search:getSearchItems - Partial text match"""
        # Search for partial word
        response = api_client.get('search:getSearchItems', params={'query': 'set'})
        assert_api_success(response, "Failed partial match search")

        data = response['data']

        # Should find items containing 'set' (like 'settings', 'preset', etc.)
        if len(data) > 0:
            for item in data:
                assert 'set' in item['sorter'].lower(), \
                    f"Partial match failed for 'set': {item['sorter']}"

            print(f"✓ Partial match works: found {len(data)} items containing 'set'")
        else:
            print(f"✓ No items match partial 'set'")

    def test_06_search_empty_query(self, api_client):
        """Test GET /search:getSearchItems?query= - Empty query returns only menu sections"""
        # Empty query
        response_empty = api_client.get('search:getSearchItems', params={'query': ''})
        assert_api_success(response_empty, "Failed with empty query")

        # No query
        response_none = api_client.get('search:getSearchItems')
        assert_api_success(response_none, "Failed without query")

        # Both should return same items (menu sections only)
        count_empty = len(response_empty['data'])
        count_none = len(response_none['data'])

        assert count_empty == count_none, \
            f"Empty query should return same as no query: empty={count_empty}, none={count_none}"

        # All items should be MENUITEMS type (not database entities)
        for item in response_empty['data']:
            assert item['type'] == 'MENUITEMS', \
                f"Empty query should return only menu sections, got: {item['type']}"

        print(f"✓ Empty query returns only {count_empty} menu sections")
        print(f"  Sample sections: {[item['sorter'][:30] for item in response_empty['data'][:5]]}")

    def test_07_search_nonexistent(self, api_client):
        """Test GET /search:getSearchItems?query=xyz999 - Search for nonexistent item"""
        response = api_client.get('search:getSearchItems', params={'query': 'xyz999nonexistent'})
        assert_api_success(response, "Failed search for nonexistent item")

        data = response['data']
        assert isinstance(data, list), "Response should be a list"
        assert len(data) == 0, "Should return empty list for nonexistent item"

        print(f"✓ Nonexistent search returns empty list")


class TestSearchMultilingual:
    """Tests for multilingual search (Russian)"""

    def test_01_search_cyrillic_network(self, api_client):
        """Test GET /search:getSearchItems?query=сеть - Search in Russian (network)"""
        response = api_client.get('search:getSearchItems', params={'query': 'сеть'})
        assert_api_success(response, "Failed Cyrillic search")

        data = response['data']
        assert isinstance(data, list), "Response should be a list"

        # If Russian interface is enabled, should find network-related items
        if len(data) > 0:
            print(f"✓ Found {len(data)} items matching 'сеть' (Russian)")
            print(f"  Sample matches: {[item['sorter'][:40] for item in data[:3]]}")
        else:
            # Might not match if interface is in English
            print(f"✓ No items match 'сеть' (interface might be in English)")

    def test_02_search_cyrillic_settings(self, api_client):
        """Test GET /search:getSearchItems?query=настройки - Search for settings in Russian"""
        response = api_client.get('search:getSearchItems', params={'query': 'настройки'})
        assert_api_success(response, "Failed Cyrillic search for settings")

        data = response['data']
        assert isinstance(data, list), "Response should be a list"

        if len(data) > 0:
            print(f"✓ Found {len(data)} items matching 'настройки' (settings)")
            print(f"  Sample matches: {[item['sorter'][:40] for item in data[:3]]}")
        else:
            print(f"✓ No items match 'настройки'")

    def test_03_search_mixed_languages(self, api_client):
        """Test search with mixed Latin and Cyrillic characters"""
        # This should work even if it's unusual
        response = api_client.get('search:getSearchItems', params={'query': 'admin настройки'})
        assert_api_success(response, "Failed mixed language search")

        data = response['data']
        assert isinstance(data, list), "Response should be a list"

        print(f"✓ Mixed language search returned {len(data)} items")


class TestSearchEdgeCases:
    """Edge cases and stress tests for Search"""

    def test_01_search_special_characters(self, api_client):
        """Test GET /search:getSearchItems - Search with special characters"""
        special_chars = ['@', '#', '$', '%', '&', '*', '(', ')', '-', '+', '=']

        for char in special_chars[:3]:  # Test a few
            response = api_client.get('search:getSearchItems', params={'query': char})
            assert_api_success(response, f"Failed search with special char '{char}'")

            data = response['data']
            assert isinstance(data, list), f"Response should be a list for '{char}'"

        print(f"✓ Special character searches work correctly")

    def test_02_search_very_long_query(self, api_client):
        """Test GET /search:getSearchItems - Very long query string"""
        long_query = 'a' * 200  # 200 character query
        response = api_client.get('search:getSearchItems', params={'query': long_query})
        assert_api_success(response, "Failed with very long query")

        data = response['data']
        assert isinstance(data, list), "Response should be a list"
        assert len(data) == 0, "Should return empty for nonsense long query"

        print(f"✓ Long query (200 chars) handled correctly")

    def test_03_search_numbers_only(self, api_client):
        """Test GET /search:getSearchItems - Search with numbers only"""
        response = api_client.get('search:getSearchItems', params={'query': '123'})
        assert_api_success(response, "Failed number-only search")

        data = response['data']
        assert isinstance(data, list), "Response should be a list"

        print(f"✓ Number-only search returned {len(data)} items")

    def test_04_search_whitespace_handling(self, api_client):
        """Test GET /search:getSearchItems - Whitespace handling"""
        # Leading/trailing spaces
        response = api_client.get('search:getSearchItems', params={'query': '  admin  '})
        assert_api_success(response, "Failed with whitespace query")

        data = response['data']
        assert isinstance(data, list), "Response should be a list"

        # Should trim whitespace and find matches
        if len(data) > 0:
            for item in data:
                assert 'admin' in item['sorter'].lower(), \
                    f"Should match 'admin' after trimming: {item['sorter']}"

        print(f"✓ Whitespace trimming works: found {len(data)} items")

    def test_05_search_performance_stress(self, api_client):
        """Test GET /search:getSearchItems - Multiple rapid sequential searches"""
        queries = ['a', 'ad', 'adm', 'admi', 'admin']

        for query in queries:
            response = api_client.get('search:getSearchItems', params={'query': query})
            assert_api_success(response, f"Failed sequential search for '{query}'")

        print(f"✓ Sequential searches work correctly ({len(queries)} queries)")

    def test_06_search_unicode_characters(self, api_client):
        """Test GET /search:getSearchItems - Unicode characters"""
        unicode_queries = ['café', '日本', '한국', '🎯']

        for query in unicode_queries[:2]:  # Test a few
            response = api_client.get('search:getSearchItems', params={'query': query})
            assert_api_success(response, f"Failed Unicode search for '{query}'")

            data = response['data']
            assert isinstance(data, list), f"Response should be a list for '{query}'"

        print(f"✓ Unicode character searches work correctly")


class TestSearchIntegration:
    """Integration tests with actual system data"""

    def test_01_verify_static_menu_items_exist(self, api_client):
        """Test that static menu items are included in search results"""
        response = api_client.get('search:getSearchItems')
        assert_api_success(response, "Failed to get search items")

        data = response['data']
        menu_items = [item for item in data if item['type'] == 'MENUITEMS']

        assert len(menu_items) > 0, "Should have at least some static menu items"

        print(f"✓ Found {len(menu_items)} static menu items")
        print(f"  Sample menu items: {[item['sorter'][:40] for item in menu_items[:5]]}")

    def test_02_verify_item_urls_valid(self, api_client):
        """Test that all returned URLs are properly formatted"""
        response = api_client.get('search:getSearchItems')
        assert_api_success(response, "Failed to get search items")

        data = response['data']

        for item in data[:50]:  # Check first 50
            url = item['value']
            # Should start with / for relative URLs
            assert url.startswith('/') or url.startswith('http'), \
                f"Invalid URL format: {url}"

        print(f"✓ All item URLs are properly formatted")

    def test_03_search_consistency_check(self, api_client):
        """Test that search results are consistent across multiple calls"""
        query = 'test'

        # Make 3 identical requests
        response1 = api_client.get('search:getSearchItems', params={'query': query})
        response2 = api_client.get('search:getSearchItems', params={'query': query})
        response3 = api_client.get('search:getSearchItems', params={'query': query})

        assert_api_success(response1, "First request failed")
        assert_api_success(response2, "Second request failed")
        assert_api_success(response3, "Third request failed")

        # All should return same count
        count1 = len(response1['data'])
        count2 = len(response2['data'])
        count3 = len(response3['data'])

        assert count1 == count2 == count3, \
            f"Inconsistent results: {count1}, {count2}, {count3}"

        print(f"✓ Search results are consistent: all returned {count1} items")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
