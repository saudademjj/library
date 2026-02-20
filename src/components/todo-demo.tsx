"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, RefreshCcw, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { formatDateTime } from "@/lib/datetime";

type Todo = {
  id: number;
  title: string;
  completed: boolean;
  createdAt: string;
};

type ApiError = {
  ok: false;
  error: string;
};

function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === "object" &&
    value !== null &&
    "ok" in value &&
    (value as { ok?: unknown }).ok === false &&
    "error" in value &&
    typeof (value as { error?: unknown }).error === "string"
  );
}

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  return JSON.parse(text) as unknown;
}

export function TodoDemo() {
  const [items, setItems] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remainingCount = useMemo(
    () => items.filter((t) => !t.completed).length,
    [items],
  );

  const refresh = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/todos", { method: "GET" });
      const json = await readJson(res);
      if (!res.ok) {
        if (isApiError(json)) throw new Error(json.error);
        throw new Error(res.statusText);
      }

      const data = json as { ok: true; todos: Todo[] };
      setItems(Array.isArray(data.todos) ? data.todos : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createTodo = useCallback(async () => {
    const nextTitle = title.trim();
    if (!nextTitle) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: nextTitle }),
      });
      const json = await readJson(res);
      if (!res.ok) {
        if (isApiError(json)) throw new Error(json.error);
        throw new Error(res.statusText);
      }

      const data = json as { ok: true; todo: Todo };
      setItems((prev) => [data.todo, ...prev]);
      setTitle("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  }, [title]);

  const updateTodo = useCallback(async (id: number, patch: Partial<Todo>) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await readJson(res);
      if (!res.ok) {
        if (isApiError(json)) throw new Error(json.error);
        throw new Error(res.statusText);
      }

      const data = json as { ok: true; todo: Todo };
      setItems((prev) => prev.map((t) => (t.id === id ? data.todo : t)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  }, []);

  const deleteTodo = useCallback(async (id: number) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/todos/${id}`, { method: "DELETE" });
      const json = await readJson(res);
      if (!res.ok) {
        if (isApiError(json)) throw new Error(json.error);
        throw new Error(res.statusText);
      }
      setItems((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">Todo Demo</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={remainingCount === 0 ? "secondary" : "default"}>
              {remainingCount} remaining
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refresh()}
              disabled={busy}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCcw className="size-4" />
              )}
              Refresh
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Add a todo..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void createTodo();
            }}
            disabled={busy}
          />
          <Button onClick={() => void createTodo()} disabled={busy || !title.trim()}>
            <Plus className="size-4" />
            Add
          </Button>
        </div>
        {error ? (
          <p className="text-sm text-destructive">
            {error}{" "}
            <span className="text-muted-foreground">
              (check Postgres + DATABASE_URL)
            </span>
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground">No todos yet.</div>
        ) : (
          items.map((t) => (
            <div key={t.id} className="flex items-center gap-3">
              <Checkbox
                checked={t.completed}
                onCheckedChange={(checked) =>
                  void updateTodo(t.id, { completed: checked === true })
                }
                disabled={busy}
              />
              <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{t.title}</div>
                  <div className="text-xs text-muted-foreground">
                    #{t.id} •{" "}
                    {t.createdAt ? formatDateTime(t.createdAt) : "—"}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => void deleteTodo(t.id)}
                  disabled={busy}
                  aria-label="Delete"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
      <CardFooter className="flex-col items-start gap-2">
        <Separator />
        <p className="text-xs text-muted-foreground">
          API: <code>/api/todos</code> (Hono + Next API Routes + Drizzle + Postgres)
        </p>
      </CardFooter>
    </Card>
  );
}

