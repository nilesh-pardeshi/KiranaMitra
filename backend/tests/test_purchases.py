from decimal import Decimal
def create_test_supplier(client, name="Test Supplier"):
    response = client.post(
        "/api/suppliers/",
        json={
            "name": name,
            "phone": "9876500010",
            "address": "Pune"
        }
    )

    assert response.status_code == 201
    return response.json()["id"]


def create_test_variant(client):
    response = client.post(
        "/api/products/",
        json={
            "name": "Purchase Test Rice",
            "category": "Groceries",
            "variants": [
                {
                    "brand": "Test Brand",
                    "variant_name": "1 KG",
                    "sku": "PUR-TEST-001",
                    "unit": "kg",
                    "purchase_price": "40.00",
                    "selling_price": "50.00",
                    "current_stock": "10.000",
                    "reorder_level": "2.000",
                    "target_stock": "30.000"
                }
            ]
        }
    )

    assert response.status_code == 201
    return response.json()["variants"][0]["id"]


def create_test_purchase(client, supplier_id, variant_id, invoice):
    return client.post(
        "/api/purchases/",
        json={
            "supplier_id": supplier_id,
            "invoice_number": invoice,
            "items": [
                {
                    "variant_id": variant_id,
                    "quantity": "5.000",
                    "unit_cost": "40.00"
                }
            ]
        }
    )


def test_create_purchase(client):
    supplier_id = create_test_supplier(client)
    variant_id = create_test_variant(client)

    response = create_test_purchase(
        client,
        supplier_id,
        variant_id,
        "PUR-INV-001"
    )

    assert response.status_code == 201

    data = response.json()

    assert data["supplier_id"] == supplier_id
    assert data["invoice_number"] == "PUR-INV-001"
    assert data["status"] == "RECEIVED"
    assert float(data["total_amount"]) == 200.0
    assert len(data["items"]) == 1


def test_purchase_increases_stock(client):
    supplier_id = create_test_supplier(client)
    variant_id = create_test_variant(client)

    response = create_test_purchase(
        client,
        supplier_id,
        variant_id,
        "PUR-INV-002"
    )

    assert response.status_code == 201

    product_response = client.get(
        "/api/products/"
    )

    assert product_response.status_code == 200

    variant = next(
        variant
        for product in product_response.json()
        for variant in product["variants"]
        if variant["id"] == variant_id
    )

    assert float(variant["current_stock"]) == 15.0


def test_get_all_purchases(client):
    supplier_id = create_test_supplier(client)
    variant_id = create_test_variant(client)

    create_test_purchase(
        client,
        supplier_id,
        variant_id,
        "PUR-INV-003"
    )

    response = client.get("/api/purchases/")

    assert response.status_code == 200
    assert isinstance(response.json(), list)
    assert len(response.json()) == 1


def test_get_purchase_details(client):
    supplier_id = create_test_supplier(client)
    variant_id = create_test_variant(client)

    purchase_response = create_test_purchase(
        client,
        supplier_id,
        variant_id,
        "PUR-INV-004"
    )

    purchase_id = purchase_response.json()["id"]

    response = client.get(
        f"/api/purchases/{purchase_id}"
    )

    assert response.status_code == 200
    assert response.json()["id"] == purchase_id


def test_get_nonexistent_purchase(client):
    response = client.get("/api/purchases/999999")

    assert response.status_code == 404


def test_reject_duplicate_supplier_invoice(client):
    supplier_id = create_test_supplier(client)
    variant_id = create_test_variant(client)

    first = create_test_purchase(
        client,
        supplier_id,
        variant_id,
        "DUPLICATE-INV-001"
    )

    assert first.status_code == 201

    second = create_test_purchase(
        client,
        supplier_id,
        variant_id,
        "DUPLICATE-INV-001"
    )

    assert second.status_code == 400
    assert "Duplicate invoice" in second.json()["detail"]


def test_same_invoice_allowed_for_different_suppliers(client):
    supplier_one = create_test_supplier(
        client,
        "Supplier One"
    )

    supplier_two = create_test_supplier(
        client,
        "Supplier Two"
    )

    variant_id = create_test_variant(client)

    first = create_test_purchase(
        client,
        supplier_one,
        variant_id,
        "SHARED-INV-001"
    )

    second = create_test_purchase(
        client,
        supplier_two,
        variant_id,
        "SHARED-INV-001"
    )

    assert first.status_code == 201
    assert second.status_code == 201


