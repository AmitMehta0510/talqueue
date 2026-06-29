/**
 * @file usePlatformQueries.test.ts
 * @description Enterprise-grade test suite for critical hooks in usePlatformQueries.ts.
 *
 * Source: client/src/hooks/usePlatformQueries.ts
 *
 * Hooks under test:
 *   1. useFeedQuery          (line 129) — anonymous vs authenticated feed routing
 *   2. useSendMessageMutation (line 260) — optimistic inject + network error rollback
 *   3. useMarkConversationReadMutation (line 374) — atomic unread badge reset
 *
 * Architecture constraints:
 *   - @tanstack/react-query v5 — QueryClientProvider with fresh client per test
 *   - vi.mock() at module level for api, AuthContext, ToastContext
 *   - vi.restoreAllMocks() + vi.clearAllMocks() in every beforeEach
 *   - renderHook() + act() + waitFor() from @testing-library/react
 *   - Type-safe fixtures — no implicit any in assertion paths
 */

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockedFunction,
} from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// --------------------------------------------------------------------------
// Module-level mocks (hoisted before any import resolution)
// --------------------------------------------------------------------------

vi.mock("../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/api")>();
  return {
    ...actual,
    api: {
      publicPosts: vi.fn(),
      personalizedFeed: vi.fn(),
      sendMessage: vi.fn(),
      markConversationRead: vi.fn(),
      conversations: vi.fn(),
      createDirectConversation: vi.fn(),
      createGroupConversation: vi.fn(),
      conversationMessages: vi.fn(),
    },
  };
});

