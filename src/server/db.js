import { neon } from "@neondatabase/serverless";
import { env } from "$env/dynamic/private";

if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined");
}

export const sql = neon(env.DATABASE_URL)