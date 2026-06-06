import { describe, test, expect } from "vitest";
import {
  calculateCosineSimilarity,
  calculateComplementarity,
  matchLookingForSkills,
} from "./recommendation-engine.service";

describe("Recommendation Engine Matching Service", () => {
  describe("Cosine Similarity", () => {
    test("should compute perfect match for identical skill arrays", () => {
      expect(
        calculateCosineSimilarity(["React", "Node.js"], ["React", "Node.js"])
      ).toBeCloseTo(1, 4);
    });

    test("should return 0 similarity for completely disjoint arrays", () => {
      expect(
        calculateCosineSimilarity(["React", "Next.js"], ["Python", "Django"])
      ).toBe(0);
    });

    test("should compute correct fractional similarity for partial overlap", () => {
      expect(
        calculateCosineSimilarity(["React", "Node.js"], ["Node.js", "PostgreSQL"])
      ).toBeCloseTo(0.5, 4);
    });
  });

  describe("Skill Complementarity", () => {
    test("should return 0 complementarity for engineers in the same domain", () => {
      expect(
        calculateComplementarity(["React", "CSS"], ["React", "HTML"])
      ).toBe(0);
    });

    test("should return correct ratio for engineers across complementary domains", () => {
      expect(
        calculateComplementarity(["React", "CSS"], ["Node.js", "PostgreSQL"])
      ).toBeCloseTo(0.3333, 2);
    });
  });

  describe("lookingFor Text Matching", () => {
    test("should match keyword skills present in vacancy text descriptions", () => {
      expect(
        matchLookingForSkills(
          ["React Native", "Flutter", "Kotlin"],
          "We are looking for a mobile engineer with React Native experience"
        )
      ).toBe(1);
    });

    test("should return 0 matches when none of the skills are present", () => {
      expect(
        matchLookingForSkills(
          ["React Native", "Flutter", "Kotlin"],
          "We want a Backend Engineer with Go and SQL"
        )
      ).toBe(0);
    });
  });
});
