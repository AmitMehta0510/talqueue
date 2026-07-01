import type { ATSAdapter, ATSSource } from "../interfaces/ATSAdapter";

/**
 * ATSAdapterRegistry — Plugin registry for ATS adapters.
 *
 * Maps ATSSource identifiers to their adapter implementations.
 * Adding a new ATS provider requires only:
 *   1. Creating a new class implementing ATSAdapter
 *   2. Calling registry.register(new MyNewAdapter())
 *
 * Zero changes to the pipeline orchestrator or any other module.
 */
export class ATSAdapterRegistry {
  private readonly adapters = new Map<ATSSource, ATSAdapter>();

  /**
   * Register an ATS adapter. Overwrites any existing adapter for the same source.
   */
  register(adapter: ATSAdapter): this {
    this.adapters.set(adapter.source, adapter);
    return this;
  }

  /**
   * Retrieve the adapter for a given ATS source.
   * @throws If no adapter is registered for the source.
   */
  get(source: ATSSource): ATSAdapter {
    const adapter = this.adapters.get(source);
    if (!adapter) {
      throw new Error(
        `[ATSAdapterRegistry] No adapter registered for source: "${source}". ` +
          `Registered sources: ${[...this.adapters.keys()].join(", ")}`,
      );
    }
    return adapter;
  }

  /**
   * Check whether an adapter is registered for a given source.
   */
  has(source: string): source is ATSSource {
    return this.adapters.has(source as ATSSource);
  }

  /**
   * List all registered ATS sources.
   */
  registeredSources(): ATSSource[] {
    return [...this.adapters.keys()];
  }
}
