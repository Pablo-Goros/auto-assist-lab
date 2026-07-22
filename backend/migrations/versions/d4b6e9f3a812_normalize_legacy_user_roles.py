"""normalize legacy user roles to owners

Revision ID: d4b6e9f3a812
Revises: c3f5a8d7e921
Create Date: 2026-07-22
"""

from typing import Sequence, Union

from alembic import op


revision: str = "d4b6e9f3a812"
down_revision: Union[str, Sequence[str], None] = "c3f5a8d7e921"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("UPDATE users SET role = 'OWNER' WHERE role IN ('OPERATOR', 'ADMIN')")


def downgrade() -> None:
    # A data normalization is intentionally irreversible.
    pass
