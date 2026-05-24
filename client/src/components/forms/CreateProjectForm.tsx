import { FormEvent, useState } from "react";
import { Loader2, Plus } from "lucide-react";

export function CreateProjectForm({
  onCreate,
  disabled,
}: {
  onCreate: (payload: {
    title: string;
    description: string;
    visibility: "PUBLIC" | "PRIVATE";
    lookingFor?: string;
  }) => Promise<boolean>;
  disabled: boolean;
}) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    visibility: "PUBLIC" as "PUBLIC" | "PRIVATE",
    lookingFor: "",
  });
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    const created = await onCreate(form);

    if (created) {
      setForm({ title: "", description: "", visibility: "PUBLIC", lookingFor: "" });
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
        <button className="btn-primary" type="submit" disabled={disabled || loading}>
          {loading ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
          Create
        </button>
      </div>
    </form>
  );
}
