import { FormEvent, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { titleCase } from "../../lib/format";

const postTypes = [
  "GENERAL",
  "PROJECT_UPDATE",
  "EVENT",
  "HACKATHON",
  "ACHIEVEMENT",
];

export function ComposePost({
  onCreate,
  disabled,
}: {
  onCreate: (payload: { content: string; type: string; tags?: string[] }) => Promise<boolean>;
  disabled: boolean;
}) {
  const [content, setContent] = useState("");
  const [type, setType] = useState(postTypes[0]);
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    const created = await onCreate({
      content: content.trim(),
      type,
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    });

    if (created) {
      setContent("");
      setTags("");
    }

    setLoading(false);
  };

  return (
    <form className="panel p-5" onSubmit={submit}>
      <div className="flex gap-3">
        <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
          <Send size={18} />
        </div>
        <textarea
          className="field min-h-28 resize-y"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder={disabled ? "Login to post" : "Share an engineering update"}
          disabled={disabled}
          required
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[0.8fr_1fr_auto]">
        <select
          className="field"
          value={type}
          onChange={(event) => setType(event.target.value)}
          disabled={disabled}
        >
          {postTypes.map((postType) => (
            <option key={postType} value={postType}>
              {titleCase(postType)}
            </option>
          ))}
        </select>
        <input
          className="field"
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          placeholder="react, ai, systems"
          disabled={disabled}
        />
        <button className="btn-primary" type="submit" disabled={disabled || loading}>
          {loading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
          Post
        </button>
      </div>
    </form>
  );
}
