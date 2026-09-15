-- PathProof schema (AP EAPCET verified-data store)
-- Usage: psql "$DATABASE_URL" -f db/schema.sql

BEGIN;

-- Every value in the other tables traces back to a row here.
CREATE TABLE IF NOT EXISTS sources (
  id             integer PRIMARY KEY,
  name           text NOT NULL,
  url            text,
  publisher      text NOT NULL,
  doc_type       text NOT NULL,
  retrieved_date date NOT NULL,
  notes          text
);

CREATE TABLE IF NOT EXISTS institutions (
  inst_code     text PRIMARY KEY,
  name          text NOT NULL,
  district      text,
  district_code text,
  type_code     text,
  type          text,
  region        text
);

CREATE TABLE IF NOT EXISTS branches (
  branch_code text PRIMARY KEY,
  name        text NOT NULL
);

CREATE TABLE IF NOT EXISTS fees (
  inst_code        text NOT NULL REFERENCES institutions(inst_code),
  academic_year    text NOT NULL,
  tuition_per_year integer,
  source_id        integer REFERENCES sources(id),
  PRIMARY KEY (inst_code, academic_year)
);

CREATE TABLE IF NOT EXISTS cutoffs (
  inst_code    text NOT NULL REFERENCES institutions(inst_code),
  branch_code  text NOT NULL REFERENCES branches(branch_code),
  category     text NOT NULL,
  gender       text NOT NULL,
  local_area   text NOT NULL,
  closing_rank integer NOT NULL,
  source_id    integer REFERENCES sources(id),
  PRIMARY KEY (inst_code, branch_code, category, gender, local_area)
);

CREATE TABLE IF NOT EXISTS accreditations (
  id          bigserial PRIMARY KEY,
  inst_code   text NOT NULL REFERENCES institutions(inst_code),
  branch_code text REFERENCES branches(branch_code),
  agency      text NOT NULL,
  status      text NOT NULL,
  detail      text,
  valid_from  date,
  valid_to    date,
  source_id   integer REFERENCES sources(id)
);

-- One row per shortlist run so parents/auditors can replay any result.
CREATE TABLE IF NOT EXISTS recommendation_runs (
  id              bigserial PRIMARY KEY,
  student_profile jsonb NOT NULL,
  weights         jsonb NOT NULL,
  data_version    text NOT NULL,
  shortlist       jsonb NOT NULL,
  audit_trace     jsonb NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cutoffs_inst_idx   ON cutoffs (inst_code);
CREATE INDEX IF NOT EXISTS cutoffs_lookup_idx ON cutoffs (branch_code, category, gender, closing_rank);
CREATE INDEX IF NOT EXISTS accreditations_idx ON accreditations (inst_code);

COMMIT;
