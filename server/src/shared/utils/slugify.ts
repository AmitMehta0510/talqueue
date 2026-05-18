import slugify from "slugify";

export const generateSlug =
  (
    value: string
  ) => {

    return slugify(value, {

      lower: true,

      strict: true,

      trim: true,
    });
  };