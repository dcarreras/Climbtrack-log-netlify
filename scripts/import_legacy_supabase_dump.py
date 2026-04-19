from __future__ import annotations

import argparse
import gzip
import json
import re
import uuid
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path


UUID_NAMESPACE = uuid.UUID("7dbd5a11-5edf-4c69-b7d4-88b10efef1e0")


def read_dump(path: Path) -> str:
    with gzip.open(path, "rt", encoding="utf-8", errors="replace") as handle:
        return handle.read()


def parse_copy_table(sql: str, table: str) -> list[dict[str, str | None]]:
    pattern = rf"COPY {re.escape(table)} \((.*?)\) FROM stdin;\n(.*?)\n\\\.\n"
    match = re.search(pattern, sql, re.S)
    if not match:
        return []

    columns = [column.strip() for column in match.group(1).split(",")]
    rows: list[dict[str, str | None]] = []

    for line in match.group(2).splitlines():
        if not line.strip():
            continue
        values = [None if value == r"\N" else value for value in line.split("\t")]
        rows.append(dict(zip(columns, values)))

    return rows


def sql_literal(value: object | None) -> str:
    if value is None:
        return "null"

    if isinstance(value, bool):
        return "true" if value else "false"

    if isinstance(value, (int, float)):
        return str(value)

    if isinstance(value, (datetime, date)):
        return "'" + value.isoformat() + "'"

    text = str(value).replace("'", "''")
    return f"'{text}'"


def compact_text(value: str | None) -> str | None:
    if value is None:
        return None

    normalized = " ".join(value.split())
    return normalized or None


def parse_int(value: str | None) -> int | None:
    if value is None or value == "":
        return None
    return int(value)


def parse_timestamp(value: str | None) -> str | None:
    if value is None or value == "":
        return None
    return value


def parse_date(value: str | None) -> date | None:
    if value is None or value == "":
        return None
    return date.fromisoformat(value)


def stable_uuid(name: str) -> str:
    return str(uuid.uuid5(UUID_NAMESPACE, name))


def detect_grade_system(grade: str | None, discipline: str) -> str | None:
    if not grade:
        return None

    if discipline == "boulder":
        return "v-grade" if grade.upper().startswith("V") else "font"

    return "french"


def detect_color_band(notes: str | None) -> str | None:
    if not notes:
        return None

    lowered = notes.lower()
    mapping = {
        "white": ["white", "blanco"],
        "blue": ["blue", "azul"],
        "green": ["green", "verde"],
        "yellow": ["yellow", "amarillo"],
        "red": ["red", "rojo"],
        "black": ["black", "negro"],
        "orange": ["orange", "naranja"],
        "purple": ["purple", "morado", "morada"],
        "pink": ["pink", "rosa"],
    }

    for color, needles in mapping.items():
        if any(needle in lowered for needle in needles):
            return color

    return None


def map_detail_discipline(climb_type: str | None) -> str:
    lowered = (climb_type or "").lower()
    return "boulder" if "boulder" in lowered else "route"


def map_session_type(old_type: str | None, disciplines: set[str], grade: str | None) -> str:
    if disciplines == {"boulder"}:
        return "boulder"
    if disciplines == {"route"}:
        return "rope"
    if disciplines == {"boulder", "route"}:
        return "hybrid"

    lowered = (old_type or "").lower()
    if "boulder" in lowered:
        return "boulder"
    if "train" in lowered:
        return "training"
    if "sport" in lowered:
        return "rope"
    if "outdoor" in lowered:
        if grade and grade.upper().startswith("V"):
            return "boulder"
        return "rope"

    return "training"


def compose_session_notes(
    legacy_session: dict[str, str | None],
    has_details: bool,
) -> str | None:
    lines = ["Importado desde el proyecto legacy."]

    if legacy_session.get("type"):
        lines.append(f"Tipo original: {legacy_session['type']}")
    if legacy_session.get("location"):
        lines.append(f"Ubicacion legacy: {legacy_session['location']}")
    if legacy_session.get("grade"):
        lines.append(f"Grado resumen legacy: {legacy_session['grade']}")
    if legacy_session.get("routes"):
        lines.append(f"Total registrado en legacy: {legacy_session['routes']}")
    if not has_details:
        lines.append("No habia detalle individual de vias en el dump original.")
    if legacy_session.get("notes"):
        lines.append(f"Notas originales: {legacy_session['notes']}")

    return "\n".join(lines)


