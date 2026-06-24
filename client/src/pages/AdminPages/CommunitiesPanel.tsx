import { useState } from "react";
import { Hash, BadgeCheck, Archive, CheckCircle, Loader2 } from "lucide-react";
import { useAdminCommunitiesQuery, useAdminUpdateCommunityMutation } from "../../hooks/usePlatformQueries";
import { SearchBar, DataTable, StatusBadge, LoadMoreBtn } from "./shared";
import { Avatar } from "../../components/ui";

export function CommunitiesPanel() {
  const [q, setQ] = useState("");
  const query = useAdminCommunitiesQuery(q);
  const updateCommunity = useAdminUpdateCommunityMutation();

  const communities = query.data?.pages.flatMap((p) => p?.communities ?? []) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Community Management</h2>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{communities.length} loaded</span>
      </div>
      <SearchBar value={q} onChange={setQ} placeholder="Search communities..." />

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
        {query.isPending ? (
          <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-emerald-500" /></div>
        ) : (
          <>
            <DataTable
              headers={["Community", "Type", "Members", "Verified", "Status", "Actions"]}
              empty={communities.length === 0}
            >
              {communities.map((c: any) => (
                <tr key={c.id} className="transition hover:bg-[var(--bg-surface-2)]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {c.avatarUrl ? (
                        <img src={c.avatarUrl} alt={c.name} className="h-7 w-7 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border border-emerald-600/20">
                          <Hash size={12} className="text-emerald-500 dark:text-emerald-400" />
                        </div>
                      )}
                      <div>
                        <div className="font-semibold" style={{ color: "var(--text-primary)" }}>{c.name}</div>
                        <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                          {c.college?.name || c.company?.name || c.category}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--text-muted)" }}>{c.type}</td>
                  <td className="px-4 py-3 text-center" style={{ color: "var(--text-secondary)" }}>{c.memberCount || c._count?.members || 0}</td>
                  <td className="px-4 py-3">
                    {c.verified ? (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold"><BadgeCheck size={11} /> Verified</span>
                    ) : (
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Unverified</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.archived ? "ARCHIVED" : "ACTIVE"} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {!c.verified && (
                        <button
                          className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-700/30 hover:bg-emerald-500/20 transition"
                          onClick={() => updateCommunity.mutateAsync({ communityId: c.id, verified: true })}
                        >
                          <BadgeCheck size={9} /> Verify
                        </button>
                      )}
                      {!c.archived ? (
                        <button
                          className="btn-secondary text-[10px] px-2 py-1"
                          onClick={() => updateCommunity.mutateAsync({ communityId: c.id, archived: true })}
                        >
                          <Archive size={9} /> Archive
                        </button>
                      ) : (
                        <button
                          className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-700/30 hover:bg-emerald-500/20 transition"
                          onClick={() => updateCommunity.mutateAsync({ communityId: c.id, archived: false })}
                        >
                          <CheckCircle size={9} /> Restore
                        </button>
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
    </div>
  );
}
