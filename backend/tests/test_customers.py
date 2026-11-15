
def create_test_customer(client):
    """Create a customer for testing."""

    payload = {
        "name": "Test Customer",
        "phone": "9876500001",
        "address": "Test Address"
    }

    response = client.post("/api/customers/", json=payload)

    assert response.status_code == 201

    return response.json()["id"]


def test_create_customer(client):
    payload = {
        "name": "Rahul Test",
        "phone": "9876500002",
        "address": "Pune"
    }

    response = client.post("/api/customers/", json=payload)

    assert response.status_code == 201

    data = response.json()

    assert data["name"] == "Rahul Test"
    assert data["phone"] == "9876500002"
    assert data["is_active"] is True


def test_reject_customer_with_short_name(client):
    payload = {
        "name": "A",
        "phone": "9876500003",
        "address": "Pune"
    }

    response = client.post("/api/customers/", json=payload)

    assert response.status_code == 422


def test_get_all_customers(client):
    create_test_customer(client)

    response = client.get("/api/customers/")

    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_get_customer_details(client):
    customer_id = create_test_customer(client)

    response = client.get(f"/api/customers/{customer_id}")

    assert response.status_code == 200
    assert response.json()["id"] == customer_id
    assert response.json()["name"] == "Test Customer"
    assert float(response.json()["outstanding_balance"]) == 0.0


def test_get_nonexistent_customer(client):
    response = client.get("/api/customers/999999")

    assert response.status_code == 404


def test_get_customer_ledger(client):
    customer_id = create_test_customer(client)

    response = client.get(
        f"/api/customers/{customer_id}/ledger"
    )

    assert response.status_code == 200
    assert response.json()["customer_id"] == customer_id
    assert response.json()["entries"] == []
    assert float(response.json()["outstanding_balance"]) == 0.0


def test_record_udhar(client):
    customer_id = create_test_customer(client)

    response = client.post(
        f"/api/customers/{customer_id}/udhar",
        json={
            "amount": "500.00",
            "description": "Grocery purchase on credit"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert data["message"] == "Udhar recorded successfully."
    assert float(data["outstanding_balance"]) == 500.0


def test_record_multiple_udhar_entries(client):
    customer_id = create_test_customer(client)

    for amount in ["300.00", "200.00"]:
        response = client.post(
            f"/api/customers/{customer_id}/udhar",
            json={
                "amount": amount,
                "description": "Test credit purchase"
            }
        )

        assert response.status_code == 200

    details = client.get(
        f"/api/customers/{customer_id}"
    )

    assert float(details.json()["outstanding_balance"]) == 500.0


def test_reject_zero_udhar(client):
    customer_id = create_test_customer(client)

    response = client.post(
        f"/api/customers/{customer_id}/udhar",
        json={
            "amount": "0",
            "description": "Invalid credit"
        }
    )

    assert response.status_code == 422


def test_reject_negative_udhar(client):
    customer_id = create_test_customer(client)

    response = client.post(
        f"/api/customers/{customer_id}/udhar",
        json={
            "amount": "-100",
            "description": "Invalid credit"
        }
    )

    assert response.status_code == 422


def test_reject_udhar_for_nonexistent_customer(client):
    response = client.post(
        "/api/customers/999999/udhar",
        json={
            "amount": "100",
            "description": "Test"
        }
    )

    assert response.status_code == 400


def test_record_repayment(client):
    customer_id = create_test_customer(client)

    # First create outstanding Udhar.
    udhar_response = client.post(
        f"/api/customers/{customer_id}/udhar",
        json={
            "amount": "500.00",
            "description": "Test credit"
        }
    )

    assert udhar_response.status_code == 200

    # Customer repays 200 through UPI.
    repayment_response = client.post(
        f"/api/customers/{customer_id}/repayments",
        json={
            "amount": "200.00",
            "payment_method": "UPI",
            "reference_number": "TEST-UPI-001"
        }
    )

    assert repayment_response.status_code == 200

    data = repayment_response.json()

    assert data["message"] == (
        "Repayment recorded and allocated successfully."
    )

    assert data["payment_id"] is not None
    assert data["allocations"] == []
    assert float(data["unallocated_amount"]) == 200.0
    assert float(data["outstanding_balance"]) == 300.0


def test_reject_repayment_exceeding_balance(client):
    customer_id = create_test_customer(client)

    client.post(
        f"/api/customers/{customer_id}/udhar",
        json={
            "amount": "300.00",
            "description": "Test credit"
        }
    )

    response = client.post(
        f"/api/customers/{customer_id}/repayments",
        json={
            "amount": "500.00",
            "payment_method": "CASH"
        }
    )

    assert response.status_code == 400
    assert "exceeds outstanding balance" in response.json()["detail"]


def test_reject_repayment_without_outstanding_balance(client):
    customer_id = create_test_customer(client)

    response = client.post(
        f"/api/customers/{customer_id}/repayments",
        json={
            "amount": "100.00",
            "payment_method": "CASH"
        }
    )

    assert response.status_code == 400
    assert "no outstanding balance" in response.json()["detail"]


def test_reject_invalid_repayment_method(client):
    customer_id = create_test_customer(client)

    response = client.post(
        f"/api/customers/{customer_id}/repayments",
        json={
            "amount": "100.00",
            "payment_method": "BITCOIN"
        }
    )

    assert response.status_code == 422