@dataclass
class ImportedClimb:
    id: str
    session_id: str
    discipline: str
    grade_system: str | None
    grade_value: str | None
    color_band: str | None
    flash: bool
    notes: str | None
    order_index: int
    created_at: str
    updated_at: str


@dataclass
class ImportedSession:
    id: str
    legacy_id: str
    session_type: str
    date_value: str
    created_at: str
    updated_at: str
    duration_min: int | None
    description: str | None
    notes: str | None
    location: str | None
    gym_name: str | None
    legacy_grade: str | None
    climbs: list[ImportedClimb]


def build_import_model(sql: str) -> tuple[str, dict[str, str | None], list[ImportedSession], list[dict[str, str | None]], list[dict[str, str | None]]]:
    auth_users = parse_copy_table(sql, "auth.users")
    if not auth_users:
        raise RuntimeError("The legacy dump does not contain auth.users data.")

    legacy_email = auth_users[0]["email"]
    if not legacy_email:
        raise RuntimeError("Could not determine the legacy user email from auth.users.")

    profiles = parse_copy_table(sql, "public.profiles")
    sessions = parse_copy_table(sql, "public.sessions")
    route_details = parse_copy_table(sql, "public.route_details")
    route_photos = parse_copy_table(sql, "public.route_photos")
    goals = parse_copy_table(sql, "public.goals")

    profile = profiles[0] if profiles else {}
    details_by_session: dict[str, list[dict[str, str | None]]] = defaultdict(list)

    for detail in route_details:
        session_id = detail.get("session_id")
        if session_id:
            details_by_session[session_id].append(detail)

    imported_sessions: list[ImportedSession] = []

    for legacy_session in sessions:
        legacy_session_id = legacy_session["id"]
        if not legacy_session_id:
            continue

        session_details = details_by_session.get(legacy_session_id, [])
        disciplines = {map_detail_discipline(detail.get("climb_type")) for detail in session_details}
        session_type = map_session_type(legacy_session.get("type"), disciplines, compact_text(legacy_session.get("grade")))
        location = compact_text(legacy_session.get("location"))
        created_at = parse_timestamp(legacy_session.get("created_at")) or f"{legacy_session['date']}T00:00:00+00:00"
        updated_at = created_at
        notes = compose_session_notes(legacy_session, bool(session_details))
        description = compact_text(legacy_session.get("type"))
        imported_climbs: list[ImportedClimb] = []
        order_index = 0

        if session_details:
            for detail in session_details:
                repeats = max(1, parse_int(detail.get("count")) or 1)
                discipline = map_detail_discipline(detail.get("climb_type"))
                grade_value = compact_text(detail.get("grade"))
                detail_notes = [
                    "Importado desde detalle legacy.",
                ]
                if detail.get("climb_type"):
                    detail_notes.append(f"Tipo legacy: {detail['climb_type']}")
                if detail.get("difficulty"):
                    detail_notes.append(f"Dificultad legacy: {detail['difficulty']}")
                if detail.get("notes"):
                    detail_notes.append(f"Notas legacy: {detail['notes']}")

                for repeat_index in range(repeats):
                    imported_climbs.append(
                        ImportedClimb(
                            id=stable_uuid(f"legacy-detail:{detail['id']}:{repeat_index}"),
                            session_id=legacy_session_id,
                            discipline=discipline,
                            grade_system=detect_grade_system(grade_value, discipline),
                            grade_value=grade_value,
                            color_band=detect_color_band(detail.get("notes")),
                            flash=(detail.get("flash") or "").lower() == "t",
                            notes="\n".join(detail_notes),
                            order_index=order_index,
                            created_at=created_at,
                            updated_at=updated_at,
                        )
                    )
                    order_index += 1
        else:
            summary_count = max(0, parse_int(legacy_session.get("routes")) or 0)
            if session_type in {"boulder", "rope", "hybrid"} and summary_count > 0:
                if session_type == "boulder":
                    discipline = "boulder"
                elif session_type == "hybrid":
                    discipline = "route" if compact_text(legacy_session.get("grade")) else "boulder"
                else:
                    discipline = "route"

                grade_value = compact_text(legacy_session.get("grade"))
                for repeat_index in range(summary_count):
                    imported_climbs.append(
                        ImportedClimb(
                            id=stable_uuid(f"legacy-summary:{legacy_session_id}:{repeat_index}"),
                            session_id=legacy_session_id,
                            discipline=discipline,
                            grade_system=detect_grade_system(grade_value, discipline),
                            grade_value=grade_value,
                            color_band=None,
                            flash=False,
                            notes="Importado desde resumen legacy sin detalle por via.",
                            order_index=order_index,
                            created_at=created_at,
                            updated_at=updated_at,
                        )
                    )
                    order_index += 1

        imported_sessions.append(
            ImportedSession(
                id=legacy_session_id,
                legacy_id=legacy_session_id,
                session_type=session_type,
                date_value=legacy_session["date"] or created_at.split("T")[0],
                created_at=created_at,
                updated_at=updated_at,
                duration_min=parse_int(legacy_session.get("duration")),
                description=description,
                notes=notes,
                location=location,
                gym_name=location,
                legacy_grade=compact_text(legacy_session.get("grade")),
                climbs=imported_climbs,
            )
        )

    return legacy_email, profile, imported_sessions, route_photos, goals


