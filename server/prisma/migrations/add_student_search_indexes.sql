-- CREATE INDEXES CONCURRENTLY TO SECURE PERFORMANCE UNDER 100K+ STUDENT LOAD
-- Note: CONCURRENTLY is used to prevent locking writes on active production systems.

CREATE INDEX CONCURRENTLY IF NOT EXISTS education_college_cgpa_year_idx 
ON "Education" ("collegeId", "cgpa", "currentYear");

CREATE INDEX CONCURRENTLY IF NOT EXISTS education_college_alumni_idx 
ON "Education" ("collegeId", "isAlumni", "alumniVerified");

CREATE INDEX CONCURRENTLY IF NOT EXISTS placement_drive_app_user_status_idx 
ON "PlacementDriveApplication" ("userId", "status");
