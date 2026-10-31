import { createFixtures, poster } from "./fixtures.js";

let tables = createFixtures();
let session = null;
const listeners = new Set();
const objects = new Map();
const error = message => ({ data: null, error: { message } });
const admin = () => session?.user?.app_metadata?.role === "admin";
export function setPreviewRole(role) {
  session = role ? { user: { id: "33333333-3333-4333-8333-333333333333", app_metadata: { role } } } : null;
  for (const callback of listeners) callback("SIGNED_IN", session);
}
export function resetPreview() { tables = createFixtures(); objects.clear(); setPreviewRole(null); }

class Query {
  constructor(table) { this.table = table; this.filters = []; }
  select() { return this; }
  eq(key, value) { this.filters.push(row => row[key] === value); return this; }
  in(key, values) { this.filters.push(row => values.includes(row[key])); return this; }
  order(key, options = {}) { this.sort = { key, ascending: options.ascending !== false }; return this; }
  single() { this.one = true; return this; }
  maybeSingle() { this.one = true; return this; }
  insert() { this.denied = true; return this; }
  update() { this.denied = true; return this; }
  delete() { this.denied = true; return this; }
  then(resolve, reject) {
    let result;
    if (this.denied) result = error("Direct table writes are disabled in offline preview.");
    else if (!Object.hasOwn(tables, this.table)) result = error(`Unsupported offline table: ${this.table}`);
    else {
      let rows = structuredClone(tables[this.table]).filter(row => this.filters.every(filter => filter(row)));
      if (this.sort) rows.sort((a, b) => String(a[this.sort.key]).localeCompare(String(b[this.sort.key])) * (this.sort.ascending ? 1 : -1));
      result = { data: this.one ? rows[0] ?? null : rows, error: null };
    }
    return Promise.resolve(result).then(resolve, reject);
  }
}

const client = {
  auth: {
    getSession: async () => ({ data: { session }, error: null }),
    onAuthStateChange(callback) {
      listeners.add(callback);
      queueMicrotask(() => { if (listeners.has(callback)) callback("INITIAL_SESSION", session); });
      return { data: { subscription: { unsubscribe: () => listeners.delete(callback) } } };
    },
    async signInWithPassword() { setPreviewRole("admin"); return { data: { session }, error: null }; },
    async signOut() { setPreviewRole(null); return { error: null }; },
  },
  from: table => new Query(table),
  async rpc(name, args) {
    if (!admin()) return error("Offline admin permission required.");
    if (!["submit_simple_party", "update_simple_party", "delete_simple_party"].includes(name)) return error("This operation is not supported in offline preview.");
    const index = tables.simple_parties.findIndex(row => row.id === args.party_id);
    if (name === "delete_simple_party") {
      if (index < 0) return error("Party not found.");
      tables.simple_parties.splice(index, 1);
      return { data: args.party_id, error: null };
    }
    const payload = args.payload;
    if (!payload || !["seoul", "bangkok", "hanoi"].includes(payload.capital_id)
      || !payload.venue_name?.trim() || !Number.isFinite(Date.parse(payload.starts_at))) return error("Invalid offline party payload.");
    if (name === "update_simple_party" && index < 0) return error("Party not found.");
    const id = name === "update_simple_party" ? args.party_id : crypto.randomUUID();
    const row = { ...structuredClone(payload), id };
    if (index >= 0) tables.simple_parties[index] = row; else tables.simple_parties.push(row);
    return { data: id, error: null };
  },
  storage: { from(bucket) { return {
    async upload(objectPath, file, options) {
      if (!admin() || bucket !== "simple-party-posters") return error("Offline upload denied.");
      if (!/^(seoul|bangkok|hanoi)\/[a-f0-9-]+\.(jpg|png|webp)$/.test(objectPath)
        || !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 4 * 1024 * 1024) return error("Invalid mock image.");
      if (options?.upsert || objects.has(objectPath)) return error("Offline overwrite denied.");
      objects.set(objectPath, { type: file.type, size: file.size });
      return { data: { path: objectPath }, error: null };
    },
    getPublicUrl: objectPath => ({ data: { publicUrl: `${poster}?mock-upload=${encodeURIComponent(objectPath)}` } }),
    remove: async () => error("Storage deletion is disabled in offline preview."),
  }; } },
};
// Never create an actual SDK client, read credentials, persist auth, or use a transport.
export function createClient() { return client; }
