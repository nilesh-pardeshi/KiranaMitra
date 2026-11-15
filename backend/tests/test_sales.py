
def create_test_customer(client):
    response = client.post(
        "/api/customers/",
        json={
            "name": "Sales Test Customer",
            "phone": "9876500020",
            "address": "Pune"
        }
    )

    assert response.status_code == 201
    return response.json()["id"]


def create_test_variant(client, stock="10.000"):
    response = client.post(
        "/api/products/",
        json={
            "name": "Sales Test Rice",
            "category": "Groceries",
            "variants": [
                {
                    "brand": "Test Brand",
                    "variant_name": "1 KG",
                    "sku": "SALES-TEST-001",
                    "unit": "kg",
                    "purchase_price": "40.00",
                    "selling_price": "50.00",
                    "current_stock": stock,
                    "reorder_level": "2.000",
                    "target_stock": "30.000"
                }
            ]
        }
    )

    assert response.status_code == 201
    return response.json()["variants"][0]["id"]


def create_test_sale(
    client,
    variant_id,
    quantity="2",
    customer_id=None,
    discount="0",
    paid_amount="100",
    payment_method="CASH"
):
    return client.post(
        "/api/sales/",
        json={
            "customer_id": customer_id,
            "discount": discount,
            "paid_amount": paid_amount,
            "payment_method": payment_method,
            "items": [
                {
                    "variant_id": variant_id,
                    "quantity": quantity
                }
            ]
        }
    )


def get_variant_stock(client, variant_id):
    response = client.get("/api/products/")

    assert response.status_code == 200

    for product in response.json():
        for variant in product["variants"]:
            if variant["id"] == variant_id:
                return float(variant["current_stock"])

    raise AssertionError("Test variant not found")


def test_create_fully_paid_cash_sale(client):
    variant_id = create_test_variant(client)

    response = create_test_sale(
        client,
        variant_id,
        quantity="2",
        paid_amount="100",
        payment_method="CASH"
    )

    assert response.status_code == 201

    data = response.json()

    assert float(data["subtotal"]) == 100.0
    assert float(data["total_amount"]) == 100.0
    assert float(data["paid_amount"]) == 100.0
    assert float(data["current_outstanding"]) == 0.0
    assert data["payment_status"] == "PAID"
    assert data["current_payment_status"] == "PAID"


def test_create_upi_sale(client):
    variant_id = create_test_variant(client)

    response = create_test_sale(
        client,
        variant_id,
        paid_amount="100",
        payment_method="UPI"
    )

    assert response.status_code == 201
    assert response.json()["payment_status"] == "PAID"


def test_create_partial_payment_sale(client):
    customer_id = create_test_customer(client)
    variant_id = create_test_variant(client)

    response = create_test_sale(
        client,
        variant_id,
        customer_id=customer_id,
        paid_amount="40",
        payment_method="CASH"
    )

    assert response.status_code == 201

    data = response.json()

    assert float(data["total_amount"]) == 100.0
    assert float(data["paid_amount"]) == 40.0
    assert float(data["current_outstanding"]) == 60.0
    assert data["payment_status"] == "PARTIAL"
    assert data["current_payment_status"] == "PARTIAL"


def test_create_unpaid_udhar_sale(client):
    customer_id = create_test_customer(client)
    variant_id = create_test_variant(client)

    response = create_test_sale(
        client,
        variant_id,
        customer_id=customer_id,
        paid_amount="0",
        payment_method=None
    )

    assert response.status_code == 201

    data = response.json()

    assert data["payment_status"] == "UNPAID"
    assert data["current_payment_status"] == "UNPAID"
    assert float(data["current_outstanding"]) == 100.0


def test_sale_deducts_inventory(client):
    variant_id = create_test_variant(client, stock="10")

    response = create_test_sale(
        client,
        variant_id,
        quantity="3",
        paid_amount="150",
        payment_method="CASH"
    )

    assert response.status_code == 201
    assert get_variant_stock(client, variant_id) == 7.0


def test_reject_sale_with_insufficient_stock(client):
    variant_id = create_test_variant(client, stock="5")

    response = create_test_sale(
        client,
        variant_id,
        quantity="10",
        paid_amount="500",
        payment_method="CASH"
    )

    assert response.status_code == 400
    assert "Insufficient stock" in response.json()["detail"]

    # Failed sale must not deduct stock.
    assert get_variant_stock(client, variant_id) == 5.0


def test_reject_sale_without_customer_for_udhar(client):
    variant_id = create_test_variant(client)

    response = create_test_sale(
        client,
        variant_id,
        paid_amount="0",
        payment_method=None
    )

    assert response.status_code == 400
    assert "Select a customer" in response.json()["detail"]


def test_reject_discount_greater_than_subtotal(client):
    variant_id = create_test_variant(client)

    response = create_test_sale(
        client,
        variant_id,
        discount="150",
        paid_amount="0"
    )

    assert response.status_code == 400
    assert "Discount cannot exceed subtotal" in response.json()["detail"]


