import { PlacementDrivesTab } from "./PlacementDrivesTab";

export interface JobsCampusTabProps {
  collegeId?: string;
}

export function JobsCampusTab({ collegeId }: JobsCampusTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Campus Placement Drives</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Exclusive placement drives targeted at your college
          </p>
        </div>
      </div>
      <PlacementDrivesTab collegeId={collegeId} />
    </div>
  );
}
