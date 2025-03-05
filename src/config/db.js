import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: "postgresql://postgres:samiullah21january@db.eckrsjigtbkfjpgkypky.supabase.co:5432/postgres",
});

export default pool;
