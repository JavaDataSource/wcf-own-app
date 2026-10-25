import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import {
  Plus, BookOpen, NotePencil, PencilSimple, CalendarPlus, Clock, Star, Trash, TrendUp, CheckCircle,
} from "@phosphor-icons/react";
import { api } from "../api";
import { useWorkspace } from "../WorkspaceContext";
import { addDays, classNames, formatDate, formatDuration, localDate } from "../utils";
import { Badge, Button, ConfirmDialog, EmptyState, EntityForm, IconButton, Modal, PageHeader, Section, type FieldDefinition } from "../components/ui";
import { ModuleArtwork } from "../components/ModuleArtwork";

const statusLabels: Record<string, string> = { want: "想读", reading: "在读", paused: "搁置", finished: "已读完" };
const statusTones: Record<string, "neutral" | "accent" | "success" | "warning"> = { want: "neutral", reading: "accent", paused: "warning", finished: "success" };

export function ReadingPage() {
  const { data, run } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState("reading");
  const [dialog, setDialog] = useState<{ type: string; item?: Record<string, any>; bookId?: string } | null>(null);
  const [confirm, setConfirm] = useState<{ collection: "books" | "readingSessions" | "readingNotes"; id: string; title: string } | null>(null);

  useEffect(() => {
    const value = params.get("new");
    if (value === "book" || value === "session" || value === "note") setDialog({ type: value });
  }, [params]);

  const close = () => { setDialog(null); setParams({}); };

  const books = data.books;
  const sessions = data.readingSessions;
  const notes = data.readingNotes;

  const totals = useMemo(() => Object.fromEntries(books.map((book) => {
    const bookSessions = sessions.filter((session) => session.book_id === book.id);
    return [book.id, {
      minutes: bookSessions.reduce((sum, session) => sum + Number(session.minutes || 0), 0),
      pages: bookSessions.reduce((sum, session) => sum + Number(session.pages_read || 0), 0),
      notes: notes.filter((note) => note.book_id === book.id).length,
    }];
  })), [books, sessions, notes]);

  const stats = useMemo(() => {
    const month = localDate().slice(0, 7);
    const monthSessions = sessions.filter((session) => String(session.session_date).startsWith(month));
    return {
      reading: books.filter((book) => book.status === "reading").length,
      finished: books.filter((book) => book.status === "finished").length,
      monthMinutes: monthSessions.reduce((sum, session) => sum + Number(session.minutes || 0), 0),
      monthPages: monthSessions.reduce((sum, session) => sum + Number(session.pages_read || 0), 0),
    };
  }, [books, sessions]);

  const chartData = useMemo(() => {
    const today = localDate();
    return Array.from({ length: 14 }, (_, index) => addDays(today, index - 13)).map((date) => ({
      date: date.slice(5),
      minutes: sessions.filter((session) => session.session_date === date).reduce((sum, session) => sum + Number(session.minutes || 0), 0),
      pages: sessions.filter((session) => session.session_date === date).reduce((sum, session) => sum + Number(session.pages_read || 0), 0),
    }));
  }, [sessions]);

  const visibleBooks = books.filter((book) => filter === "all" || book.status === filter);
  const recentNotes = [...notes].sort((a, b) => String(b.note_date).localeCompare(String(a.note_date)) || String(b.created_at).localeCompare(String(a.created_at))).slice(0, 6);
  const recentSessions = [...sessions].sort((a, b) => String(b.session_date).localeCompare(String(a.session_date)) || String(b.created_at).localeCompare(String(a.created_at))).slice(0, 8);
  const hasChartData = chartData.some((day) => day.minutes > 0 || day.pages > 0);

  return (
    <div>
      <PageHeader
        icon={<ModuleArtwork module="reading" />}
        eyebrow="阅读与笔记"
        title="阅读"
        description="管理想读和在读的书，记录每次阅读的页数与时长，并把值得留下的句子整理成笔记。"
        actions={<>
          <Button variant="secondary" onClick={() => setDialog({ type: "session" })}><Clock size={17} />记录阅读</Button>
          <Button onClick={() => setDialog({ type: "book" })}><Plus size={17} />添加书籍</Button>
        </>}
      />

      <div className="reading-stats">
        <div className="reading-stat"><span><BookOpen size={17} />正在阅读</span><strong>{stats.reading}<small> 本</small></strong></div>
        <div className="reading-stat"><span><CheckCircle size={17} />已读完</span><strong>{stats.finished}<small> 本</small></strong></div>
        <div className="reading-stat"><span><Clock size={17} />本月阅读</span><strong>{formatDuration(stats.monthMinutes)}</strong></div>
        <div className="reading-stat"><span><TrendUp size={17} />本月页数</span><strong>{stats.monthPages}<small> 页</small></strong></div>
      </div>

      <div className="reading-toolbar">
        <div className="segmented">
          {["reading", "want", "paused", "finished", "all"].map((value) => (
            <button className={filter === value ? "active" : ""} key={value} onClick={() => setFilter(value)}>
              {value === "all" ? "全部" : statusLabels[value]}
            </button>
          ))}
        </div>
        <span className="reading-count">书架共 {books.length} 本 · 笔记 {notes.length} 条</span>
      </div>

      <Section title="书架" description="进度来自每次阅读记录，也可以直接编辑书籍信息">
        {visibleBooks.length ? (
          <div className="book-grid">
            {visibleBooks.map((book) => {
              const progress = bookProgress(book);
              const total = totals[book.id] ?? { minutes: 0, pages: 0, notes: 0 };
              return (
                <article className="book-card" key={book.id}>
                  <div className={classNames("book-cover", `book-cover-${book.status}`)}>
                    <BookOpen size={30} />
                    <div><strong>{book.category || "未分类"}</strong><span>{book.author || "未知作者"}</span></div>
                    <Badge tone={statusTones[book.status] ?? "neutral"}>{statusLabels[book.status] ?? book.status}</Badge>
                  </div>
                  <div className="book-copy">
                    <header>
                      <div><h3>{book.title}</h3><small>{book.summary || "还没有添加简介"}</small></div>
                      <IconButton label={`删除《${book.title}》`} onClick={() => setConfirm({ collection: "books", id: book.id, title: book.title })}><Trash size={16} /></IconButton>
                    </header>
                    <div className="book-progress">
                      <div><span>{Number(book.current_page || 0)} / {book.total_pages ? `${book.total_pages} 页` : "未设置总页数"}</span><strong>{progress}%</strong></div>
                      <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
                    </div>
                    <div className="book-meta">
                      <span><Clock size={14} />{formatDuration(total.minutes)}</span>
                      <span><NotePencil size={14} />{total.notes} 条笔记</span>
                      {book.rating ? <span><Star size={14} weight="fill" />{book.rating}</span> : null}
                    </div>
                    <div className="book-actions">
                      <Button size="sm" onClick={() => setDialog({ type: "session", bookId: book.id })}><Clock size={15} />记录阅读</Button>
                      <Button variant="secondary" size="sm" onClick={() => setDialog({ type: "note", bookId: book.id })}><NotePencil size={15} />写笔记</Button>
                      <Button variant="ghost" size="sm" onClick={() => setDialog({ type: "book", item: book })}><PencilSimple size={15} />编辑</Button>
                      <Button variant="ghost" size="sm" onClick={() => void run(() => api.create("planItems", { title: `阅读：${book.title}`, plan_date: localDate(), source_module: "reading", source_entity_type: "book", source_entity_id: book.id, priority: "low" }))}><CalendarPlus size={15} />安排</Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title={books.length ? "这个分类还没有书" : "书架还是空的"}
            description={books.length ? "切换分类，或把想读的书加入书架。" : "先添加一本正在读或想读的书，之后每次阅读都可以记录页数和时长。"}
            action={<Button variant="secondary" onClick={() => setDialog({ type: "book" })}>添加书籍</Button>}
          />
        )}
      </Section>

      <div className="reading-grid">
        <Section title="近 14 天阅读" description="按天统计阅读时长与页数" action={<Button variant="ghost" size="sm" onClick={() => setDialog({ type: "session" })}><Plus size={15} />记录一次</Button>}>
          {hasChartData ? (
            <div className="chart-wrap reading-chart">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} barGap={3}>
                  <XAxis dataKey="date" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={34} />
                  <Tooltip formatter={(value: any, name: any) => [name === "minutes" ? `${value} 分钟` : `${value} 页`, name === "minutes" ? "时长" : "页数"]} />
                  <Bar dataKey="minutes" name="minutes" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pages" name="pages" fill="var(--palette-indigo)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="quiet-line">最近 14 天还没有阅读记录。</p>}
        </Section>

        <Section title="最近笔记" description="摘录、想法和页码会一起保留" action={<Button variant="ghost" size="sm" onClick={() => setDialog({ type: "note" })}><Plus size={15} />写笔记</Button>}>
          {recentNotes.length ? (
            <div className="reading-note-list">
              {recentNotes.map((note) => (
                <article key={note.id}>
                  <header>
                    <div><strong>{bookName(books, note.book_id)}</strong><small>{formatDate(note.note_date)}{note.chapter ? ` · ${note.chapter}` : ""}{note.page_number ? ` · 第 ${note.page_number} 页` : ""}</small></div>
                    <div className="reading-note-actions">
                      <IconButton label="编辑笔记" onClick={() => setDialog({ type: "note", item: note })}><PencilSimple size={15} /></IconButton>
                      <IconButton label="删除笔记" onClick={() => setConfirm({ collection: "readingNotes", id: note.id, title: note.content })}><Trash size={15} /></IconButton>
                    </div>
                  </header>
                  {note.quote ? <blockquote>{note.quote}</blockquote> : null}
                  <p>{note.content}</p>
                </article>
              ))}
            </div>
          ) : <p className="quiet-line">还没有笔记。读到喜欢的句子时，可以在这里留下摘录和想法。</p>}
        </Section>
      </div>

      <Section title="阅读记录" description="每次阅读的日期、时长和页数">
        {recentSessions.length ? (
          <div className="reading-session-list">
            {recentSessions.map((session) => (
              <article key={session.id}>
                <div><strong>{bookName(books, session.book_id)}</strong><small>{formatDate(session.session_date)}</small></div>
                <span>{formatDuration(session.minutes)}</span>
                <span>{Number(session.pages_read || 0)} 页</span>
                <p>{session.note || "没有补充"}</p>
                <IconButton label="删除阅读记录" onClick={() => setConfirm({ collection: "readingSessions", id: session.id, title: `${bookName(books, session.book_id)} ${formatDate(session.session_date)}` })}><Trash size={15} /></IconButton>
              </article>
            ))}
          </div>
        ) : <p className="quiet-line">还没有阅读记录。</p>}
      </Section>

      <ReadingDialog dialog={dialog} close={close} run={run} books={books} />
      <ConfirmDialog
        open={Boolean(confirm)}
        title="移到回收站"
        description={confirm ? `“${confirm.title}”会先移到回收站，可以之后恢复。` : ""}
        confirmLabel="移到回收站"
        danger
        onConfirm={async () => { if (confirm) await run(() => api.remove(confirm.collection, confirm.id)); }}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}

function bookProgress(book: Record<string, any>): number {
  if (book.status === "finished") return 100;
  const total = Number(book.total_pages || 0);
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((Number(book.current_page || 0) / total) * 100)));
}

function bookName(books: Record<string, any>[], id: string): string {
  return books.find((book) => book.id === id)?.title || "已删除书籍";
}

function ReadingDialog({ dialog, close, run, books }: any) {
  if (!dialog) return null;
  const bookOptions = books.map((book: Record<string, any>) => ({ value: book.id, label: book.title }));

  if (dialog.type === "book") {
    const fields: FieldDefinition[] = [
      { name: "title", label: "书名", required: true, placeholder: "例如：置身事内" },
      { name: "author", label: "作者", placeholder: "例如：兰小欢" },
      { name: "category", label: "分类", placeholder: "例如：经济、小说、技术" },
      { name: "status", label: "状态", type: "select", required: true, options: Object.entries(statusLabels).map(([value, label]) => ({ value, label })) },
      { name: "total_pages", label: "总页数", type: "number" },
      { name: "current_page", label: "当前页", type: "number" },
      { name: "started_on", label: "开始阅读日期", type: "date" },
      { name: "finished_on", label: "读完日期", type: "date" },
      { name: "rating", label: "个人评分（0-10）", type: "number", step: "0.5" },
      { name: "summary", label: "简介或阅读目标", type: "textarea" },
    ];
    return (
      <Modal open title={dialog.item?.id ? "编辑书籍" : "添加书籍"} description="总页数用于计算阅读进度，可以稍后补充。" onClose={close}>
        <EntityForm
          fields={fields}
          initial={{ status: "want", current_page: 0, ...dialog.item }}
          onCancel={close}
          onSubmit={async (values) => {
            const status = values.status;
            const finished = status === "finished";
            const payload = {
              ...values,
              current_page: finished && values.total_pages ? values.total_pages : values.current_page,
              finished_on: finished && !values.finished_on ? localDate() : values.finished_on,
              started_on: status !== "want" && !values.started_on ? localDate() : values.started_on,
            };
            if (dialog.item?.id) await run(() => api.update("books", dialog.item.id, payload));
            else await run(() => api.create("books", payload));
            close();
          }}
        />
      </Modal>
    );
  }

  if (dialog.type === "session") {
    const fields: FieldDefinition[] = [
      { name: "book_id", label: "书籍", type: "select", required: true, options: bookOptions },
      { name: "session_date", label: "阅读日期", type: "date", required: true },
      { name: "minutes", label: "阅读时长（分钟）", type: "number" },
      { name: "pages_read", label: "阅读页数", type: "number" },
      { name: "note", label: "这次读到什么", type: "textarea" },
    ];
    return (
      <Modal open title="记录阅读" description="记录页数后会自动推进书籍进度。" onClose={close}>
        {bookOptions.length ? (
          <EntityForm
            fields={fields}
            initial={{ book_id: dialog.bookId ?? bookOptions[0].value, session_date: localDate(), minutes: 30, pages_read: 0 }}
            onCancel={close}
            onSubmit={async (values) => {
              await run(async () => {
                await api.create("readingSessions", values);
                const book = books.find((item: Record<string, any>) => item.id === values.book_id);
                if (!book) return;
                const pagesRead = Number(values.pages_read || 0);
                const totalPages = Number(book.total_pages || 0);
                const nextPage = Number(book.current_page || 0) + pagesRead;
                const finished = totalPages > 0 && nextPage >= totalPages;
                await api.update("books", book.id, {
                  current_page: totalPages > 0 ? Math.min(totalPages, nextPage) : nextPage,
                  status: finished ? "finished" : book.status === "want" ? "reading" : book.status,
                  started_on: book.started_on || values.session_date,
                  finished_on: finished ? values.session_date : book.finished_on,
                });
              });
              close();
            }}
          />
        ) : <EmptyState title="书架还是空的" description="先添加一本书，再记录阅读。" action={<Button variant="secondary" onClick={close}>知道了</Button>} />}
      </Modal>
    );
  }

  const noteFields: FieldDefinition[] = [
    { name: "book_id", label: "书籍", type: "select", required: true, options: bookOptions },
    { name: "note_date", label: "日期", type: "date", required: true },
    { name: "chapter", label: "章节", placeholder: "例如：第三章" },
    { name: "page_number", label: "页码", type: "number" },
    { name: "quote", label: "原文摘录", type: "textarea" },
    { name: "content", label: "我的想法", type: "textarea", required: true },
  ];
  return (
    <Modal open title={dialog.item?.id ? "编辑笔记" : "写笔记"} description="摘录原文并写下自己的想法，之后可以在搜索里找到。" onClose={close}>
      {bookOptions.length ? (
        <EntityForm
          fields={noteFields}
          initial={{ book_id: dialog.bookId ?? bookOptions[0].value, note_date: localDate(), ...dialog.item }}
          onCancel={close}
          onSubmit={async (values) => {
            if (dialog.item?.id) await run(() => api.update("readingNotes", dialog.item.id, values));
            else await run(() => api.create("readingNotes", values));
            close();
          }}
        />
      ) : <EmptyState title="书架还是空的" description="先添加一本书，再写读书笔记。" action={<Button variant="secondary" onClick={close}>知道了</Button>} />}
    </Modal>
  );
}
