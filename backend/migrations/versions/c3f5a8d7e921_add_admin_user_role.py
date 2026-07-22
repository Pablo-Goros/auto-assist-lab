"""add admin user role

Revision ID: c3f5a8d7e921
Revises: a79f4ae8b243
Create Date: 2026-07-22
"""

from typing import Sequence, Union

from alembic import op


revision: str = "c3f5a8d7e921"
down_revision: Union[str, Sequence[str], None] = "a79f4ae8b243"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'ADMIN'")


def downgrade() -> None:
    # PostgreSQL cannot remove an individual enum value. Recreate the type;
    # preserve ADMIN users by mapping them to the closest pre-existing
    # privileged role before recreating the old enum.
    op.execute("ALTER TABLE users ALTER COLUMN role TYPE VARCHAR USING role::text")
    op.execute("UPDATE users SET role = 'OPERATOR' WHERE role = 'ADMIN'")
    op.execute("DROP TYPE user_role")
    op.execute("CREATE TYPE user_role AS ENUM ('OWNER', 'OPERATOR')")
    op.execute(
        "ALTER TABLE users ALTER COLUMN role TYPE user_role "
        "USING role::user_role"
    )
