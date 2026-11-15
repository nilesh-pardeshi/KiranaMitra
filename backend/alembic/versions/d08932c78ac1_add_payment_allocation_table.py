"""add payment allocation table

Revision ID: d08932c78ac1
Revises: ff3e28f8d57a
Create Date: 2026-11-15 06:41:55.272993

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd08932c78ac1'
down_revision: Union[str, Sequence[str], None] = 'ff3e28f8d57a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None



def upgrade() -> None:
    op.create_table(
        "payment_allocations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("payment_id", sa.Integer(), nullable=False),
        sa.Column("sale_id", sa.Integer(), nullable=False),
        sa.Column(
            "amount",
            sa.Numeric(precision=12, scale=2),
            nullable=False
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False
        ),
        sa.CheckConstraint(
            "amount > 0",
            name="check_payment_allocation_amount_positive"
        ),
        sa.ForeignKeyConstraint(
            ["payment_id"],
            ["payments.id"],
            ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["sale_id"],
            ["sales.id"],
            ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id")
    )

    op.create_index(
        "ix_payment_allocations_payment_id",
        "payment_allocations",
        ["payment_id"],
        unique=False
    )

    op.create_index(
        "ix_payment_allocations_sale_id",
        "payment_allocations",
        ["sale_id"],
        unique=False
    )


def downgrade() -> None:
    op.drop_index(
        "ix_payment_allocations_sale_id",
        table_name="payment_allocations"
    )

    op.drop_index(
        "ix_payment_allocations_payment_id",
        table_name="payment_allocations"
    )

    op.drop_table("payment_allocations")