def test_reject_payment_greater_than_total(client):
    variant_id = create_test_variant(client)

    response = create_test_sale(
        client,
        variant_id,
        paid_amount="150",
        payment_method="CASH"
    )

    assert response.status_code == 400
    assert "Paid amount cannot exceed bill total" in response.json()["detail"]


def test_reject_payment_without_payment_method(client):
    customer_id = create_test_customer(client)
    variant_id = create_test_variant(client)

    response = create_test_sale(
        client,
        variant_id,
        customer_id=customer_id,
        paid_amount="50",
        payment_method=None
    )

    assert response.status_code == 400
    assert "Payment method is required" in response.json()["detail"]

def test_reject_duplicate_variants_in_sale(client):
    variant_id = create_test_variant(client)

    response = client.post(
        "/api/sales/",
        json={
            "discount": "0",
            "paid_amount": "100",
            "payment_method": "CASH",
            "items": [
                {
                    "variant_id": variant_id,
                    "quantity": "1"
                },
                {
                    "variant_id": variant_id,
                    "quantity": "1"
                }
            ]
        }
    )

    assert response.status_code == 400
    assert "Do not repeat" in response.json()["detail"]


def test_create_fractional_quantity_sale(client):
    variant_id = create_test_variant(client, stock="5")

    response = create_test_sale(
        client,
        variant_id,
        quantity="0.500",
        paid_amount="25",
        payment_method="CASH"
    )

    assert response.status_code == 201

    data = response.json()

    assert float(data["items"][0]["quantity"]) == 0.5
    assert float(data["subtotal"]) == 25.0
    assert get_variant_stock(client, variant_id) == 4.5


def test_get_all_sales(client):
    variant_id = create_test_variant(client)

    create_test_sale(
        client,
        variant_id,
        paid_amount="100",
        payment_method="CASH"
    )

    response = client.get("/api/sales/")

    assert response.status_code == 200
    assert isinstance(response.json(), list)
    assert len(response.json()) == 1


def test_get_sale_details(client):
    variant_id = create_test_variant(client)

    create_response = create_test_sale(
        client,
        variant_id,
        paid_amount="100",
        payment_method="CASH"
    )

    sale_id = create_response.json()["id"]

    response = client.get(f"/api/sales/{sale_id}")

    assert response.status_code == 200
    assert response.json()["id"] == sale_id
    assert response.json()["current_payment_status"] == "PAID"


def test_get_nonexistent_sale(client):
    response = client.get("/api/sales/999999")

    assert response.status_code == 404
    assert response.json()["detail"] == "Sale not found."


def test_fifo_repayment_allocation(client):
    customer_id = create_test_customer(client)
    variant_id = create_test_variant(client, stock="20")

    # First invoice: 100 unpaid.
    first_sale = create_test_sale(
        client,
        variant_id,
        quantity="2",
        customer_id=customer_id,
        paid_amount="0",
        payment_method=None
    )

    assert first_sale.status_code == 201
    first_sale_id = first_sale.json()["id"]

    # Second invoice: another 100 unpaid.
    second_sale = create_test_sale(
        client,
        variant_id,
        quantity="2",
        customer_id=customer_id,
        paid_amount="0",
        payment_method=None
    )

    assert second_sale.status_code == 201
    second_sale_id = second_sale.json()["id"]

    # Repay 150. FIFO should settle invoice 1 first.
    repayment = client.post(
        f"/api/customers/{customer_id}/repayments",
        json={
            "amount": "150",
            "payment_method": "UPI",
            "reference_number": "FIFO-TEST-001"
        }
    )

    assert repayment.status_code == 200

    allocations = repayment.json()["allocations"]

    assert len(allocations) == 2

    assert allocations[0]["sale_id"] == first_sale_id
    assert float(allocations[0]["amount"]) == 100.0

    assert allocations[1]["sale_id"] == second_sale_id
    assert float(allocations[1]["amount"]) == 50.0

    # First invoice should now be fully paid.
    first_details = client.get(
        f"/api/sales/{first_sale_id}"
    ).json()

    assert float(first_details["current_outstanding"]) == 0.0
    assert first_details["current_payment_status"] == "PAID"

    # Second invoice should have 50 outstanding.
    second_details = client.get(
        f"/api/sales/{second_sale_id}"
    ).json()

    assert float(second_details["current_outstanding"]) == 50.0
    assert second_details["current_payment_status"] == "PARTIAL"


def test_failed_sale_does_not_change_stock_or_create_invoice(
    client
):
    variant_id = create_test_variant(client, stock="5")

    initial_stock = get_variant_stock(client, variant_id)

    # This request should fail because the customer
    # is not provided for an unpaid sale.
    response = create_test_sale(
        client,
        variant_id,
        quantity="2",
        paid_amount="0",
        payment_method=None
    )

    assert response.status_code == 400

    # Stock must remain unchanged.
    assert get_variant_stock(client, variant_id) == initial_stock

    # No sale should have been committed.
    sales_response = client.get("/api/sales/")

    assert sales_response.status_code == 200
    assert sales_response.json() == []
