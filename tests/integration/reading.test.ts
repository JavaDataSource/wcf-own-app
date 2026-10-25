// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../server/app.js";
import { makeTestDirectory, removeTestDirectory } from "../helpers.js";

let directory = "";
let app: FastifyInstance;
beforeEach(async () => { directory = makeTestDirectory("reading"); app = await buildApp({ dataDir: directory, autoBackup: false }); });
afterEach(async () => { await app.close(); removeTestDirectory(directory); });

async function create(collection: string, payload: Record<string, any>) {
  const response = await app.inject({ method: "POST", url: `/api/collections/${collection}`, payload });
  expect(response.statusCode).toBe(201);
  return response.json().data;
}

describe("reading module", () => {
  it("tracks books, reading sessions and notes with searchable content", async () => {
    const book = await create("books", {
      title: "置身事内",
      author: "兰小欢",
      category: "经济",
      status: "reading",
      total_pages: 340,
      current_page: 120,
      started_on: "2026-08-01",
      summary: "理解地方政府的经济行为",
    });
    const session = await create("readingSessions", {
      book_id: book.id,
      session_date: "2026-08-02",
      minutes: 45,
      pages_read: 24,
      note: "读到土地财政一章",
    });
    const note = await create("readingNotes", {
      book_id: book.id,
      note_date: "2026-08-02",
      chapter: "第三章",
      page_number: 118,
      quote: "地方政府是经济发展的重要参与者",
      content: "把土地、财政和城市化联系起来理解。",
    });

    const state = (await app.inject({ method: "GET", url: "/api/state" })).json().data;
    expect(state.books[0]).toMatchObject({ title: "置身事内", status: "reading", total_pages: 340, current_page: 120 });
    expect(state.readingSessions.find((item: any) => item.id === session.id)).toMatchObject({ minutes: 45, pages_read: 24 });
    expect(state.readingNotes.find((item: any) => item.id === note.id)).toMatchObject({ chapter: "第三章", page_number: 118 });

    const search = (await app.inject({ method: "GET", url: "/api/search?q=%E8%B4%A2%E6%94%BF" })).json().data;
    expect(search.map((item: any) => item.collection)).toEqual(expect.arrayContaining(["readingNotes", "readingSessions"]));

    const dashboard = (await app.inject({ method: "GET", url: "/api/dashboard?date=2026-08-03" })).json().data;
    expect(dashboard.summaries.reading[0]).toMatchObject({ title: "置身事内" });
  });

  it("resolves a linked plan item title from the book and keeps the source module", async () => {
    const book = await create("books", { title: "原始书名", status: "reading" });
    await create("planItems", {
      title: "旧的阅读计划标题",
      plan_date: "2026-08-02",
      source_module: "reading",
      source_entity_type: "book",
      source_entity_id: book.id,
    });
    await app.inject({ method: "PATCH", url: `/api/collections/books/${book.id}`, payload: { title: "更新后的书名" } });
    const state = (await app.inject({ method: "GET", url: "/api/state" })).json().data;
    expect(state.planItems[0].display_title).toBe("更新后的书名");
    expect(state.planItems[0].source_module).toBe("reading");
  });

  it("requires a book and a date for reading records and notes", async () => {
    const session = await app.inject({ method: "POST", url: "/api/collections/readingSessions", payload: { minutes: 20 } });
    expect(session.statusCode).toBe(400);
    const note = await app.inject({ method: "POST", url: "/api/collections/readingNotes", payload: { content: "缺少书籍和日期" } });
    expect(note.statusCode).toBe(400);
  });
});
