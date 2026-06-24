import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Send } from "lucide-react";
import { titleCase } from "../../lib/format";

const postTypes = [
  "GENERAL",
  "PROJECT_UPDATE",
  "EVENT",
  "HACKATHON",
  "ACHIEVEMENT",
] as const;

const visibilityOptions = [
  "PUBLIC",
  "CONNECTIONS",
  "COLLEGE_ONLY",
  "TEAM_ONLY",
] as const;

const composeSchema = z.object({
  content: z
    .string()
    .min(1, "Post content cannot be empty")
    .max(3000, "Post cannot exceed 3,000 characters"),
  type: z.enum(postTypes),
  visibility: z.enum(visibilityOptions),
  tags: z.string().max(200, "Tags string too long").optional(),
});

type ComposeFormValues = z.infer<typeof composeSchema>;

export function ComposePost({
  onCreate,
  disabled,
  initialType,
}: {
  onCreate: (payload: {
    content: string;
    type: string;
    tags?: string[];
    visibility?: string;
  }) => Promise<boolean>;
  disabled: boolean;
  initialType?: string;
}) {
  const resolvedInitialType =
    initialType && (postTypes as readonly string[]).includes(initialType)
      ? (initialType as (typeof postTypes)[number])
      : "GENERAL";

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ComposeFormValues>({
    resolver: zodResolver(composeSchema),
    defaultValues: {
      content: "",
      type: resolvedInitialType,
      visibility: "PUBLIC",
      tags: "",
    },
  });

  const isBusy = disabled || isSubmitting;

  const onSubmit = async (values: ComposeFormValues) => {
    const created = await onCreate({
      content: values.content.trim(),
      type: values.type,
      visibility: values.visibility,
      tags: values.tags
        ? values.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
    });

    if (created) {
      reset();
    }
  };

  return (
    <form className="panel p-5" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="flex gap-3">
        <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-light text-brand border border-brand-light/30">
          <Send size={18} />
        </div>
        <div className="flex-1">
          <textarea
            {...register("content")}
            className={`field min-h-28 resize-y w-full ${errors.content ? "border-rose-400 focus:ring-rose-400/30" : ""}`}
            placeholder={isBusy ? "Login to post" : "Share an engineering update"}
            disabled={isBusy}
            aria-invalid={Boolean(errors.content)}
            aria-describedby={errors.content ? "compose-content-error" : undefined}
          />
          {errors.content && (
            <p id="compose-content-error" className="mt-1 text-[11px] text-rose-500 font-medium">
              {errors.content.message}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[0.8fr_0.8fr_1fr_auto]">
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <select {...field} className="field" disabled={isBusy}>
              {postTypes.map((postType) => (
                <option key={postType} value={postType}>
                  {titleCase(postType)}
                </option>
              ))}
            </select>
          )}
        />

        <Controller
          name="visibility"
          control={control}
          render={({ field }) => (
            <select {...field} className="field" disabled={isBusy}>
              {visibilityOptions.map((option) => (
                <option key={option} value={option}>
                  {titleCase(option)}
                </option>
              ))}
            </select>
          )}
        />

        <input
          {...register("tags")}
          className="field"
          placeholder="react, ai, systems"
          disabled={isBusy}
        />

        <button className="btn-primary" type="submit" disabled={isBusy}>
          {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
          Post
        </button>
      </div>
    </form>
  );
}
