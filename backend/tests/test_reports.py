
from datetime import date
from decimal import Decimal


def create_test_variant(client):
    """Create a product variant with known prices and stock."""
    response = client.post(
        "/api/products/",
        json={
            "name": "Reports Test Rice",
            "category": "Groceries",
            "variants": [
                {
                    "brand": "Test Brand",
                    "variant_name": "1 KG",
                    "sku": "REPORT-TEST-RICE-001",
                    "purchase_price": "40",
                    "selling_price": "50",
                    "current_stock": "20",
                    "reorder_level": "5",
                    "target_stock": "50"
                }
            ]
        }
    )

    assert response.status_code == 201, response.text
    return response.json()["variants"][0]["id"]


def create_test_sale(client, variant_id, quantity="2", paid_amount="100"):
    """Create a sale with predictable revenue and cost."""
    response = client.post(
        "/api/sales/",
        json={
            "items": [
                {
                    "variant_id": variant_id,
                    "quantity": quantity
                }
            ],
            "discount": "0",
            "paid_amount": paid_amount,
            "payment_method": "CASH"
        }
    )

    assert response.status_code == 201, response.text
    return response.json()


def test_daily_sales_report(client):
    variant_id = create_test_variant(client)
    sale = create_test_sale(client, variant_id)

    today = date.today().isoformat()

    response = client.get(
        "/api/reports/daily-sales",
        params={"report_date": today}
    )

    assert response.status_code == 200

    data = response.json()

    assert data["total_bills"] == 1
    assert Decimal(str(data["subtotal"])) == Decimal("100")
    assert Decimal(str(data["discount"])) == Decimal("0")
    assert Decimal(str(data["total_sales"])) == Decimal("100")
    assert Decimal(str(data["amount_collected"])) == Decimal("100")
    assert Decimal(str(data["outstanding_amount"])) == Decimal("0")


def test_monthly_sales_report(client):
    variant_id = create_test_variant(client)
    create_test_sale(client, variant_id)

    today = date.today()

    response = client.get(
        "/api/reports/monthly-sales",
        params={
            "year": today.year,
            "month": today.month
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert data["year"] == today.year
    assert data["month"] == today.month
    assert data["total_bills"] == 1
    assert Decimal(str(data["total_sales"])) == Decimal("100")
    assert Decimal(str(data["amount_collected"])) == Decimal("100")
    assert Decimal(str(data["outstanding_amount"])) == Decimal("0")


def test_product_sales_report(client):
    variant_id = create_test_variant(client)
    create_test_sale(client, variant_id, quantity="2")

    today = date.today().isoformat()

    response = client.get(
        "/api/reports/product-sales",
        params={
            "start_date": today,
            "end_date": today
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert len(data) == 1
    assert data[0]["product"] == "Reports Test Rice"
    assert data[0]["brand"] == "Test Brand"
    assert data[0]["variant"] == "1 KG"
    assert Decimal(str(data[0]["quantity_sold"])) == Decimal("2")
    assert Decimal(str(data[0]["revenue"])) == Decimal("100")


def test_product_sales_rejects_invalid_date_range(client):
    response = client.get(
        "/api/reports/product-sales",
        params={
            "start_date": "2026-11-15",
            "end_date": "2026-11-14"
        }
    )

    assert response.status_code == 400
    assert "End date cannot be earlier" in response.json()["detail"]


def test_inventory_valuation_report(client):
    create_test_variant(client)

    response = client.get("/api/reports/inventory-valuation")

    assert response.status_code == 200

    data = response.json()

    assert len(data["products"]) == 1

    product = data["products"][0]

    assert product["product"] == "Reports Test Rice"
    assert Decimal(str(product["stock"])) == Decimal("20")
    assert Decimal(str(product["cost_value"])) == Decimal("800")
    assert Decimal(str(product["selling_value"])) == Decimal("1000")

    assert Decimal(str(data["total_cost_value"])) == Decimal("800")
    assert Decimal(str(data["total_selling_value"])) == Decimal("1000")


def test_estimated_profit_report(client):
    variant_id = create_test_variant(client)

    # Quantity 2 x selling price 50 = revenue 100
    # Quantity 2 x purchase cost 40 = cost 80
    create_test_sale(client, variant_id, quantity="2")

    today = date.today().isoformat()

    response = client.get(
        "/api/reports/estimated-profit",
        params={
            "start_date": today,
            "end_date": today
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert Decimal(
        str(data["gross_revenue_before_discount"])
    ) == Decimal("100")

    assert Decimal(
        str(data["estimated_cost"])
    ) == Decimal("80")

    assert Decimal(
        str(data["estimated_gross_profit_before_discount"])
    ) == Decimal("20")


def test_estimated_profit_rejects_invalid_date_range(client):
    response = client.get(
        "/api/reports/estimated-profit",
        params={
            "start_date": "2026-11-15",
            "end_date": "2026-11-14"
        }
    )

    assert response.status_code == 400
    assert "End date cannot be earlier" in response.json()["detail"]


def test_download_invoice_pdf(client):
    variant_id = create_test_variant(client)
    sale = create_test_sale(client, variant_id)

    response = client.get(
        f"/api/reports/invoices/{sale['id']}/pdf"
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content.startswith(b"%PDF")
    assert len(response.content) > 500


def test_download_nonexistent_invoice_pdf(client):
    response = client.get("/api/reports/invoices/999999/pdf")

    assert response.status_code == 404
    assert response.json()["detail"] == "Invoice not found."


def test_daily_sales_outstanding_includes_later_repayment(client):
    customer_response = client.post(
        "/api/customers/",
        json={
            "name": "Reports Udhar Customer",
            "phone": "9876500099"
        }
    )
    assert customer_response.status_code == 201

    customer_id = customer_response.json()["id"]

    variant_id = create_test_variant(client)

    # Create invoice worth Rs. 100 with Rs. 40 paid.
    sale_response = client.post(
        "/api/sales/",
        json={
            "customer_id": customer_id,
            "items": [
                {
                    "variant_id": variant_id,
                    "quantity": "2"
                }
            ],
            "discount": "0",
            "paid_amount": "40",
            "payment_method": "CASH"
        }
    )

    assert sale_response.status_code == 201

    today = date.today().isoformat()

    # Original outstanding = Rs. 60.
    # Repay Rs. 20 later.
    repayment_response = client.post(
        f"/api/customers/{customer_id}/repayments",
        json={
            "amount": "20",
            "payment_method": "CASH"
        }
    )

    assert repayment_response.status_code == 200

    response = client.get(
        "/api/reports/daily-sales",
        params={"report_date": today}
    )

    assert response.status_code == 200

    data = response.json()

    assert Decimal(
        str(data["total_sales"])
    ) == Decimal("100")

    assert Decimal(
        str(data["outstanding_amount"])
    ) == Decimal("40")
