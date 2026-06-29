import React, { useState, useEffect } from "react";
import {
  Loader2, FileText, GitBranch, Briefcase, Trash2, Archive,
} from "lucide-react";
import {
  useAdminPostsQuery,
  useAdminDeletePostMutation,
  useAdminProjectsQuery,
  useAdminUpdateProjectStatusMutation,
  useAdminJobsQuery,
  useAdminDeleteJobMutation,
} from "../../hooks/usePlatformQueries";
import { Avatar } from "../../components/ui";
import { SearchBar, DataTable, StatusBadge, LoadMoreBtn, fmtRelative } from "./shared";
import { cleanLogoUrl } from "../../core/utils/format";

type ModerationTab = "posts" | "projects" | "jobs";

export function ModerationPanel() {
  const [sub, setSub] = useState<ModerationTab>("posts");
  const [q, setQ] = useState("");

  const SUB_TABS: { id: ModerationTab; label: string; icon: any }[] = [
    { id: "posts", label: "Posts", icon: FileText },
    { id: "projects", label: "Projects", icon: GitBranch },
    { id: "jobs", label: "Jobs", icon: Briefcase },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Content Moderation</h2>
      </div>

      <div className="flex gap-1 border-b pb-3" style={{ borderColor: "var(--border)" }}>
        {SUB_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all border
              ${sub === id ? "bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border-indigo-600/20" : "border-transparent hover:bg-[var(--bg-surface-2)]"}`}
            style={sub !== id ? { color: "var(--text-muted)" } : {}}
            onClick={() => { setSub(id); setQ(""); }}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      <SearchBar
        value={q}
        onChange={setQ}
        placeholder={`Search ${sub}...`}
      />

      {sub === "posts" && <PostsModerationTab q={q} />}
      {sub === "projects" && <ProjectsModerationTab q={q} />}
      {sub === "jobs" && <JobsModerationTab q={q} />}
    </div>
  );
}

function PostsModerationTab({ q }: { q: string }) {
  const query = useAdminPostsQuery(q);
  const deletePost = useAdminDeletePostMutation();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const posts = query.data?.pages.flatMap((p) => p?.posts ?? []) ?? [];

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
      {query.isPending ? <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-indigo-500" /></div> : (
        <>
          <DataTable headers={["Author", "Content Preview", "Engagement", "Date", "Action"]} empty={posts.length === 0}>
            {posts.map((post: any) => (
              <tr key={post.id} className="transition hover:bg-[var(--bg-surface-2)]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar user={post.author} size="sm" />
                    <div>
                      <div className="font-semibold" style={{ color: "var(--text-primary)" }}>{post.author?.profile?.fullName || post.author?.username}</div>
                      <div style={{ color: "var(--text-muted)" }}>@{post.author?.username}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 max-w-xs">
                  <p className="line-clamp-2 leading-relaxed" style={{ color: "var(--text-secondary)" }}>{post.content}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-3" style={{ color: "var(--text-muted)" }}>
                    <span>❤️ {post._count?.likes ?? 0}</span>
                    <span>💬 {post._count?.comments ?? 0}</span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--text-muted)" }}>{fmtRelative(post.createdAt)}</td>
                <td className="px-4 py-3">
                  {confirmDelete === post.id ? (
                    <div className="flex gap-1">
                      <button
                        className="rounded px-2 py-1 text-[10px] font-bold bg-rose-500/20 text-rose-500 hover:bg-rose-500/30 transition"
                        onClick={async () => { await deletePost.mutateAsync(post.id); setConfirmDelete(null); }}
                        disabled={deletePost.isPending}
                      >
                        {deletePost.isPending ? <Loader2 size={10} className="animate-spin" /> : "Confirm"}
                      </button>
                      <button className="rounded px-2 py-1 text-[10px] transition" style={{ color: "var(--text-muted)" }} onClick={() => setConfirmDelete(null)}>Cancel</button>
                    </div>
                  ) : (
                    <button
                      className="flex items-center gap-1 rounded-lg border border-rose-700/40 px-2.5 py-1.5 text-[10px] font-bold text-rose-500 hover:bg-rose-500/10 transition"
                      onClick={() => setConfirmDelete(post.id)}
                    >
                      <Trash2 size={10} /> Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </DataTable>
          <div className="p-3"><LoadMoreBtn query={query} /></div>
        </>
      )}
    </div>
  );
}

function ProjectsModerationTab({ q }: { q: string }) {
  const query = useAdminProjectsQuery(q);
  const updateStatus = useAdminUpdateProjectStatusMutation();

  const projects = query.data?.pages.flatMap((p) => p?.projects ?? []) ?? [];

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
      {query.isPending ? <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-indigo-500" /></div> : (
        <>
          <DataTable headers={["Project", "Owner", "Status", "Visibility", "Members", "Actions"]} empty={projects.length === 0}>
            {projects.map((p: any) => (
              <tr key={p.id} className="transition hover:bg-[var(--bg-surface-2)]">
                <td className="px-4 py-3">
                  <div className="font-semibold" style={{ color: "var(--text-primary)" }}>{p.title}</div>
                  {p.techStack?.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {p.techStack.slice(0, 3).map((t: string) => (
                        <span key={t} className="chip text-[9px] px-1">{t}</span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar user={p.owner} size="sm" />
                    <span style={{ color: "var(--text-secondary)" }}>@{p.owner?.username}</span>
                  </div>
                </td>
                <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                <td className="px-4 py-3" style={{ color: "var(--text-muted)" }}>{p.visibility}</td>
                <td className="px-4 py-3 text-center" style={{ color: "var(--text-secondary)" }}>{p._count?.members ?? 0}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {p.status !== "ARCHIVED" && (
                      <button
                        className="btn-secondary text-[10px] px-2 py-1"
                        onClick={() => updateStatus.mutateAsync({ projectId: p.id, status: "ARCHIVED" })}
                      >
                        <Archive size={9} /> Archive
                      </button>
                    )}
                    {p.status === "ARCHIVED" && (
                      <button
                        className="rounded px-2 py-1 text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-700/30 hover:bg-indigo-500/20 transition"
                        onClick={() => updateStatus.mutateAsync({ projectId: p.id, status: "OPEN" })}
                      >Restore</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </DataTable>
          <div className="p-3"><LoadMoreBtn query={query} /></div>
        </>
      )}
    </div>
  );
}

function JobsModerationTab({ q }: { q: string }) {
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [history, setHistory] = useState<(string | undefined)[]>([]);

  // Reset pagination on search change
  useEffect(() => {
    setCursor(undefined);
    setHistory([]);
  }, [q]);

  const query = useAdminJobsQuery(q, cursor);
  const deleteJob = useAdminDeleteJobMutation();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const jobs = query.data?.jobs ?? [];

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
      {query.isPending ? <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-indigo-500" /></div> : (
        <>
          <DataTable headers={["Job", "Company", "Type", "Status", "Applications", "Action"]} empty={jobs.length === 0}>
            {jobs.map((j: any) => (
              <tr key={j.id} className="transition hover:bg-[var(--bg-surface-2)]">
                <td className="px-4 py-3">
                  <div className="font-semibold" style={{ color: "var(--text-primary)" }}>{j.title}</div>
                  <div style={{ color: "var(--text-muted)" }}>{j.location}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {cleanLogoUrl(j.company?.logoUrl) && (
                      <img src={cleanLogoUrl(j.company.logoUrl)!} alt="" className="h-5 w-5 rounded object-contain" />
                    )}
                    <span style={{ color: "var(--text-secondary)" }}>{j.company?.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3" style={{ color: "var(--text-muted)" }}>{j.type} · {j.workMode}</td>
                <td className="px-4 py-3"><StatusBadge status={j.status} /></td>
                <td className="px-4 py-3 text-center" style={{ color: "var(--text-secondary)" }}>{j._count?.applications ?? 0}</td>
                <td className="px-4 py-3">
                  {confirmDelete === j.id ? (
                    <div className="flex gap-1">
                      <button
                        className="rounded px-2 py-1 text-[10px] font-bold bg-rose-500/20 text-rose-500 hover:bg-rose-500/30 transition"
                        onClick={async () => { await deleteJob.mutateAsync(j.id); setConfirmDelete(null); }}
                        disabled={deleteJob.isPending}
                      >
                        {deleteJob.isPending ? <Loader2 size={10} className="animate-spin" /> : "Confirm"}
                      </button>
                      <button className="rounded px-2 py-1 text-[10px] transition" style={{ color: "var(--text-muted)" }} onClick={() => setConfirmDelete(null)}>Cancel</button>
                    </div>
                  ) : (
                    <button
                      className="flex items-center gap-1 rounded-lg border border-rose-700/40 px-2.5 py-1.5 text-[10px] font-bold text-rose-500 hover:bg-rose-500/10 transition"
                      onClick={() => setConfirmDelete(j.id)}
                    >
                      <Trash2 size={10} /> Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </DataTable>
          <div className="flex items-center justify-between border-t px-4 py-3" style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)" }}>
            <div className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
              Page {history.length + 1}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const prev = history[history.length - 1];
                  setHistory(history.slice(0, -1));
                  setCursor(prev);
                }}
                disabled={history.length === 0 || query.isFetching}
                className="btn-secondary text-xs disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => {
                  setHistory([...history, cursor]);
                  setCursor(query.data?.nextCursor || undefined);
                }}
                disabled={!query.data?.hasNextPage || query.isFetching}
                className="btn-secondary text-xs disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
