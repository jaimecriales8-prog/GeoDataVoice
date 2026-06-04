"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-06-04

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from geoalchemy2 import Geometry

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enable PostGIS
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    # --- clients ---
    op.create_table(
        "clients",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("type", sa.String(30), nullable=False),
        sa.Column("nit", sa.String(20), nullable=True),
        sa.Column("contact_name", sa.String(200), nullable=True),
        sa.Column("contact_email", sa.String(200), nullable=True),
        sa.Column("contact_phone", sa.String(20), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # --- projects ---
    op.create_table(
        "projects",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("client_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("type", sa.String(30), nullable=False),
        sa.Column("purpose", sa.String(30), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # --- territories ---
    op.create_table(
        "territories",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("type", sa.String(30), nullable=False),
        sa.Column("parent_id", sa.UUID(), nullable=True),
        sa.Column("codigo_dane", sa.String(10), nullable=True),
        sa.Column("geom", Geometry("MULTIPOLYGON", srid=4326), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["parent_id"], ["territories.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # --- participants ---
    op.create_table(
        "participants",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("document_hash", sa.String(64), nullable=False),
        sa.Column("phone_hash", sa.String(64), nullable=False),
        sa.Column("name_encrypted", sa.Text(), nullable=False),
        sa.Column("gender", sa.String(20), nullable=True),
        sa.Column("birth_year", sa.Integer(), nullable=True),
        sa.Column("territory_id", sa.UUID(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="preregistered"),
        sa.Column("kyc_status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("phone_verified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("residence_verified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["territory_id"], ["territories.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("document_hash"),
    )

    # --- participant_profiles ---
    op.create_table(
        "participant_profiles",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("participant_id", sa.UUID(), nullable=False),
        sa.Column("socioeconomic_stratum", sa.Integer(), nullable=True),
        sa.Column("education_level", sa.String(50), nullable=True),
        sa.Column("occupation", sa.String(100), nullable=True),
        sa.Column("housing_type", sa.String(50), nullable=True),
        sa.Column("income_range", sa.String(50), nullable=True),
        sa.Column("tags", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["participant_id"], ["participants.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("participant_id"),
    )

    # --- field_operators ---
    op.create_table(
        "field_operators",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("document", sa.String(20), nullable=False),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("role", sa.String(20), nullable=False, server_default="encuestador"),
        sa.Column("territory_id", sa.UUID(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["territory_id"], ["territories.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # --- field_visits ---
    op.create_table(
        "field_visits",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("operator_id", sa.UUID(), nullable=False),
        sa.Column("participant_id", sa.UUID(), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("gps_accuracy", sa.Float(), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("evidence_url", sa.Text(), nullable=True),
        sa.Column("result", sa.String(50), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("visited_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["operator_id"], ["field_operators.id"]),
        sa.ForeignKeyConstraint(["participant_id"], ["participants.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # --- consents ---
    op.create_table(
        "consents",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("participant_id", sa.UUID(), nullable=False),
        sa.Column("type", sa.String(20), nullable=False),
        sa.Column("version", sa.String(20), nullable=False),
        sa.Column("accepted", sa.Boolean(), nullable=False),
        sa.Column("channel", sa.String(50), nullable=False, server_default="field_app"),
        sa.Column("ip_or_device", sa.String(200), nullable=True),
        sa.Column("proof_url", sa.Text(), nullable=True),
        sa.Column("accepted_at", sa.DateTime(), nullable=False),
        sa.Column("revoked_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["participant_id"], ["participants.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # --- cohorts ---
    op.create_table(
        "cohorts",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("project_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("type", sa.String(20), nullable=False),
        sa.Column("rotation_rule", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # --- panel_memberships ---
    op.create_table(
        "panel_memberships",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("participant_id", sa.UUID(), nullable=False),
        sa.Column("project_id", sa.UUID(), nullable=False),
        sa.Column("cohort_id", sa.UUID(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("statistical_weight", sa.Float(), nullable=True),
        sa.Column("joined_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["cohort_id"], ["cohorts.id"]),
        sa.ForeignKeyConstraint(["participant_id"], ["participants.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # --- surveys ---
    op.create_table(
        "surveys",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("project_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("wave", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
        sa.Column("sent_at", sa.DateTime(), nullable=True),
        sa.Column("closes_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # --- questions ---
    op.create_table(
        "questions",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("survey_id", sa.UUID(), nullable=False),
        sa.Column("type", sa.String(30), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("options", sa.JSON(), nullable=True),
        sa.Column("required", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("order", sa.Integer(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(["survey_id"], ["surveys.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # --- responses ---
    op.create_table(
        "responses",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("participant_id", sa.UUID(), nullable=False),
        sa.Column("survey_id", sa.UUID(), nullable=False),
        sa.Column("question_id", sa.UUID(), nullable=False),
        sa.Column("value", sa.Text(), nullable=True),
        sa.Column("quality", sa.String(20), nullable=False, server_default="valid"),
        sa.Column("responded_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["participant_id"], ["participants.id"]),
        sa.ForeignKeyConstraint(["question_id"], ["questions.id"]),
        sa.ForeignKeyConstraint(["survey_id"], ["surveys.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # --- audio_responses ---
    op.create_table(
        "audio_responses",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("response_id", sa.UUID(), nullable=False),
        sa.Column("audio_url", sa.Text(), nullable=False),
        sa.Column("duration_seconds", sa.Float(), nullable=True),
        sa.Column("language", sa.String(10), nullable=False, server_default="es"),
        sa.Column("transcription", sa.Text(), nullable=True),
        sa.Column("quality", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("processed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["response_id"], ["responses.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("response_id"),
    )

    # --- nlp_outputs ---
    op.create_table(
        "nlp_outputs",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("audio_id", sa.UUID(), nullable=False),
        sa.Column("sentiment", sa.String(20), nullable=True),
        sa.Column("emotion", sa.String(50), nullable=True),
        sa.Column("intensity", sa.String(20), nullable=True),
        sa.Column("main_topic", sa.String(100), nullable=True),
        sa.Column("topics", sa.JSON(), nullable=True),
        sa.Column("narrative", sa.Text(), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("citizen_quote", sa.Text(), nullable=True),
        sa.Column("actor_mentioned", sa.String(200), nullable=True),
        sa.Column("opinion_driver", sa.Text(), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("model_version", sa.String(50), nullable=True),
        sa.Column("human_reviewed", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["audio_id"], ["audio_responses.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("audio_id"),
    )

    # --- payments ---
    op.create_table(
        "payments",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("participant_id", sa.UUID(), nullable=False),
        sa.Column("type", sa.String(30), nullable=False),
        sa.Column("amount_cop", sa.Numeric(12, 2), nullable=False),
        sa.Column("medium", sa.String(50), nullable=False, server_default="nequi"),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("reference_id", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("approved_at", sa.DateTime(), nullable=True),
        sa.Column("sent_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["participant_id"], ["participants.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # --- messages ---
    op.create_table(
        "messages",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("project_id", sa.UUID(), nullable=False),
        sa.Column("type", sa.String(20), nullable=False),
        sa.Column("text", sa.Text(), nullable=True),
        sa.Column("file_url", sa.Text(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("approved_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # --- peers ---
    op.create_table(
        "peers",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("participant_id", sa.UUID(), nullable=False),
        sa.Column("territory_id", sa.UUID(), nullable=True),
        sa.Column("origin", sa.String(50), nullable=False, server_default="panel"),
        sa.Column("affinities", sa.JSON(), nullable=True),
        sa.Column("communities", sa.Text(), nullable=True),
        sa.Column("estimated_reach", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["participant_id"], ["participants.id"]),
        sa.ForeignKeyConstraint(["territory_id"], ["territories.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # --- peer_tasks ---
    op.create_table(
        "peer_tasks",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("project_id", sa.UUID(), nullable=False),
        sa.Column("message_id", sa.UUID(), nullable=True),
        sa.Column("peer_id", sa.UUID(), nullable=False),
        sa.Column("channel", sa.String(50), nullable=False, server_default="whatsapp"),
        sa.Column("payment_offered_cop", sa.Float(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="assigned"),
        sa.Column("assigned_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["message_id"], ["messages.id"]),
        sa.ForeignKeyConstraint(["peer_id"], ["peers.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # --- peer_evidences ---
    op.create_table(
        "peer_evidences",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("task_id", sa.UUID(), nullable=False),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("url", sa.Text(), nullable=True),
        sa.Column("text", sa.Text(), nullable=True),
        sa.Column("metrics", sa.JSON(), nullable=True),
        sa.Column("ai_review", sa.String(20), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("submitted_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["task_id"], ["peer_tasks.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # Indexes
    op.create_index("ix_participants_territory", "participants", ["territory_id"])
    op.create_index("ix_participants_status", "participants", ["status"])
    op.create_index("ix_field_visits_operator", "field_visits", ["operator_id"])
    op.create_index("ix_field_visits_participant", "field_visits", ["participant_id"])
    op.create_index("ix_responses_participant", "responses", ["participant_id"])
    op.create_index("ix_responses_survey", "responses", ["survey_id"])
    op.create_index("ix_panel_memberships_project", "panel_memberships", ["project_id"])
    op.create_index("ix_panel_memberships_participant", "panel_memberships", ["participant_id"])
    op.create_index("ix_payments_status", "payments", ["status"])


def downgrade() -> None:
    op.drop_table("peer_evidences")
    op.drop_table("peer_tasks")
    op.drop_table("peers")
    op.drop_table("messages")
    op.drop_table("payments")
    op.drop_table("nlp_outputs")
    op.drop_table("audio_responses")
    op.drop_table("responses")
    op.drop_table("questions")
    op.drop_table("surveys")
    op.drop_table("panel_memberships")
    op.drop_table("cohorts")
    op.drop_table("consents")
    op.drop_table("field_visits")
    op.drop_table("field_operators")
    op.drop_table("participant_profiles")
    op.drop_table("participants")
    op.drop_table("territories")
    op.drop_table("projects")
    op.drop_table("clients")
