const PG_STATUS: Record<string, number> = {
  "23505": 409, // unique_violation
  "23502": 400, // not_null_violation
  "22P02": 400, // invalid_text_representation (e.g. id = "abc")
  "22003": 400, // numeric_value_out_of_range (id too large for integer)
};

type PgLike = { code?: string; detail?: string; cause?: PgLike };

export const toHttpError = (err: unknown): { status: number; msg: string } => {
  const e = err as PgLike;
  // drizzle wraps the pg error in `cause`; fall back to the error itself
  const pg = e?.cause?.code ? e.cause : e;
  const status = (pg?.code && PG_STATUS[pg.code]) || 500;
  if (status === 500) console.error("db error:", err);
  return {
    status,
    msg:
      status === 500 ? "Internal server error" : (pg.detail ?? "Bad request"),
  };
};
