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
        <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Referral Monitoring</h2>
        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
          <Eye size={12} />
          Read-only monitoring view
        </div>
      </div>
      <SearchBar value={q} onChange={setQ} placeholder="Search by company or role..." />

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
        {query.isPending ? (
          <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-indigo-500" /></div>
        ) : (
          <>
            <DataTable
              headers={["Requester", "Referrer", "Company", "Role", "Status", "Date"]}
              empty={referrals.length === 0}
            >
              {referrals.map((r: any) => (
                <tr key={r.id} className="transition hover:bg-[var(--bg-surface-2)]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar user={r.requester} size="sm" />
                      <div>
                        <div className="font-semibold" style={{ color: "var(--text-primary)" }}>{r.requester?.profile?.fullName || r.requester?.username}</div>
                        <div style={{ color: "var(--text-muted)" }}>@{r.requester?.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {r.referrer ? (
                      <div className="flex items-center gap-2">
                        <Avatar user={r.referrer} size="sm" />
                        <span style={{ color: "var(--text-secondary)" }}>@{r.referrer?.username}</span>
                      </div>
                    ) : <span style={{ color: "var(--text-muted)" }}>—</span>}
                  </td>
                  <td className="px-4 py-3 font-semibold" style={{ color: "var(--text-primary)" }}>{r.companyName}</td>
                  <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{r.jobRole || "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--text-muted)" }}>{fmtRelative(r.createdAt)}</td>
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
