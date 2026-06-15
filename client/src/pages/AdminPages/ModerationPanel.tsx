import React, { useState } from "react";
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
import { cleanLogoUrl } from "../../lib/format";

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
        <h2 className="text-sm font-black uppercase tracking-wider text-zinc-400">Content Moderation</h2>
      </div>

      <div className="flex gap-1 border-b border-zinc-800/60 pb-3">
        {SUB_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all
              ${sub === id ? "bg-emerald-600/20 text-emerald-400 border border-emerald-600/30" : "text-zinc-500 hover:text-zinc-200 border border-transparent"}`}
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
    <div className="rounded-xl border border-zinc-700/50 bg-zinc-900/60 overflow-hidden">
      {query.isPending ? <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-emerald-500" /></div> : (
        <>
          <DataTable headers={["Author", "Content Preview", "Engagement", "Date", "Action"]} empty={posts.length === 0}>
            {posts.map((post: any) => (
              <tr key={post.id} className="hover:bg-zinc-800/40 transition">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar user={post.author} size="sm" />
                    <div>
                      <div className="font-semibold text-white">{post.author?.profile?.fullName || post.author?.username}</div>
                      <div className="text-zinc-500">@{post.author?.username}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 max-w-xs">
                  <p className="text-zinc-300 line-clamp-2 leading-relaxed">{post.content}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-3 text-zinc-500">
                    <span>❤️ {post._count?.likes ?? 0}</span>
                    <span>💬 {post._count?.comments ?? 0}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">{fmtRelative(post.createdAt)}</td>
                <td className="px-4 py-3">
                  {confirmDelete === post.id ? (
                    <div className="flex gap-1">
                      <button
                        className="rounded px-2 py-1 text-[10px] font-bold bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition"
                        onClick={async () => { await deletePost.mutateAsync(post.id); setConfirmDelete(null); }}
                        disabled={deletePost.isPending}
                      >
                        {deletePost.isPending ? <Loader2 size={10} className="animate-spin" /> : "Confirm"}
                      </button>
                      <button className="rounded px-2 py-1 text-[10px] text-zinc-500 hover:text-zinc-200" onClick={() => setConfirmDelete(null)}>Cancel</button>
                    </div>
                  ) : (
                    <button
                      className="flex items-center gap-1 rounded-lg border border-rose-700/40 px-2.5 py-1.5 text-[10px] font-bold text-rose-400 hover:bg-rose-500/10 transition"
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
    <div className="rounded-xl border border-zinc-700/50 bg-zinc-900/60 overflow-hidden">
      {query.isPending ? <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-emerald-500" /></div> : (
        <>
          <DataTable headers={["Project", "Owner", "Status", "Visibility", "Members", "Actions"]} empty={projects.length === 0}>
            {projects.map((p: any) => (
              <tr key={p.id} className="hover:bg-zinc-800/40 transition">
                <td className="px-4 py-3">
                  <div className="font-semibold text-white">{p.title}</div>
                  {p.techStack?.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {p.techStack.slice(0, 3).map((t: string) => (
                        <span key={t} className="rounded px-1 text-[9px] bg-zinc-800 text-zinc-500">{t}</span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar user={p.owner} size="sm" />
                    <span className="text-zinc-400">@{p.owner?.username}</span>
                  </div>
                </td>
                <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                <td className="px-4 py-3 text-zinc-500">{p.visibility}</td>
                <td className="px-4 py-3 text-center text-zinc-300">{p._count?.members ?? 0}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {p.status !== "ARCHIVED" && (
                      <button
                        className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700 transition"
                        onClick={() => updateStatus.mutateAsync({ projectId: p.id, status: "ARCHIVED" })}
                      >
                        <Archive size={9} /> Archive
                      </button>
                    )}
                    {p.status === "ARCHIVED" && (
                      <button
                        className="rounded px-2 py-1 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-700/30 hover:bg-emerald-500/20 transition"
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
  const query = useAdminJobsQuery(q);
  const deleteJob = useAdminDeleteJobMutation();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const jobs = query.data?.pages.flatMap((p) => p?.jobs ?? []) ?? [];

  return (
    <div className="rounded-xl border border-zinc-700/50 bg-zinc-900/60 overflow-hidden">
      {query.isPending ? <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-emerald-500" /></div> : (
        <>
          <DataTable headers={["Job", "Company", "Type", "Status", "Applications", "Action"]} empty={jobs.length === 0}>
            {jobs.map((j: any) => (
              <tr key={j.id} className="hover:bg-zinc-800/40 transition">
                <td className="px-4 py-3">
                  <div className="font-semibold text-white">{j.title}</div>
                  <div className="text-zinc-500">{j.location}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {cleanLogoUrl(j.company?.logoUrl) && (
                      <img src={cleanLogoUrl(j.company.logoUrl)!} alt="" className="h-5 w-5 rounded object-contain" />
                    )}
                    <span className="text-zinc-300">{j.company?.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-500">{j.type} · {j.workMode}</td>
                <td className="px-4 py-3"><StatusBadge status={j.status} /></td>
                <td className="px-4 py-3 text-center text-zinc-300">{j._count?.applications ?? 0}</td>
                <td className="px-4 py-3">
                  {confirmDelete === j.id ? (
                    <div className="flex gap-1">
                      <button
                        className="rounded px-2 py-1 text-[10px] font-bold bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition"
                        onClick={async () => { await deleteJob.mutateAsync(j.id); setConfirmDelete(null); }}
                        disabled={deleteJob.isPending}
                      >
                        {deleteJob.isPending ? <Loader2 size={10} className="animate-spin" /> : "Confirm"}
                      </button>
                      <button className="rounded px-2 py-1 text-[10px] text-zinc-500 hover:text-zinc-200" onClick={() => setConfirmDelete(null)}>Cancel</button>
                    </div>
                  ) : (
                    <button
                      className="flex items-center gap-1 rounded-lg border border-rose-700/40 px-2.5 py-1.5 text-[10px] font-bold text-rose-400 hover:bg-rose-500/10 transition"
                      onClick={() => setConfirmDelete(j.id)}
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
