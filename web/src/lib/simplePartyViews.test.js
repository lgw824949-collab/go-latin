import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { transformWithOxc } from "vite";
import { emptySimplePartyForm } from "./simplePartyAdmin.js";

// Render and invoke only mocked client handlers: no DOM, network, Storage or DB.
const require = createRequire(import.meta.url);
const dataModule = code => `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
const hooks = dataModule(`
  export const useEffect=()=>{};
  export const useRef=value=>({current:value});
  export const useState=()=>{
    const index=globalThis.__qp.index++;
    return [globalThis.__qp.states[index],value=>{
      const states=globalThis.__qp.states;
      states[index]=typeof value==='function'?value(states[index]):value;
    }];
  };
`);
const adminMock = dataModule(`
  export const emptySimplePartyForm=()=>globalThis.__qp.empty();
  export const simplePartyEditForm=party=>party;
  export const loadSimplePartyAdmin=()=>{throw Error('Effects must not run');};
  export const saveSimplePartyAdmin=form=>globalThis.__qp.save(form);
  export const deleteSimplePartyAdmin=id=>globalThis.__qp.remove(id);
`);
async function compile(relative, admin = false, exportName = "default") {
  const filename = fileURLToPath(new URL(relative, import.meta.url));
  let source = fs.readFileSync(filename, "utf8");
  source = source.replace(/import \{[^}]*\} from "react";/, `import {useState,useEffect,useRef} from "${hooks}";`);
  source = source.replace(/from "(\.[^"]+)"/g, (_, specifier) => {
    if (admin && specifier === "../lib/simplePartyAdmin.js") return `from "${adminMock}"`;
    return `from "${pathToFileURL(path.resolve(path.dirname(filename), specifier)).href}"`;
  });
  const transformed = await transformWithOxc(source, filename, { jsx: { runtime: "automatic" } });
  const code = transformed.code.replace(/from ["'](react(?:\/jsx-runtime)?|react-router-dom)["']/g,
    (_, specifier) => `from "${pathToFileURL(require.resolve(specifier)).href}"`);
  return (await import(dataModule(code)))[exportName];
}
const AdminPage = await compile("../pages/SimplePartyManage.jsx", true);
const AdminPoster = await compile("../pages/SimplePartyManage.jsx", true, "AdminPoster");
const PublicList = await compile("../components/SimpleCityParties.jsx");
const Poster = await compile("../components/SimpleCityParties.jsx", false, "PartyPoster");
const ID = "11111111-1111-4111-8111-111111111111";
const party = { id: ID, capitalId: "seoul", venueName: "Past venue", startsAt: "2020-01-01T12:00:00Z",
  posterUrl: "https://example.com/poster.png", snsUrl: "https://example.com/social", genre: "bachata" };
function fixture(access = "admin") {
  globalThis.__qp = { index: 0, empty: emptySimplePartyForm,
    states: [access, "", [party], "ready", "", "", "", 0, "", emptySimplePartyForm(), 0, false],
    save: async () => ({ id: ID }), remove: async () => ID };
  return globalThis.__qp;
}
function find(node, predicate) {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) return node.map(child => find(child, predicate)).find(Boolean) ?? null;
  if (predicate(node)) return node;
  return find(node.props?.children, predicate);
}
function editorTree() { const element = AdminPage(); return element.type(element.props); }

test("signed-out and non-admin screens show no editor or delete actions", () => {
  for (const access of ["signedOut", "forbidden"]) {
    fixture(access);
    // Link needs Router context only on this access-denied screen.
    const tree = AdminPage();
    assert.equal(find(tree, node => node.type === "form"), null);
    assert.ok(find(tree, node => node.props?.role === "alert"));
    assert.equal(find(tree, node => node.type === "button"), null);
  }
});

test("admin screen includes past parties, optional poster replacement and delete", () => {
  fixture();
  const tree = editorTree();
  assert.ok(find(tree, node => node.props?.children === "All parties, including past dates"));
  assert.ok(find(tree, node => node.props?.children === "Past venue"));
  assert.ok(find(tree, node => node.type === "button" && node.props.children === "Delete"));
  const state = fixture(); state.states[9] = { ...emptySimplePartyForm(), id: ID, posterUrl: party.posterUrl };
  const editing = editorTree();
  assert.equal(find(editing, node => node.type === "input" && node.props.type === "file").props.required, false);
});

test("save success resets the editor and refreshes the list", async () => {
  const state = fixture();
  await find(editorTree(), node => node.type === "form").props.onSubmit({ preventDefault() {} });
  assert.equal(state.states[6], "Saved."); assert.equal(state.states[7], 1); assert.equal(state.states[11], false);
});

test("save failure displays error and retains a successful replacement upload for retry", async () => {
  const state = fixture();
  state.save = async () => { const error = new Error("RPC denied"); error.uploadedPoster = { url: "https://example.com/new.png" }; throw error; };
  await find(editorTree(), node => node.type === "form").props.onSubmit({ preventDefault() {} });
  assert.match(state.states[5], /RPC denied/);
  assert.equal(state.states[9].posterUrl, "https://example.com/new.png");
  assert.equal(state.states[9].posterFile, null); assert.equal(state.states[7], 0);
});

test("delete requires confirmation and preserves the list on failure", async () => {
  const oldWindow = globalThis.window;
  try {
    const state = fixture(); let calls = 0;
    state.remove = async () => { calls++; throw new Error("Delete denied"); };
    globalThis.window = { confirm: () => false };
    const button = find(editorTree(), node => node.type === "button" && node.props.children === "Delete");
    await button.props.onClick(); assert.equal(calls, 0);
    globalThis.window.confirm = () => true;
    await button.props.onClick(); assert.equal(calls, 1);
    assert.equal(state.states[2].length, 1); assert.match(state.states[5], /Delete denied/);
  } finally { globalThis.window = oldWindow; }
});

test("successful delete removes only the matching list item and refreshes", async () => {
  const oldWindow = globalThis.window;
  try {
    const state = fixture(); globalThis.window = { confirm: () => true };
    await find(editorTree(), node => node.type === "button" && node.props.children === "Delete").props.onClick();
    assert.equal(state.states[2].length, 0); assert.equal(state.states[6], "Deleted."); assert.equal(state.states[7], 1);
  } finally { globalThis.window = oldWindow; }
});

test("public list preserves poster and SNS but has no registration link", () => {
  globalThis.__qp = { index: 0, states: ["ready", [party], ""] };
  const html = renderToStaticMarkup(createElement(PublicList, { capitalId: "seoul" }));
  assert.ok(html.includes(party.posterUrl)); assert.ok(html.includes(party.snsUrl));
  assert.ok(!html.includes("Register a party")); assert.ok(!html.includes("/admin"));
});

test("public query error renders an alert rather than no-upcoming-parties", () => {
  globalThis.__qp = { index: 0, states: ["error", [], "Query denied"] };
  const html = renderToStaticMarkup(createElement(PublicList, { capitalId: "seoul" }));
  assert.ok(html.includes('role="alert"')); assert.ok(html.includes("Query denied"));
  assert.ok(!html.includes("No upcoming parties"));
});

test("failed public poster becomes guidance without an image and leaves party links alone", () => {
  globalThis.__qp = { index: 0, states: [false] };
  const image = find(Poster({ party }), node => node.type === "img");
  assert.equal(image.props.src, party.posterUrl);
  image.props.onError();
  globalThis.__qp.index = 0;
  const failed = Poster({ party });
  assert.equal(find(failed, node => node.type === "img"), null);
  assert.match(renderToStaticMarkup(failed), /Poster unavailable.*SNS/);
});

test("switching public city replaces the stateful list so prior-city rows and errors cannot flash", () => {
  const seoul = PublicList({ capitalId: "seoul" });
  const bangkok = PublicList({ capitalId: "bangkok" });
  const hanoi = PublicList({ capitalId: "hanoi" });
  assert.equal(seoul.type, bangkok.type);
  assert.notEqual(seoul.key, bangkok.key);
  assert.notEqual(bangkok.key, hanoi.key);
  assert.equal(hanoi.props.capitalId, "hanoi");
});

test("admin poster failure shows guidance while preserving preview dimensions", () => {
  for (const width of [160, 240]) {
    globalThis.__qp = { index: 0, states: [false] };
    const props = { src: party.posterUrl, alt: "Current poster", width };
    const image = find(AdminPoster(props), node => node.type === "img");
    assert.equal(image.props.width, width);
    assert.equal(image.props.style.height, "auto");
    image.props.onError();
    globalThis.__qp.index = 0;
    const failed = AdminPoster(props);
    assert.equal(find(failed, node => node.type === "img"), null);
    assert.match(renderToStaticMarkup(failed), /Poster unavailable.*replacement/);
  }
});

test.after(() => { delete globalThis.__qp; });
