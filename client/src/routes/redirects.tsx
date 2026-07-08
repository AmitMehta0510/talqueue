/**
 * Legacy URL redirect stub components.
 *
 * Each one maps an old flat route shape to the new nested workspace route.
 * Extracted from App.tsx to reduce its line count and make the redirect
 * inventory easy to find and audit in one place.
 */
import { Navigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import { useWorkspace } from "../hooks/useWorkspace";

export const ProjectRedirect = () => {
  const { projectSlug } = useParams();
  return <Navigate to={`/campus/projects/${projectSlug || ""}`} replace />;
};

export const CollegeRedirect = () => {
  const { collegeSlug } = useParams();
  return <Navigate to={`/campus/colleges/${collegeSlug || ""}`} replace />;
};

export const CollegeBatchRedirect = () => {
  const { collegeSlug, graduationYear } = useParams();
  return <Navigate to={`/campus/colleges/${collegeSlug || ""}/batch/${graduationYear || ""}`} replace />;
};

export const CommunityRedirect = () => {
  const { communitySlug } = useParams();
  return <Navigate to={`/campus/communities/${communitySlug || ""}`} replace />;
};

export const TeamRedirect = () => {
  const { teamId } = useParams();
  return <Navigate to={`/campus/teams/${teamId || ""}`} replace />;
};

export const HackathonRedirect = () => {
  const { hackathonSlug } = useParams();
  return <Navigate to={`/campus/hackathons/${hackathonSlug || ""}`} replace />;
};

export const CompanyRedirect = () => {
  const { companySlug } = useParams();
  return <Navigate to={`/career/companies/${companySlug || ""}`} replace />;
};

export const CompanyAdminRedirect = () => {
  const { companySlug } = useParams();
  return <Navigate to={`/career/companies/${companySlug || ""}/admin`} replace />;
};

export const RecruiterDriveRedirect = () => {
  const { driveId } = useParams();
  return <Navigate to={`/career/recruiter/drive/${driveId || ""}`} replace />;
};

export const ProfileRedirect = () => {
  const { activeWorkspace } = useWorkspace();
  return <Navigate to={activeWorkspace === "CAMPUS" ? "/campus/profile" : "/career/profile"} replace />;
};
