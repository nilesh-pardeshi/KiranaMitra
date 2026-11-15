from app.models.product import ProductVariant

def create_test_product(client):
    """Create a product with 10 units of opening stock."""

    payload = {
        "name": "Inventory Test Rice",
        "category": "Groceries",
        "description": "Inventory automated testing",
        "variants": [
            {
                "brand": "Test Brand",
                "variant_name": "1 KG",
                "sku": "INV-TEST-001",
                "unit": "kg",
                "purchase_price": "40.00",
                "selling_price": "50.00",
                "current_stock": "10.000",
                "reorder_level": "2.000",
                "target_stock": "30.000"
            }
        ]
    }

    response = client.post("/api/products/", json=payload)

    assert response.status_code == 201

    return response.json()["variants"][0]["id"]


def test_add_stock(client):
    variant_id = create_test_product(client)

    response = client.patch(
        f"/api/products/variants/{variant_id}/stock",
        json={
            "quantity": "5",
            "movement_type": "IN",
            "note": "Test stock addition"
        }
    )

    assert response.status_code == 200
    assert float(response.json()["current_stock"]) == 15.0


def test_remove_stock(client):
    variant_id = create_test_product(client)

    response = client.patch(
        f"/api/products/variants/{variant_id}/stock",
        json={
            "quantity": "3",
            "movement_type": "OUT",
            "note": "Test stock removal"
        }
    )

    assert response.status_code == 200
    assert float(response.json()["current_stock"]) == 7.0


def test_reject_insufficient_stock(client):
    variant_id = create_test_product(client)

    response = client.patch(
        f"/api/products/variants/{variant_id}/stock",
        json={
            "quantity": "20",
            "movement_type": "OUT",
            "note": "Insufficient stock test"
        }
    )

    assert response.status_code == 400


def test_reject_zero_stock_adjustment(client):
    variant_id = create_test_product(client)

    response = client.patch(
        f"/api/products/variants/{variant_id}/stock",
        json={
            "quantity": "0",
            "movement_type": "IN",
            "note": "Zero quantity test"
        }
    )

    assert response.status_code == 422


def test_reject_negative_stock_adjustment(client):
    variant_id = create_test_product(client)

    response = client.patch(
        f"/api/products/variants/{variant_id}/stock",
        json={
            "quantity": "-5",
            "movement_type": "IN",
            "note": "Negative quantity test"
        }
    )

    assert response.status_code == 422


def test_reject_invalid_movement_type(client):
    variant_id = create_test_product(client)

    response = client.patch(
        f"/api/products/variants/{variant_id}/stock",
        json={
            "quantity": "2",
            "movement_type": "INVALID",
            "note": "Invalid movement test"
        }
    )

    assert response.status_code == 400


def test_stock_adjustment_for_nonexistent_variant(client):
    response = client.patch(
        "/api/products/variants/999999/stock",
        json={
            "quantity": "2",
            "movement_type": "IN",
            "note": "Nonexistent variant test"
        }
    )

    assert response.status_code == 400

def test_reject_stock_adjustment_for_inactive_variant(
    client, db_session
):
    variant_id = create_test_product(client)

    variant = db_session.get(ProductVariant, variant_id)
    assert variant is not None

    variant.is_active = False
    db_session.flush()

    response = client.patch(
        f"/api/products/variants/{variant_id}/stock",
        json={
            "quantity": "5",
            "movement_type": "IN",
            "note": "Inactive variant test"
        }
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Product variant not found."