def test_reject_purchase_with_empty_items(client):
    supplier_id = create_test_supplier(client)

    response = client.post(
        "/api/purchases/",
        json={
            "supplier_id": supplier_id,
            "invoice_number": "EMPTY-INV",
            "items": []
        }
    )

    assert response.status_code == 422


def test_reject_purchase_with_zero_quantity(client):
    supplier_id = create_test_supplier(client)
    variant_id = create_test_variant(client)

    response = client.post(
        "/api/purchases/",
        json={
            "supplier_id": supplier_id,
            "invoice_number": "ZERO-QTY-INV",
            "items": [
                {
                    "variant_id": variant_id,
                    "quantity": "0",
                    "unit_cost": "40"
                }
            ]
        }
    )

    assert response.status_code == 422


def test_reject_purchase_with_negative_cost(client):
    supplier_id = create_test_supplier(client)
    variant_id = create_test_variant(client)

    response = client.post(
        "/api/purchases/",
        json={
            "supplier_id": supplier_id,
            "invoice_number": "NEG-COST-INV",
            "items": [
                {
                    "variant_id": variant_id,
                    "quantity": "5",
                    "unit_cost": "-40"
                }
            ]
        }
    )

    assert response.status_code == 422


def test_reject_purchase_for_nonexistent_supplier(client):
    variant_id = create_test_variant(client)

    response = create_test_purchase(
        client,
        999999,
        variant_id,
        "INVALID-SUP-INV"
    )

    assert response.status_code == 400


def test_reject_purchase_for_nonexistent_variant(client):
    supplier_id = create_test_supplier(client)

    response = create_test_purchase(
        client,
        supplier_id,
        999999,
        "INVALID-VARIANT-INV"
    )

    assert response.status_code == 400

def test_failed_purchase_rolls_back_all_stock_changes(client):
    supplier_id = create_test_supplier(client)
    variant_id = create_test_variant(client)

    # Get the initial stock.
    products_response = client.get("/api/products/")
    assert products_response.status_code == 200

    initial_stock = None

    for product in products_response.json():
        for variant in product["variants"]:
            if variant["id"] == variant_id:
                initial_stock = Decimal(str(variant["current_stock"]))

    assert initial_stock is not None

    # First item is valid; second item does not exist.
    response = client.post(
        "/api/purchases/",
        json={
            "supplier_id": supplier_id,
            "invoice_number": "ROLLBACK-TEST-001",
            "items": [
                {
                    "variant_id": variant_id,
                    "quantity": "5",
                    "unit_cost": "40"
                },
                {
                    "variant_id": 999999,
                    "quantity": "3",
                    "unit_cost": "50"
                }
            ]
        }
    )

    assert response.status_code == 400

    # Confirm the first item's stock increase was rolled back.
    products_response = client.get("/api/products/")
    assert products_response.status_code == 200

    final_stock = None

    for product in products_response.json():
        for variant in product["variants"]:
            if variant["id"] == variant_id:
                final_stock = Decimal(str(variant["current_stock"]))

    assert final_stock == initial_stock

    # Confirm no purchase was saved.
    purchases_response = client.get("/api/purchases/")
    assert purchases_response.status_code == 200

    assert all(
        purchase["invoice_number"] != "ROLLBACK-TEST-001"
        for purchase in purchases_response.json()
    )

def test_reject_duplicate_variants_in_purchase(client):
    supplier_id = create_test_supplier(client)
    variant_id = create_test_variant(client)

    response = client.post(
        "/api/purchases/",
        json={
            "supplier_id": supplier_id,
            "invoice_number": "DUPLICATE-VARIANT-001",
            "items": [
                {
                    "variant_id": variant_id,
                    "quantity": "5",
                    "unit_cost": "40"
                },
                {
                    "variant_id": variant_id,
                    "quantity": "3",
                    "unit_cost": "40"
                }
            ]
        }
    )

    assert response.status_code == 400
    assert "only appear once" in response.json()["detail"]