// Recovery uses an isolated, memory-only client; ordinary admin sessions are untouched.
export async function openPasswordRecovery(auth, href) {
  const url = new URL(href);
  const params = new URLSearchParams(url.hash.slice(1));
  if (url.searchParams.has("error") || params.has("error")
      || params.get("type") !== "recovery"
      || !params.get("access_token") || !params.get("refresh_token")) {
    throw new Error("This recovery link is invalid or expired. Request a new link.");
  }
  const { data, error } = await auth.setSession({
    access_token: params.get("access_token"),
    refresh_token: params.get("refresh_token"),
  });
  if (error || !data?.session) throw new Error("This recovery link is invalid or expired. Request a new link.");
  const verified = await auth.getUser();
  const claims = await auth.getClaims();
  if (verified.error || claims.error || verified.data?.user?.app_metadata?.role !== "admin"
      || !claims.data?.claims?.amr?.some(item => item.method === "recovery")) {
    await auth.signOut({ scope: "local" });
    throw new Error("A valid administrator recovery link is required.");
  }
  let ready = true;
  let saved = false;
  return {
    async dispose() {
      ready = false;
      await auth.signOut({ scope: "local" });
    },
    async save(password, confirmation) {
      if (!ready) throw new Error("Request a new recovery link.");
      if (!saved) {
        if (password.length < 12) throw new Error("Use at least 12 characters.");
        if (password !== confirmation) throw new Error("Passwords do not match.");
        const result = await auth.updateUser({ password });
        if (result.error) throw new Error("Password could not be saved. Check the password requirements or request a new link.");
        saved = true;
      }
      const result = await auth.signOut({ scope: "local" });
      if (result.error) throw new Error("Password saved, but sign-out failed. Retry to finish signing out.");
      ready = false;
    },
  };
}
