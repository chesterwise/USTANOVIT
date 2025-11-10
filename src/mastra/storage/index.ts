import { LibSQLStore } from "@mastra/libsql";

// Use LibSQL storage which works with local files and doesn't require DATABASE_URL
// This storage will be persisted in the local filesystem
export const getSharedPostgresStorage = () => {
  return new LibSQLStore({
    url: "file:./mastra.db",
  });
};
