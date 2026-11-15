
"""add database integrity constraints and fractional quantities

Revision ID: 7f007ccaa7c4
Revises: c3443b2da695
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "7f007ccaa7c4"
down_revision: Union[str, Sequence[str], None] = "c3443b2da695"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:

    # 1. Convert sale item quantity to support fractional quantities
    op.alter_column(
        "sale_items",
        "quantity",
        existing_type=sa.INTEGER(),
        type_=sa.Numeric(12, 3),
        existing_nullable=False,
        postgresql_using="quantity::numeric(12,3)"
    )

    # 2. Product variant constraints
    op.create_check_constraint(
        "check_variant_purchase_price_nonnegative",
        "product_variants",
        "purchase_price >= 0"
    )

    op.create_check_constraint(
        "check_variant_selling_price_nonnegative",
        "product_variants",
        "selling_price >= 0"
    )

    op.create_check_constraint(
        "check_variant_current_stock_nonnegative",
        "product_variants",
        "current_stock >= 0"
    )

    op.create_check_constraint(
        "check_variant_reorder_level_nonnegative",
        "product_variants",
        "reorder_level >= 0"
    )

    op.create_check_constraint(
        "check_variant_target_stock_nonnegative",
        "product_variants",
        "target_stock >= 0"
    )

    # 3. Purchase item constraints
    op.create_check_constraint(
        "check_purchase_item_quantity_positive",
        "purchase_items",
        "quantity > 0"
    )

    op.create_check_constraint(
        "check_purchase_item_unit_cost_nonnegative",
        "purchase_items",
        "unit_cost >= 0"
    )

    op.create_check_constraint(
        "check_purchase_item_subtotal_nonnegative",
        "purchase_items",
        "subtotal >= 0"
    )

    # 4. Stock movement constraints
    op.create_check_constraint(
        "check_stock_movement_type",
        "stock_movements",
        "movement_type IN ('IN', 'OUT', 'ADJUSTMENT')"
    )

    op.create_check_constraint(
        "check_stock_movement_quantity_positive",
        "stock_movements",
        "quantity > 0"
    )

    # 5. Sales constraints
    op.create_check_constraint(
        "check_sale_subtotal_nonnegative",
        "sales",
        "subtotal >= 0"
    )

    op.create_check_constraint(
        "check_sale_discount_valid",
        "sales",
        "discount >= 0 AND discount <= subtotal"
    )

    op.create_check_constraint(
        "check_sale_total_valid",
        "sales",
        "total_amount >= 0 AND total_amount <= subtotal"
    )

    op.create_check_constraint(
        "check_sale_paid_amount_valid",
        "sales",
        "paid_amount >= 0 AND paid_amount <= total_amount"
    )

    op.create_check_constraint(
        "check_sale_payment_status",
        "sales",
        "payment_status IN ('PAID', 'PARTIAL', 'UNPAID')"
    )

    # 6. Sale item constraints
    op.create_check_constraint(
        "check_sale_item_quantity_positive",
        "sale_items",
        "quantity > 0"
    )

    op.create_check_constraint(
        "check_sale_item_price_nonnegative",
        "sale_items",
        "unit_price >= 0"
    )

    op.create_check_constraint(
        "check_sale_item_cost_nonnegative",
        "sale_items",
        "unit_cost >= 0"
    )

    op.create_check_constraint(
        "check_sale_item_subtotal_nonnegative",
        "sale_items",
        "subtotal >= 0"
    )


def downgrade() -> None:

    # Remove sale item constraints
    op.drop_constraint(
        "check_sale_item_subtotal_nonnegative",
        "sale_items",
        type_="check"
    )

    op.drop_constraint(
        "check_sale_item_cost_nonnegative",
        "sale_items",
        type_="check"
    )

    op.drop_constraint(
        "check_sale_item_price_nonnegative",
        "sale_items",
        type_="check"
    )

    op.drop_constraint(
        "check_sale_item_quantity_positive",
        "sale_items",
        type_="check"
    )

    # Remove sales constraints
    op.drop_constraint("check_sale_payment_status", "sales", type_="check")
    op.drop_constraint("check_sale_paid_amount_valid", "sales", type_="check")
    op.drop_constraint("check_sale_total_valid", "sales", type_="check")
    op.drop_constraint("check_sale_discount_valid", "sales", type_="check")
    op.drop_constraint("check_sale_subtotal_nonnegative", "sales", type_="check")

    # Remove stock movement constraints
    op.drop_constraint(
        "check_stock_movement_quantity_positive",
        "stock_movements",
        type_="check"
    )

    op.drop_constraint(
        "check_stock_movement_type",
        "stock_movements",
        type_="check"
    )

    # Remove purchase item constraints
    op.drop_constraint(
        "check_purchase_item_subtotal_nonnegative",
        "purchase_items",
        type_="check"
    )

    op.drop_constraint(
        "check_purchase_item_unit_cost_nonnegative",
        "purchase_items",
        type_="check"
    )

    op.drop_constraint(
        "check_purchase_item_quantity_positive",
        "purchase_items",
        type_="check"
    )

    # Remove product variant constraints
    op.drop_constraint(
        "check_variant_target_stock_nonnegative",
        "product_variants",
        type_="check"
    )

    op.drop_constraint(
        "check_variant_reorder_level_nonnegative",
        "product_variants",
        type_="check"
    )

    op.drop_constraint(
        "check_variant_current_stock_nonnegative",
        "product_variants",
        type_="check"
    )

    op.drop_constraint(
        "check_variant_selling_price_nonnegative",
        "product_variants",
        type_="check"
    )

    op.drop_constraint(
        "check_variant_purchase_price_nonnegative",
        "product_variants",
        type_="check"
    )

    # Convert quantity back to integer
    op.alter_column(
        "sale_items",
        "quantity",
        existing_type=sa.Numeric(12, 3),
        type_=sa.INTEGER(),
        existing_nullable=False,
        postgresql_using="round(quantity)::integer"
    )
