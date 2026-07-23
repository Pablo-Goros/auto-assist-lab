"""add country tenancy

Revision ID: e8a3c6d1f294
Revises: d4b6e9f3a812
Create Date: 2026-07-23
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e8a3c6d1f294"
down_revision: Union[str, Sequence[str], None] = "d4b6e9f3a812"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "tenants",
        sa.Column("code", sa.String(length=2), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.PrimaryKeyConstraint("code"),
    )
    op.bulk_insert(
        sa.table("tenants", sa.column("code", sa.String), sa.column("name", sa.String)),
        [{"code": "AR", "name": "Argentina"}, {"code": "CL", "name": "Chile"}],
    )

    op.add_column("users", sa.Column("tenant_code", sa.String(length=2), nullable=True))
    op.add_column("workshops", sa.Column("tenant_code", sa.String(length=2), nullable=True))
    op.add_column("service_requests", sa.Column("tenant_code", sa.String(length=2), nullable=True))

    # All pre-tenancy development records belong to Argentina. New Firebase
    # identities are created without a tenant and must select one explicitly.
    op.execute("UPDATE users SET tenant_code = 'AR'")
    op.execute("UPDATE workshops SET tenant_code = 'AR'")
    op.execute("UPDATE service_requests SET tenant_code = 'AR'")

    op.create_foreign_key("fk_users_tenant", "users", "tenants", ["tenant_code"], ["code"])
    op.create_foreign_key("fk_workshops_tenant", "workshops", "tenants", ["tenant_code"], ["code"])
    op.create_foreign_key("fk_service_requests_tenant", "service_requests", "tenants", ["tenant_code"], ["code"])
    op.create_unique_constraint("uq_users_id_tenant", "users", ["id", "tenant_code"])
    op.create_unique_constraint("uq_workshops_id_tenant", "workshops", ["id", "tenant_code"])
    op.create_index("ix_users_tenant_code", "users", ["tenant_code"])
    op.create_index("ix_workshops_tenant_code", "workshops", ["tenant_code"])
    op.create_index("ix_service_requests_tenant_code", "service_requests", ["tenant_code"])

    op.drop_constraint("service_requests_owner_id_fkey", "service_requests", type_="foreignkey")
    op.drop_constraint("service_requests_assigned_workshop_id_fkey", "service_requests", type_="foreignkey")
    op.create_foreign_key(
        "fk_service_requests_owner_tenant",
        "service_requests",
        "users",
        ["owner_id", "tenant_code"],
        ["id", "tenant_code"],
    )
    op.create_foreign_key(
        "fk_service_requests_workshop_tenant",
        "service_requests",
        "workshops",
        ["assigned_workshop_id", "tenant_code"],
        ["id", "tenant_code"],
    )
    op.alter_column("workshops", "tenant_code", nullable=False)
    op.alter_column("service_requests", "tenant_code", nullable=False)


def downgrade() -> None:
    op.drop_constraint("fk_service_requests_workshop_tenant", "service_requests", type_="foreignkey")
    op.drop_constraint("fk_service_requests_owner_tenant", "service_requests", type_="foreignkey")
    op.create_foreign_key("service_requests_owner_id_fkey", "service_requests", "users", ["owner_id"], ["id"])
    op.create_foreign_key(
        "service_requests_assigned_workshop_id_fkey",
        "service_requests",
        "workshops",
        ["assigned_workshop_id"],
        ["id"],
    )
    op.drop_index("ix_service_requests_tenant_code", table_name="service_requests")
    op.drop_index("ix_workshops_tenant_code", table_name="workshops")
    op.drop_index("ix_users_tenant_code", table_name="users")
    op.drop_constraint("uq_workshops_id_tenant", "workshops", type_="unique")
    op.drop_constraint("uq_users_id_tenant", "users", type_="unique")
    op.drop_constraint("fk_service_requests_tenant", "service_requests", type_="foreignkey")
    op.drop_constraint("fk_workshops_tenant", "workshops", type_="foreignkey")
    op.drop_constraint("fk_users_tenant", "users", type_="foreignkey")
    op.drop_column("service_requests", "tenant_code")
    op.drop_column("workshops", "tenant_code")
    op.drop_column("users", "tenant_code")
    op.drop_table("tenants")
