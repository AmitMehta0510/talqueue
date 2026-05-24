import { FormEvent, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { compactPayload, splitCsv } from "../../lib/format";

export function CreateProjectForm({
  onCreate,
  disabled,
}: {
  onCreate: (payload: {
    title: string;
    description: string;
    shortDescription?: string;
    githubUrl?: string;
    liveUrl?: string;
    videoDemoUrl?: string;
    techStack?: string[];
    deploymentStatus?: string;
    visibility: "PUBLIC" | "PRIVATE";
    lookingFor?: string;
  }) => Promise<boolean>;
  disabled: boolean;
}) {
  const [form, setForm] = useState({
    title: "",
    shortDescription: "",
    description: "",
    githubUrl: "",
    liveUrl: "",
    videoDemoUrl: "",
    techStack: "",
    deploymentStatus: "DEVELOPMENT",
    visibility: "PUBLIC" as "PUBLIC" | "PRIVATE",
    lookingFor: "",
  });
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    const created = await onCreate({
      title: form.title,
      description: form.description,
      visibility: form.visibility,
      ...compactPayload({
        shortDescription: form.shortDescription,
        githubUrl: form.githubUrl,
        liveUrl: form.liveUrl,
        videoDemoUrl: form.videoDemoUrl,
        deploymentStatus: form.deploymentStatus,
        lookingFor: form.lookingFor,
      }),
      techStack: splitCsv(form.techStack),
    });

    if (created) {
      setForm({
        title: "",
        shortDescription: "",
        description: "",
        githubUrl: "",
        liveUrl: "",
        videoDemoUrl: "",
        techStack: "",
        deploymentStatus: "DEVELOPMENT",
        visibility: "PUBLIC",
        lookingFor: "",
      });
    }

    setLoading(false);
  };

  return (
    <form className="panel p-5" onSubmit={submit}>
      <div className="grid gap-3 md:grid-cols-2">
        <input
          className="field"
          value={form.title}
          onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          placeholder={disabled ? "Login to create a project" : "Project title"}
          minLength={3}
          disabled={disabled}
          required
        />
        <input
          className="field"
          value={form.lookingFor}
          onChange={(event) =>
            setForm((current) => ({ ...current, lookingFor: event.target.value }))
          }
          placeholder="Looking for"
          disabled={disabled}
        />
      </div>
      <input
        className="field mt-3"
        value={form.shortDescription}
        onChange={(event) =>
          setForm((current) => ({ ...current, shortDescription: event.target.value }))
        }
        placeholder="Short description"
        disabled={disabled}
      />
      <textarea
        className="field mt-3 min-h-24"
        value={form.description}
        onChange={(event) =>
          setForm((current) => ({ ...current, description: event.target.value }))
        }
        placeholder="Project description"
        minLength={10}
        disabled={disabled}
        required
      />
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <input
          className="field"
          value={form.githubUrl}
          onChange={(event) =>
            setForm((current) => ({ ...current, githubUrl: event.target.value }))
          }
          placeholder="GitHub URL"
          disabled={disabled}
        />
        <input
          className="field"
          value={form.liveUrl}
          onChange={(event) =>
            setForm((current) => ({ ...current, liveUrl: event.target.value }))
          }
          placeholder="Live URL"
          disabled={disabled}
        />
        <input
          className="field"
          value={form.videoDemoUrl}
          onChange={(event) =>
            setForm((current) => ({ ...current, videoDemoUrl: event.target.value }))
          }
          placeholder="Video demo URL"
          disabled={disabled}
        />
      </div>
      <input
        className="field mt-3"
        value={form.techStack}
        onChange={(event) =>
          setForm((current) => ({ ...current, techStack: event.target.value }))
        }
        placeholder="Tech stack: react, node, postgres"
        disabled={disabled}
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <select
          className="field max-w-48"
          value={form.visibility}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              visibility: event.target.value as "PUBLIC" | "PRIVATE",
            }))
          }
          disabled={disabled}
        >
          <option value="PUBLIC">Public</option>
          <option value="PRIVATE">Private</option>
        </select>
        <select
          className="field max-w-48"
          value={form.deploymentStatus}
          onChange={(event) =>
            setForm((current) => ({ ...current, deploymentStatus: event.target.value }))
          }
          disabled={disabled}
        >
          <option value="DEVELOPMENT">Development</option>
          <option value="LIVE">Live</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <button className="btn-primary" type="submit" disabled={disabled || loading}>
          {loading ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
          Create
        </button>
      </div>
    </form>
  );
}