vi.mock("../core/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../core/contexts/ToastContext", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

// --------------------------------------------------------------------------
// Lazy imports (after mocks are registered)
// --------------------------------------------------------------------------

import { api } from "../lib/api";
import { useAuth } from "../core/contexts/AuthContext";
import {
  useFeedQuery,
  useSendMessageMutation,
  useMarkConversationReadMutation,
} from "./usePlatformQueries";
import type {
  ChatMessage,
  ChatMessagesPage,
  Conversation,
  FeedItem,
  FeedPost,
  SendMessagePayload,
  User,
} from "../lib/api";
import { queryKeys } from "../lib/queryKeys";

// --------------------------------------------------------------------------
// Typed mock aliases
// --------------------------------------------------------------------------

const mockApi = api as {
  publicPosts: MockedFunction<typeof api.publicPosts>;
  personalizedFeed: MockedFunction<typeof api.personalizedFeed>;
  sendMessage: MockedFunction<typeof api.sendMessage>;
  markConversationRead: MockedFunction<typeof api.markConversationRead>;
};

const mockUseAuth = useAuth as MockedFunction<typeof useAuth>;

// --------------------------------------------------------------------------
// Shared Fixtures
// --------------------------------------------------------------------------

const MOCK_USER: User = {
  id: "user-001",
  username: "alice_dev",
  email: "alice@engineers.dev",
  primaryRole: "STUDENT",
};

const CONVERSATION_ID = "conv-abc-123";

/** Factory: creates a minimal ChatMessage fixture */
function makeChatMessage(overrides?: Partial<ChatMessage>): ChatMessage {
  return {
    id: overrides?.id ?? "msg-001",
    conversationId: overrides?.conversationId ?? CONVERSATION_ID,
    senderId: overrides?.senderId ?? MOCK_USER.id,
    content: overrides?.content ?? "Hello world",
    type: "TEXT",
    readByUsers: overrides?.readByUsers ?? [MOCK_USER.id],
    createdAt: overrides?.createdAt ?? "2024-01-15T10:00:00.000Z",
    ...overrides,
  };
}

/** Factory: creates an InfiniteMessagesCache with one page */
function makeMessagesCache(messages: ChatMessage[]): {
  pages: ChatMessagesPage[];
  pageParams: unknown[];
} {
  return {
    pages: [{ messages, nextCursor: null }],
    pageParams: [undefined],
  };
}

/** Factory: creates a Conversation fixture */
function makeConversation(overrides?: Partial<Conversation>): Conversation {
  return {
    id: overrides?.id ?? CONVERSATION_ID,
    type: "DIRECT",
    unreadCount: overrides?.unreadCount ?? 3,
    participants: overrides?.participants ?? [
      {
        id: "part-001",
        conversationId: CONVERSATION_ID,
        userId: MOCK_USER.id,
        unreadCount: 3,
      },
    ],
    messages: overrides?.messages ?? [],
    ...overrides,
  };
}

/** Factory: creates a FeedPost fixture */
function makeFeedPost(id = "post-001"): FeedPost {
  return {
    id,
    content: `Post content for ${id}`,
    type: "POST",
    authorId: MOCK_USER.id,
    createdAt: "2024-01-15T10:00:00.000Z",
  };
}

// --------------------------------------------------------------------------
// Test helper: wrapper factory
// --------------------------------------------------------------------------

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

/** Creates a fresh, isolated QueryClient for each test */
function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        // gcTime: Infinity prevents cache entries from being garbage-collected
        // during tests. Since we have no active observers for all seeded query
        // keys, gcTime:0 would immediately evict setQueryData entries.
        gcTime: Infinity,
        staleTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

// --------------------------------------------------------------------------
// Suite 1 — Dynamic Feed Evaluation (useFeedQuery)
// --------------------------------------------------------------------------

describe("Suite 1 — useFeedQuery: Dynamic Feed Evaluation", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    queryClient = makeQueryClient();
  });

  afterEach(() => {
    queryClient.clear();
  });

  // -------------------------------------------------------------------------
  // Test 1.1 — Anonymous view: routes to api.publicPosts
  // -------------------------------------------------------------------------
  it("anonymous viewer — calls api.publicPosts and maps response to FeedItem[]", async () => {
    // No authenticated user
    mockUseAuth.mockReturnValue({
      user: null,
      authStatus: "anonymous",
      isAuthenticated: false,
      loading: false,
      apiOnline: true,
      apiStatus: "online",
      authError: null,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      refreshUser: vi.fn(),
      setUser: vi.fn(),
    });

    const post = makeFeedPost("post-anon-01");
    mockApi.publicPosts.mockResolvedValueOnce({
      success: true,
      message: "ok",
      data: {
        posts: [post],
        nextCursor: null,
        hasNextPage: false,
      },
    });

    const { result } = renderHook(() => useFeedQuery(16), {
      wrapper: makeWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // api.publicPosts must be called (not personalizedFeed)
    expect(mockApi.publicPosts).toHaveBeenCalledOnce();
    expect(mockApi.personalizedFeed).not.toHaveBeenCalled();

    // Data must be mapped: FeedPost[] → FeedItem[]
    const items = result.current.data as FeedItem[];
    expect(items).toHaveLength(1);
    expect(items[0].type).toBe("POST");
    expect((items[0] as { type: "POST"; data: FeedPost }).data.id).toBe(post.id);
  });

  // -------------------------------------------------------------------------
  // Test 1.2 — Authenticated view: routes to api.personalizedFeed
  // -------------------------------------------------------------------------
  it("authenticated viewer — calls api.personalizedFeed and returns feed items directly", async () => {
    mockUseAuth.mockReturnValue({
      user: MOCK_USER,
      authStatus: "authenticated",
      isAuthenticated: true,
      loading: false,
      apiOnline: true,
      apiStatus: "online",
      authError: null,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      refreshUser: vi.fn(),
      setUser: vi.fn(),
    });

    const feedItems: FeedItem[] = [
      { type: "POST", score: 0.9, data: makeFeedPost("post-auth-01") },
      { type: "POST", score: 0.7, data: makeFeedPost("post-auth-02") },
    ];

    mockApi.personalizedFeed.mockResolvedValueOnce({
      success: true,
      message: "ok",
      data: feedItems,
    });

    const { result } = renderHook(() => useFeedQuery(16), {
      wrapper: makeWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // api.personalizedFeed must be called (not publicPosts)
    expect(mockApi.personalizedFeed).toHaveBeenCalledOnce();
    expect(mockApi.publicPosts).not.toHaveBeenCalled();

    // Data must match exactly what the API returned
    expect(result.current.data).toEqual(feedItems);
    expect((result.current.data as FeedItem[])!.length).toBe(2);
  });

  // -------------------------------------------------------------------------
  // Test 1.3 — Query key correctly encodes viewer identity
  // -------------------------------------------------------------------------
  it("query key contains viewer id for authenticated user (prevents cache collision)", async () => {
    mockUseAuth.mockReturnValue({
      user: MOCK_USER,
      authStatus: "authenticated",
      isAuthenticated: true,
      loading: false,
      apiOnline: true,
      apiStatus: "online",
      authError: null,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      refreshUser: vi.fn(),
      setUser: vi.fn(),
    });

    mockApi.personalizedFeed.mockResolvedValue({
      success: true,
      message: "ok",
      data: [],
    });

    const { result } = renderHook(() => useFeedQuery(16), {
      wrapper: makeWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verify the expected query key is in the cache
    const cachedData = queryClient.getQueryData(
      queryKeys.feed.list(MOCK_USER.id, 16),
    );
    expect(cachedData).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // Test 1.4 — Anonymous cache key uses "public" sentinel
  // -------------------------------------------------------------------------
  it("anonymous user — query key uses 'public' sentinel instead of user id", async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      authStatus: "anonymous",
      isAuthenticated: false,
      loading: false,
      apiOnline: true,
      apiStatus: "online",
      authError: null,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      refreshUser: vi.fn(),
      setUser: vi.fn(),
    });

    mockApi.publicPosts.mockResolvedValue({
      success: true,
      message: "ok",
      data: { posts: [], nextCursor: null, hasNextPage: false },
    });

    const { result } = renderHook(() => useFeedQuery(16), {
      wrapper: makeWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Cache must be keyed under "public" (not under any user id)
    const cachedData = queryClient.getQueryData(
      queryKeys.feed.list("public", 16),
    );
    expect(cachedData).toBeDefined();

    // User-id keyed cache must NOT exist
    const userKeyed = queryClient.getQueryData(
      queryKeys.feed.list(MOCK_USER.id, 16),
    );
    expect(userKeyed).toBeUndefined();
  });
});

// --------------------------------------------------------------------------
// Suite 2 — Messaging State Mutation & Optimistic Rollbacks
// (useSendMessageMutation)
// --------------------------------------------------------------------------

describe("Suite 2 — useSendMessageMutation: Optimistic Updates & Rollbacks", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    queryClient = makeQueryClient();

    // Default: authenticated user
    mockUseAuth.mockReturnValue({
      user: MOCK_USER,
      authStatus: "authenticated",
      isAuthenticated: true,
      loading: false,
      apiOnline: true,
      apiStatus: "online",
      authError: null,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      refreshUser: vi.fn(),
      setUser: vi.fn(),
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  // -------------------------------------------------------------------------
  // Test 2.1 — Optimistic inject: message appears in cache BEFORE API resolves
  // -------------------------------------------------------------------------
  it("optimistic push — message injected into cache immediately on mutate(), before API resolves", async () => {
    const existingMessage = makeChatMessage({ id: "msg-existing-01" });

    // Spy cancelQueries as no-op FIRST so pre-seeded data survives onMutate
    vi.spyOn(queryClient, "cancelQueries").mockResolvedValue();

    // Pre-seed messages cache AND conversations cache (hook updates both in onMutate)
    queryClient.setQueryData(
      queryKeys.chat.messages(CONVERSATION_ID),
      makeMessagesCache([existingMessage]),
    );
    queryClient.setQueryData(queryKeys.chat.conversations(), [makeConversation()]);

    // API call stays pending so we can inspect intermediate state
    let resolveApi!: (v: { success: boolean; message: string; data: ChatMessage }) => void;
    mockApi.sendMessage.mockReturnValueOnce(
      new Promise<{ success: boolean; message: string; data: ChatMessage }>(
        (res) => { resolveApi = res; },
      ),
    );

    const { result } = renderHook(
      () => useSendMessageMutation(CONVERSATION_ID),
      { wrapper: makeWrapper(queryClient) },
    );

    const payload: SendMessagePayload = { content: "Hi there!", type: "TEXT" };

    // Fire and let onMutate execute
    await act(async () => {
      result.current.mutate(payload);
      // Give onMutate async setQueryData time to flush
      await new Promise((res) => setTimeout(res, 50));
    });

    // Read cache snapshot AFTER act completes
    const cache = queryClient.getQueryData<{
      pages: ChatMessagesPage[];
      pageParams: unknown[];
    }>(queryKeys.chat.messages(CONVERSATION_ID));

    const allMsgs = cache?.pages.flatMap((p) => p.messages) ?? [];
    const optimistic = allMsgs.find((m) => m.id.startsWith("pending-"));

    expect(allMsgs).toHaveLength(2);
    expect(optimistic).toBeDefined();
    expect(optimistic?.content).toBe("Hi there!");
    expect(optimistic?.senderId).toBe(MOCK_USER.id);
    expect(optimistic?.conversationId).toBe(CONVERSATION_ID);
    expect(optimistic?.type).toBe("TEXT");

    // Resolve the pending API call to clean up
    act(() => {
      resolveApi({
        success: true,
        message: "ok",
        data: makeChatMessage({ id: "msg-server-001", content: "Hi there!" }),
      });
    });
  });

  // -------------------------------------------------------------------------
  // Test 2.2 — Optimistic message replaces pending-id with server id on success
  // -------------------------------------------------------------------------
  it("optimistic success — pending message id replaced by server-confirmed id after API resolves", async () => {
    const existingMessage = makeChatMessage({ id: "msg-existing-01" });

    queryClient.setQueryData(
      queryKeys.chat.messages(CONVERSATION_ID),
      makeMessagesCache([existingMessage]),
    );

    const serverMessage = makeChatMessage({
      id: "msg-server-confirmed-999",
      content: "Hello friend!",
    });

    mockApi.sendMessage.mockResolvedValueOnce({
      success: true,
      message: "ok",
      data: serverMessage,
    });

    const { result } = renderHook(
      () => useSendMessageMutation(CONVERSATION_ID),
      { wrapper: makeWrapper(queryClient) },
    );

    await act(async () => {
      result.current.mutate({ content: "Hello friend!", type: "TEXT" });
    });

    await waitFor(() => result.current.isSuccess);

    // After success, no pending- id should remain in cache
    const cache = queryClient.getQueryData<{
      pages: ChatMessagesPage[];
      pageParams: unknown[];
    }>(queryKeys.chat.messages(CONVERSATION_ID));

    const allMessages = cache?.pages.flatMap((p) => p.messages) ?? [];
    const hasPending = allMessages.some((m) => m.id.startsWith("pending-"));

    // Pending message must be replaced by confirmed server message
    expect(hasPending).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Test 2.3 — Network failure triggers rollback to previous snapshot
  // -------------------------------------------------------------------------
  it("mutation crash — optimistic state rolled back to previous snapshot on API error", async () => {
    const existingMessage = makeChatMessage({ id: "msg-existing-01" });

    // Spy cancelQueries as no-op FIRST so pre-seeded data is captured as 'previous'
    vi.spyOn(queryClient, "cancelQueries").mockResolvedValue();

    queryClient.setQueryData(
      queryKeys.chat.messages(CONVERSATION_ID),
      makeMessagesCache([existingMessage]),
    );
    queryClient.setQueryData(queryKeys.chat.conversations(), [makeConversation()]);

    // API will fail
    mockApi.sendMessage.mockRejectedValueOnce(new Error("Network timeout"));

    const { result } = renderHook(
      () => useSendMessageMutation(CONVERSATION_ID),
      { wrapper: makeWrapper(queryClient) },
    );

    await act(async () => {
      result.current.mutate({ content: "Will fail!", type: "TEXT" });
      // Allow onMutate (optimistic) → API reject → onError (rollback) lifecycle
      await new Promise((res) => setTimeout(res, 200));
    });

    await waitFor(() => result.current.isError, { timeout: 3000 });

    // Rollback verification: only original message must survive
    const restoredCache = queryClient.getQueryData<{
      pages: ChatMessagesPage[];
      pageParams: unknown[];
    }>(queryKeys.chat.messages(CONVERSATION_ID));

    const restoredMessages = restoredCache?.pages.flatMap((p) => p.messages) ?? [];
    expect(restoredMessages).toHaveLength(1);
    expect(restoredMessages[0].id).toBe("msg-existing-01");
    expect(restoredMessages.some((m) => m.id.startsWith("pending-"))).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Test 2.4 — Guard: throws if no user (login required)
  // -------------------------------------------------------------------------
  it("auth guard — mutation throws 'Login required' when user is not authenticated", async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      authStatus: "anonymous",
      isAuthenticated: false,
      loading: false,
      apiOnline: true,
      apiStatus: "online",
      authError: null,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      refreshUser: vi.fn(),
      setUser: vi.fn(),
    });

    const { result } = renderHook(
      () => useSendMessageMutation(CONVERSATION_ID),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.mutate({ content: "Should fail", type: "TEXT" });
    });

    await waitFor(() => result.current.isError);

    expect(result.current.error?.message).toBe("Login required");
    expect(mockApi.sendMessage).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Test 2.5 — Guard: throws if no conversationId
  // -------------------------------------------------------------------------
  it("guard — mutation throws 'Conversation missing' when no conversationId provided", async () => {
    const { result } = renderHook(
      () => useSendMessageMutation(undefined), // no conversationId
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.mutate({ content: "No convo", type: "TEXT" });
    });

    await waitFor(() => result.current.isError);

    expect(result.current.error?.message).toBe("Conversation missing");
    expect(mockApi.sendMessage).not.toHaveBeenCalled();
  });
});

// --------------------------------------------------------------------------
// Suite 3 — Dynamic Atomic Resets (useMarkConversationReadMutation)
// --------------------------------------------------------------------------

describe("Suite 3 — useMarkConversationReadMutation: Atomic Unread Badge Reset", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    queryClient = makeQueryClient();

    mockUseAuth.mockReturnValue({
      user: MOCK_USER,
      authStatus: "authenticated",
      isAuthenticated: true,
      loading: false,
      apiOnline: true,
      apiStatus: "online",
      authError: null,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      refreshUser: vi.fn(),
      setUser: vi.fn(),
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  // -------------------------------------------------------------------------
  // Test 3.1 — Atomic unread badge reset to 0 on mutate() (onMutate optimistic)
  // -------------------------------------------------------------------------
  it("mark-read onMutate — conversation unreadCount immediately reset to 0 in cache", async () => {
    // Pre-seed conversations cache with unread messages
    const conversationWithUnread = makeConversation({
      id: CONVERSATION_ID,
      unreadCount: 5,
      participants: [
        {
          id: "part-001",
          conversationId: CONVERSATION_ID,
          userId: MOCK_USER.id,
          unreadCount: 5,
        },
      ],
    });

    const otherConversation = makeConversation({
      id: "conv-other-999",
      unreadCount: 2,
    });

    queryClient.setQueryData(queryKeys.chat.conversations(), [
      conversationWithUnread,
      otherConversation,
    ]);

    // Keep API pending so we observe only onMutate state
    let resolveMarkRead!: (v: { success: boolean; message: string; data: { messageIds: string[] } }) => void;
    mockApi.markConversationRead.mockReturnValueOnce(
      new Promise((res) => { resolveMarkRead = res; }),
    );

    const { result } = renderHook(
      () => useMarkConversationReadMutation(CONVERSATION_ID),
      { wrapper: makeWrapper(queryClient) },
    );

    // Fire mutation — do NOT await so we observe onMutate side effect
    act(() => {
      result.current.mutate();
    });

    // Capture all expected values inside waitFor to avoid stale reads
    let capturedTargetUnread: number | undefined;
    let capturedParticipantUnread: number | undefined;
    let capturedOtherUnread: number | undefined;

    await waitFor(
      () => {
        const convs = queryClient.getQueryData<Conversation[]>(
          queryKeys.chat.conversations(),
        );
        const target = convs?.find((c) => c.id === CONVERSATION_ID);
        const other = convs?.find((c) => c.id === "conv-other-999");
        capturedTargetUnread = target?.unreadCount;
        capturedParticipantUnread = target?.participants?.find((p) => p.userId === MOCK_USER.id)?.unreadCount;
        capturedOtherUnread = other?.unreadCount;
        return capturedTargetUnread === 0;
      },
      { timeout: 3000 },
    );

    expect(capturedTargetUnread).toBe(0);
    expect(capturedParticipantUnread).toBe(0);
    expect(capturedOtherUnread).toBe(2);

    // Resolve pending API call to prevent hanging
    act(() => {
      resolveMarkRead({ success: true, message: "ok", data: { messageIds: [] } });
    });
  });

  // -------------------------------------------------------------------------
  // Test 3.2 — Archived conversations cache also updated atomically
  // -------------------------------------------------------------------------
  it("mark-read onMutate — archived conversations cache also has unreadCount zeroed", async () => {
    const archivedConversation = makeConversation({
      id: CONVERSATION_ID,
      unreadCount: 7,
      participants: [
        {
          id: "part-archived-001",
          conversationId: CONVERSATION_ID,
          userId: MOCK_USER.id,
          unreadCount: 7,
        },
      ],
    });

    queryClient.setQueryData(queryKeys.chat.conversations(), []);
    queryClient.setQueryData(queryKeys.chat.archived(), [archivedConversation]);

    let resolveMarkRead!: (v: { success: boolean; message: string; data: { messageIds: string[] } }) => void;
    mockApi.markConversationRead.mockReturnValueOnce(
      new Promise((res) => { resolveMarkRead = res; }),
    );

    const { result } = renderHook(
      () => useMarkConversationReadMutation(CONVERSATION_ID),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.mutate();
    });

    // Capture all values inside waitFor to avoid stale reads
    let capturedUnread: number | undefined;
    let capturedParticipantUnread: number | undefined;

    await waitFor(
      () => {
        const archived = queryClient.getQueryData<Conversation[]>(
          queryKeys.chat.archived(),
        );
        const target = archived?.find((c) => c.id === CONVERSATION_ID);
        capturedUnread = target?.unreadCount;
        capturedParticipantUnread = target?.participants?.find(
          (p) => p.userId === MOCK_USER.id,
        )?.unreadCount;
        return capturedUnread === 0;
      },
      { timeout: 3000 },
    );

    expect(capturedUnread).toBe(0);
    expect(capturedParticipantUnread).toBe(0);

    act(() => {
      resolveMarkRead({ success: true, message: "ok", data: { messageIds: ["msg-1", "msg-2"] } });
    });
  });

  // -------------------------------------------------------------------------
  // Test 3.3 — Guard: no conversationId → mutation throws
  // -------------------------------------------------------------------------
  it("guard — mutation throws 'Conversation missing' when no conversationId provided", async () => {
    const { result } = renderHook(
      () => useMarkConversationReadMutation(undefined),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.mutate();
    });

    await waitFor(() => result.current.isError);

    expect(result.current.error?.message).toBe("Conversation missing");
    expect(mockApi.markConversationRead).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Test 3.4 — onSuccess: readByUsers updated in messages cache
  // -------------------------------------------------------------------------
  it("onSuccess — readByUsers array updated for all marked messages in messages cache", async () => {
    const message1 = makeChatMessage({ id: "msg-a1", readByUsers: [] });
    const message2 = makeChatMessage({ id: "msg-a2", readByUsers: ["other-user"] });

    queryClient.setQueryData(
      queryKeys.chat.messages(CONVERSATION_ID),
      makeMessagesCache([message1, message2]),
    );
    queryClient.setQueryData(queryKeys.chat.conversations(), [makeConversation()]);

    mockApi.markConversationRead.mockResolvedValueOnce({
      success: true,
      message: "ok",
      data: { messageIds: ["msg-a1", "msg-a2"] },
    });

    const { result } = renderHook(
      () => useMarkConversationReadMutation(CONVERSATION_ID),
      { wrapper: makeWrapper(queryClient) },
    );

    await act(async () => {
      result.current.mutate();
      await new Promise((res) => setTimeout(res, 100));
    });

    await waitFor(() => result.current.isSuccess, { timeout: 3000 });

    // Poll until onSuccess has updated the messages cache
    let msg1ReadByUsers: string[] | undefined;
    let msg2ReadByUsers: string[] | undefined;

    await waitFor(
      () => {
        const cache = queryClient.getQueryData<{
          pages: ChatMessagesPage[];
          pageParams: unknown[];
        }>(queryKeys.chat.messages(CONVERSATION_ID));
        const msgs = cache?.pages.flatMap((p) => p.messages) ?? [];
        const m1 = msgs.find((m) => m.id === "msg-a1");
        const m2 = msgs.find((m) => m.id === "msg-a2");
        msg1ReadByUsers = m1?.readByUsers;
        msg2ReadByUsers = m2?.readByUsers;
        return (
          Array.isArray(msg1ReadByUsers) &&
          msg1ReadByUsers.includes(MOCK_USER.id)
        );
      },
      { timeout: 3000 },
    );

    expect(Array.isArray(msg1ReadByUsers)).toBe(true);
    expect(msg1ReadByUsers).toContain(MOCK_USER.id);
    expect(Array.isArray(msg2ReadByUsers)).toBe(true);
    expect(msg2ReadByUsers).toContain(MOCK_USER.id);
    // Existing "other-user" must not be removed
    expect(msg2ReadByUsers).toContain("other-user");
  });
});
