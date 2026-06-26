import { Request, Response } from "express";
import asyncHandler from "shared/utils/asyncHandler";
import { successResponse } from "shared/utils/apiResponse";
import AppError from "shared/errors/AppError";
import elasticClient from "services/elasticClient";

/**
 * POST /api/v1/forum/search
 * 
 * Request body (all fields optional):
 * {
 *   query?:       string,       // fuzzy text match on content
 *   tags?:        string[],     // exact term match on tags (keyword)
 *   category?:    string,       // bypassed/ignored per schema mappings
 *   communityId?: string,       // exact term match on communityId (keyword)
 *   size?:        number,       // page size, default 20
 *   from?:        number,       // offset, default 0
 * }
 */
export const searchForumPostsHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const body = req.body ?? {};

    // Validate tags is an array of strings if provided
    if (body.tags !== undefined && !Array.isArray(body.tags)) {
      throw new AppError("'tags' must be an array of strings.", 400);
    }

    const size = body.size !== undefined ? Number(body.size) : 20;
    const from = body.from !== undefined ? Number(body.from) : 0;

    const mustClauses: any[] = [];
    const filterClauses: any[] = [];

    // 1. Free-text fuzzy search on title and content
    if (body.query && typeof body.query === "string" && body.query.trim()) {
      mustClauses.push({
        multi_match: {
          query: body.query.trim(),
          fields: ["title^3", "content^1"],
          fuzziness: "AUTO",
        },
      });
    }

    // 2. Exact keyword filter on tags (lowercased to match insertion format)
    if (body.tags && Array.isArray(body.tags) && body.tags.length > 0) {
      const lowercasedTags = body.tags
        .map((tag: any) => String(tag).trim().toLowerCase())
        .filter(Boolean);

      if (lowercasedTags.length > 0) {
        filterClauses.push({
          terms: {
            tags: lowercasedTags,
          },
        });
      }
    }

    // 3. Exact keyword filter on communityId
    if (body.communityId && typeof body.communityId === "string" && body.communityId.trim()) {
      filterClauses.push({
        term: {
          communityId: body.communityId.trim(),
        },
      });
    }

    // Note: category parameter is accepted but ignored/bypassed in the ES query
    // because it was omitted from the index schema mapping.

    // If no clauses are specified, query matches all documents
    const boolQuery: any = {};
    if (mustClauses.length > 0) {
      boolQuery.must = mustClauses;
    }
    if (filterClauses.length > 0) {
      boolQuery.filter = filterClauses;
    }

    const esQuery =
      mustClauses.length === 0 && filterClauses.length === 0
        ? { match_all: {} }
        : { bool: boolQuery };

    try {
      const response = await elasticClient.search({
        index: "forum_posts",
        from,
        size,
        query: esQuery,
        sort: [
          { createdAt: { order: "desc" } }
        ],
        _source: true,
      });

      const hits = response.hits?.hits ?? [];
      const total =
        typeof response.hits?.total === "number"
          ? response.hits.total
          : (response.hits?.total as any)?.value ?? 0;

      const posts = hits.map((hit: any) => ({
        id: hit._id as string,
        score: hit._score ?? 0,
        ...(hit._source as any),
      }));

      res.json(
        successResponse({ total, posts }, `Found ${total} post(s).`)
      );
    } catch (esErr: any) {
      console.error("[Forum Search] Elasticsearch search failed:", esErr?.message || esErr);
      throw new AppError("Failed to search forum posts index.", 500);
    }
  }
);
