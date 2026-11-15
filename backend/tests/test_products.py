
def test_create_product(client):
    payload = {
        "name": "Test Rice",
        "category": "Groceries",
        "description": "Automated testing product",
        "variants": [
            {
                "brand": "Test Brand",
                "variant_name": "1 KG",
                "sku": "TEST-RICE-001",
                "unit": "kg",
                "purchase_price": "45.00",
                "selling_price": "55.00",
                "current_stock": "20.000",
                "reorder_level": "5.000",
                "target_stock": "50.000"
            }
        ]
    }

    response = client.post("/api/products/", json=payload)

    assert response.status_code == 201

    data = response.json()

    assert data["name"] == "Test Rice"
    assert data["category"] == "Groceries"
    assert len(data["variants"]) == 1
    assert data["variants"][0]["brand"] == "Test Brand"
    assert float(data["variants"][0]["current_stock"]) == 20.0


def test_create_product_without_name(client):
    payload = {
        "category": "Groceries",
        "variants": [
            {
                "brand": "Test Brand",
                "variant_name": "1 KG",
                "purchase_price": "45.00",
                "selling_price": "55.00",
                "current_stock": "20",
                "reorder_level": "5",
                "target_stock": "50"
            }
        ]
    }

    response = client.post("/api/products/", json=payload)

    assert response.status_code == 422


def test_create_product_with_negative_price(client):
    payload = {
        "name": "Invalid Rice",
        "category": "Groceries",
        "variants": [
            {
                "brand": "Test Brand",
                "variant_name": "1 KG",
                "purchase_price": "-45.00",
                "selling_price": "55.00",
                "current_stock": "20",
                "reorder_level": "5",
                "target_stock": "50"
            }
        ]
    }

    response = client.post("/api/products/", json=payload)

    assert response.status_code == 422


def test_create_product_without_variants(client):
    payload = {
        "name": "Invalid Product",
        "category": "Groceries",
        "variants": []
    }

    response = client.post("/api/products/", json=payload)

    assert response.status_code == 422


def test_get_nonexistent_product(client):
    response = client.get("/api/products/999999")

    assert response.status_code == 404
    assert response.json()["detail"] == "Product not found"