def score_photo_candidate(photo: dict[str, str | None], session: ImportedSession) -> int:
    score = 0
    photo_location = compact_text(photo.get("location"))
    session_location = compact_text(session.location)

    if photo_location and session_location and photo_location.lower() == session_location.lower():
        score += 40

    photo_date = parse_date((photo.get("created_at") or "")[:10])
    session_date = parse_date(session.date_value)
    if photo_date and session_date:
        diff_days = abs((photo_date - session_date).days)
        score += max(0, 20 - diff_days * 3)

    photo_discipline = map_detail_discipline(photo.get("climb_type"))
    if photo_discipline == "boulder" and session.session_type in {"boulder", "hybrid"}:
        score += 20
    if photo_discipline == "route" and session.session_type in {"rope", "hybrid"}:
        score += 20

    photo_grade = compact_text(photo.get("grade"))
    if photo_grade and photo_grade == session.legacy_grade:
        score += 8
    if photo_grade and any(climb.grade_value == photo_grade for climb in session.climbs):
        score += 12

    return score


def match_photo_targets(
    photos: list[dict[str, str | None]],
    imported_sessions: list[ImportedSession],
) -> list[dict[str, str | None]]:
    used_climb_ids: set[str] = set()
    attachments: list[dict[str, str | None]] = []

    for photo in photos:
        best_session = max(imported_sessions, key=lambda session: score_photo_candidate(photo, session), default=None)
        session_id = best_session.id if best_session and score_photo_candidate(photo, best_session) > 0 else None
        climb_id = None

        if best_session:
            target_grade = compact_text(photo.get("grade"))
            target_discipline = map_detail_discipline(photo.get("climb_type"))

            climb_candidates = [
                climb
                for climb in best_session.climbs
                if climb.discipline == target_discipline
                and (target_grade is None or climb.grade_value == target_grade)
                and climb.id not in used_climb_ids
            ]

            if not climb_candidates and target_grade:
                climb_candidates = [
                    climb
                    for climb in best_session.climbs
                    if climb.grade_value == target_grade and climb.id not in used_climb_ids
                ]

            if climb_candidates:
                climb_id = climb_candidates[0].id
                used_climb_ids.add(climb_id)

        attachments.append(
            {
                "id": photo["id"],
                "session_id": session_id,
                "climb_id": climb_id,
                "file_url": photo.get("photo_url"),
                "legacy_grade": photo.get("grade"),
                "legacy_climb_type": photo.get("climb_type"),
                "legacy_location": photo.get("location"),
                "legacy_name": photo.get("name"),
                "legacy_notes": photo.get("notes"),
                "legacy_flash": (photo.get("flash") or "").lower() == "t",
                "created_at": photo.get("created_at"),
            }
        )

    return attachments


