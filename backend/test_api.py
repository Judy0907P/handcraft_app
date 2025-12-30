#!/usr/bin/env python3
"""
Test script for Handcraft Management API
Run this after starting the server to verify all endpoints work correctly
"""

import requests
import json
from uuid import UUID

BASE_URL = "http://localhost:8000"

# Test organization ID from seed data
TEST_ORG_ID = "22222222-2222-2222-2222-222222222222"
TEST_PRODUCT_ID = "11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa"  # Blue Bead Bracelet


def print_response(title, response):
    """Helper to print formatted response"""
    print(f"\n{'='*60}")
    print(f"{title}")
    print(f"{'='*60}")
    print(f"Status: {response.status_code}")
    try:
        print(f"Response: {json.dumps(response.json(), indent=2, default=str)}")
    except:
        print(f"Response: {response.text}")


def test_health_check():
    """Test health check endpoint"""
    print("\n1. Testing Health Check...")
    response = requests.get(f"{BASE_URL}/health")
    print_response("Health Check", response)
    assert response.status_code == 200
    print("✓ Health check passed")


def test_get_parts():
    """Test getting parts for organization"""
    print("\n2. Testing Get Parts...")
    response = requests.get(f"{BASE_URL}/parts/org/{TEST_ORG_ID}")
    print_response("Get Parts", response)
    assert response.status_code == 200
    parts = response.json()
    assert len(parts) > 0
    print(f"✓ Found {len(parts)} parts")


def test_create_part():
    """Test creating a new part"""
    print("\n3. Testing Create Part...")
    new_part = {
        "org_id": TEST_ORG_ID,
        "name": "Test Silver Clasp",
        "stock": 25,
        "unit_cost": "1.50",
        "unit": "piece"
    }
    response = requests.post(f"{BASE_URL}/parts/", json=new_part)
    print_response("Create Part", response)
    assert response.status_code == 201
    part = response.json()
    assert part["name"] == new_part["name"]
    print(f"✓ Created part: {part['part_id']}")
    return part["part_id"]


def test_get_products():
    """Test getting products for organization"""
    print("\n4. Testing Get Products...")
    response = requests.get(f"{BASE_URL}/products/org/{TEST_ORG_ID}")
    print_response("Get Products", response)
    assert response.status_code == 200
    products = response.json()
    assert len(products) > 0
    print(f"✓ Found {len(products)} products")


def test_get_product():
    """Test getting a specific product"""
    print("\n5. Testing Get Product...")
    response = requests.get(f"{BASE_URL}/products/{TEST_PRODUCT_ID}")
    print_response("Get Product", response)
    assert response.status_code == 200
    product = response.json()
    assert product["product_id"] == TEST_PRODUCT_ID
    print(f"✓ Found product: {product['name']}")


def test_build_product():
    """Test building a product"""
    print("\n6. Testing Build Product...")
    build_request = {
        "product_id": TEST_PRODUCT_ID,
        "build_qty": "3"
    }
    response = requests.post(f"{BASE_URL}/production/build", json=build_request)
    print_response("Build Product", response)
    assert response.status_code == 200
    result = response.json()
    assert "transaction_id" in result
    print(f"✓ Built {result['build_qty']} units, new quantity: {result['new_product_quantity']}")


def test_sell_product():
    """Test selling a product"""
    print("\n7. Testing Sell Product...")
    sale_request = {
        "product_id": TEST_PRODUCT_ID,
        "quantity": 2,
        "unit_price": "18.00",
        "notes": "Test sale via API"
    }
    response = requests.post(
        f"{BASE_URL}/sales/?org_id={TEST_ORG_ID}",
        json=sale_request
    )
    print_response("Sell Product", response)
    assert response.status_code == 201
    sale = response.json()
    assert sale["quantity"] == sale_request["quantity"]
    assert float(sale["total_revenue"]) == sale_request["quantity"] * float(sale_request["unit_price"])
    print(f"✓ Sold {sale['quantity']} units for ${sale['total_revenue']}")


def test_get_sales():
    """Test getting sales for organization"""
    print("\n8. Testing Get Sales...")
    response = requests.get(f"{BASE_URL}/sales/org/{TEST_ORG_ID}")
    print_response("Get Sales", response)
    assert response.status_code == 200
    sales = response.json()
    print(f"✓ Found {len(sales)} sales")


def test_profit_summary():
    """Test getting profit summary"""
    print("\n9. Testing Profit Summary...")
    response = requests.get(f"{BASE_URL}/analytics/profit-summary/{TEST_ORG_ID}")
    print_response("Profit Summary", response)
    assert response.status_code == 200
    summary = response.json()
    print(f"✓ Found profit data for {len(summary)} products")
    if len(summary) > 0:
        for item in summary:
            print(f"  - {item['product_name']}: Revenue=${item['total_revenue']}, Profit=${item['total_profit']}")


def main():
    """Run all tests"""
    print("="*60)
    print("Handcraft Management API Test Suite")
    print("="*60)
    print(f"Testing against: {BASE_URL}")
    print(f"Test Org ID: {TEST_ORG_ID}")
    
    try:
        test_health_check()
        test_get_parts()
        part_id = test_create_part()
        test_get_products()
        test_get_product()
        test_build_product()
        test_sell_product()
        test_get_sales()
        test_profit_summary()
        
        print("\n" + "="*60)
        print("ALL TESTS PASSED! ✓")
        print("="*60)
        
    except AssertionError as e:
        print(f"\n❌ Test failed: {e}")
        return 1
    except requests.exceptions.ConnectionError:
        print(f"\n❌ Could not connect to {BASE_URL}")
        print("Make sure the server is running: uvicorn app.main:app --reload")
        return 1
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())

