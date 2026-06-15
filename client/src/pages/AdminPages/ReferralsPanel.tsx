import { useState } from "react";
import { Eye, Loader2 } from "lucide-react";
import { useAdminReferralsQuery } from "../../hooks/usePlatformQueries";
import { SearchBar, DataTable, StatusBadge, LoadMoreBtn, fmtRelative } from "./shared";
import { Avatar } from "../../components/ui";

export function ReferralsPanel() {
  const [q, setQ] = useState("");
  const query = useAdminReferralsQuery(q);

  const referrals = query.data?.pages.flatMap((p) => p?.referrals ?? []) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-wider text-zinc-400">Referral Monitoring</h2>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Eye size={12} />
          Read-only monitoring view
        </div>
      </div>
      <SearchBar value={q} onChange={setQ} placeholder="Search by company or role..." />

      <div className="rounded-xl border border-zinc-700/50 bg-zinc-900/60 overflow-hidden">
        {query.isPending ? (
          <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-emerald-500" /></div>
        ) : (
          <>
            <DataTable
              headers={["Requester", "Referrer", "Company", "Role", "Status", "Date"]}
              empty={referrals.length === 0}
            >
              {referrals.map((r: any) => (
                <tr key={r.id} className="hover:bg-zinc-800/40 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar user={r.requester} size="sm" />
                      <div>
                        <div className="font-semibold text-white">{r.requester?.profile?.fullName || r.requester?.username}</div>
                        <div className="text-zinc-500">@{r.requester?.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {r.referrer ? (
                      <div className="flex items-center gap-2">
                        <Avatar user={r.referrer} size="sm" />
                        <span className="text-zinc-300">@{r.referrer?.username}</span>
                      </div>
                    ) : <span className="text-zinc-600">—</span>}
                  </td>
                  <td className="px-4 py-3 font-semibold text-white">{r.companyName}</td>
                  <td className="px-4 py-3 text-zinc-400">{r.jobRole || "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">{fmtRelative(r.createdAt)}</td>
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