def render_sql(
    legacy_email: str,
    profile: dict[str, str | None],
    imported_sessions: list[ImportedSession],
    attachments: list[dict[str, str | None]],
    goals: list[dict[str, str | None]],
) -> str:
    gym_names = sorted({session.gym_name for session in imported_sessions if session.gym_name})
    total_climbs = sum(len(session.climbs) for session in imported_sessions)

    lines: list[str] = []
    lines.append("-- Legacy Supabase import generated from dump")
    lines.append(f"-- Source user email: {legacy_email}")
    lines.append(f"-- Sessions: {len(imported_sessions)}")
    lines.append(f"-- Climbs: {total_climbs}")
    lines.append(f"-- Legacy photo records: {len(attachments)}")
    lines.append(f"-- Goals: {len(goals)}")
    lines.append("")
    lines.append(
        "create table if not exists public.legacy_profile_snapshots ("
        " id uuid primary key,"
        " user_id uuid not null references auth.users(id) on delete cascade,"
        " source text not null,"
        " payload jsonb not null,"
        " imported_at timestamp with time zone not null default now()"
        ");"
    )
    lines.append("alter table public.legacy_profile_snapshots enable row level security;")
    lines.append(
        "do $$ begin "
        "create policy \"Users can view own legacy profile snapshots\" "
        "on public.legacy_profile_snapshots for select using (auth.uid() = user_id); "
        "exception when duplicate_object then null; end $$;"
    )
    lines.append("")
    lines.append(
        "create table if not exists public.legacy_goals ("
        " id uuid primary key,"
        " user_id uuid not null references auth.users(id) on delete cascade,"
        " title text not null,"
        " description text,"
        " progress integer,"
        " source text not null default 'legacy-supabase',"
        " created_at timestamp with time zone not null,"
        " imported_at timestamp with time zone not null default now()"
        ");"
    )
    lines.append("alter table public.legacy_goals enable row level security;")
    lines.append(
        "do $$ begin "
        "create policy \"Users can view own legacy goals\" "
        "on public.legacy_goals for select using (auth.uid() = user_id); "
        "exception when duplicate_object then null; end $$;"
    )
    lines.append("")
    lines.append(
        "create table if not exists public.legacy_route_photos ("
        " id uuid primary key,"
        " user_id uuid not null references auth.users(id) on delete cascade,"
        " session_id uuid references public.sessions(id) on delete set null,"
        " climb_id uuid references public.climbs(id) on delete set null,"
        " photo_url text,"
        " legacy_grade text,"
        " legacy_climb_type text,"
        " legacy_location text,"
        " legacy_name text,"
        " legacy_notes text,"
        " legacy_flash boolean,"
        " created_at timestamp with time zone not null,"
        " imported_at timestamp with time zone not null default now()"
        ");"
    )
    lines.append("alter table public.legacy_route_photos enable row level security;")
    lines.append(
        "do $$ begin "
        "create policy \"Users can view own legacy route photos\" "
        "on public.legacy_route_photos for select using (auth.uid() = user_id); "
        "exception when duplicate_object then null; end $$;"
    )
    lines.append("")
    lines.append("do $$")
    lines.append("declare")
    lines.append("  target_user_id uuid;")
    lines.append("begin")
    lines.append(f"  select id into target_user_id from auth.users where email = {sql_literal(legacy_email)} limit 1;")
    lines.append("  if target_user_id is null then")
    lines.append("    raise exception 'Legacy import aborted: target auth user not found for email %', " + sql_literal(legacy_email) + ";")
    lines.append("  end if;")
    lines.append("")

    if profile:
        payload = json.dumps(profile, ensure_ascii=True)
        snapshot_id = stable_uuid("legacy-profile-snapshot")
        lines.append(
            "  update public.profiles"
            f" set display_name = coalesce(display_name, {sql_literal(compact_text(profile.get('name')))})"
            " where id = target_user_id;"
        )
        lines.append(
            "  insert into public.legacy_profile_snapshots (id, user_id, source, payload)"
            f" values ({sql_literal(snapshot_id)}, target_user_id, 'legacy-supabase', {sql_literal(payload)}::jsonb)"
            " on conflict (id) do nothing;"
        )
        lines.append("")

    for gym_name in gym_names:
        lines.append(
            "  if not exists (select 1 from public.gyms where lower(name) = lower("
            + sql_literal(gym_name)
            + ")) then"
        )
        lines.append(
            "    insert into public.gyms (name) values (" + sql_literal(gym_name) + ");"
        )
        lines.append("  end if;")
    if gym_names:
        lines.append("")

    for session in imported_sessions:
        gym_id_sql = (
            "null"
            if not session.gym_name
            else "(select id from public.gyms where lower(name) = lower("
            + sql_literal(session.gym_name)
            + ") order by created_at asc limit 1)"
        )
        lines.append(
            "  if not exists (select 1 from public.sessions where id = "
            + sql_literal(session.id)
            + ") then"
        )
        lines.append(
            "    insert into public.sessions ("
            "id, user_id, date, gym_id, session_type, duration_min, description, notes, "
            "status, started_at, paused_ms, completed_at, created_at, updated_at"
            ") values ("
            + ", ".join(
                [
                    sql_literal(session.id),
                    "target_user_id",
                    sql_literal(session.date_value),
                    gym_id_sql,
                    sql_literal(session.session_type) + "::public.session_type",
                    sql_literal(session.duration_min),
                    sql_literal(session.description),
                    sql_literal(session.notes),
                    "'completed'::public.session_status",
                    sql_literal(session.created_at),
                    "0",
                    sql_literal(session.updated_at),
                    sql_literal(session.created_at),
                    sql_literal(session.updated_at),
                ]
            )
            + ");"
        )
        lines.append("  end if;")

        for climb in session.climbs:
            lines.append(
                "  if not exists (select 1 from public.climbs where id = "
                + sql_literal(climb.id)
                + ") then"
            )
            lines.append(
                "    insert into public.climbs ("
                "id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at"
                ") values ("
                + ", ".join(
                    [
                        sql_literal(climb.id),
                        sql_literal(climb.session_id),
                        sql_literal(climb.discipline) + "::public.discipline",
                        "null"
                        if not climb.color_band
                        else sql_literal(climb.color_band) + "::public.color_band",
                        "null"
                        if not climb.grade_system
                        else sql_literal(climb.grade_system) + "::public.grade_system",
                        sql_literal(climb.grade_value),
                        "1",
                        "true",
                        sql_literal(climb.flash),
                        sql_literal(climb.notes),
                        sql_literal(climb.order_index),
                        sql_literal(climb.created_at),
                        sql_literal(climb.updated_at),
                    ]
                )
                + ");"
            )
            lines.append("  end if;")

    lines.append("")

    for attachment in attachments:
        lines.append(
            "  if not exists (select 1 from public.legacy_route_photos where id = "
            + sql_literal(attachment["id"])
            + ") then"
        )
        lines.append(
            "    insert into public.legacy_route_photos (id, user_id, session_id, climb_id, photo_url, legacy_grade, legacy_climb_type, legacy_location, legacy_name, legacy_notes, legacy_flash, created_at) values ("
            + ", ".join(
                [
                    sql_literal(attachment["id"]),
                    "target_user_id",
                    sql_literal(attachment["session_id"]),
                    sql_literal(attachment["climb_id"]),
                    sql_literal(attachment["file_url"]),
                    sql_literal(attachment["legacy_grade"]),
                    sql_literal(attachment["legacy_climb_type"]),
                    sql_literal(attachment["legacy_location"]),
                    sql_literal(attachment["legacy_name"]),
                    sql_literal(attachment["legacy_notes"]),
                    sql_literal(attachment["legacy_flash"]),
                    sql_literal(attachment["created_at"]),
                ]
            )
            + ");"
        )
        lines.append("  end if;")

    if goals:
        lines.append("")
        for goal in goals:
            lines.append(
                "  if not exists (select 1 from public.legacy_goals where id = "
                + sql_literal(goal["id"])
                + ") then"
            )
            lines.append(
                "    insert into public.legacy_goals (id, user_id, title, description, progress, created_at) values ("
                + ", ".join(
                    [
                        sql_literal(goal["id"]),
                        "target_user_id",
                        sql_literal(compact_text(goal.get("title"))),
                        sql_literal(compact_text(goal.get("description"))),
                        sql_literal(parse_int(goal.get("progress"))),
                        sql_literal(goal.get("created_at")),
                    ]
                )
                + ");"
            )
            lines.append("  end if;")

    lines.append("end $$;")
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate a SQL migration from a legacy Supabase dump.")
    parser.add_argument("dump", type=Path, help="Path to the .backup.gz legacy dump")
    parser.add_argument("output", type=Path, help="Path to the generated SQL migration")
    args = parser.parse_args()

    sql = read_dump(args.dump)
    legacy_email, profile, imported_sessions, photos, goals = build_import_model(sql)
    attachments = match_photo_targets(photos, imported_sessions)
    migration_sql = render_sql(legacy_email, profile, imported_sessions, attachments, goals)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(migration_sql, encoding="utf-8")

    print(json.dumps(
        {
            "legacy_email": legacy_email,
            "sessions": len(imported_sessions),
            "climbs": sum(len(session.climbs) for session in imported_sessions),
            "legacy_photo_records": len(attachments),
            "goals": len(goals),
            "output": str(args.output),
        },
        indent=2,
    ))


if __name__ == "__main__":
    main()
